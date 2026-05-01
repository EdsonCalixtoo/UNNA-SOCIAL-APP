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
  Alert,
  Pressable,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Check, CheckCheck, Mic, Play, Pause, Paperclip, Image as ImageIcon, Video as VideoIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { notifyMessageRecipient } from '@/lib/notifications';
import { Audio, Video, ResizeMode } from 'expo-av';
import { uploadFile } from '@/lib/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import Slider from '@react-native-community/slider';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  read_at?: string;
  sender?: {
    full_name: string;
    username: string;
  };
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
  const [conversation, setConversation] = useState<{ id?: string, name?: string, is_group?: boolean, avatar_url?: string } | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulseAnim = useSharedValue(1);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));

  useEffect(() => {
    if (isRecording) {
      pulseAnim.value = withRepeat(
        withSequence(withTiming(0.4, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        true
      );
    } else {
      pulseAnim.value = 1;
    }
  }, [isRecording]);

  useEffect(() => {
    loadOtherUser();
    loadMessages();

    const currentId = activeConversationId || conversationId as string;
    if (!currentId) return;

    // Verificar se o ID é um UUID válido (formato básico) para evitar erro no filtro do realtime
    // IDs de usuário e IDs de conversa costumam ser UUIDs, mas se currentId for algo como "new"
    // ou um username, o filtro de igualdade pode falhar ou causar erro.
    
    console.log('Setting up subscription for conversation:', currentId);

    const channel = supabase
      .channel(`conversation:${currentId}`, {
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
          filter: `conversation_id=eq.${currentId}`,
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
        supabase.removeChannel(channel);
      } catch (err) {
        console.warn('Error while removing channel:', err);
      }
    };
  }, [conversationId, activeConversationId]);

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
      supabase.removeChannel(presenceChannel);
    };
  }, [userId]);

  // Monitor typing indicator
  useEffect(() => {
    const currentId = activeConversationId || conversationId as string;
    if (!currentId) return;

    const typingChannel = supabase.channel(`typing:${currentId}`);
    
    typingChannel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'typing_indicators',
      filter: `conversation_id=eq.${currentId}`,
    }, (payload) => {
      const typingData = payload.new as any;
      if (payload.eventType === 'INSERT' && typingData?.user_id !== user?.id) {
        setIsTyping(true);
      } else if (payload.eventType === 'DELETE') {
        setIsTyping(false);
      }
    }).subscribe();

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [conversationId, activeConversationId, user?.id]);

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
  }, [messages, user?.id, conversationId, activeConversationId]);

  const markMessagesAsRead = async () => {
    if (!conversationId || !user) return;

    try {
      const currentId = activeConversationId;
      if (!currentId) return;

      const unreadMessages = messages.filter(m => !m.read && m.sender_id !== user.id);
      
      if (unreadMessages.length > 0) {
        await supabase
          .from('messages')
          .update({
            read: true,
            read_at: new Date().toISOString(),
          })
          .eq('conversation_id', currentId)
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
    if (!userId && !conversationId) return;

    try {
      let currentConvId = conversationId as string;
      
      // Tentar carregar detalhes da conversa
      const { data: convData } = await supabase
        .from('conversations')
        .select('id, name, is_group, avatar_url')
        .eq('id', conversationId)
        .maybeSingle();
      
      if (convData) {
        setConversation(convData);
        setActiveConversationId(convData.id);
      } else if (userId) {
        // Se não achou conversa pelo ID, mas temos userId, talvez o id seja o userId
        // Procurar conversa 1:1 comum
        const { data: myConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user?.id);
        
        const myConvIds = myConvs?.map(c => c.conversation_id) || [];

        const { data: targetConv } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId)
          .in('conversation_id', myConvIds)
          .maybeSingle();

        if (targetConv) {
          setActiveConversationId(targetConv.conversation_id);
          // Carregar detalhes dessa conversa real
          const { data: realConv } = await supabase
            .from('conversations')
            .select('id, name, is_group, avatar_url')
            .eq('id', targetConv.conversation_id)
            .single();
          setConversation(realConv);
        } else {
          // Nenhuma conversa existe, vamos criar quando enviar a primeira mensagem
          setActiveConversationId(null);
        }
      }

      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setOtherUser(data);
      }
    } catch (error) {
      console.error('Error loading other user/conversation:', error);
    }
  };

  const loadMessages = async () => {
    let currentId = activeConversationId || conversationId as string;
    if (!currentId) return;

    try {
      // Verificar se o ID é uma conversa válida antes de carregar
      const { data: checkConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', currentId)
        .maybeSingle();
      
      if (!checkConv) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(full_name, username)
        `)
        .eq('conversation_id', currentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', currentId)
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
    if (!messageText.trim() || !user || sending) return;

    setSending(true);
    const content = messageText.trim();
    setMessageText('');

    console.log('[SendMessage] Starting... Text:', content.substring(0, 20));
    console.log('[SendMessage] Route conversationId:', conversationId);
    console.log('[SendMessage] State activeConversationId:', activeConversationId);
    console.log('[SendMessage] userId (recipient):', userId);

    try {
      let currentConvId = activeConversationId;

      // Se não temos um ID de conversa ativo, precisamos criar a conversa agora
      if (!currentConvId && userId) {
        console.log('[SendMessage] No active conversation, creating new 1:1 chat with:', userId);
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({ is_group: false })
          .select()
          .single();

        if (convError) {
          console.error('[SendMessage] Error creating conversation:', convError);
          throw convError;
        }
        
        currentConvId = newConv.id;
        console.log('[SendMessage] New conversation created:', currentConvId);
        setActiveConversationId(currentConvId);

        // Adicionar participantes
        const { error: partError } = await supabase.from('conversation_participants').insert([
          { conversation_id: currentConvId, user_id: user.id },
          { conversation_id: currentConvId, user_id: userId }
        ]);

        if (partError) {
          console.error('[SendMessage] Error adding participants:', partError);
          throw partError;
        }
      }

      if (!currentConvId) {
        console.error('[SendMessage] Failed to determine currentConvId');
        throw new Error(`No conversation ID available (Active: ${activeConversationId}, Route: ${conversationId}, User: ${userId})`);
      }

      console.log('[SendMessage] Inserting message into conversation:', currentConvId);

      // Remover indicador de digitação
      await removeTypingIndicator();

      const { data: insertedData, error } = await supabase.from('messages').insert({
        conversation_id: currentConvId,
        sender_id: user.id,
        content: content,
        read: false,
      }).select().single();

      if (error) {
        console.error('[SendMessage] Database error while inserting message:', error);
        throw error;
      }

      // Adicionar a mensagem ao estado localmente para aparecer imediatamente
      if (insertedData) {
        setMessages((prev) => [...prev, insertedData as Message]);
      }

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConvId);

      // Notificar o destinatário sobre a nova mensagem
      if (otherUser && userId) {
        const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content;
        await notifyMessageRecipient(
          userId as string,
          user.id,
          messagePreview,
          currentConvId
        );
      }

      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(content);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = async (text: string) => {
    const currentId = activeConversationId || conversationId as string;
    if (!user || !currentId) return;

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
            conversation_id: currentId,
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
    const currentId = activeConversationId || conversationId as string;
    if (!user || !currentId) return;

    try {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', currentId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error removing typing indicator:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const sendMediaMessage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.7,
        allowsEditing: true,
      });

      if (result.canceled) return;

      setSending(true);
      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'video' : 'image';
      const fileExt = type === 'video' ? 'mp4' : 'jpg';
      const fileName = `${user?.id}/media/${Date.now()}.${fileExt}`;
      
      const publicUrl = await uploadFile(
        asset.uri,
        `${user?.id}/media/${Date.now()}.${fileExt}`,
        type === 'video' ? 'video/mp4' : 'image/jpeg'
      );

      if (!publicUrl) throw new Error('Upload failed');

      const content = JSON.stringify({ 
        type, 
        url: publicUrl,
        aspectRatio: asset.width / asset.height 
      });

      let currentConvId = activeConversationId;
      if (!currentConvId && userId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({ is_group: false })
          .select()
          .single();

        if (convError) throw convError;
        currentConvId = newConv.id;
        setActiveConversationId(currentConvId);

        await supabase.from('conversation_participants').insert([
          { conversation_id: currentConvId, user_id: user?.id },
          { conversation_id: currentConvId, user_id: userId }
        ]);
      }

      if (!currentConvId) throw new Error('No conversation ID available');

      const { data: insertedData, error } = await supabase.from('messages').insert({
        conversation_id: currentConvId,
        sender_id: user?.id,
        content: content,
        read: false,
      }).select().single();

      if (error) throw error;
      if (insertedData) setMessages(prev => [...prev, insertedData as Message]);
      scrollToBottom();
    } catch (err) {
      console.error('Error sending media:', err);
      Alert.alert('Erro', 'Não foi possível enviar o arquivo.');
    } finally {
      setSending(false);
    }
  };

  const startAudioRecording = async () => {
    try {
      // Limpeza de segurança: se houver algo gravando ou pendente, para e limpa
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) {
          // ignora erro se já estiver parado
        }
        recordingRef.current = null;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopAudioRecording = async () => {
    if (!recordingRef.current) return;

    try {
      if (timerRef.current) clearInterval(timerRef.current);
      
      const status = await recordingRef.current.getStatusAsync();
      if (status.canRecord) {
        await recordingRef.current.stopAndUnloadAsync();
      }
      
      const uri = recordingRef.current.getURI();
      const duration = recordingDuration;
      
      recordingRef.current = null;
      setIsRecording(false);
      setRecordingDuration(0);

      // Se a gravação for muito curta (menos de 1 segundo), cancelamos para evitar erro
      if (duration < 1) {
        console.log('Gravação muito curta, descartando...');
        return;
      }

      if (uri) {
        await uploadAndSendAudio(uri, duration);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Erro', 'Não foi possível finalizar a gravação');
    }
  };

  const uploadAndSendAudio = async (uri: string, duration: number) => {
    if (!user || (!conversationId && !activeConversationId && !userId)) return;
    setSending(true);

    try {
      const fileName = `${user.id}/audios/${Date.now()}.m4a`;
      
      const publicUrl = await uploadFile(uri, fileName, 'audio/m4a');

      if (!publicUrl) {
        throw new Error('Upload failed');
      }

      const content = JSON.stringify({ type: 'audio', url: publicUrl, duration });
      
      let currentConvId = activeConversationId;
      if (!currentConvId && userId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({ is_group: false })
          .select()
          .single();

        if (convError) throw convError;
        currentConvId = newConv.id;
        setActiveConversationId(currentConvId);

        await supabase.from('conversation_participants').insert([
          { conversation_id: currentConvId, user_id: user?.id },
          { conversation_id: currentConvId, user_id: userId }
        ]);
      }

      if (!currentConvId) throw new Error('No conversation ID available');

      const { data: insertedData, error } = await supabase.from('messages').insert({
        conversation_id: currentConvId,
        sender_id: user.id,
        content: content,
        read: false,
      }).select().single();

      if (error) {
        console.error('Database error:', error);
        Alert.alert('Erro no Banco', 'Áudio enviado, mas falhou ao salvar a mensagem.');
        throw error;
      }
      
      if (insertedData) setMessages(prev => [...prev, insertedData as Message]);
      scrollToBottom();
    } catch (err) {
      console.error('Error uploading/sending audio:', err);
      Alert.alert('Erro Geral', 'Ocorreu um problema ao processar seu áudio.');
    } finally {
      setSending(false);
    }
  };

  const playAudio = async (url: string, id: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        if (playingAudioId === id) {
          setPlayingAudioId(null);
          return;
        }
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, rate: audioSpeed, shouldCorrectPitch: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) setPlayingAudioId(null);
        }
      );
      soundRef.current = sound;
      setPlayingAudioId(id);
    } catch (err) {
      console.error('Error playing audio', err);
    }
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

          {(conversation || otherUser) && (
            <View style={styles.userInfo}>
              {(conversation?.avatar_url || otherUser?.avatar_url) ? (
                <Image source={{ uri: conversation?.avatar_url || otherUser?.avatar_url }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
                  <Text style={styles.headerAvatarText}>
                    {(conversation?.name || otherUser?.full_name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.userInfoText}>
                <Text style={styles.headerUserName}>
                  {conversation?.is_group ? conversation.name : otherUser?.full_name}
                </Text>
                <View style={styles.statusContainer}>
                  {!conversation?.is_group && (
                    <>
                      <View style={[styles.statusDot, isOtherUserOnline && styles.statusDotOnline]} />
                      <Text style={styles.headerUsername}>
                        {isTyping ? '✍️ digitando...' : isOtherUserOnline ? 'online' : 'offline'}
                      </Text>
                    </>
                  )}
                  {conversation?.is_group && (
                    <Text style={styles.headerUsername}>Grupo</Text>
                  )}
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
                  {conversation?.is_group && !isMyMessage && (
                    <Text style={styles.senderName}>{message.sender?.full_name || 'Usuário'}</Text>
                  )}
                    <Text
                      style={[
                        styles.messageText,
                        isMyMessage ? styles.myMessageText : styles.otherMessageText,
                      ]}
                    >
                      {(() => {
                        try {
                          const parsed = JSON.parse(message.content);
                          if (parsed.type === 'event_card') {
                            return (
                              <TouchableOpacity 
                                style={styles.eventCardMessage}
                                onPress={() => router.push(`/event/${parsed.event_id}`)}
                              >
                                {parsed.image ? (
                                  <Image source={{ uri: parsed.image }} style={styles.eventCardImage} />
                                ) : (
                                  <View style={styles.eventCardPlaceholder}>
                                    <Text style={styles.eventCardPlaceholderText}>UNИA</Text>
                                  </View>
                                )}
                                <View style={styles.eventCardInfo}>
                                  <Text style={styles.eventCardTitle} numberOfLines={1}>{parsed.title}</Text>
                                  <Text style={styles.eventCardDate}>{new Date(parsed.date).toLocaleDateString('pt-BR')}</Text>
                                  <View style={styles.viewEventBtn}>
                                    <Text style={styles.viewEventBtnText}>Ver Evento</Text>
                                  </View>
                                </View>
                              </TouchableOpacity>
                            );
                          }
                          if (parsed.type === 'image') {
                            return (
                              <TouchableOpacity onPress={() => {/* Abrir imagem em tela cheia */}}>
                                <Image 
                                  source={{ uri: parsed.url }} 
                                  style={[styles.mediaImage, { aspectRatio: parsed.aspectRatio || 1 }]} 
                                />
                              </TouchableOpacity>
                            );
                          }
                          if (parsed.type === 'video') {
                            return (
                              <View style={styles.mediaVideoContainer}>
                                <Video
                                  source={{ uri: parsed.url }}
                                  style={[styles.mediaVideo, { aspectRatio: parsed.aspectRatio || 1 }]}
                                  useNativeControls
                                  resizeMode={ResizeMode.CONTAIN}
                                  isLooping
                                />
                              </View>
                            );
                          }
                          if (parsed.type === 'audio') {
                            const isPlaying = playingAudioId === message.id;
                            return (
                              <View style={styles.audioContainer}>
                                <TouchableOpacity onPress={() => playAudio(parsed.url, message.id)}>
                                  {isPlaying ? (
                                    <Pause size={24} color={isMyMessage ? '#000' : '#00d9ff'} fill={isMyMessage ? '#000' : '#00d9ff'} />
                                  ) : (
                                    <Play size={24} color={isMyMessage ? '#000' : '#00d9ff'} fill={isMyMessage ? '#000' : '#00d9ff'} />
                                  )}
                                </TouchableOpacity>
                                <View style={styles.audioProgress}>
                                  <Slider
                                    style={{ width: 120, height: 20 }}
                                    minimumValue={0}
                                    maximumValue={parsed.duration}
                                    value={0}
                                    disabled
                                    minimumTrackTintColor={isMyMessage ? '#000' : '#00d9ff'}
                                    thumbTintColor={isMyMessage ? '#000' : '#00d9ff'}
                                  />
                                  <Text style={[styles.audioDuration, isMyMessage && { color: 'rgba(0,0,0,0.6)' }]}>
                                    {parsed.duration}s
                                  </Text>
                                </View>
                                {isPlaying && (
                                  <TouchableOpacity onPress={() => setAudioSpeed(audioSpeed === 2 ? 1 : audioSpeed + 0.5)}>
                                    <Text style={[styles.speedText, isMyMessage && { color: '#000' }]}>{audioSpeed}x</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            );
                          }
                        } catch (e) {
                          return message.content;
                        }
                        return message.content;
                      })()}
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
          <TouchableOpacity 
            style={styles.attachButton} 
            onPress={sendMediaMessage}
            disabled={sending || isRecording}
          >
            <Paperclip size={22} color="#00d9ff" />
          </TouchableOpacity>

          {isRecording ? (
            <View style={styles.recordingOverlay}>
              <Animated.View style={[styles.recordingDot, pulseStyle]} />
              <Text style={styles.recordingText}>Gravando... {recordingDuration}s</Text>
              <Text style={styles.cancelHint}>Solte para enviar</Text>
            </View>
          ) : (
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
          )}

          {messageText.trim().length > 0 ? (
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={20} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                (isRecording || pressed) && styles.recordingButton,
                sending && styles.sendButtonDisabled
              ]}
              onPressIn={startAudioRecording}
              onPressOut={stopAudioRecording}
              disabled={sending}
            >
              <Mic size={20} color="#fff" />
            </Pressable>
          )}
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
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 180,
    paddingVertical: 4,
  },
  audioProgress: {
    flex: 1,
    justifyContent: 'center',
  },
  audioDuration: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: -4,
    marginLeft: 10,
  },
  speedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00d9ff',
  },
  recordingOverlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff3b30',
  },
  recordingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  cancelHint: {
    color: '#8E8E93',
    fontSize: 12,
  },
  recordingButton: {
    backgroundColor: '#ff3b30',
  },
  attachButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: 240,
    maxWidth: '100%',
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  mediaVideoContainer: {
    width: 240,
    maxWidth: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  mediaVideo: {
    width: '100%',
  },
  senderName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00d9ff',
    marginBottom: 4,
  },
  eventCardMessage: {
    width: 220,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  eventCardImage: {
    width: '100%',
    height: 100,
  },
  eventCardPlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCardPlaceholderText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  eventCardInfo: {
    padding: 10,
  },
  eventCardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  eventCardDate: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 8,
  },
  viewEventBtn: {
    backgroundColor: '#00d9ff',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewEventBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
