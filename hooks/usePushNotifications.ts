import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const usePushNotifications = () => {
  const { user } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const setupPushNotifications = async () => {
      try {
        // Limpar badge existente quando a app inicia
        await Notifications.setBadgeCountAsync(0);
        
        // Registrar para notificações
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: '805a59da-5728-4d83-9531-e768d92fe6b9',
        });

        if (isMounted) {
          console.log('Expo Push Token:', token.data);

          // Salvar o token no banco de dados
          try {
            const { error } = await supabase
              .from('profiles')
              .update({ push_token: token.data })
              .eq('id', user.id);

            if (error) {
              // Se o erro for sobre a coluna não existir, apenas logar o aviso
              if (error.code === 'PGRST204' || error.message?.includes('push_token')) {
                console.warn('Push token column not yet available in database. Will retry on next login.');
              } else {
                console.error('Error saving push token:', error);
              }
            } else {
              console.log('Push token saved successfully');
            }
          } catch (err) {
            console.error('Exception while saving push token:', err);
          }
        }

        // Solicitar permissão
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          if (newStatus !== 'granted') {
            console.warn('Push notification permission not granted');
          }
        }
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    };

    setupPushNotifications();

    // Listener para notificações recebidas em foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Listener para resposta às notificações
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        console.log('Notification response:', response);
        // Aqui você pode navegar para a tela apropriada baseado no tipo de notificação
      }
    );

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id]);
};

// Função para enviar notificações push de forma local (para teste)
export const sendLocalNotification = async (title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        badge: 1,
      },
      trigger: null, // Imediato
    });
  } catch (error) {
    console.error('Error sending local notification:', error);
  }
};
