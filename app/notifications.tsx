import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Notification } from '@/types/database';
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Calendar, 
  ShieldCheck, 
  ChevronLeft, 
  BellOff,
  Bell,
  CheckCircle2,
  Trophy,
  Trash2
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '@/utils/responsive';
import PageTransition from '@/components/PageTransition';
import { BlurView } from 'expo-blur';
import Animated, { 
  FadeInRight, FadeInUp, Layout, FadeOutLeft,
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  interpolate, Extrapolation, runOnJS
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import PremiumConfirmationModal from '@/components/PremiumConfirmationModal';

const formatNotificationMessage = (msg: string) => {
  if (!msg) return '';
  const trimmed = msg.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === 'image') return '📷 Foto';
      if (parsed.type === 'video') return '🎥 Vídeo';
      if (parsed.type === 'audio') return '🎙️ Mensagem de voz';
      if (parsed.type === 'event_card') return '🎫 Convite de Evento';
      if (parsed.type === 'reply') return parsed.text || '';
    } catch (e) {
      // Ignora erro
    }
  }
  return msg;
};

export default function NotificationsScreen() {
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [presenceData, setPresenceData] = useState<{[key: string]: boolean}>({});
  const [showClearModal, setShowClearModal] = useState(false);
  const [followRequests, setFollowRequests] = useState<any[]>([]);

  const fetchFollowRequests = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('follow_requests')
        .select(`
          id,
          requester_id,
          requested_id,
          status,
          created_at,
          profiles:requester_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('requested_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      setFollowRequests(data || []);
    } catch (e) {
      console.error('Error fetching follow requests:', e);
    }
  }, [user]);

  const fetchNotifications = useCallback(async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const filtered = (data || []).filter(n => n.type !== 'message' && n.type !== 'new_message' && n.title !== 'Nova mensagem');
      
      // Agrupar notificações de mensagens do mesmo usuário/conversa
      const grouped: any[] = [];
      const seenConversations = new Set<string>();

      for (const notif of filtered) {
        if (notif.type === 'new_message') {
          const convId = notif.data?.conversation_id || notif.title;
          if (seenConversations.has(convId)) {
            // Incrementar contagem de mensagens acumuladas
            const existing = grouped.find(g => 
              g.type === 'new_message' && 
              (g.data?.conversation_id === convId || g.title === notif.title)
            );
            if (existing) {
              if (!existing.unreadCount) {
                existing.unreadCount = 1;
              }
              existing.unreadCount += 1;
            }
            continue;
          }
          seenConversations.add(convId);
        }
        grouped.push(notif);
      }

      setNotifications(grouped);
      
      // Carregar presença dos usuários que geraram notificações
      if (data && data.length > 0) {
        const userIds = data
          .map(n => n.data?.user_id || n.data?.follower_id || n.data?.author_id || n.data?.sender_id)
          .filter(id => !!id);
        
        if (userIds.length > 0) {
          const { data: presence } = await supabase
            .from('user_presence')
            .select('user_id, is_online')
            .in('user_id', userIds);
          
          if (presence) {
            const pMap: {[key: string]: boolean} = {};
            presence.forEach(p => {
              pMap[p.user_id] = p.is_online;
            });
            setPresenceData(pMap);
          }
        }
      }

      // Mark all as read after fetching
      if (data && data.some(n => !n.read)) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    fetchFollowRequests();

    // Canal unificado em tempo real para tela de notificações
    const channel = supabase
      .channel(`realtime-notifications-screen-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence'
      }, (payload) => {
        const newPresence = payload.new as any;
        if (newPresence?.user_id) {
          setPresenceData(prev => ({
            ...prev,
            [newPresence.user_id]: newPresence.is_online
          }));
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchNotifications(false);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'follow_requests',
        filter: `requested_id=eq.${user.id}`
      }, () => {
        fetchFollowRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications, fetchFollowRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
    fetchFollowRequests();
  };

  const handleNotificationPress = (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const { data, type } = notification;
    
    if (data?.event_id) {
      if (type === 'mention') {
        router.push(`/event/${data.event_id}?openComments=true`);
      } else {
        router.push(`/event/${data.event_id}`);
      }
    } else if (data?.conversation_id) {
      router.push(`/messages/${data.conversation_id}`);
    } else if (type === 'follow' || data?.follower_id) {
      const profileId = data?.follower_id || data?.user_id;
      if (profileId) {
        router.push(`/profile/${profileId}`);
      }
    } else if (data?.post_id) {
      // Se tivermos uma tela de post detalhado no futuro, navegamos aqui
      // Por enquanto, podemos levar ao perfil do autor do post se soubermos quem é
      if (data?.author_id) {
        router.push(`/profile/${data.author_id}`);
      }
    }
  };

  const clearAllNotifications = async () => {
    setShowClearModal(true);
  };

  const confirmClearAll = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user!.id);
      setNotifications([]);
    } catch (e) {
      console.error('Error clearing notifications:', e);
    } finally {
      setShowClearModal(false);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await supabase.from('notifications').delete().eq('id', id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error('Error deleting notification:', e);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconSize = vs(18);
    switch (type) {
      case 'like':
        return <Heart size={iconSize} color="#ff2d55" fill="#ff2d55" />;
      case 'comment':
        return <MessageCircle size={iconSize} color={accent} fill={accent + '44'} />;
      case 'follow':
        return <UserPlus size={iconSize} color="#5856d6" />;
      case 'event_invite':
      case 'event_reminder':
        return <Calendar size={iconSize} color="#ff9500" />;
      case 'reputation':
      case 'achievement':
        return <Trophy size={iconSize} color="#ffcc00" />;
      default:
        return <Bell size={iconSize} color={textSecondary} />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'agora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const SWIPE_THRESHOLD = -75;
  const DELETE_ZONE = -120;

  const SwipeableNotification = ({ item, index }: { item: Notification; index: number }) => {
    const translateX = useSharedValue(0);
    const itemHeight = useSharedValue<number | 'auto'>('auto');
    const opacity = useSharedValue(1);

    const onDelete = () => deleteNotification(item.id);

    const panGesture = Gesture.Pan()
      .activeOffsetX([-10, 10])
      .failOffsetY([-15, 15])
      .onUpdate((e) => {
        // Apenas arrastar para esquerda
        if (e.translationX < 0) {
          translateX.value = e.translationX;
        }
      })
      .onEnd((e) => {
        if (e.translationX < DELETE_ZONE || e.velocityX < -1200) {
          // Deletar: animar saída para esquerda
          runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Warning as any);
          translateX.value = withTiming(-500, { duration: 280 });
          opacity.value = withTiming(0, { duration: 280 });
          setTimeout(() => runOnJS(onDelete)(), 260);
        } else if (e.translationX < SWIPE_THRESHOLD) {
          // Revelar botão delete
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium as any);
          translateX.value = withSpring(-80, { damping: 20, stiffness: 200 });
        } else {
          // Snap de volta
          translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        }
      });

    const cardStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    }));

    const deleteButtonStyle = useAnimatedStyle(() => {
      const scale = interpolate(translateX.value, [-80, -30, 0], [1, 0.7, 0.4], Extrapolation.CLAMP);
      const opacity = interpolate(translateX.value, [-80, -20, 0], [1, 0.6, 0], Extrapolation.CLAMP);
      return { transform: [{ scale }], opacity };
    });

    const resetSwipe = () => {
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
    };

    return (
      <Animated.View
        entering={FadeInRight.delay(index * 50).duration(400)}
        exiting={FadeOutLeft.duration(280)}
        layout={Layout.springify()}
        style={{ marginBottom: vs(12) }}
      >
        {/* Botão de delete revelado atrás */}
        <Animated.View style={[styles.swipeDeleteBg, deleteButtonStyle]}>
          <Trash2 size={22} color="#fff" />
          <Text style={styles.swipeDeleteText}>Excluir</Text>
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={cardStyle}>
            <TouchableOpacity
              style={[
                styles.notificationCard,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  marginBottom: 0,
                },
                !item.read && { backgroundColor: isDark ? accent + '15' : accent + '10', borderColor: accent + '30' }
              ]}
              onPress={() => {
                resetSwipe();
                handleNotificationPress(item);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                {getNotificationIcon(item.type)}
              </View>

              <View style={styles.contentContainer}>
                <View style={styles.contentHeader}>
                  <View style={styles.titleWithStatus}>
                    <Text style={[styles.title, { color: textPrimary }]}>{item.title}</Text>
                    {(() => {
                      const targetUserId = item.data?.user_id || item.data?.follower_id || item.data?.author_id || item.data?.sender_id;
                      const isOnline = targetUserId ? presenceData[targetUserId] : false;
                      return targetUserId ? (
                        <View style={[styles.presenceDot, { backgroundColor: isOnline ? '#4cd964' : '#8e8e93' }]} />
                      ) : null;
                    })()}
                  </View>
                  <Text style={[styles.time, { color: textSecondary }]}>{formatTime(item.created_at)}</Text>
                </View>
                <Text style={[styles.message, { color: textSecondary }]} numberOfLines={2}>
                  {formatNotificationMessage(item.message)}
                  {item.unreadCount && item.unreadCount > 1 ? (
                    <Text style={{ color: accent, fontWeight: '600' }}>
                      {` (+${item.unreadCount - 1} novas)`}
                    </Text>
                  ) : null}
                </Text>
              </View>

              {!item.read && (
                <View style={[styles.unreadDot, { backgroundColor: accent }]} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    );
  };

  const handleAcceptRequest = async (request: any) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const { error: followError } = await supabase.from('follows').insert({
        follower_id: request.requester_id,
        following_id: user!.id
      });
      if (followError) throw followError;

      await supabase.from('follow_requests').delete().eq('id', request.id);
      setFollowRequests(prev => prev.filter(r => r.id !== request.id));

      await supabase.from('notifications').insert({
        user_id: request.requester_id,
        type: 'follow',
        title: 'Solicitação aceita! 🎉',
        message: `@${user?.user_metadata?.username || user?.email?.split('@')[0]} aceitou sua solicitação para seguir.`,
        data: { follower_id: request.requester_id, following_id: user!.id },
        read: false
      });
    } catch (e) {
      console.error('Error accepting follow request:', e);
    }
  };

  const handleDeclineRequest = async (request: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await supabase.from('follow_requests').delete().eq('id', request.id);
      setFollowRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (e) {
      console.error('Error declining follow request:', e);
    }
  };

  const renderFollowRequestsHeader = () => {
    if (followRequests.length === 0) return null;

    return (
      <Animated.View 
        entering={FadeInRight.duration(400)} 
        style={[
          styles.requestsSection, 
          { 
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }
        ]}
      >
        <View style={styles.requestsHeader}>
          <UserPlus size={18} color={accent} />
          <Text style={[styles.requestsTitle, { color: textPrimary }]}>
            Solicitações de seguimento ({followRequests.length})
          </Text>
        </View>
        
        {followRequests.map((req, idx) => {
          const profile = req.profiles;
          if (!profile) return null;

          return (
            <View 
              key={req.id} 
              style={[
                styles.requestItem,
                idx > 0 && { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
              ]}
            >
              <TouchableOpacity 
                style={styles.requestUser}
                onPress={() => router.push(`/profile/${profile.id}`)}
              >
                <Animated.Image 
                  source={{ uri: profile.avatar_url || 'https://via.placeholder.com/150' }} 
                  style={[styles.requestAvatar, { borderColor: accent }]} 
                />
                <View style={styles.requestInfo}>
                  <Text style={[styles.requestUsername, { color: textPrimary }]} numberOfLines={1}>
                    @{profile.username}
                  </Text>
                  <Text style={[styles.requestFullName, { color: textSecondary }]} numberOfLines={1}>
                    {profile.full_name || 'Usuário UNNA'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.requestActions}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: accent }]}
                  onPress={() => handleAcceptRequest(req)}
                >
                  <Text style={styles.acceptBtnText}>Aceitar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.declineBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={() => handleDeclineRequest(req)}
                >
                  <Text style={[styles.declineBtnText, { color: textSecondary }]}>Recusar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }: { item: Notification; index: number }) => (
    <SwipeableNotification item={item} index={index} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Animated.View entering={FadeInUp.delay(200)}>
        <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <BellOff size={vs(40)} color={textSecondary} opacity={0.5} />
        </View>
      </Animated.View>
      <Text style={[styles.emptyTitle, { color: textPrimary }]}>Tudo limpo por aqui!</Text>
      <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
        Suas notificações aparecerão aqui quando alguém interagir com você.
      </Text>
      <TouchableOpacity 
        style={[styles.refreshButton, { backgroundColor: accent }]}
        onPress={() => fetchNotifications()}
      >
        <Text style={styles.refreshButtonText}>Atualizar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <PageTransition>
      <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
        {/* Glass Header */}
        <View style={[styles.header, { paddingTop: insets.top + vs(4), backgroundColor: backgroundSecondary, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={vs(24)} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Notificações</Text>
          {notifications.length > 0 ? (
            <TouchableOpacity
              style={styles.clearAllBtn}
              onPress={clearAllNotifications}
            >
              <Trash2 size={vs(18)} color="#ff3b30" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: vs(40) }} />
          )}
        </View>

        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={[
              styles.listContent, 
              { paddingBottom: insets.bottom + vs(20) }
            ]}
            ListHeaderComponent={renderFollowRequestsHeader}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                tintColor={accent}
                colors={[accent]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        <PremiumConfirmationModal
          visible={showClearModal}
          title="Limpar notificações"
          description="Todas as notificações serão removidas permanentemente. Esta ação não pode ser desfeita."
          confirmText="Limpar tudo"
          cancelText="Cancelar"
          isDestructive
          onConfirm={confirmClearAll}
          onCancel={() => setShowClearModal(false)}
        />
      </View>
    </PageTransition>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingBottom: vs(15),
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backButton: {
    width: vs(40),
    height: vs(40),
    borderRadius: vs(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: ms(18),
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  clearAllBtn: {
    width: vs(40),
    height: vs(40),
    borderRadius: vs(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeDeleteBg: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#FF3B30',
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  swipeDeleteText: {
    color: '#fff',
    fontSize: ms(11),
    fontWeight: '800',
  },
  listContent: {
    padding: s(16),
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: s(12),
    borderRadius: ms(16),
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: vs(40),
    height: vs(40),
    borderRadius: vs(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(12),
  },
  contentContainer: {
    flex: 1,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(2),
  },
  titleWithStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  presenceDot: {
    width: vs(8),
    height: vs(8),
    borderRadius: vs(4),
    marginTop: vs(1),
  },
  title: {
    fontSize: ms(14),
    fontWeight: '700',
  },
  time: {
    fontSize: ms(11),
    opacity: 0.7,
  },
  message: {
    fontSize: ms(13),
    lineHeight: vs(18),
  },
  unreadDot: {
    width: vs(8),
    height: vs(8),
    borderRadius: vs(4),
    marginLeft: s(8),
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: vs(100),
  },
  emptyIconCircle: {
    width: vs(80),
    height: vs(80),
    borderRadius: vs(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(20),
  },
  emptyTitle: {
    fontSize: ms(18),
    fontWeight: '800',
    marginBottom: vs(8),
  },
  emptySubtitle: {
    fontSize: ms(14),
    textAlign: 'center',
    paddingHorizontal: s(40),
    lineHeight: vs(20),
    marginBottom: vs(30),
  },
  refreshButton: {
    paddingHorizontal: s(24),
    paddingVertical: vs(12),
    borderRadius: ms(20),
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: ms(14),
  },
  requestsSection: {
    marginBottom: vs(12),
    borderRadius: ms(16),
    borderWidth: 1,
    padding: s(12),
  },
  requestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(12),
  },
  requestsTitle: {
    fontSize: ms(14),
    fontWeight: '700',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: vs(10),
    gap: s(8),
  },
  requestUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: s(10),
  },
  requestAvatar: {
    width: s(36),
    height: s(36),
    borderRadius: ms(18),
    borderWidth: 1.5,
  },
  requestInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  requestUsername: {
    fontSize: ms(13),
    fontWeight: '600',
  },
  requestFullName: {
    fontSize: ms(11),
    marginTop: vs(1),
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
  },
  actionBtn: {
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderRadius: ms(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: ms(12),
    fontWeight: '700',
  },
  declineBtn: {
    borderWidth: 1,
    borderColor: 'transparent',
  },
  declineBtnText: {
    fontSize: ms(12),
    fontWeight: '600',
  },
});
