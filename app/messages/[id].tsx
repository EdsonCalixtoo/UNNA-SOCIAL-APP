import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Check, CheckCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { notifyMessageRecipient } from '@/lib/notifications';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  read_at?: string;
}

interface OtherUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: conversationId, userId } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadOtherUser();
    loadMessages();

    if (!conversationId) return;

    console.log('Setting up subscription for conversation:', conversationId);

    const channel = supabase
      .channel(`conversation:${conversationId}`, {
        config: {
          broadcast: { ack: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          try {
            console.log('[Realtime] New message payload:', payload);
            const newMsg = payload.new as Message | null;
            if (!newMsg) {
              console.warn('[Realtime] payload.new is empty, skipping');
              return;
            }

            setMessages((prev) => {
              // Evitar duplicatas
              if (prev.some((m) => m.id === newMsg.id)) {
                console.log('[Realtime] Message already exists, skipping duplicate', newMsg.id);
                return prev;
              }

              // Inserir e garantir ordenação por created_at
              const merged = [...prev, newMsg];
              merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              return merged;
            });

            scrollToBottom();
          } catch (err) {
            console.error('[Realtime] Error handling payload:', err);
          }
        }
      );

    // Subscribir e logar o estado para diagnóstico
    channel.subscribe((status, err) => {
      try {
        // state pode não existir no typing, acessar dinamicamente para debugging
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const state = channel.state ?? 'unknown';
        console.log('[Realtime] Conversation channel status:', status, 'state:', state);
        if (err) {
          console.error('[Realtime] Subscription error:', err);
        }
      } catch (subscribeErr) {
        console.error('[Realtime] subscribe callback error:', subscribeErr);
      }
    });

    return () => {
      console.log('Unsubscribing from conversation:', conversationId);
      try {
        channel.unsubscribe();
      } catch (err) {
        console.warn('Error while unsubscribing channel:', err);
      }
    };
  }, [conversationId]);

  // Monitor online status do outro usuário
  useEffect(() => {
    if (!userId) return;

    const presenceChannel = supabase.channel(`presence:${userId}`);
    
    presenceChannel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_presence',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const presenceData = payload.new as any;
      setIsOtherUserOnline(presenceData?.is_online ?? false);
    }).subscribe();

    // Carregar status inicial
    loadUserPresence();

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [userId]);

  // Monitor typing indicator
  useEffect(() => {
    if (!conversationId) return;

    const typingChannel = supabase.channel(`typing:${conversationId}`);
    
    typingChannel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'typing_indicators',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => {
      const typingData = payload.new as any;
      if (payload.eventType === 'INSERT' && typingData?.user_id !== user?.id) {
        setIsTyping(true);
      } else if (payload.eventType === 'DELETE') {
        setIsTyping(false);
      }
    }).subscribe();

    return () => {
      typingChannel.unsubscribe();
    };
  }, [conversationId, user?.id]);

  const loadUserPresence = async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .from('user_presence')
        .select('is_online')
        .eq('user_id', userId)
        .single();

      setIsOtherUserOnline(data?.is_online ?? false);
    } catch (error) {
      console.error('Error loading user presence:', error);
    }
  };

  // Atualizar presença do usuário quando chegar/sair da tela
  useEffect(() => {
    updateUserPresence(true);

    return () => {
      updateUserPresence(false);
    };
  }, [user?.id]);

  const updateUserPresence = async (isOnline: boolean) => {
    if (!user) return;

    try {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  // Atualizar read_at quando mensagens forem lidas
  useEffect(() => {
    markMessagesAsRead();
  }, [messages, user?.id, conversationId]);

  const markMessagesAsRead = async () => {
    if (!conversationId || !user) return;

    try {
      const unreadMessages = messages.filter(m => !m.read && m.sender_id !== user.id);
      
      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({
            read: true,
            read_at: new Date().toISOString(),
          })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .eq('read', false);

        // Atualizar estado local
        setMessages(prev => prev.map(m => 
          m.sender_id !== user.id ? { ...m, read: true, read_at: new Date().toISOString() } : m
        ));
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const loadOtherUser = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setOtherUser(data);
    } catch (error) {
      console.error('Error loading other user:', error);
    }
  };

  const loadMessages = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user?.id);

      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !user || !conversationId || sending) return;

    setSending(true);
    const content = messageText.trim();
    setMessageText('');

    // Remover indicador de digitação
    await removeTypingIndicator();

    try {
      const { data: insertedData, error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content,
        read: false,
      }).select().single();

      if (error) throw error;

      // Adicionar a mensagem ao estado localmente para aparecer imediatamente
      if (insertedData) {
        setMessages((prev) => [...prev, insertedData as Message]);
      }

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Notificar o destinatário sobre a nova mensagem
      if (otherUser && userId) {
        const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content;
        await notifyMessageRecipient(
          userId as string,
          user.id,
          messagePreview,
          conversationId as string
        );
      }

      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(content);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = async (text: string) => {
    if (!user || !conversationId) return;

    // Limpar timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Se começou a digitar, adicionar indicador
    if (text.length > 0) {
      try {
        await supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: user.id,
          }, {
            onConflict: 'conversation_id,user_id'
          });
      } catch (error) {
        console.error('Error adding typing indicator:', error);
      }
    }

    // Remover indicador após 3 segundos sem digitação
    typingTimeoutRef.current = setTimeout(async () => {
      await removeTypingIndicator();
    }, 3000);
  };

  const removeTypingIndicator = async () => {
    if (!user || !conversationId) return;

    try {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error removing typing indicator:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    }
  };

  const shouldShowDateDivider = (currentMessage: Message, previousMessage: Message | null) => {
    if (!previousMessage) return true;

    const currentDate = new Date(currentMessage.created_at).toDateString();
    const previousDate = new Date(previousMessage.created_at).toDateString();

    return currentDate !== previousDate;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={['#00d9ff', '#ff1493']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>

          {otherUser && (
            <View style={styles.userInfo}>
              {otherUser.avatar_url ? (
                <Image source={{ uri: otherUser.avatar_url }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                  <Text style={styles.headerAvatarText}>
                    {otherUser.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.userInfoText}>
                <Text style={styles.headerUserName}>{otherUser.full_name}</Text>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusDot, isOtherUserOnline && styles.statusDotOnline]} />
                  <Text style={styles.headerUsername}>
                    {isTyping ? '✍️ digitando...' : isOtherUserOnline ? 'online' : 'offline'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00d9ff" />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map((message, index) => {
            const isMyMessage = message.sender_id === user?.id;
            const previousMessage = index > 0 ? messages[index - 1] : null;
            const showDateDivider = shouldShowDateDivider(message, previousMessage);

            return (
              <View key={message.id}>
                {showDateDivider && (
                  <View style={styles.dateDivider}>
                    <Text style={styles.dateDividerText}>{formatDate(message.created_at)}</Text>
                  </View>
                )}

                <View
                  style={[
                    styles.messageWrapper,
                    isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isMyMessage ? styles.myMessageText : styles.otherMessageText,
                      ]}
                    >
                      {message.content}
                    </Text>
                    <View style={styles.messageFooter}>
                      <Text
                        style={[
                          styles.messageTime,
                          isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
                        ]}
                      >
                        {formatTime(message.created_at)}
                      </Text>
                      {isMyMessage && (
                        <View style={styles.readStatus}>
                          {message.read ? (
                            <CheckCheck size={12} color="rgba(0, 0, 0, 0.6)" />
                          ) : (
                            <Check size={12} color="rgba(0, 0, 0, 0.6)" />
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
          
          {isTyping && (
            <View style={[styles.messageWrapper, styles.otherMessageWrapper]}>
              <View style={[styles.messageBubble, styles.otherMessageBubble]}>
                <Text style={[styles.messageText, styles.otherMessageText]}>
                  ✍️ digitando...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Digite uma mensagem..."
            placeholderTextColor="#8E8E93"
            value={messageText}
            onChangeText={(text) => {
              setMessageText(text);
              handleTyping(text);
            }}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  headerUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  headerUsername: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 80,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateDividerText: {
    fontSize: 12,
    color: '#8E8E93',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
  },
  messageWrapper: {
    marginBottom: 8,
    maxWidth: '80%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: '#00d9ff',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  myMessageText: {
    color: '#000',
  },
  otherMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  myMessageTime: {
    color: 'rgba(0, 0, 0, 0.6)',
  },
  otherMessageTime: {
    color: '#8E8E93',
  },
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingBottom: 0,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  userInfoText: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8E8E93',
  },
  statusDotOnline: {
    backgroundColor: '#34C759',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  readStatus: {
    marginLeft: 4,
  },
});
