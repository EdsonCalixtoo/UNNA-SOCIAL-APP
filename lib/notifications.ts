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

export const notifyMessageRecipient = async (recipientId: string, actorId: string, content: string, conversationId: string, messageId?: string) => {
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
        message: formatNotificationMessage(content),
        type: 'new_message',
        data: { conversation_id: conversationId, actor_id: actorId, message_id: messageId }
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
      .select('username, avatar_url')
      .eq('id', actorId)
      .single();

    await supabase.functions.invoke('send-notification', {
      body: {
        userId: recipientId,
        title: 'Interesse no seu evento! ⭐',
        message: `${actor?.username || 'Alguém'} curtiu seu evento "${eventTitle}".`,
        type: 'event_like',
        data: { event_id: eventId, actor_id: actorId },
        imageUrl: actor?.avatar_url // Adiciona a foto de quem curtiu
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
      .select('username, avatar_url')
      .eq('id', followerId)
      .single();

    await supabase.functions.invoke('send-notification', {
      body: {
        userId: followingId,
        title: 'Novo seguidor! 👤',
        message: `${actor?.username || 'Alguém'} começou a seguir você.`,
        type: 'follow',
        data: { follower_id: followerId },
        imageUrl: actor?.avatar_url
      }
    });
  } catch (error) {
    console.error('Error sending follow notification:', error);
  }
};

export const notifyEventPresence = async (eventId: string, eventTitle: string, actorId: string, creatorId: string) => {
  try {
    const { data: actor } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', actorId)
      .single();

    // Tenta buscar os templates no banco (pode não existir ainda)
    const { data: templates } = await supabase
      .from('notification_templates')
      .select('*')
      .in('id', ['event_presence', 'event_friend_presence']);

    const getTemplate = (id: string, defaultTitle: string, defaultBody: string) => {
      const t = templates?.find((t: any) => t.id === id);
      if (!t) return { title: defaultTitle, body: defaultBody };
      return { title: t.title_template, body: t.body_template };
    };

    const replaceVars = (text: string, vars: Record<string, string>) => {
      let result = text;
      for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
      }
      return result;
    };

    const ownerVars = {
      ATOR: actor?.username || 'Alguém',
      EVENTO: eventTitle
    };

    // 1. Notificar o dono do evento
    if (actorId !== creatorId) {
      const tOwner = getTemplate('event_presence', 'Nova presença confirmada! 🎉', '[ATOR] confirmou presença no seu evento "[EVENTO]".');
      
      await supabase.functions.invoke('send-notification', {
        body: {
          userId: creatorId,
          title: replaceVars(tOwner.title, ownerVars),
          message: replaceVars(tOwner.body, ownerVars),
          type: 'event_presence',
          data: { event_id: eventId, actor_id: actorId },
          imageUrl: actor?.avatar_url
        }
      });
    }

    // 2. Notificar os seguidores do usuário (Efeito FOMO)
    const { data: followers } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', actorId);

    if (followers && followers.length > 0) {
      const friendVars = { ATOR: actor?.username || 'Um amigo', EVENTO: eventTitle };
      const tFriend = getTemplate('event_friend_presence', 'Seu amigo vai em um evento!', '[ATOR] marcou presença em "[EVENTO]". Que tal ir junto?');

      const BATCH_SIZE = 50;
      for (let i = 0; i < followers.length; i += BATCH_SIZE) {
        const batch = followers.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(follower => {
          return supabase.functions.invoke('send-notification', {
            body: {
              userId: follower.follower_id,
              title: replaceVars(tFriend.title, friendVars),
              message: replaceVars(tFriend.body, friendVars),
              type: 'event_friend_presence',
              data: { event_id: eventId, actor_id: actorId },
              imageUrl: actor?.avatar_url
            }
          }).catch(err => console.error('Error notifying follower:', err));
        }));
      }
    }
  } catch (error) {
    console.error('Error sending event presence notification:', error);
  }
};
