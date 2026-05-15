import { supabase } from './supabase';

export const notifyStoryLike = async (storyId: string, actorId: string, recipientId: string) => {
  if (actorId === recipientId) return;
  
  try {
    const { data: actor } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', actorId)
      .single();

    await supabase.functions.invoke('send-notification', {
      body: {
        userId: recipientId,
        title: 'Nova curtida! ❤️',
        message: `${actor?.username || 'Alguém'} curtiu seu story.`,
        type: 'story_like',
        data: { story_id: storyId, actor_id: actorId }
      }
    });
  } catch (error) {
    console.error('Error sending story like notification:', error);
  }
};

export const notifyMessageRecipient = async (recipientId: string, actorId: string, content: string, conversationId: string) => {
  if (actorId === recipientId) return;

  try {
    const { data: actor } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', actorId)
      .single();

    await supabase.functions.invoke('send-notification', {
      body: {
        userId: recipientId,
        title: actor?.username || 'Nova mensagem',
        message: content,
        type: 'new_message',
        data: { conversation_id: conversationId, actor_id: actorId }
      }
    });
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
};

export const notifyEventLike = async (eventId: string, actorId: string, recipientId: string, eventTitle: string) => {
  if (actorId === recipientId) return;

  try {
    const { data: actor } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', actorId)
      .single();

    await supabase.functions.invoke('send-notification', {
      body: {
        userId: recipientId,
        title: 'Interesse no seu evento! ⭐',
        message: `${actor?.username || 'Alguém'} curtiu seu evento "${eventTitle}".`,
        type: 'event_like',
        data: { event_id: eventId, actor_id: actorId }
      }
    });
  } catch (error) {
    console.error('Error sending event like notification:', error);
  }
};

export const notifyNewFollower = async (followerId: string, followingId: string) => {
  try {
    const { data: actor } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', followerId)
      .single();

    await supabase.functions.invoke('send-notification', {
      body: {
        userId: followingId,
        title: 'Novo seguidor! 👤',
        message: `${actor?.username || 'Alguém'} começou a seguir você.`,
        type: 'follow',
        data: { follower_id: followerId }
      }
    });
  } catch (error) {
    console.error('Error sending follow notification:', error);
  }
};
