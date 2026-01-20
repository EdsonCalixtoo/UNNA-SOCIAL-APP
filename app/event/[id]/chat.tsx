import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Paperclip, Mic } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { notifyMessageRecipient } from '@/lib/notifications';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

export default function EventChat() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [recordingUsers, setRecordingUsers] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);
  const isClearing = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    initializeChat();
  }, [id]);

  useEffect(() => {
    if (!conversationId) return;

    // Monitorar indicadores de digitação e gravação
    const loadIndicators = async () => {
      try {
        const { data } = await supabase
          .from('typing_indicators')
          .select('user_id, status')
          .eq('conversation_id', conversationId)
          .neq('status', 'idle');

        if (data) {
          // Criar sets novos do zero (não reutilizar)
          const typing = new Set<string>();
          const recording = new Set<string>();

          // Agrupar por user_id e pegar o status mais recente
          const statusMap = new Map<string, string>();
          
          data.forEach(ind => {
            statusMap.set(ind.user_id, ind.status);
          });

          // Popular os sets com base no mapa
          statusMap.forEach((status, userId) => {
            if (status === 'typing') {
              typing.add(userId);
            } else if (status === 'recording') {
              recording.add(userId);
            }
          });

          setTypingUsers(typing);
          setRecordingUsers(recording);
        }
      } catch (error) {
        console.error('Erro ao carregar indicadores:', error);
      }
    };

    // Carregar indicadores a cada 500ms
    const interval = setInterval(loadIndicators, 500);
    loadIndicators(); // Carregar imediatamente

    // Listener em tempo real para novas mensagens
    const channel = supabase
      .channel(`event-chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: any) => {
          // Carregar a mensagem completa com perfil do usuário
          const { data: newMsg } = await supabase
            .from('messages')
            .select(`
              *,
              profiles:sender_id (
                username,
                full_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMsg) {
            // Verificar se a mensagem já existe para evitar duplicatas
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMsg.id);
              if (exists) return prev; // Não adicionar se já existe
              return [...prev, newMsg];
            });
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          // Remover a mensagem deletada
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Animar pulso para gravação
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isRecording]);

  const initializeChat = async () => {
    try {
      const eventId = Array.isArray(id) ? id[0] : id;

      let { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('event_id', eventId)
        .maybeSingle();

      let conversationIdToUse: string;

      if (!existingConv) {
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({ event_id: eventId })
          .select()
          .single();

        if (createError) throw createError;
        conversationIdToUse = newConv.id;
      } else {
        conversationIdToUse = existingConv.id;
      }

      // Adicionar o usuário como participante ANTES de qualquer outra operação
      if (user) {
        const { error: participantError } = await supabase
          .from('conversation_participants')
          .upsert({
            conversation_id: conversationIdToUse,
            user_id: user.id
          }, {
            onConflict: 'conversation_id,user_id'
          });

        if (participantError) {
          console.error('Error adding participant:', participantError);
        }
      }

      // Atualizar o state com o ID da conversa
      setConversationId(conversationIdToUse);
      
      // Carregar as mensagens usando o ID que foi determinado
      await loadMessagesForConversation(conversationIdToUse);
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessagesForConversation = async (convId: string, isAfterDelete: boolean = false) => {
    try {
      // Não recarrega mensagens se estamos no processo de limpeza
      // EXCETO se for após um delete para confirmar que foi limpo
      if (isClearing.current && !isAfterDelete) {
        return;
      }
      
      const { data, error, status } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:sender_id (username, full_name, avatar_url)
        `)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Erro ao carregar:', error);
        throw error;
      }
      
      setMessages(data || []);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!user || !conversationId) return;
    
    try {
      const status = isTyping ? 'typing' : 'idle';
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          status: status,
        }, {
          onConflict: 'conversation_id,user_id'
        });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const updateRecordingStatus = async (isRecording: boolean) => {
    if (!user || !conversationId) return;
    
    try {
      const status = isRecording ? 'recording' : 'idle';
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          status: status,
        }, {
          onConflict: 'conversation_id,user_id'
        });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const loadMessages = async () => {
    try {
      if (!conversationId) return;

      // Não recarrega mensagens se estamos no processo de limpeza
      if (isClearing.current) {
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles:sender_id (username, full_name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages(data || []);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !conversationId) {
      console.log('❌ Validação falhou:', { 
        hasMessage: !!newMessage.trim(), 
        hasUser: !!user, 
        hasConversationId: !!conversationId 
      });
      return;
    }

    try {
      const messageContent = newMessage.trim();
      const eventId = Array.isArray(id) ? id[0] : id;

      console.log('📤 Enviando mensagem:', { 
        conversationId, 
        userId: user.id, 
        content: messageContent.substring(0, 30)
      });

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: messageContent,
        });

      if (error) {
        const errorMessage = `Erro ao enviar: ${error.message || error.code}`;
        console.error('❌ Erro do Supabase ao inserir:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        Alert.alert('❌ Erro', errorMessage);
        throw error;
      }

      console.log('✅ Mensagem inserida com sucesso');
      setNewMessage('');
      await updateTypingStatus(false);
      await loadMessages();

      // Notificar outros participantes da conversa
      const { data: otherParticipants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);

      if (otherParticipants && otherParticipants.length > 0) {
        for (const participant of otherParticipants) {
          const messagePreview = messageContent.length > 50 
            ? messageContent.substring(0, 50) + '...' 
            : messageContent;
          
          await notifyMessageRecipient(
            participant.user_id,
            user.id,
            messagePreview,
            conversationId,
            eventId
          );
        }
      }
    } catch (error) {
      console.error('❌ Erro geral ao enviar:', error);
      setNewMessage(''); // Ainda limpa o input mesmo com erro
    }
  };

  const playAudio = async (audioUrl: string, messageId: string) => {
    try {
      // Se estava tocando um outro áudio, para ele
      if (soundRef.current && playingAudioId !== messageId) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayingAudioId(null);
      }

      // Se é o áudio que está tocando, pausa
      if (playingAudioId === messageId && soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setPlayingAudioId(null);
            return;
          } else {
            await soundRef.current.playAsync();
            setPlayingAudioId(messageId);
            return;
          }
        }
      }

      // Criar e tocar novo som
      const sound = new Audio.Sound();
      await sound.loadAsync({ uri: audioUrl });
      
      // Aplicar velocidade
      await sound.setRateAsync(audioSpeed, true);
      
      soundRef.current = sound;
      setPlayingAudioId(messageId);

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          setPlayingAudioId(null);
        }
      });

      await sound.playAsync();
    } catch (error) {
      Alert.alert('❌ Erro', 'Erro ao reproduzir áudio');
      console.error(error);
    }
  };

  const changeAudioSpeed = async (speed: number) => {
    setAudioSpeed(speed);
    if (soundRef.current) {
      try {
        await soundRef.current.setRateAsync(speed, true);
      } catch (error) {
        console.error('Erro ao mudar velocidade:', error);
      }
    }
  };

  const uploadMediaToSupabase = async (uri: string, type: 'image' | 'audio'): Promise<string | null> => {
    try {
      const fileExt = type === 'image' ? 'jpg' : 'm4a';
      const fileName = `${user?.id}/${type}s/${Date.now()}.${fileExt}`;
      
      const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
      
      const { data, error } = await supabase.storage
        .from('media')
        .upload(fileName, decode(base64), {
          contentType: type === 'image' ? 'image/jpeg' : 'audio/mp4',
          upsert: true,
        });

      if (error) {
        console.error(`❌ Erro ao fazer upload de ${type}:`, error);
        return null;
      }

      const { data: publicData } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      return publicData.publicUrl;
    } catch (error) {
      console.error(`❌ Erro ao processar ${type}:`, error);
      return null;
    }
  };

  const sendImageMessage = async () => {
    if (!conversationId || !user) return;

    try {
      setSending(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert('❌ Permissão Negada', 'Você precisa permitir acesso à galeria');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (result.canceled) return;

      const imageUri = result.assets[0].uri;
      const publicUrl = await uploadMediaToSupabase(imageUri, 'image');

      if (!publicUrl) {
        Alert.alert('❌ Erro', 'Falha ao enviar imagem');
        return;
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: JSON.stringify({ type: 'image', url: publicUrl }),
        });

      if (error) throw error;

      await loadMessages();
      Alert.alert('✅ Sucesso', 'Imagem enviada!');
    } catch (error) {
      Alert.alert('❌ Erro', 'Erro ao enviar imagem');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const startAudioRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      
      if (!permission.granted) {
        Alert.alert('❌ Permissão Negada', 'Você precisa permitir acesso ao microfone');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);
      await updateRecordingStatus(true);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      Alert.alert('❌ Erro', 'Falha ao iniciar gravação');
      console.error(error);
    }
  };

  const stopAudioRecording = async () => {
    if (!recordingRef.current || !conversationId || !user) return;

    try {
      if (timerRef.current) clearInterval(timerRef.current);
      
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      setRecordingDuration(0);
      await updateRecordingStatus(false);

      if (!uri) return;

      setSending(true);
      const publicUrl = await uploadMediaToSupabase(uri, 'audio');

      if (!publicUrl) {
        Alert.alert('❌ Erro', 'Falha ao enviar áudio');
        return;
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: JSON.stringify({ type: 'audio', url: publicUrl, duration: recordingDuration }),
        });

      if (error) throw error;

      await loadMessages();
    } catch (error) {
      Alert.alert('❌ Erro', 'Erro ao enviar áudio');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const clearLocalChat = () => {
    if (!conversationId) {
      Alert.alert('⚠️ Erro', 'Conversa não foi inicializada. Tente novamente.');
      return;
    }

    Alert.alert(
      '🗑️ Limpar Chat',
      'Isso vai DELETAR TODAS as mensagens do banco de dados permanentemente!',
      [
        {
          text: 'Cancelar',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Deletar Tudo',
          onPress: async () => {
            try {
              isClearing.current = true;
              
              // Deletar do banco
              const deleteResponse = await supabase
                .from('messages')
                .delete()
                .eq('conversation_id', conversationId);

              const { error, count } = deleteResponse;

              if (error) {
                Alert.alert('❌ Erro', `Falha ao deletar: ${error.message}`);
                isClearing.current = false;
                return;
              }

              // Verificar se deletou realmente
              const { count: countAfter, data: remaining } = await supabase
                .from('messages')
                .select('id', { count: 'exact' })
                .eq('conversation_id', conversationId);

              if (countAfter === 0) {
                setMessages([]);
                Alert.alert('✅ Sucesso', `${count || 0} mensagens deletadas permanentemente`);
                
                // Recarregar uma última vez para confirmar
                setTimeout(() => {
                  loadMessagesForConversation(conversationId, true);
                }, 500);
              } else {
                Alert.alert('⚠️ Aviso', `Apenas ${count || 0} mensagens foram deletadas, mas ${countAfter} ainda permanecem`);
              }

              // Aguardar antes de liberar recarregamento
              setTimeout(() => {
                isClearing.current = false;
              }, 1000);

            } catch (error) {
              Alert.alert('❌ Erro', 'Erro inesperado ao deletar mensagens');
              isClearing.current = false;
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleTextChange = async (text: string) => {
    setNewMessage(text);

    if (text.trim().length > 0) {
      await updateTypingStatus(true);

      // Limpar timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Marcar como não digitando após 3 segundos sem digitar
      typingTimeoutRef.current = setTimeout(() => {
        updateTypingStatus(false);
      }, 3000);
    } else {
      await updateTypingStatus(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    
    let messageContent = item.content;
    let mediaContent = null;
    
    try {
      const parsed = JSON.parse(item.content);
      if (parsed.type === 'image') {
        mediaContent = (
          <Image 
            source={{ uri: parsed.url }} 
            style={styles.messageImage}
            resizeMode="cover"
          />
        );
        messageContent = '';
      } else if (parsed.type === 'audio') {
        const isPlaying = playingAudioId === item.id;
        mediaContent = (
          <TouchableOpacity 
            style={[styles.audioContainer, isPlaying && styles.audioContainerPlaying]}
            onPress={() => playAudio(parsed.url, item.id)}
          >
            <Text style={[styles.audioIcon, isOwnMessage && { color: '#000' }]}>
              {isPlaying ? '⏸️' : '▶️'}
            </Text>
            <Text style={[styles.audioText, isOwnMessage && { color: '#000' }]}>
              {isPlaying ? 'Tocando' : 'Áudio'} {parsed.duration}s
            </Text>
          </TouchableOpacity>
        );
        messageContent = '';
      }
    } catch (e) {
      // É texto normal
    }

    return (
      <View style={[styles.messageContainer, isOwnMessage && styles.ownMessageContainer]}>
        {!isOwnMessage && (
          <View style={styles.avatarContainer}>
            {item.profiles?.avatar_url ? (
              <Image
                source={{ uri: item.profiles.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {item.profiles?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
        )}
        <View style={[styles.messageContent, isOwnMessage && styles.ownMessageContent]}>
          {!isOwnMessage && (
            <View style={styles.messageHeader}>
              <Text style={styles.messageSender}>{item.profiles?.full_name || 'Usuário'}</Text>
            </View>
          )}
          <View style={[styles.messageBubble, isOwnMessage && styles.ownMessageBubble]}>
            {mediaContent}
            {messageContent && (
              <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
                {messageContent}
              </Text>
            )}
          </View>
          <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Chat do Evento</Text>
          <Text style={styles.headerSubtitle}>{messages.length} mensagens</Text>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={clearLocalChat}>
          <Text style={styles.clearButtonText}>Limpar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        style={{ flex: 1 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhuma mensagem ainda</Text>
            <Text style={styles.emptySubtext}>Seja o primeiro a enviar uma mensagem!</Text>
          </View>
        }
        ListFooterComponent={
          (typingUsers.size > 0 || recordingUsers.size > 0) ? (
            <View style={styles.indicatorContainer}>
              {Array.from(typingUsers).map(userId => (
                <Text key={`typing-${userId}`} style={styles.indicatorText}>👤 Digitando...</Text>
              ))}
              {Array.from(recordingUsers).map(userId => (
                <Text key={`recording-${userId}`} style={styles.indicatorText}>🎙️ Gravando áudio...</Text>
              ))}
            </View>
          ) : null
        }
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.mediaButton}
          onPress={sendImageMessage}
          disabled={sending || isRecording}
        >
          <Paperclip size={22} color="#00d9ff" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.input}
          placeholder="Digite sua mensagem..."
          placeholderTextColor="#8E8E93"
          value={newMessage}
          onChangeText={handleTextChange}
          multiline
          maxLength={500}
          editable={!isRecording}
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton, 
            (!newMessage.trim() || sending || isRecording) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending || isRecording}
        >
          <Send size={24} color="#fff" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.audioButton, isRecording && styles.audioButtonRecording]}
          onPress={isRecording ? stopAudioRecording : startAudioRecording}
          disabled={sending || newMessage.trim().length > 0}
        >
          {isRecording ? (
            <Animated.View style={{ opacity: pulseAnim }}>
              <Text style={styles.recordingTime}>{recordingDuration}s</Text>
            </Animated.View>
          ) : (
            <Mic size={22} color="#00d9ff" />
          )}
        </TouchableOpacity>

        {playingAudioId && (
          <View style={styles.speedContainer}>
            <TouchableOpacity
              style={[styles.speedButton, audioSpeed === 1 && styles.speedButtonActive]}
              onPress={() => changeAudioSpeed(1)}
            >
              <Text style={[styles.speedButtonText, audioSpeed === 1 && styles.speedButtonTextActive]}>1x</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.speedButton, audioSpeed === 1.5 && styles.speedButtonActive]}
              onPress={() => changeAudioSpeed(1.5)}
            >
              <Text style={[styles.speedButtonText, audioSpeed === 1.5 && styles.speedButtonTextActive]}>1.5x</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.speedButton, audioSpeed === 2 && styles.speedButtonActive]}
              onPress={() => changeAudioSpeed(2)}
            >
              <Text style={[styles.speedButtonText, audioSpeed === 2 && styles.speedButtonTextActive]}>2x</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: '#1a1a1a',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d2d',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2d2d2d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    marginRight: 10,
    marginBottom: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2d2d2d',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  avatarPlaceholder: {
    backgroundColor: '#00d9ff',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  messageContent: {
    flex: 1,
  },
  ownMessageContent: {
    alignItems: 'flex-end',
    marginRight: 10,
  },
  messageHeader: {
    marginBottom: 6,
  },
  messageSender: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00d9ff',
  },
  messageBubble: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  ownMessageBubble: {
    backgroundColor: '#00d9ff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 4,
    borderColor: '#00d9ff',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 22,
    marginBottom: 6,
  },
  ownMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  ownMessageTime: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2d2d2d',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#2d2d2d',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 4,
    fontSize: 15,
    color: '#fff',
    maxHeight: 80,
    borderWidth: 1,
    borderColor: '#3d3d3d',
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  mediaButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  audioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  audioButtonRecording: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  recordingTime: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 6,
  },
  audioContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
  },
  audioContainerPlaying: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  audioIcon: {
    fontSize: 16,
  },
  audioText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  speedContainer: {
    flexDirection: 'row',
    backgroundColor: '#2d2d2d',
    borderRadius: 22,
    padding: 4,
    gap: 4,
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  speedButtonActive: {
    backgroundColor: '#00d9ff',
  },
  speedButtonText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
  },
  speedButtonTextActive: {
    color: '#000',
  },
  indicatorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  indicatorText: {
    color: '#00d9ff',
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 4,
  },
});
