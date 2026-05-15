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
  Trophy
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '@/utils/responsive';
import PageTransition from '@/components/PageTransition';
import { BlurView } from 'expo-blur';
import Animated, { FadeInRight, FadeInUp, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function NotificationsScreen() {
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setNotifications(data || []);
      
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
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  const handleNotificationPress = (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const { data, type } = notification;
    
    if (data?.event_id) {
      router.push(`/event/${data.event_id}`);
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

  const renderItem = ({ item, index }: { item: Notification; index: number }) => (
    <Animated.View 
      entering={FadeInRight.delay(index * 50).duration(400)}
      layout={Layout.springify()}
    >
      <TouchableOpacity 
        style={[
          styles.notificationCard, 
          { 
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          },
          !item.read && { backgroundColor: isDark ? accent + '15' : accent + '10', borderColor: accent + '30' }
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          {getNotificationIcon(item.type)}
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.contentHeader}>
            <Text style={[styles.title, { color: textPrimary }]}>{item.title}</Text>
            <Text style={[styles.time, { color: textSecondary }]}>{formatTime(item.created_at)}</Text>
          </View>
          <Text style={[styles.message, { color: textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>
        </View>
        
        {!item.read && (
          <View style={[styles.unreadDot, { backgroundColor: accent }]} />
        )}
      </TouchableOpacity>
    </Animated.View>
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
        <View style={[styles.header, { paddingTop: insets.top + vs(10), backgroundColor: backgroundSecondary, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={vs(24)} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Notificações</Text>
          <View style={{ width: vs(40) }} />
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
  listContent: {
    padding: s(16),
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: s(12),
    borderRadius: ms(16),
    marginBottom: vs(12),
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
});
