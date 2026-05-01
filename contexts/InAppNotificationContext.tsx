import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
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
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

type NotificationType = 'message' | 'success' | 'error' | 'info' | 'alert' | 'event' | 'default' | 'new_message' | 'event_created' | 'follow_request' | 'follow_accepted' | 'event_joined' | 'event_reminder';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: any;
  created_at: number;
}

interface InAppNotificationContextType {
  showNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => void;
  clearAll: () => void;
}

const InAppNotificationContext = createContext<InAppNotificationContextType | undefined>(undefined);

export function InAppNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const showNotification = useCallback((notif: Omit<Notification, 'id' | 'created_at'>) => {
    const id = Date.now().toString();
    const newNotif = { ...notif, id, created_at: Date.now() };
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        notif.type === 'error' ? Haptics.NotificationFeedbackType.Error :
        notif.type === 'success' ? Haptics.NotificationFeedbackType.Success :
        Haptics.NotificationFeedbackType.Warning
      );
    }
    
    setNotifications(prev => [newNotif, ...prev].slice(0, 3)); 

    setTimeout(() => {
      hideNotification(id);
    }, 5000);
  }, [hideNotification]);

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
          const newNotif = payload.new as any;
          if (newNotif) {
            showNotification({
              title: newNotif.title || 'Nova Interação',
              message: newNotif.message || '',
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
    <InAppNotificationContext.Provider value={{ showNotification, clearAll }}>
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
                } else if (notif.type === 'message' && notif.data?.conversation_id) {
                  router.push(`/messages/${notif.data.conversation_id}`);
                } else {
                  router.push('/(tabs)/notifications');
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
    switch (notification.type) {
      case 'message': return <View style={[styles.iconBg, { backgroundColor: '#34C759' }]}><MessageCircle size={size} color={color} /></View>;
      case 'success': return <View style={[styles.iconBg, { backgroundColor: '#28a745' }]}><CheckCircle size={size} color={color} /></View>;
      case 'error': return <View style={[styles.iconBg, { backgroundColor: '#FF3B30' }]}><AlertCircle size={size} color={color} /></View>;
      case 'alert': return <View style={[styles.iconBg, { backgroundColor: '#FF9500' }]}><AlertCircle size={size} color={color} /></View>;
      case 'event': return <View style={[styles.iconBg, { backgroundColor: '#7b2fff' }]}><Calendar size={size} color={color} /></View>;
      case 'info': return <View style={[styles.iconBg, { backgroundColor: '#007AFF' }]}><Info size={size} color={color} /></View>;
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
    backgroundColor: 'rgba(30, 45, 50, 0.92)',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pressable: {
    width: '100%',
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBg: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  timeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  body: {
    width: '100%',
  },
  messageText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
  },
  handle: {
    width: 30,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: -8,
  }
});
