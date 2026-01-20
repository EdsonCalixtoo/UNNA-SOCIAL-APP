import { supabase } from './supabase';
import * as Notifications from 'expo-notifications';

export type NotificationType =
  | 'event_created'
  | 'follow_request'
  | 'follow_accepted'
  | 'event_joined'
  | 'event_reminder'
  | 'new_message';

// Função para limpar o badge de notificações do sistema
export async function clearNotificationBadge() {
  try {
    await Notifications.setBadgeCountAsync(0);
    console.log('Badge cleared');
  } catch (error) {
    console.error('Error clearing badge:', error);
  }
}

interface NotificationData {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

// Função para enviar notificação push usando Expo
async function sendPushNotification(userToken: string, title: string, message: string, data?: Record<string, any>) {
  if (!userToken) {
    console.warn('No push token available for user');
    return;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: userToken,
        sound: 'default',
        title,
        body: message,
        data: data || {},
        badge: 1,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send push notification:', await response.text());
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

export async function createNotification(notification: NotificationData) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        read: false,
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
}

export async function notifyFollowersAboutNewEvent(creatorId: string, eventId: string, eventTitle: string) {
  try {
    const { data: followers, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', creatorId);

    if (error) throw error;
    if (!followers || followers.length === 0) return;

    const { data: creator } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', creatorId)
      .maybeSingle();

    const notifications = followers.map(follower => ({
      user_id: follower.follower_id,
      type: 'event_created' as NotificationType,
      title: 'Novo evento criado',
      message: `@${creator?.username} criou: ${eventTitle}`,
      data: { event_id: eventId, creator_id: creatorId },
      read: false,
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;

    return { success: true, count: notifications.length };
  } catch (error) {
    console.error('Error notifying followers:', error);
    return { success: false, error };
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error };
  }
}

export async function markAllNotificationsAsRead(userId: string | undefined) {
  if (!userId) {
    console.warn('No userId provided for marking notifications as read');
    return { success: false };
  }

  try {
    console.log('Marking all notifications as read for user:', userId);
    
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
      .select();

    if (error) {
      console.error('Update error details:', error);
      throw error;
    }

    console.log('Successfully marked notifications as read:', data?.length);
    
    // Limpar o badge do sistema após marcar como lido
    await clearNotificationBadge();
    
    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error };
  }
}

export async function getUnreadNotificationsCount(userId: string) {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return { count: count || 0 };
  } catch (error) {
    console.error('Error getting unread count:', error);
    return { count: 0 };
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error };
  }
}

export async function notifyMessageRecipient(recipientId: string, senderId: string, messagePreview: string, conversationId: string, eventId?: string) {
  try {
    // Obter dados do remetente - com tratamento para coluna push_token
    let sender = null;
    const { data: senderData, error: senderError } = await supabase
      .from('profiles')
      .select('full_name, push_token')
      .eq('id', senderId)
      .maybeSingle();

    if (senderError && !senderError.message?.includes('push_token')) {
      console.warn('Note: push_token column may not exist yet');
    }
    sender = senderData;

    // Obter token push do destinatário - com tratamento para coluna push_token
    let recipient = null;
    const { data: recipientData, error: recipientError } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', recipientId)
      .maybeSingle();

    if (recipientError && !recipientError.message?.includes('push_token')) {
      console.warn('Note: push_token column may not exist yet');
    }
    recipient = recipientData;

    const notificationMessage = `${sender?.full_name || 'Usuário'}: ${messagePreview}`;

    // Salvar notificação no banco de dados
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'new_message',
        title: 'Nova mensagem',
        message: notificationMessage,
        data: { sender_id: senderId, conversation_id: conversationId, event_id: eventId },
        read: false,
      });

    if (error) throw error;

    // Enviar push notification se o token estiver disponível
    if (recipient?.push_token) {
      await sendPushNotification(
        recipient.push_token,
        'Nova mensagem',
        notificationMessage,
        { sender_id: senderId, conversation_id: conversationId, event_id: eventId }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error notifying message recipient:', error);
    return { success: false, error };
  }
}
