import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useInAppNotification } from '@/contexts/InAppNotificationContext';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

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
  const router = useRouter();
  const { showNotification } = useInAppNotification();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const setupPushNotifications = async () => {
      try {
        // Limpar badge existente quando a app inicia
        try {
          await Notifications.setBadgeCountAsync(0);
        } catch (e) {
          // Ignorar erro se não for suportado no ambiente (ex: simulador/web)
        }
        
        // Registrar para notificações - Apenas se não for Expo Go em SDK 53+
        // Ou simplesmente envolver em try/catch para evitar crash
        try {
          const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? '805a59da-5728-4d83-9531-e768d92fe6b9';
          const token = await Notifications.getExpoPushTokenAsync({
            projectId,
          });

          if (isMounted && token?.data) {
            console.log('Expo Push Token:', token.data);

            // Salvar o token no banco de dados
            const { error } = await supabase
              .from('profiles')
              .update({ push_token: token.data })
              .eq('id', user.id);

            if (error) {
              if (error.code === 'PGRST204' || error.message?.includes('push_token')) {
                console.warn('Push token column not yet available in database.');
              } else {
                console.error('Error saving push token:', error);
              }
            }
          }
        } catch (tokenError: any) {
          if (tokenError.message?.includes('Expo Go')) {
            console.warn('Push notifications are not supported in Expo Go (SDK 53+). Use a development build to test remote notifications.');
          } else {
            console.error('Error getting push token:', tokenError);
          }
        }

        // Solicitar permissão
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
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
        
        const { title, body, data } = notification.request.content;
        
        // Mostrar o banner animado in-app
        showNotification({
          title: title || 'Notificação',
          message: body || '',
          type: (data?.type as any) || 'default',
          data: data
        });
      }
    );

    // Listener para resposta às notificações (quando o usuário clica na notificação)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped with data:', data);

        if (data?.conversation_id) {
          // Se for mensagem, vai para o chat
          router.push(`/messages/${data.conversation_id}${data.sender_id ? `?userId=${data.sender_id}` : ''}`);
        } else if (data?.event_id) {
          // Se for evento, vai para os detalhes do evento
          router.push(`/event/${data.event_id}`);
        } else if (data?.story_id) {
          // Se for story, vai para o index onde os stories são exibidos (ou implementar StoryViewer direto)
          router.push('/(tabs)');
        } else if (data?.follower_id || data?.user_id) {
          // Se for novo seguidor ou perfil, vai para o perfil
          router.push(`/profile/${data.follower_id || data.user_id}`);
        } else if (data?.story_id) {
          // Se for story, vai para a home onde os stories são carregados
          router.push('/(tabs)');
        } else {
          // Fallback para a aba de notificações
          router.push('/(tabs)/notifications');
        }
      }
    );

    return () => {
      isMounted = false;
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [user?.id, showNotification]);
};
