import { supabase } from './supabase';

export type NotificationType =
  | 'event_created'
  | 'follow_request'
  | 'follow_accepted'
  | 'event_joined'
  | 'event_reminder'
  | 'new_message';

interface NotificationData {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
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

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
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

export async function notifyMessageRecipient(recipientId: string, senderId: string, messagePreview: string, conversationId: string) {
  try {
    const { data: sender } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', senderId)
      .maybeSingle();

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type: 'new_message',
        title: 'Nova mensagem',
        message: `${sender?.full_name || 'Usuário'}: ${messagePreview}`,
        data: { sender_id: senderId, conversation_id: conversationId },
        read: false,
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error notifying message recipient:', error);
    return { success: false, error };
  }
}
