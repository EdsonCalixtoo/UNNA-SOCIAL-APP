import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform, Image } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS,
  interpolate,
  Extrapolation,
  withTiming,
  Layout,
  FadeInUp,
  FadeOutUp
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, MessageCircle, Calendar, Trash2, CheckCircle, AlertCircle, Info } from 'lucide-react-native';
import { useRouter, useSegments } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

type NotificationType = 'message' | 'success' | 'error' | 'info' | 'alert' | 'event' | 'default' | 'new_message' | 'event_created' | 'follow_request' | 'follow_accepted' | 'event_joined' | 'event_reminder' | 'story_like' | 'story_reply';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: any;
  created_at: number;
}

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
      // Ignora e prossegue
    }
  }
  return msg;
};

interface InAppNotificationContextType {
  showNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => void;
  clearAll: () => void;
  setActiveConversation: (id: string | null) => void;
}

const InAppNotificationContext = createContext<InAppNotificationContextType | undefined>(undefined);

export function InAppNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const lastNotificationRef = useRef<{ title: string, message: string, time: number } | null>(null);

  const showNotification = useCallback((notif: Omit<Notification, 'id' | 'created_at'>) => {
    // Silenciar se o usuário já estiver na aba de mensagens ou na conversa correspondente
    const segmentsList = segments as string[];
    const isInMessages = segmentsList.includes('messages');
    const isMessageNotif = notif.type === 'message' || notif.type === 'new_message';

    if (isMessageNotif) {
      if (notif.data?.conversation_id === activeConversationId) {
        console.log('[InAppNotification] Silenciando banner: conversa ativa.');
        return;
      }
      if (isInMessages) {
        console.log('[InAppNotification] Silenciando banner: usuário já está na aba de mensagens.');
        return;
      }
    }

    // Deduplicação: bloquear apenas notificações IDÊNTICAS em menos de 1s
    const now = Date.now();
    const dedupeKey = `${notif.title}|${notif.message}|${notif.data?.conversation_id || ''}`;
    if (
      lastNotificationRef.current &&
      lastNotificationRef.current.title === dedupeKey &&
      now - lastNotificationRef.current.time < 1000
    ) {
      console.log('[InAppNotification] Deduplicando notificação idêntica:', notif.title);
      return;
    }

    lastNotificationRef.current = { title: dedupeKey, message: notif.message, time: now };
    
    const id = now.toString();
    const newNotif = { ...notif, id, created_at: now };
    
    // Tocar som e haptic
    if (Platform.OS !== 'web') {
      // Som Sutil (Premium Bubble Pop)
      const playSoftSound = async () => {
        try {
          const soundUri = Platform.OS === 'ios' 
            ? 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' 
            : 'https://assets.mixkit.co/active_storage/sfx/2006/2006-preview.mp3';
          const { sound } = await Audio.Sound.createAsync(
            { uri: soundUri },
            { shouldPlay: true, volume: 0.5 }
          );
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
          });
        } catch (e) {
          console.log('[InAppNotification] Erro ao tocar som:', e);
        }
      };

      playSoftSound();

      if (notif.type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (notif.type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Feedback mais suave para mensagens e alertas comuns
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    
    setNotifications(prev => [newNotif, ...prev].slice(0, 3)); 

    setTimeout(() => {
      hideNotification(id);
    }, 5000);
  }, [hideNotification, activeConversationId]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`realtime-in-app-notifs:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime-DEBUG] Nova notificação na tabela notifications:', JSON.stringify(payload.new, null, 2));
          const newNotif = payload.new as any;
          // Exibir banner in-app para todos os tipos, inclusive new_message (mensagens do chat)
          if (newNotif && newNotif.type !== 'message' && newNotif.title !== 'Nova mensagem') {
            showNotification({
              title: newNotif.title || 'UNNA',
              message: formatNotificationMessage(newNotif.message || ''),
              type: (newNotif.type as NotificationType) || 'info',
              data: newNotif.data || {}
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, showNotification]);

  return (
    <InAppNotificationContext.Provider value={{ showNotification, clearAll, setActiveConversation: setActiveConversationId }}>
      {children}
      <View style={[styles.globalContainer, { top: insets.top || 10 }]} pointerEvents="box-none">
        {notifications.length > 1 && (
          <Animated.View entering={FadeInUp.springify()} exiting={FadeOutUp} style={styles.headerActions}>
            <Pressable style={styles.clearBtn} onPress={clearAll}>
              <Trash2 size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.clearText}>Limpar Tudo</Text>
            </Pressable>
          </Animated.View>
        )}
        <View style={styles.stackContainer}>
          {notifications.map((notif, index) => (
            <NotificationItem 
              key={notif.id} 
              notification={notif} 
              index={index} 
              total={notifications.length}
              onHide={() => hideNotification(notif.id)}
              onPress={() => {
                if (notif.data?.url) {
                  router.push(notif.data.url);
                } else if ((notif.type === 'message' || notif.type === 'new_message') && notif.data?.conversation_id) {
                  router.push(`/messages/${notif.data.conversation_id}`);
                } else {
                  router.push('/notifications');
                }
                hideNotification(notif.id);
              }}
            />
          ))}
        </View>
      </View>
    </InAppNotificationContext.Provider>
  );
}

function NotificationItem({ notification, index, total, onHide, onPress }: { 
  notification: Notification, 
  index: number, 
  total: number,
  onHide: () => void,
  onPress: () => void
}) {
  const translateY = useSharedValue(0);
  const isPressed = useSharedValue(1);
  
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY < -50 || event.velocityY < -500) {
        runOnJS(onHide)();
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(index, [0, 1, 2], [1, 0.94, 0.88], Extrapolation.CLAMP) * isPressed.value;
    const yOffset = interpolate(index, [0, 1, 2], [0, 14, 28], Extrapolation.CLAMP);
    const opacity = interpolate(index, [0, 1, 2], [1, 0.7, 0.3], Extrapolation.CLAMP);
    
    return {
      transform: [
        { translateY: translateY.value + yOffset }, 
        { scale }
      ] as any,
      opacity,
      zIndex: 100 - index,
    } as any;
  });

  const getIcon = () => {
    const size = 18;
    const color = "#fff";
    
    if (notification.type === 'default' || notification.type === 'info') {
      return (
        <View style={[styles.iconBg, { backgroundColor: 'transparent' }]}>
          <Image 
            source={require('../assets/images/icon.png')} 
            style={{ width: 32, height: 32, borderRadius: 10 }} 
          />
        </View>
      );
    }

    switch (notification.type) {
      case 'message':
      case 'new_message': return <View style={[styles.iconBg, { backgroundColor: '#34C759' }]}><MessageCircle size={size} color={color} /></View>;
      case 'success': return <View style={[styles.iconBg, { backgroundColor: '#28a745' }]}><CheckCircle size={size} color={color} /></View>;
      case 'error': return <View style={[styles.iconBg, { backgroundColor: '#FF3B30' }]}><AlertCircle size={size} color={color} /></View>;
      case 'alert': return <View style={[styles.iconBg, { backgroundColor: '#FF9500' }]}><AlertCircle size={size} color={color} /></View>;
      case 'event': return <View style={[styles.iconBg, { backgroundColor: '#7b2fff' }]}><Calendar size={size} color={color} /></View>;
      default: return <View style={[styles.iconBg, { backgroundColor: '#666' }]}><Bell size={size} color={color} /></View>;
    }
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View 
        layout={Layout.springify().mass(1).damping(20).stiffness(120)}
        entering={FadeInUp.springify().mass(1).damping(18).stiffness(100)}
        exiting={FadeOutUp.duration(200)}
        style={[styles.banner, animatedStyle, { position: index === 0 ? 'relative' : 'absolute' }]}
      >
        <Pressable 
          style={styles.pressable} 
          onPress={onPress}
          onPressIn={() => isPressed.value = withTiming(0.97, { duration: 100 })}
          onPressOut={() => isPressed.value = withTiming(1, { duration: 100 })}
        >
          <BlurView intensity={Platform.OS === 'ios' ? 90 : 100} tint="dark" style={[styles.blur, { backgroundColor: 'rgba(20, 20, 20, 0.85)' }]}>
            <View style={styles.bannerHeader}>
              <View style={styles.headerLeft}>
                {getIcon()}
                <Text style={styles.titleText}>{notification.title}</Text>
              </View>
              <Text style={styles.timeText}>agora</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.messageText} numberOfLines={2}>{notification.message}</Text>
            </View>
            <View style={styles.handle} />
          </BlurView>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export function useInAppNotification() {
  const context = useContext(InAppNotificationContext);
  if (context === undefined) {
    throw new Error('useInAppNotification must be used within an InAppNotificationProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  globalContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  clearText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  stackContainer: {
    width: '100%',
    alignItems: 'center',
  },
  banner: {
    width: '100%',
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  blur: {
    padding: 16,
    paddingBottom: 14,
  },
  pressable: {
    width: '100%',
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  timeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    width: '100%',
    paddingLeft: 2,
  },
  messageText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 14,
    marginBottom: -2,
  }
});
