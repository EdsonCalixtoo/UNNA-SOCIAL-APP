import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useInAppNotification } from '@/contexts/InAppNotificationContext';

export const useInAppNotificationsListener = () => {
  const { user } = useAuth();
  const { showNotification } = useInAppNotification();

  useEffect(() => {
    if (!user?.id) return;

    console.log('[Realtime] Setting up notification listener for user:', user.id);

    const channel = supabase
      .channel(`user-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] New notification received:', payload.new);
          const newNotif = payload.new as any;
          
          if (newNotif) {
            showNotification({
              title: newNotif.title || 'Nova Notificação',
              message: newNotif.message || '',
              type: newNotif.type || 'default',
              data: newNotif.data || {}
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Notification channel status:', status);
      });

    return () => {
      console.log('[Realtime] Cleaning up notification listener');
      supabase.removeChannel(channel);
    };
  }, [user?.id, showNotification]);
};
