import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearNotificationBadge } from '@/lib/notifications';
import { Bell, Calendar, UserPlus, UserCheck, Users, CheckCheck, MessageCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadNotifications();

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Marcar todas as notificações como lidas quando a página é exibida
  useEffect(() => {
    if (user?.id) {
      markAllNotificationsAsRead(user.id).then(result => {
        if (!result.success) {
          console.log('Could not mark all as read, but continuing...');
        }
      });
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      console.log('Notification pressed:', notification.type, notification.data);

      // Marcar como lida antes de qualquer coisa
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
      }

      // Preparar a navegação ANTES de deletar
      let navigationPath: string | null = null;

      // Se for mensagem, navegar para a conversa
      if (notification.type === 'new_message') {
        // Se tem event_id, é chat de evento
        if (notification.data?.event_id) {
          navigationPath = `/event/${notification.data.event_id}/chat`;
        } 
        // Se não tem event_id, é chat direto
        else if (notification.data?.conversation_id) {
          navigationPath = `/messages/${notification.data.conversation_id}`;
        }
      }
      // Se for evento, navegar para o evento
      else if (notification.data?.event_id) {
        navigationPath = `/event/${notification.data.event_id}`;
      }
      // Se for seguir (follow_request, follow_accepted), navegar para o perfil da pessoa
      else if (notification.type === 'follow_request' || notification.type === 'follow_accepted') {
        if (notification.data?.user_id) {
          navigationPath = `/profile/${notification.data.user_id}`;
        }
      }
      // Fallback para outras situações
      else if (notification.data?.user_id) {
        navigationPath = `/profile/${notification.data.user_id}`;
      }

      console.log('Navigation path:', navigationPath);

      // Deletar a notificação
      await deleteNotification(notification.id);
      setNotifications(prev => prev.filter(n => n.id !== notification.id));

      // Navegar APÓS preparar tudo
      if (navigationPath) {
        console.log('Navigating to:', navigationPath);
        router.push(navigationPath as any);
      } else {
        console.warn('No navigation path found for notification:', notification);
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(user?.id!);
    await clearNotificationBadge();
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'event_created':
        return <Calendar size={24} color="#00d9ff" />;
      case 'follow_request':
        return <UserPlus size={24} color="#FF9500" />;
      case 'follow_accepted':
        return <UserCheck size={24} color="#34C759" />;
      case 'event_joined':
        return <Users size={24} color="#AF52DE" />;
      case 'event_reminder':
        return <Bell size={24} color="#FF3B30" />;
      case 'new_message':
        return <MessageCircle size={24} color="#00d9ff" />;
      default:
        return <Bell size={24} color="#666" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('pt-BR');
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        {getNotificationIcon(item.type)}
      </View>

      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2d2d2d', '#1a1a1a']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Notificações</Text>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <CheckCheck size={20} color="#00d9ff" />
              <Text style={styles.markAllText}>Marcar todas</Text>
            </TouchableOpacity>
          )}
        </View>
        {unreadCount > 0 && (
          <Text style={styles.headerSubtitle}>
            {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}
          </Text>
        )}
      </LinearGradient>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
            tintColor="#00d9ff"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bell size={64} color="#666" />
            <Text style={styles.emptyStateText}>Nenhuma notificação</Text>
            <Text style={styles.emptyStateSubtext}>
              Você será notificado sobre novos eventos e interações
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#00d9ff',
    fontWeight: '600',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00d9ff',
  },
  listContent: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  unreadCard: {
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
    borderColor: '#00d9ff',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00d9ff',
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
