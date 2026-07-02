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
  StatusBar,
  Modal,
  Linking,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Check, CheckCheck, Mic, Play, Pause, Paperclip, Image as ImageIcon, Video as VideoIcon, Plus, Trash2, Crown, LogOut, Search, X, Camera, Link, Calendar, CornerUpLeft, Edit3, Star, Phone, Box, ChevronRight, HardDrive, Bell, Palette, Download, Clock, Lock, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { notifyMessageRecipient } from '@/lib/notifications';
import { Audio, Video, ResizeMode } from 'expo-av';
import { uploadFile, uploadImage } from '@/lib/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withSpring } from 'react-native-reanimated';
import { hapticFeedback } from '@/utils/haptics';
import Skeleton from '@/components/Skeleton';
import { ConfettiView } from '@/components/ConfettiView';
import { useInAppNotification } from '@/contexts/InAppNotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/lib/i18n';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
  read_at?: string;
  delivered?: boolean;
  delivered_at?: string;
  is_edited?: boolean;
  sender?: {
    full_name: string;
    username: string;
  };
  reactions?: any[];
}

interface OtherUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

const WaveBar = ({ index, meteringShared, color }: { index: number, meteringShared: any, color: string }) => {
  const animatedStyle = useAnimatedStyle(() => {
    // We do NOT use withTiming here because the array shifts, so the value at this index changes rapidly.
    // Animating it would cause a morphing lag effect.
    const h = meteringShared.value[index] || 4;
    return {
      height: h
    };
  });
  return <Animated.View style={[{ width: 3, backgroundColor: color, borderRadius: 1.5, marginHorizontal: 1.5 }, animatedStyle]} />;
}

const LiveWaveform = ({ meteringShared }: { meteringShared: any }) => {
  const color = '#00a884'; // WhatsApp green style
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 32, overflow: 'hidden' }}>
      {Array.from({ length: 30 }).map((_, i) => (
         <WaveBar key={i} index={i} meteringShared={meteringShared} color={color} />
      ))}
    </View>
  );
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const { setActiveConversation } = useInAppNotification();
  const { id: conversationId, userId } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [conversation, setConversation] = useState<{ id?: string, name?: string, is_group?: boolean, avatar_url?: string, description?: string } | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Group Details & Management States
  const [groupParticipants, setGroupParticipants] = useState<any[]>([]);
  const [isAdminOfGroup, setIsAdminOfGroup] = useState(false);
  const [groupInfoModalVisible, setGroupInfoModalVisible] = useState(false);
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [availableUsersToAdd, setAvailableUsersToAdd] = useState<any[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  
  // Group Photo & Description Editing States
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [selectedMemberForAction, setSelectedMemberForAction] = useState<any | null>(null);
  const [memberActionModalVisible, setMemberActionModalVisible] = useState(false);
  const [groupMedia, setGroupMedia] = useState<any[]>([]);
  const [groupLinks, setGroupLinks] = useState<any[]>([]);
  const [groupEvents, setGroupEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'media' | 'links' | 'events'>('members');
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<any | null>(null);
  const [messageActionModalVisible, setMessageActionModalVisible] = useState(false);
  const [mediaSourceModalVisible, setMediaSourceModalVisible] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingMessage, setReplyingMessage] = useState<any | null>(null);
  const [favoritedMessageIds, setFavoritedMessageIds] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState(1);
  const [audioPosition, setAudioPosition] = useState(0);
  const [audioDurationState, setAudioDurationState] = useState(0);
  const [isRecordingLocked, setIsRecordingLocked] = useState(false);
  const [contactInfoVisible, setContactInfoVisible] = useState(false);
  const [fullscreenMessage, setFullscreenMessage] = useState<any | null>(null);
  
  const meteringShared = useSharedValue<number[]>(Array(30).fill(4));
  
  // New States for Contact Info
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [searchMessageQuery, setSearchMessageQuery] = useState('');
  const [mediaLinksModalVisible, setMediaLinksModalVisible] = useState(false);
  const [favoritesModalVisible, setFavoritesModalVisible] = useState(false);
  const [isChatMuted, setIsChatMuted] = useState(false);
  const [isChatLocked, setIsChatLocked] = useState(false);
  const [saveToPhotos, setSaveToPhotos] = useState(true);
  const [disappearingTimer, setDisappearingTimer] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastConfettiMessageId, setLastConfettiMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender_id !== user?.id && lastMsg.id !== lastConfettiMessageId) {
        let isText = false;
        let text = '';
        try {
          const parsed = JSON.parse(lastMsg.content);
          if (parsed.type === 'text' || parsed.type === 'reply') {
            text = parsed.text || parsed.reply_to_text;
            isText = true;
          }
        } catch {
          text = lastMsg.content;
          isText = true;
        }
        
        if (isText && /parab[eé]ns|feliz|quebra tudo/i.test(text)) {
          setShowConfetti(true);
          setLastConfettiMessageId(lastMsg.id);
        }
      }
    }
  }, [messages, user?.id, lastConfettiMessageId]);

  const isSeekingRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRecordingRef = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPressingMicRef = useRef(false);
  const pulseAnim = useSharedValue(1);
  const inputRef = useRef<TextInput>(null);
  const micDragX = useSharedValue(0);
  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: micDragX.value }]
  }));
  const slideTextOpacity = useAnimatedStyle(() => ({
    opacity: Math.max(0, 1 - Math.abs(micDragX.value) / 40)
  }));

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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
    loadChatSettings();

    const currentId = activeConversationId || conversationId as string;
    if (!currentId || currentId.length < 10) return;

    setActiveConversation(currentId);
    
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
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentId}`,
        },
        (payload) => {
          try {
            console.log('[Realtime] Message event payload:', payload);
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new as Message | null;
              if (!newMsg) return;

              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                const merged = [...prev, newMsg];
                merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                return merged;
              });
              scrollToBottom();

              // Se a mensagem for de outra pessoa e estamos na tela, marcamos como lida e entregue
              if (newMsg.sender_id !== user?.id) {
                supabase
                  .from('messages')
                  .update({ 
                    read: true, 
                    delivered: true, 
                    read_at: new Date().toISOString(), 
                    delivered_at: new Date().toISOString() 
                  })
                  .eq('id', newMsg.id)
                  .then(({ error }) => {
                    if (error) console.error('[Realtime] Failed to mark new msg as read:', error);
                  });
              }
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old?.id;
              if (deletedId) {
                setMessages(prev => prev.filter(m => m.id !== deletedId));
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedMsg = payload.new as Message | null;
              if (!updatedMsg) return;
              setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
            }
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
      setActiveConversation(null);
      
      // Cleanup de áudio
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      try {
        supabase.removeChannel(channel);
      } catch (err) {
        console.warn('Error while removing channel:', err);
      }
    };
  }, [conversationId, activeConversationId, setActiveConversation]);

  // Monitor online status do outro usuário
  useEffect(() => {
    const targetId = otherUser?.id;
    if (!targetId) return;

    const presenceChannel = supabase.channel(`presence:${targetId}`);
    
    presenceChannel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_presence',
      filter: `user_id=eq.${targetId}`,
    }, (payload) => {
      const presenceData = payload.new as any;
      setIsOtherUserOnline(presenceData?.is_online ?? false);
      setOtherUserLastSeen(presenceData?.last_seen ?? null);
    }).subscribe();

    // Carregar status inicial
    const loadUserPresence = async () => {
      try {
        const { data } = await supabase
          .from('user_presence')
          .select('is_online, last_seen')
          .eq('user_id', targetId)
          .single();

        setIsOtherUserOnline(data?.is_online ?? false);
        setOtherUserLastSeen(data?.last_seen ?? null);
      } catch (error) {
        console.error('Error loading user presence:', error);
      }
    };

    loadUserPresence();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [otherUser?.id]);

  // Monitor typing indicator
  useEffect(() => {
    const currentId = activeConversationId || conversationId as string;
    if (!currentId) return;

    let typingResetTimeout: ReturnType<typeof setTimeout> | null = null;

    const resetTyping = () => {
      if (typingResetTimeout) clearTimeout(typingResetTimeout);
      typingResetTimeout = null;
      setIsTyping(false);
    };

    const typingChannel = supabase.channel(`typing:${currentId}`);

    typingChannel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'typing_indicators',
      filter: `conversation_id=eq.${currentId}`,
    }, (payload) => {
      const typingData = payload.new as any;

      // Ignorar eventos do próprio usuário
      if (typingData?.user_id === user?.id) return;

      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        setIsTyping(true);
        // Auto-reset após 4s caso o DELETE não chegue
        if (typingResetTimeout) clearTimeout(typingResetTimeout);
        typingResetTimeout = setTimeout(resetTyping, 4000);
      } else if (payload.eventType === 'DELETE') {
        resetTyping();
      }
    }).subscribe();

    // Ao montar, garantir que isTyping começa falso
    setIsTyping(false);

    return () => {
      if (typingResetTimeout) clearTimeout(typingResetTimeout);
      supabase.removeChannel(typingChannel);
    };
  }, [conversationId, activeConversationId, user?.id]);

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
            delivered: true,
            delivered_at: new Date().toISOString()
          })
          .eq('conversation_id', currentId)
          .neq('sender_id', user.id)
          .eq('read', false);

        // Atualizar estado local
        setMessages(prev => prev.map(m => 
          m.sender_id !== user.id ? { ...m, read: true, delivered: true, read_at: new Date().toISOString(), delivered_at: new Date().toISOString() } : m
        ));
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const loadOtherUser = async () => {
    if (!userId && !conversationId) return;

    try {
      // Tentar carregar detalhes da conversa
      const { data: convData } = await supabase
        .from('conversations')
        .select('id, name, is_group, avatar_url, description')
        .eq('id', conversationId)
        .maybeSingle();

      let targetUserId = userId as string;

      if (convData) {
        setConversation(convData);
        setActiveConversationId(convData.id);
        
        // Se for uma conversa 1:1 e não temos o userId, buscamos o outro participante
        if (!convData.is_group && !targetUserId) {
          const { data: participantData } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', convData.id)
            .neq('user_id', user?.id)
            .maybeSingle();
          
          if (participantData) {
            targetUserId = participantData.user_id;
          }
        }
      } else if (userId) {
        // Se não achou conversa pelo ID, mas temos userId, talvez o id seja o userId
        // Procurar conversa 1:1 comum de forma ultra robusta
        const { data: myConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user?.id);
        
        const myConvIds = myConvs?.map(c => c.conversation_id) || [];

        if (myConvIds.length > 0) {
          const { data: targetConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', userId)
            .in('conversation_id', myConvIds);
          
          const commonConvIds = targetConvs?.map(c => c.conversation_id) || [];

          if (commonConvIds.length > 0) {
            // Buscar conversa 1:1 real ordenando por updated_at descendente (mais recente primeiro)
            const { data: realConvs } = await supabase
              .from('conversations')
              .select('id, name, is_group, avatar_url, description, updated_at')
              .eq('is_group', false)
              .in('id', commonConvIds)
              .order('updated_at', { ascending: false });

            if (realConvs && realConvs.length > 0) {
              const mainConv = realConvs[0];
              setActiveConversationId(mainConv.id);
              setConversation(mainConv);
              targetUserId = userId as string;
            } else {
              setActiveConversationId(null);
              targetUserId = userId as string;
            }
          } else {
            setActiveConversationId(null);
            targetUserId = userId as string;
          }
        } else {
          setActiveConversationId(null);
          targetUserId = userId as string;
        }
      }

      if (targetUserId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .eq('id', targetUserId)
          .single();

        if (!error && data) {
          setOtherUser(data);
        }
      }
    } catch (error) {
      console.error('Error loading other user/conversation:', error);
    }
  };

  const loadGroupParticipants = async () => {
    const currentId = activeConversationId || conversationId as string;
    if (!currentId) return;

    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          user_id,
          is_admin,
          profiles:user_id (id, username, full_name, avatar_url)
        `)
        .eq('conversation_id', currentId);

      if (error) throw error;

      if (data) {
        setGroupParticipants(data);
        const myParticipant = data.find((p: any) => p.user_id === user?.id);
        setIsAdminOfGroup(myParticipant?.is_admin || false);
      }
    } catch (err) {
      console.error('Error loading group participants:', err);
    }
  };

  useEffect(() => {
    if (conversation?.is_group) {
      loadGroupParticipants();
    }
  }, [conversation, conversationId, activeConversationId]);

  const loadGroupMediaAndLinks = async () => {
    const currentId = activeConversationId || conversationId as string;
    if (!currentId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mediaItems: any[] = [];
      const linkItems: any[] = [];
      const eventItems: any[] = [];

      (data || []).forEach(msg => {
        // 1. Mídia via coluna media_url (se houver)
        if ((msg as any).media_url) {
          mediaItems.push({
            id: msg.id,
            url: (msg as any).media_url,
            created_at: msg.created_at
          });
        }

        // 2. Eventos, Links ou Mídias em JSON
        if (msg.content) {
          const trimmed = msg.content.trim();
          try {
            if (trimmed.startsWith('{')) {
              const parsed = JSON.parse(trimmed);
              if (parsed) {
                if (parsed.type === 'event_card') {
                  eventItems.push({
                    id: msg.id,
                    event_id: parsed.event_id,
                    title: parsed.title,
                    date: parsed.date,
                    image: parsed.image,
                    created_at: msg.created_at
                  });
                } else if (parsed.type === 'image' || parsed.type === 'video') {
                  mediaItems.push({
                    id: msg.id,
                    url: parsed.url,
                    created_at: msg.created_at
                  });
                }
              }
            } else if (trimmed.includes('http://') || trimmed.includes('https://')) {
              const urls = trimmed.match(/\bhttps?:\/\/\S+/gi);
              if (urls) {
                urls.forEach((url: string) => {
                  linkItems.push({
                    id: msg.id,
                    url: url,
                    text: trimmed,
                    created_at: msg.created_at
                  });
                });
              }
            }
          } catch (e) {
            if (trimmed.includes('http://') || trimmed.includes('https://')) {
              const urls = trimmed.match(/\bhttps?:\/\/\S+/gi);
              if (urls) {
                urls.forEach((url: string) => {
                  linkItems.push({
                    id: msg.id,
                    url: url,
                    text: trimmed,
                    created_at: msg.created_at
                  });
                });
              }
            }
          }
        }
      });

      setGroupMedia(mediaItems);
      setGroupLinks(linkItems);
      setGroupEvents(eventItems);
    } catch (err) {
      console.error('Error loading media and links:', err);
    }
  };

  useEffect(() => {
    if (groupInfoModalVisible) {
      loadGroupMediaAndLinks();
    }
  }, [groupInfoModalVisible]);

  const handleParticipantPress = (participant: any) => {
    const isMe = participant.user_id === user?.id;
    if (!isAdminOfGroup || isMe) return;

    setSelectedMemberForAction(participant);
    setMemberActionModalVisible(true);
  };

  const promoteToAdmin = async (targetUserId: string) => {
    const currentId = activeConversationId || conversationId as string;
    if (!currentId) return;

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_admin: true })
        .eq('conversation_id', currentId)
        .eq('user_id', targetUserId);

      if (error) throw error;
      
      Alert.alert('Sucesso 🎉', 'Usuário promovido a administrador do grupo.');
      loadGroupParticipants();
    } catch (err) {
      console.error('Error promoting user:', err);
      Alert.alert('Erro', 'Não foi possível promover o usuário.');
    }
  };

  const removeFromGroup = async (targetUserId: string) => {
    const currentId = activeConversationId || conversationId as string;
    if (!currentId) return;

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', currentId)
        .eq('user_id', targetUserId);

      if (error) throw error;

      Alert.alert('Sucesso ❌', 'Usuário removido do grupo.');
      loadGroupParticipants();
    } catch (err) {
      console.error('Error removing user from group:', err);
      Alert.alert('Erro', 'Não foi possível remover o usuário.');
    }
  };

  const leaveGroup = async () => {
    const currentId = activeConversationId || conversationId as string;
    if (!currentId || !user) return;

    Alert.alert(
      'Sair do Grupo 🚪',
      'Tem certeza que deseja sair deste grupo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('conversation_participants')
                .delete()
                .eq('conversation_id', currentId)
                .eq('user_id', user.id);

              if (error) throw error;

              setGroupInfoModalVisible(false);
              router.replace('/messages');
            } catch (err) {
              console.error('Error leaving group:', err);
              Alert.alert('Erro', 'Não foi possível sair do grupo.');
            }
          }
        }
      ]
    );
  };

  const changeGroupPhoto = async () => {
    if (!isAdminOfGroup) return;

    try {
      const permissionGranted = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionGranted.granted) {
        Alert.alert('Permissão Negada', 'Precisamos de permissão para acessar sua galeria de fotos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUpdatingGroup(true);
      const selectedUri = result.assets[0].uri;

      const currentId = activeConversationId || conversationId as string;
      const uploadedUrl = await uploadImage(selectedUri, 'media', 'groups', user?.id || 'unknown');

      if (!uploadedUrl) {
        throw new Error('Falha no upload da imagem');
      }

      const { error } = await supabase
        .from('conversations')
        .update({ avatar_url: uploadedUrl })
        .eq('id', currentId);

      if (error) throw error;

      setConversation(prev => prev ? { ...prev, avatar_url: uploadedUrl } : null);
      Alert.alert('Sucesso 🎉', 'A foto do grupo foi atualizada com sucesso!');
    } catch (err) {
      console.error('Error updating group photo:', err);
      Alert.alert('Erro', 'Não foi possível atualizar a foto do grupo.');
    } finally {
      setUpdatingGroup(false);
    }
  };

  const saveGroupDescription = async () => {
    const currentId = activeConversationId || conversationId as string;
    if (!currentId) return;

    setUpdatingGroup(true);
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ description: editedDescription })
        .eq('id', currentId);

      if (error) throw error;

      setConversation(prev => prev ? { ...prev, description: editedDescription } : null);
      setIsEditingDescription(false);
      Alert.alert('Sucesso 🎉', 'A descrição do grupo foi atualizada com sucesso!');
    } catch (err) {
      console.error('Error updating description:', err);
      Alert.alert('Erro', 'Não foi possível atualizar a descrição.');
    } finally {
      setUpdatingGroup(false);
    }
  };

  const loadUsersToAdd = async () => {
    try {
      const currentId = activeConversationId || conversationId as string;
      if (!currentId) return;

      const { data: existingParts } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', currentId);

      const excludedUserIds = existingParts?.map(p => p.user_id) || [];

      let queryBuilder = supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url');
      
      if (excludedUserIds.length > 0) {
        queryBuilder = queryBuilder.not('id', 'in', `(${excludedUserIds.join(',')})`);
      }

      const { data, error } = await queryBuilder.order('full_name');

      if (error) throw error;
      setAvailableUsersToAdd(data || []);
    } catch (err) {
      console.error('Error loading users to add:', err);
    }
  };

  const addUserToGroup = async (targetUserId: string) => {
    const currentId = activeConversationId || conversationId as string;
    if (!currentId) return;

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: currentId,
          user_id: targetUserId,
          is_admin: false,
        });

      if (error) throw error;

      Alert.alert('Sucesso ✅', 'Novo membro adicionado ao grupo.');
      loadGroupParticipants();
      loadUsersToAdd();
    } catch (err) {
      console.error('Error adding user to group:', err);
      Alert.alert('Erro', 'Não foi possível adicionar o usuário.');
    }
  };

  const loadChatSettings = async () => {
    let currentId = activeConversationId || conversationId as string;
    if (!currentId || !user) return;
    try {
      // Favoritos
      const { data: favs } = await supabase
        .from('favorite_messages')
        .select('message_id')
        .eq('user_id', user.id);
      if (favs) setFavoritedMessageIds(favs.map(f => f.message_id));

      // Muted
      const { data: participant } = await supabase
        .from('conversation_participants')
        .select('is_muted')
        .eq('conversation_id', currentId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (participant) setIsChatMuted(!!participant.is_muted);

      // Disappearing Timer
      const { data: conv } = await supabase
        .from('conversations')
        .select('disappearing_timer')
        .eq('id', currentId)
        .maybeSingle();
      if (conv) setDisappearingTimer(conv.disappearing_timer || 0);

      // Save to Photos & Lock (Local)
      const savePhotosVal = await AsyncStorage.getItem(`save_to_photos_${currentId}`);
      if (savePhotosVal !== null) setSaveToPhotos(savePhotosVal === 'true');

      const isLockedVal = await AsyncStorage.getItem(`is_locked_${currentId}`);
      if (isLockedVal === 'true') {
        setIsChatLocked(true);
        authenticateToUnlock();
      }
    } catch (e) {
      console.log('Error loading settings', e);
    }
  };

  const authenticateToUnlock = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Desbloquear conversa' });
        if (result.success) {
          setIsChatLocked(false);
        } else {
          router.back();
        }
      } else {
        setIsChatLocked(false);
      }
    } catch (e) {
      console.log('Biometrics error:', e);
      setIsChatLocked(false);
    }
  };

  const toggleMute = async () => {
    let currentId = activeConversationId || conversationId as string;
    if (!currentId || !user) return;
    const newMuted = !isChatMuted;
    setIsChatMuted(newMuted);
    await supabase.from('conversation_participants')
      .update({ is_muted: newMuted })
      .eq('conversation_id', currentId)
      .eq('user_id', user.id);
  };

  const toggleSavePhotos = async () => {
    let currentId = activeConversationId || conversationId as string;
    if (!currentId) return;
    const newVal = !saveToPhotos;
    setSaveToPhotos(newVal);
    await AsyncStorage.setItem(`save_to_photos_${currentId}`, newVal ? 'true' : 'false');
  };

  const toggleChatLock = async () => {
    let currentId = activeConversationId || conversationId as string;
    if (!currentId) return;
    
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        Alert.alert('Erro', 'Seu dispositivo não possui biometria configurada.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({ promptMessage: isChatLocked ? 'Desativar bloqueio' : 'Ativar bloqueio de conversa' });
      if (result.success) {
        const newVal = !isChatLocked;
        setIsChatLocked(newVal);
        await AsyncStorage.setItem(`is_locked_${currentId}`, newVal ? 'true' : 'false');
      }
    } catch (e) {
      console.log(e);
    }
  };

  const changeDisappearingTimer = () => {
    Alert.alert('Mensagens Temporárias', 'Escolha o tempo de duração:', [
      { text: 'Desativado', onPress: () => updateTimerDB(0) },
      { text: '24 horas', onPress: () => updateTimerDB(86400) },
      { text: '7 dias', onPress: () => updateTimerDB(604800) },
      { text: 'Cancelar', style: 'cancel' }
    ]);
  };

  const updateTimerDB = async (seconds: number) => {
    let currentId = activeConversationId || conversationId as string;
    if (!currentId) return;
    setDisappearingTimer(seconds);
    await supabase.from('conversations').update({ disappearing_timer: seconds }).eq('id', currentId);
  };

  const toggleFavorite = async (messageId: string) => {
    if (!user) return;
    const isFav = favoritedMessageIds.includes(messageId);
    if (isFav) {
      setFavoritedMessageIds(prev => prev.filter(id => id !== messageId));
      await supabase.from('favorite_messages').delete().eq('user_id', user.id).eq('message_id', messageId);
    } else {
      setFavoritedMessageIds(prev => [...prev, messageId]);
      await supabase.from('favorite_messages').insert({ user_id: user.id, message_id: messageId });
    }
  };

  const loadMessages = async () => {
    let currentId = activeConversationId || conversationId as string;
    if (!currentId) return;

    try {
      // Verificar se o ID é uma conversa válida antes de carregar
      const { data: checkConv } = await supabase
        .from('conversations')
        .select('id, is_group')
        .eq('id', currentId)
        .maybeSingle();
      
      if (!checkConv) {
        setLoading(false);
        return;
      }

      let conversationIdsToFetch = [currentId];

      // Se for uma conversa 1:1, unificar todas as outras 1:1 com este participante histórico
      if (!checkConv.is_group && otherUser?.id) {
        const { data: myConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user?.id);
        const myConvIds = myConvs?.map(c => c.conversation_id) || [];

        if (myConvIds.length > 0) {
          const { data: commonConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', otherUser.id)
            .in('conversation_id', myConvIds);
          const commonConvIds = commonConvs?.map(c => c.conversation_id) || [];

          if (commonConvIds.length > 0) {
            const { data: realConvs } = await supabase
              .from('conversations')
              .select('id')
              .eq('is_group', false)
              .in('id', commonConvIds);
            
            if (realConvs && realConvs.length > 0) {
              conversationIdsToFetch = realConvs.map(c => c.id);
            }
          }
        }
      }

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, full_name, username, avatar_url, is_verified),
          reactions:message_reactions(*)
        `)
        .in('conversation_id', conversationIdsToFetch)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      await supabase
        .from('messages')
        .update({ read: true, delivered: true })
        .in('conversation_id', conversationIdsToFetch)
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

    if (isEditingMessage && editingMessageId) {
      try {
        const { error } = await supabase
          .from('messages')
          .update({ content: content, is_edited: true })
          .eq('id', editingMessageId);

        if (error) throw error;

        // Atualizar estado local
        setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: content, is_edited: true } : m));
        
        // Resetar estados de edição
        setIsEditingMessage(false);
        setEditingMessageId(null);
      } catch (err) {
        console.error('Error editing message:', err);
      } finally {
        setSending(false);
      }
      return;
    }

    let finalContent = content;
    if (replyingMessage) {
      finalContent = JSON.stringify({
        type: 'reply',
        reply_to_id: replyingMessage.id,
        reply_to_name: replyingMessage.sender?.full_name || replyingMessage.profiles?.full_name || 'Usuário',
        reply_to_text: replyingMessage.content.startsWith('{') ? 'Mídia' : replyingMessage.content,
        text: content
      });
      setReplyingMessage(null);
    }

    console.log('[SendMessage] Starting... Text:', finalContent.substring(0, 20));
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
        content: messageText.trim(),
        read: false,
        delivered: false,
      }).select().single();

      if (error) {
        console.error('[SendMessage] Database error while inserting message:', error);
        throw error;
      }

      // Adicionar a mensagem ao estado localmente para aparecer imediatamente (otimista)
      if (insertedData) {
        setMessages((prev) => {
          if (prev.some(m => m.id === insertedData.id)) return prev;
          return [...prev, insertedData as Message];
        });
        hapticFeedback.success();
        
        // Simular entrega (2 traços) após um pequeno delay de rede para agradar a experiência visual
        setTimeout(() => {
          supabase.from('messages')
            .update({ delivered: true, delivered_at: new Date().toISOString() })
            .eq('id', insertedData.id)
            .then();
        }, 1500);
      }

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConvId);

      // Notificar o destinatário sobre a nova mensagem
      if (otherUser?.id) {
        const messagePreview = content.length > 50 ? content.substring(0, 50) + '...' : content;
        await notifyMessageRecipient(
          otherUser.id,
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

  const renderMessageTextWithLinks = (text: string, isMyMessage: boolean) => {
    if (!text) return null;

    // Regex robusto para URLs, cobrindo domínios nacionais/internacionais comuns com/sem protocolo (ex: google.com.br, unna.app, www.site.com)
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(?:com|net|org|edu|gov|mil|aero|coop|info|museum|name|mobi|post|pro|travel|asia|cat|jobs|tel|xxx|app|br|io|me|tv|cc|ws|us|uk|ca|fr|de|it|es|jp|cn|ru)\b[^\s]*)/gi;

    const parts = text.split(urlRegex);
    const matches = text.match(urlRegex);

    const myTextColor = isDark ? '#e9edef' : '#111b21';
    const otherTextColor = isDark ? '#e9edef' : '#111b21';
    const linkColorMy = isDark ? '#53bdeb' : '#004cd9';
    const linkColorOther = isDark ? '#53bdeb' : accent;

    if (!matches) {
      return (
        <Text style={[styles.messageText, isMyMessage ? [styles.myMessageText, { color: myTextColor }] : [styles.otherMessageText, { color: otherTextColor }]]}>
          {text}
        </Text>
      );
    }

    let matchIndex = 0;
    return (
      <Text style={[styles.messageText, isMyMessage ? [styles.myMessageText, { color: myTextColor }] : [styles.otherMessageText, { color: otherTextColor }]]}>
        {parts.map((part, index) => {
          if (matches[matchIndex] && (part === matches[matchIndex] || text.indexOf(part) === -1)) {
            const url = matches[matchIndex++];
            const fullUrl = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
            return (
              <Text
                key={index}
                style={{
                  color: isMyMessage ? linkColorMy : linkColorOther,
                  textDecorationLine: 'underline',
                  fontWeight: '700',
                }}
                onPress={() => {
                  Linking.openURL(fullUrl).catch(err => console.error('Failed to open link:', err));
                }}
              >
                {url}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Precisamos da permissão da galeria para enviar fotos e vídeos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.7,
        allowsEditing: false,
      });

      setMediaSourceModalVisible(false);

      if (result.canceled) return;
      await processSelectedMedia(result.assets[0]);
    } catch (err) {
      console.error('Error launching gallery:', err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Precisamos da permissão da câmera para tirar fotos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });

      setMediaSourceModalVisible(false);

      if (result.canceled) return;
      await processSelectedMedia(result.assets[0]);
    } catch (err) {
      console.error('Error launching camera:', err);
    }
  };

  const processSelectedMedia = async (asset: any, caption: string = '') => {
    setSending(true);
    try {
      const type = asset.type === 'video' ? 'video' : 'image';
      const fileExt = type === 'video' ? 'mp4' : 'jpg';
      
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
      if (insertedData) {
        setMessages(prev => [...prev, insertedData as Message]);
        
        // Notificar o destinatário sobre a nova mídia
        if (userId) {
          await notifyMessageRecipient(
            userId as string,
            user?.id as string,
            type === 'video' ? '🎥 Vídeo' : '📷 Foto',
            currentConvId
          );
        }
      }
      scrollToBottom();
    } catch (err) {
      console.error('Error sending media:', err);
      Alert.alert('Erro', 'Não foi possível enviar o arquivo.');
    } finally {
      setSending(false);
    }
  };

  const startAudioRecording = async () => {
    isPressingMicRef.current = true;
    try {
      // Limpeza profunda de segurança
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.canRecord) {
            await recordingRef.current.stopAndUnloadAsync();
          } else {
            await recordingRef.current.stopAndUnloadAsync().catch(() => {});
          }
        } catch (e) {
          console.log('[Audio] Cleanup error (safe to ignore):', e);
        } finally {
          recordingRef.current = null;
        }
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão Negada', 'Precisamos de acesso ao microfone para gravar áudios.');
        setIsRecording(false);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('[Audio] Preparing new recording...');
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      
      // Update the waveform in real time based on volume
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.metering !== undefined) {
          // Metering is typically between -160 and 0. Let's cap at -60 for better visual range
          const raw = status.metering;
          const normalized = Math.max(0, Math.min(1, (raw + 60) / 60)); 
          const mappedHeight = 4 + (normalized * 24); // Height between 4 and 28
          
          const next = [...meteringShared.value, mappedHeight];
          if (next.length > 30) {
             meteringShared.value = next.slice(next.length - 30);
          } else {
             meteringShared.value = next;
          }
        }
      });
      
      recording.setProgressUpdateInterval(50);
      
      // Se o usuário soltou o botão enquanto a gravação estava sendo preparada:
      if (!isPressingMicRef.current) {
        console.log('[Audio] Botão solto antes da gravação iniciar, cancelando...');
        await recording.stopAndUnloadAsync().catch(() => {});
        setIsRecording(false);
        return;
      }

      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
    }
  };

  const stopAudioRecording = async (cancel: boolean = false) => {
    isPressingMicRef.current = false;
    if (!recordingRef.current) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      const status = await recordingRef.current.getStatusAsync();
      const actualDuration = status.durationMillis || 0;

      if (status.canRecord) {
        await recordingRef.current.stopAndUnloadAsync();
      } else if (status.isDoneRecording === false) {
        await recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      
      const uri = recordingRef.current.getURI();
      const durationSeconds = Math.max(1, Math.round(actualDuration / 1000));
      
      recordingRef.current = null;
      setIsRecording(false);
      setIsRecordingLocked(false);
      setRecordingDuration(0);
      meteringShared.value = Array(30).fill(4);

      // Descartamos se cancelado explicitamente ou se a gravação foi um toque muito acidental (< 500ms)
      if (cancel || actualDuration < 500) {
        console.log('Gravação descartada...');
        return;
      }

      if (uri) {
        await uploadAndSendAudio(uri, durationSeconds);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Erro', 'Não foi possível finalizar a gravação');
      setIsRecording(false);
      setIsRecordingLocked(false);
      setRecordingDuration(0);
    }
  };

  // PanResponder para "Deslize para cancelar" o áudio
  const micPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (isRecordingLocked) return;
        cancelRecordingRef.current = false;
        setIsRecording(true);
        startAudioRecording();
      },
      onPanResponderMove: (evt, gestureState) => {
        if (isRecordingLocked || cancelRecordingRef.current) return;
        
        if (gestureState.dx < 0) {
          micDragX.value = gestureState.dx;
        }

        // Se deslizar para cima mais de 50px, trava a gravação
        if (gestureState.dy < -50 && !cancelRecordingRef.current) {
          setIsRecordingLocked(true);
          micDragX.value = withSpring(0);
        }
        // Se deslizar para a esquerda mais de 50px, cancela
        else if (gestureState.dx < -50 && !cancelRecordingRef.current) {
          cancelRecordingRef.current = true;
          stopAudioRecording(true);
          micDragX.value = withSpring(0);
        }
      },
      onPanResponderRelease: () => {
        micDragX.value = withSpring(0);
        if (isRecordingLocked) return; // Se travou, soltar o dedo não para a gravação
        
        if (!cancelRecordingRef.current) {
          stopAudioRecording(false);
        }
      },
      onPanResponderTerminate: () => {
        micDragX.value = withSpring(0);
        if (isRecordingLocked) return;

        if (!cancelRecordingRef.current) {
          cancelRecordingRef.current = true;
          stopAudioRecording(true);
        }
      }
    })
  ).current;


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
        delivered: false,
      }).select().single();

      if (error) {
        console.error('Database error:', error);
        Alert.alert('Erro no Banco', 'Áudio enviado, mas falhou ao salvar a mensagem.');
        throw error;
      }
      
      if (insertedData) {
        setMessages(prev => [...prev, insertedData as Message]);
        
        // Notificar o destinatário sobre o novo áudio
        if (userId) {
          await notifyMessageRecipient(
            userId as string,
            user.id,
            '🎤 Mensagem de áudio',
            currentConvId
          );
        }
      }
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
        try {
          await soundRef.current.unloadAsync();
        } catch (e) {
          console.log('[Audio] Unload error (safe to ignore):', e);
        }
        if (playingAudioId === id) {
          setPlayingAudioId(null);
          setAudioPosition(0);
          return;
        }
      }

      setAudioLoadingId(id);

      // Configurar modo de áudio para sair pelo alto-falante principal (igual ao WhatsApp)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, rate: audioSpeed, shouldCorrectPitch: true },
        (status) => {
          if (!status.isLoaded) return;
          
          if (!isSeekingRef.current) {
            setAudioPosition(status.positionMillis || 0);
          }
          if (status.durationMillis) {
            setAudioDurationState(status.durationMillis);
          }

          if (status.didJustFinish) {
            setPlayingAudioId(null);
            setAudioPosition(0);
          }
        }
      );
      soundRef.current = sound;
      setAudioLoadingId(null);
      setPlayingAudioId(id);
    } catch (err) {
      console.error('Error playing audio', err);
      setAudioLoadingId(null);
      setPlayingAudioId(null);
      setAudioPosition(0);
    }
  };

  const seekAudio = async (value: number) => {
    if (soundRef.current) {
      try {
        isSeekingRef.current = false;
        await soundRef.current.setPositionAsync(value);
      } catch (err) {
        console.error('Error seeking audio', err);
      }
    }
  };

  const handleSlidingStart = () => {
    isSeekingRef.current = true;
  };

  const handleValueChange = (value: number) => {
    setAudioPosition(value);
  };

  // Efeito para atualizar dinamicamente a velocidade do áudio que já está tocando
  useEffect(() => {
    if (soundRef.current && playingAudioId) {
      soundRef.current.setRateAsync(audioSpeed, true).catch(() => {});
    }
  }, [audioSpeed, playingAudioId]);

  const handleMessageLongPress = (message: Message) => {
    // Feedback tátil
    hapticFeedback.medium();
    setSelectedMessageForAction(message);
    setMessageActionModalVisible(true);
  };

  const deleteMessage = async (messageId: string) => {
    try {
      hapticFeedback.success();
      
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      // Atualiza o estado localmente imediatamente (otimista)
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Erro', 'Não foi possível excluir a mensagem.');
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      hapticFeedback.light();
      setMessageActionModalVisible(false);

      const existingReaction = selectedMessageForAction?.reactions?.find(r => r.user_id === user?.id && r.emoji === emoji);

      if (existingReaction) {
        // Remover reação
        await supabase.from('message_reactions').delete().eq('id', existingReaction.id);
        setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
            return { ...m, reactions: m.reactions?.filter(r => r.id !== existingReaction.id) || [] };
          }
          return m;
        }));
      } else {
        // Adicionar reação
        const tempId = `temp-${Date.now()}`;
        const newReaction = { id: tempId, message_id: messageId, user_id: user?.id, emoji, created_at: new Date().toISOString() };
        
        setMessages(prev => prev.map(m => {
          if (m.id === messageId) {
            return { ...m, reactions: [...(m.reactions || []), newReaction] };
          }
          return m;
        }));

        const { data, error } = await supabase.from('message_reactions').insert({
          message_id: messageId,
          user_id: user?.id,
          emoji
        }).select().single();

        if (!error && data) {
          setMessages(prev => prev.map(m => {
            if (m.id === messageId) {
              return { ...m, reactions: m.reactions?.map(r => r.id === tempId ? data : r) || [] };
            }
            return m;
          }));
        }
      }
    } catch (err) {
      console.error('Error handling reaction:', err);
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

  const formatLastSeen = (lastSeenStr: string | null) => {
    if (!lastSeenStr) return '';
    const date = new Date(lastSeenStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (date.toDateString() === today.toDateString()) {
      return `visto por último hoje às ${timeString}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `visto por último ontem às ${timeString}`;
    } else {
      return `visto por último em ${date.toLocaleDateString('pt-BR')} às ${timeString}`;
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
      style={[styles.container, { backgroundColor: isDark ? '#0b141a' : '#efeae2' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Status bar transparente e fluida */}
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isDark ? "light-content" : "dark-content"}
      />
      
      <ConfettiView visible={showConfetti} onComplete={() => setShowConfetti(false)} />

      <View style={[styles.header, { backgroundColor: isDark ? '#0b141a' : '#075e54', paddingTop: insets.top + 8 }]}>
          {isSearchingMessages ? (
            <View style={[styles.headerTopLevel, { paddingHorizontal: 16, alignItems: 'center' }]}>
              <TouchableOpacity onPress={() => { setIsSearchingMessages(false); setSearchMessageQuery(''); }} style={{ padding: 8, marginLeft: -8 }}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
              <TextInput
                style={{ flex: 1, color: '#fff', fontSize: 16, marginLeft: 16 }}
                placeholder={t('auto.sf6a3134c', 'Pesquisar mensagens...')}
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={searchMessageQuery}
                onChangeText={setSearchMessageQuery}
                autoFocus
              />
            </View>
          ) : (
            <View style={styles.headerTopLevel}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>

              {(conversation || otherUser) && (
                <TouchableOpacity 
                  style={styles.userInfo}
                  onPress={() => {
                    if (conversation?.is_group) {
                      setEditedDescription(conversation.description || '');
                      setGroupInfoModalVisible(true);
                    } else if (otherUser) {
                      setContactInfoVisible(true);
                    }
                  }}
                  activeOpacity={0.7}
                >
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
                        <Text style={styles.headerUsername}>
                          {isTyping ? 'digitando...' : isOtherUserOnline ? 'online' : formatLastSeen(otherUserLastSeen)}
                        </Text>
                      )}
                      {conversation?.is_group && (
                        <Text style={styles.headerUsername}>{t('auto.sff7a5397', 'Toque para dados do grupo')}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              <View style={styles.headerRightIcons}>
                <TouchableOpacity onPress={() => setIsSearchingMessages(true)} style={{ padding: 8 }}>
                  <Search size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

      {loading ? (
        <ScrollView style={[styles.messagesContainer, { backgroundColor: isDark ? '#0b141a' : '#efeae2' }]} contentContainerStyle={{ padding: 20, gap: 15 }}>
          <View style={[styles.messageWrapper, styles.otherMessageWrapper]}>
            <Skeleton width="60%" height={50} borderRadius={18} />
          </View>
          <View style={[styles.messageWrapper, styles.myMessageWrapper]}>
            <Skeleton width="40%" height={40} borderRadius={18} />
          </View>
          <View style={[styles.messageWrapper, styles.otherMessageWrapper]}>
            <Skeleton width="75%" height={80} borderRadius={18} />
          </View>
          <View style={[styles.messageWrapper, styles.myMessageWrapper]}>
            <Skeleton width="50%" height={45} borderRadius={18} />
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={[styles.messagesContainer, { backgroundColor: isDark ? '#0b141a' : '#efeae2' }]}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
          onContentSizeChange={scrollToBottom}
        >
          {messages.filter(msg => {
            if (!isSearchingMessages || !searchMessageQuery.trim()) return true;
            try {
              const p = JSON.parse(msg.content);
              if (p.type === 'text') return p.text.toLowerCase().includes(searchMessageQuery.toLowerCase());
              return false;
            } catch {
              return msg.content.toLowerCase().includes(searchMessageQuery.toLowerCase());
            }
          }).map((message, index, arr) => {
            const isMyMessage = message.sender_id === user?.id;
            const previousMessage = index > 0 ? arr[index - 1] : null;
            const nextMessage = index < arr.length - 1 ? arr[index + 1] : null;
            const showDateDivider = shouldShowDateDivider(message, previousMessage);

            const isPrevSameSender = previousMessage?.sender_id === message.sender_id && !showDateDivider;
            const isNextSameSender = nextMessage?.sender_id === message.sender_id;

            const groupedRadii = isMyMessage ? {
              borderTopRightRadius: isPrevSameSender ? 6 : 20,
              borderBottomRightRadius: isNextSameSender ? 6 : 20,
              borderTopLeftRadius: 20,
              borderBottomLeftRadius: 20,
            } : {
              borderTopLeftRadius: isPrevSameSender ? 6 : 20,
              borderBottomLeftRadius: isNextSameSender ? 6 : 20,
              borderTopRightRadius: 20,
              borderBottomRightRadius: 20,
            };

            return (
              <View key={message.id}>
                {showDateDivider && (
                  <View style={styles.dateDivider}>
                    <Text style={[styles.dateDividerText, { color: textSecondary, backgroundColor: isDark ? '#1a1a1a' : '#E9E9EB' }]}>{formatDate(message.created_at)}</Text>
                  </View>
                )}

                <View
                  style={[
                    styles.messageWrapper,
                    isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper,
                  ]}
                >
                  <Pressable
                    onLongPress={() => handleMessageLongPress(message)}
                    delayLongPress={450}
                    style={({ pressed }) => [
                      styles.messageBubble,
                      groupedRadii,
                      isMyMessage 
                        ? [styles.myMessageBubble, { backgroundColor: isDark ? '#005c4b' : '#dcf8c6' }] 
                        : [styles.otherMessageBubble, { backgroundColor: isDark ? '#202c33' : '#ffffff' }],
                      pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
                    ]}
                  >
                  {conversation?.is_group && !isMyMessage && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <Text style={styles.senderName}>{message.sender?.full_name || 'Usuário'}</Text>
                      {(message.sender as any)?.is_verified && <Sparkles size={10} color="#FF1493" fill="#FF1493" />}
                    </View>
                  )}
                    {(() => {
                      try {
                        const parsed = JSON.parse(message.content);
                        if (parsed.type === 'event_card') {
                          const displayDate = (() => {
                            if (!parsed.date) return 'Data não especificada';
                            try {
                              const d = new Date(parsed.date);
                              if (!isNaN(d.getTime())) {
                                if (parsed.date.includes('-')) {
                                  const [y, m, day] = parsed.date.split('-').map(Number);
                                  return new Date(y, m - 1, day).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  });
                                }
                                return d.toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                });
                              }
                              return parsed.date;
                            } catch (e) {
                              return parsed.date || 'Data não especificada';
                            }
                          })();

                          return (
                            <TouchableOpacity 
                              style={[
                                styles.premiumEventCard, 
                                { backgroundColor: isDark ? 'rgba(30,30,35,0.95)' : '#FFFFFF', borderColor: isDark ? '#333' : '#E5E5EA' }
                              ]}
                              onPress={() => router.push(`/event/${parsed.event_id}`)}
                              activeOpacity={0.95}
                            >
                              <View style={styles.premiumEventHeader}>
                                <Calendar size={13} color="#00d9ff" />
                                <Text style={styles.premiumEventHeaderTag}>{t('auto.sa7699386', 'CONVITE DE EVENTO')}</Text>
                              </View>

                              {parsed.image && parsed.image !== 'null' && parsed.image.trim() !== '' ? (
                                <Image source={{ uri: parsed.image }} style={styles.premiumEventImage} />
                              ) : (
                                <View style={[styles.premiumEventImagePlaceholder, { backgroundColor: accent }]}>
                                  <Text style={styles.premiumEventPlaceholderText}>{t('auto.s7c59a975', 'UNИA')}</Text>
                                </View>
                              )}

                              <View style={styles.premiumEventDetails}>
                                <Text style={[styles.premiumEventTitle, { color: isDark ? '#fff' : '#000' }]} numberOfLines={2}>
                                  {parsed.title}
                                </Text>
                                
                                <View style={styles.premiumEventDateRow}>
                                  <Calendar size={12} color={accent} />
                                  <Text style={[styles.premiumEventDateText, { color: isDark ? '#ccc' : '#666' }]}>
                                    {displayDate}
                                  </Text>
                                </View>

                                <View style={[styles.premiumEventButton, { backgroundColor: accent }]}>
                                  <Text style={styles.premiumEventButtonText}>{t('auto.sc2dc5a3c', 'Ver Evento')}</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        }
                        if (parsed.type === 'reply') {
                          return (
                            <View style={{ gap: 6 }}>
                              <View style={[styles.replyQuoteBubble, { borderLeftColor: accent, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                <Text style={[styles.replyQuoteName, { color: accent }]}>{parsed.reply_to_name}</Text>
                                <Text style={[styles.replyQuoteText, { color: isDark ? '#ccc' : '#666' }]} numberOfLines={1}>{parsed.reply_to_text}</Text>
                              </View>
                               {renderMessageTextWithLinks(parsed.text, isMyMessage)}
                            </View>
                          );
                        }
                        if (parsed.type === 'image') {
                          return (
                            <TouchableOpacity 
                              onPress={() => setFullscreenMessage({ uri: parsed.url || parsed.uri, message })}
                              onLongPress={() => handleMessageLongPress(message)}
                              delayLongPress={300}
                              activeOpacity={0.9}
                            >
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
                          const isLoading = audioLoadingId === message.id;
                          const durationMs = (parsed.duration || 0) * 1000;
                          const currentPosition = isPlaying ? audioPosition : 0;
                          const currentDuration = isPlaying ? (audioDurationState || durationMs) : durationMs;
                          const progressRatio = currentDuration > 0 ? currentPosition / currentDuration : 0;

                          const formatAudioTime = (ms: number) => {
                            const totalSeconds = Math.max(0, Math.floor(ms / 1000));
                            const minutes = Math.floor(totalSeconds / 60);
                            const seconds = totalSeconds % 60;
                            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                          };

                          const renderWaveform = (messageId: string, progress: number, isMe: boolean) => {
                            const bars = [];
                            const totalBars = 32;
                            const seed = messageId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                            const playedColor = isDark ? '#53bdeb' : '#53bdeb';
                            const unplayedColor = isMe ? (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)') : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)');

                            for(let i=0; i<totalBars; i++) {
                              const isPlayed = (i/totalBars) <= progress;
                              const height = 8 + Math.abs(Math.sin((i + seed) * 0.4)) * 14;
                              bars.push(
                                <View 
                                  key={i} 
                                  style={{ 
                                    width: 2.5, 
                                    height, 
                                    backgroundColor: isPlayed ? playedColor : unplayedColor, 
                                    marginHorizontal: 1.2, 
                                    borderRadius: 1.5 
                                  }} 
                                />
                              );
                            }
                            return bars;
                          };

                          const senderData = Array.isArray(message.sender) ? message.sender[0] : message.sender;
                          const avatarUrl = senderData?.avatar_url || (isMyMessage ? user?.user_metadata?.avatar_url : undefined);

                          return (
                            <View style={styles.whatsappAudioContainer}>
                              <TouchableOpacity onPress={() => playAudio(parsed.url, message.id)} style={styles.whatsappAudioPlayBtn}>
                                {isLoading ? (
                                  <ActivityIndicator size="small" color={isDark ? '#aebac1' : '#54656f'} />
                                ) : isPlaying ? (
                                  <Pause size={24} color={isDark ? '#aebac1' : '#54656f'} fill={isDark ? '#aebac1' : '#54656f'} />
                                ) : (
                                  <Play size={24} color={isDark ? '#aebac1' : '#54656f'} fill={isDark ? '#aebac1' : '#54656f'} />
                                )}
                              </TouchableOpacity>
                              
                              <View style={styles.whatsappAudioWaveformArea}>
                                <View style={styles.whatsappAudioWaveformBars}>
                                  {renderWaveform(message.id, progressRatio, isMyMessage)}
                                </View>
                                <Slider
                                  style={styles.whatsappAudioSlider}
                                  minimumValue={0}
                                  maximumValue={currentDuration}
                                  value={currentPosition}
                                  minimumTrackTintColor="transparent"
                                  maximumTrackTintColor="transparent"
                                  thumbTintColor="transparent"
                                  onSlidingStart={handleSlidingStart}
                                  onValueChange={handleValueChange}
                                  onSlidingComplete={seekAudio}
                                />
                                <Text style={styles.whatsappAudioTime}>
                                  {formatAudioTime(isPlaying ? currentPosition : durationMs)}
                                </Text>
                              </View>

                              <View style={styles.whatsappAudioAvatarContainer}>
                                {avatarUrl ? (
                                  <Image source={{uri: avatarUrl}} style={styles.whatsappAudioAvatar} />
                                ) : (
                                  <View style={styles.whatsappAudioAvatarPlaceholder}>
                                    <Text style={{color: '#fff', fontSize: 10, fontWeight: 'bold'}}>{senderData?.full_name?.charAt(0) || 'U'}</Text>
                                  </View>
                                )}
                                <View style={styles.whatsappAudioMicBadge}>
                                  <Mic size={10} color="#fff" />
                                </View>
                              </View>
                            </View>
                          );
                        }
                      } catch (e) {
                        // ignore and fall back
                      }
                      return renderMessageTextWithLinks(message.content, isMyMessage);
                    })()}
                    <View style={styles.messageFooter}>
                      {favoritedMessageIds.includes(message.id) && (
                        <Star size={10} color="#ffb900" fill="#ffb900" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.messageTime,
                          isMyMessage 
                            ? [styles.myMessageTime, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)' }] 
                            : [styles.otherMessageTime, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)' }],
                        ]}
                      >
                        {message.is_edited && <Text style={{ fontStyle: 'italic', fontSize: 9 }}>editada • </Text>}
                        {formatTime(message.created_at)}
                      </Text>
                      {isMyMessage && (
                        <View style={styles.readStatus}>
                          {message.read ? (
                            <CheckCheck size={14} color="#53bdeb" strokeWidth={2.5} />
                          ) : message.delivered ? (
                            <CheckCheck size={14} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)"} strokeWidth={2.5} />
                          ) : (
                            <Check size={14} color={isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.45)"} strokeWidth={2.5} />
                          )}
                        </View>
                      )}
                    </View>
                  </Pressable>
                  
                  {/* Reactions */}
                  {message.reactions && message.reactions.length > 0 && (
                    <View style={[styles.reactionsContainer, isMyMessage ? { right: 4, alignItems: 'flex-end' } : { left: 4, alignItems: 'flex-start' }]}>
                      {Object.entries(
                        message.reactions.reduce((acc, curr) => {
                          acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([emoji, count]) => (
                        <View key={emoji} style={[styles.reactionPill, { backgroundColor: isDark ? '#2c2c2e' : '#fff', borderColor: isDark ? '#3a3a3c' : '#E5E5EA' }]}>
                          <Text style={styles.reactionEmoji}>{emoji}</Text>
                          {Number(count) > 1 && <Text style={[styles.reactionCount, { color: textSecondary }]}>{Number(count)}</Text>}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          {isTyping && (
            <Animated.View style={[styles.messageWrapper, styles.otherMessageWrapper]}>
              <View style={[styles.messageBubble, styles.otherMessageBubble, { backgroundColor: isDark ? '#202c33' : '#ffffff', flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomLeftRadius: 6, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20 }]}>
                {otherUser?.avatar_url ? (
                  <Image source={{ uri: otherUser.avatar_url }} style={{ width: 20, height: 20, borderRadius: 10, marginRight: 8 }} />
                ) : (
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: accent, marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 10 }}>{(otherUser?.full_name || 'U').charAt(0)}</Text>
                  </View>
                )}
                <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent, marginRight: 4 }, pulseStyle]} />
                <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent, marginRight: 4, opacity: 0.7 }, pulseStyle]} />
                <Animated.View style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent, opacity: 0.4 }, pulseStyle]} />
              </View>
            </Animated.View>
          )}
        </ScrollView>
      )}

      <View style={[
        styles.inputContainer, 
        { 
          backgroundColor: isDark ? '#0b141a' : '#efeae2',
          borderTopWidth: 0,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8 
        }
      ]}>
        {/* REPLY PREVIEW BANNER */}
        {replyingMessage && (
          <View style={[styles.replyPreviewContainer, { backgroundColor: isDark ? '#1f2c34' : '#f0f2f5', borderLeftColor: '#25D366' }]}>
            <View style={{ flex: 1, paddingVertical: 4 }}>
              <Text style={[styles.replyPreviewTitle, { color: '#25D366' }]}>Respondendo a {replyingMessage.sender?.full_name || 'Usuário'}</Text>
              <Text style={[styles.replyPreviewText, { color: textSecondary }]} numberOfLines={1}>
                {replyingMessage.content.startsWith('{') ? '📷 Mídia' : replyingMessage.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingMessage(null)} style={{ padding: 6 }}>
              <X size={16} color={textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* EDIT PREVIEW BANNER */}
        {isEditingMessage && (
          <View style={[styles.replyPreviewContainer, { backgroundColor: isDark ? '#1f2c34' : '#f0f2f5', borderLeftColor: '#ff9500' }]}>
            <View style={{ flex: 1, paddingVertical: 4 }}>
              <Text style={[styles.replyPreviewTitle, { color: '#ff9500' }]}>{t('auto.s0cdb36b0', 'Editando Mensagem')}</Text>
              <Text style={[styles.replyPreviewText, { color: textSecondary }]} numberOfLines={1}>
                {messageText}
              </Text>
            </View>
            <TouchableOpacity onPress={() => {
              setIsEditingMessage(false);
              setEditingMessageId(null);
              setMessageText('');
            }} style={{ padding: 6 }}>
              <X size={16} color={textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.whatsappInputRow}>
          <View style={[styles.whatsappInputPill, { backgroundColor: isDark ? '#2a3942' : '#ffffff' }]}>
            {!isRecording && (
              <TouchableOpacity style={styles.whatsappEmojiBtn} onPress={() => inputRef.current?.focus()}>
                <Text style={{ fontSize: 24, color: isDark ? '#8696a0' : '#8596a0' }}>{t('auto.s2a02eac3', '😀')}</Text>
              </TouchableOpacity>
            )}

            {isRecording ? (
              <View style={[styles.recordingOverlay, { backgroundColor: 'transparent', paddingHorizontal: 12 }]}>
                {isRecordingLocked ? (
                  <TouchableOpacity onPress={() => stopAudioRecording(true)} style={{ padding: 8 }}>
                    <Trash2 size={24} color="#ff3b30" />
                  </TouchableOpacity>
                ) : null}

                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, flex: isRecordingLocked ? 1 : 0, justifyContent: isRecordingLocked ? 'center' : 'flex-start'}}>
                  <Animated.View style={pulseStyle}>
                    <Mic size={20} color="#ff3b30" />
                  </Animated.View>
                  <Text style={[styles.recordingText, { color: isDark ? '#fff' : '#000', flex: 0 }]}>
                    {formatDuration(recordingDuration)}
                  </Text>
                  
                  {/* REAL TIME WAVEFORM */}
                  <LiveWaveform meteringShared={meteringShared} />
                </View>

                {!isRecordingLocked && (
                  <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', paddingRight: 4}}>
                    <Animated.View style={[{flexDirection: 'row', alignItems: 'center'}, slideTextOpacity]}>
                      <Text style={{color: isDark ? '#8696a0' : '#8596a0', fontSize: 13}}>
                        {'< Deslize para cancelar'}
                      </Text>
                    </Animated.View>
                  </View>
                )}
              </View>
            ) : (
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: isDark ? '#fff' : '#000', flex: 1, backgroundColor: 'transparent' }]}
                placeholder={t('messages.typeMessage', 'Mensagem')}
                placeholderTextColor={isDark ? '#8696a0' : '#8596a0'}
                value={messageText}
                onChangeText={(text) => {
                  setMessageText(text);
                  handleTyping(text);
                }}
                multiline
                maxLength={1000}
              />
            )}

            {!isRecording && (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 8, gap: 16 }}>
                <TouchableOpacity onPress={() => setMediaSourceModalVisible(true)} disabled={sending || isRecording}>
                  <Paperclip size={24} color={isDark ? '#8696a0' : '#8596a0'} style={{ transform: [{ rotate: '-45deg' }] }} />
                </TouchableOpacity>
                {!messageText.trim() && (
                  <TouchableOpacity onPress={() => setMediaSourceModalVisible(true)} disabled={sending || isRecording}>
                    <Camera size={24} color={isDark ? '#8696a0' : '#8596a0'} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {messageText.trim().length > 0 || isRecordingLocked ? (
            <TouchableOpacity
              style={styles.whatsappSendCircle}
              onPress={isRecordingLocked ? () => stopAudioRecording(false) : sendMessage}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={20} color="#fff" style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
          ) : (
            <Animated.View
              style={[styles.whatsappSendCircle, micAnimatedStyle]}
              {...micPanResponder.panHandlers}
            >
              <Mic size={24} color="#fff" />
            </Animated.View>
          )}
        </View>
      </View>

      {/* MODAL DE INFORMAÇÕES E PARTICIPANTES DO GRUPO */}
      <Modal
        visible={groupInfoModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGroupInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={[styles.modalContent, { backgroundColor: backgroundPrimary }]}
          >
            {/* Header do Modal */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>{t('auto.sb47a9d6e', 'Detalhes do Grupo')}</Text>
              <TouchableOpacity 
                onPress={() => setGroupInfoModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
              >
                <X size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Scroll Único do Modal para rolar TUDO de forma fluida */}
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Info do Grupo */}
              <View style={styles.groupInfoContainer}>
                <TouchableOpacity 
                  disabled={!isAdminOfGroup || updatingGroup} 
                  onPress={changeGroupPhoto}
                  style={styles.avatarEditContainer}
                  activeOpacity={0.8}
                >
                  {conversation?.avatar_url ? (
                    <Image source={{ uri: conversation.avatar_url }} style={styles.largeGroupAvatar} />
                  ) : (
                    <View style={[styles.largeGroupAvatar, styles.largeGroupAvatarPlaceholder, { backgroundColor: accent }]}>
                      <Text style={styles.largeGroupAvatarText}>
                        {(conversation?.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {isAdminOfGroup && (
                    <View style={styles.cameraOverlay}>
                      <Camera size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
                
                <Text style={[styles.largeGroupName, { color: textPrimary }]}>{conversation?.name}</Text>
                <Text style={[styles.largeGroupSubtitle, { color: textSecondary }]}>
                  {groupParticipants.length} {groupParticipants.length === 1 ? 'participante' : 'participantes'}
                </Text>

                {/* DESCRIÇÃO DO GRUPO */}
                <View style={[styles.groupDescriptionBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}>
                  {isEditingDescription ? (
                    <View style={{ width: '100%' }}>
                      <TextInput
                        style={[styles.descriptionInput, { color: textPrimary, borderBottomColor: accent }]}
                        placeholder={t('auto.s365637c7', 'Adicione uma descrição legal para o grupo...')}
                        placeholderTextColor="#8E8E93"
                        value={editedDescription}
                        onChangeText={setEditedDescription}
                        multiline
                        maxLength={150}
                      />
                      <View style={styles.descriptionEditActions}>
                        <TouchableOpacity 
                          style={[styles.descriptionBtn, styles.descriptionCancelBtn]} 
                          onPress={() => {
                            setEditedDescription(conversation?.description || '');
                            setIsEditingDescription(false);
                          }}
                        >
                          <Text style={styles.descriptionBtnText}>{t('auto.s847607d7', 'Cancelar')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.descriptionBtn, { backgroundColor: accent }]} 
                          onPress={saveGroupDescription}
                        >
                          <Text style={styles.descriptionBtnText}>{t('auto.seb7a0fed', 'Salvar')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      disabled={!isAdminOfGroup}
                      onPress={() => setIsEditingDescription(true)}
                      style={{ width: '100%', paddingVertical: 4 }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.groupDescriptionText, { color: conversation?.description ? textPrimary : '#8E8E93' }]}>
                        {conversation?.description || (isAdminOfGroup ? 'Clique para adicionar uma descrição...' : 'Sem descrição.')}
                      </Text>
                      {isAdminOfGroup && (
                        <Text style={[styles.editHintText, { color: accent }]}>{t('auto.s545215c5', 'Toque para editar descrição')}</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Botões de Ações Gerais */}
              <View style={styles.groupActionsRow}>
                {isAdminOfGroup && (
                  <TouchableOpacity 
                    style={[styles.groupActionBtn, { backgroundColor: accent }]}
                    onPress={() => {
                      loadUsersToAdd();
                      setAddUserModalVisible(true);
                    }}
                  >
                    <Plus size={18} color="#fff" />
                    <Text style={styles.groupActionBtnText}>{t('auto.s8628de65', 'Adicionar Membro')}</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.groupActionBtn, styles.leaveGroupBtn]}
                  onPress={leaveGroup}
                >
                  <LogOut size={18} color="#fff" />
                  <Text style={styles.groupActionBtnText}>{t('auto.s3cdd187d', 'Sair do Grupo')}</Text>
                </TouchableOpacity>
              </View>

              {/* Tab Bar Container */}
              <View style={[styles.tabBarContainer, { borderBottomColor: isDark ? '#1a1a1a' : '#f0f0f2' }]}>
                <TouchableOpacity 
                  style={[styles.tabItem, activeTab === 'members' && styles.tabItemActive]} 
                  onPress={() => setActiveTab('members')}
                >
                  <Text style={[styles.tabText, { color: activeTab === 'members' ? accent : textSecondary }]}>{t('auto.s0a32c571', 'Membros')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabItem, activeTab === 'media' && styles.tabItemActive]} 
                  onPress={() => setActiveTab('media')}
                >
                  <Text style={[styles.tabText, { color: activeTab === 'media' ? accent : textSecondary }]}>Mídias ({groupMedia.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabItem, activeTab === 'links' && styles.tabItemActive]} 
                  onPress={() => setActiveTab('links')}
                >
                  <Text style={[styles.tabText, { color: activeTab === 'links' ? accent : textSecondary }]}>Links ({groupLinks.length})</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabItem, activeTab === 'events' && styles.tabItemActive]} 
                  onPress={() => setActiveTab('events')}
                >
                  <Text style={[styles.tabText, { color: activeTab === 'events' ? accent : textSecondary }]}>Eventos ({groupEvents.length})</Text>
                </TouchableOpacity>
              </View>

              {/* Members Tab Content */}
              {activeTab === 'members' && (
                <View>
                  {/* Título da Lista */}
                  <Text style={[styles.listHeaderTitle, { color: textPrimary, marginLeft: 24, marginTop: 15 }]}>{t('auto.sf719121f', 'Membros do Grupo')}</Text>

                  {/* Lista de Participantes mapeada diretamente */}
                  <View style={{ paddingHorizontal: 24 }}>
                    {groupParticipants.map((participant: any) => {
                      const isMe = participant.user_id === user?.id;
                      return (
                        <TouchableOpacity
                          key={participant.user_id}
                          style={[styles.participantItem, { borderBottomColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}
                          disabled={!isAdminOfGroup || isMe}
                          onPress={() => handleParticipantPress(participant)}
                          activeOpacity={0.7}
                        >
                          {participant.profiles?.avatar_url ? (
                            <Image source={{ uri: participant.profiles.avatar_url }} style={styles.participantAvatar} />
                          ) : (
                            <View style={[styles.participantAvatar, styles.participantAvatarPlaceholder, { backgroundColor: accent }]}>
                              <Text style={styles.participantAvatarText}>
                                {(participant.profiles?.username || participant.profiles?.full_name || '?').charAt(0).toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.participantInfo}>
                            <Text style={[styles.participantName, { color: textPrimary }]} numberOfLines={1}>
                              {participant.profiles?.full_name} {isMe && '(Você)'}
                            </Text>
                            <Text style={[styles.participantUsername, { color: textSecondary }]} numberOfLines={1}>
                              @{participant.profiles?.username}
                            </Text>
                          </View>
                          
                          {/* Badges e Ações */}
                          <View style={styles.participantActions}>
                            {participant.is_admin && (
                              <View style={styles.adminBadge}>
                                <Crown size={11} color="#ffb900" style={{ marginRight: 3 }} />
                                <Text style={styles.adminBadgeText}>{t('auto.se3afed00', 'Admin')}</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Media Tab Content */}
              {activeTab === 'media' && (
                <View style={styles.mediaTabContent}>
                  {groupMedia.length === 0 ? (
                    <View style={styles.emptyTabState}>
                      <ImageIcon size={40} color={isDark ? '#444' : '#ccc'} />
                      <Text style={[styles.emptyTabText, { color: textSecondary }]}>{t('auto.s7dac2f52', 'Nenhuma mídia compartilhada neste grupo')}</Text>
                    </View>
                  ) : (
                    <View style={styles.mediaGrid}>
                      {groupMedia.map(item => (
                        <TouchableOpacity 
                          key={item.id} 
                          style={styles.mediaGridItem}
                          activeOpacity={0.8}
                        >
                          <Image source={{ uri: item.url }} style={styles.mediaGridImage} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Links Tab Content */}
              {activeTab === 'links' && (
                <View style={styles.linksTabContent}>
                  {groupLinks.length === 0 ? (
                    <View style={styles.emptyTabState}>
                      <Link size={40} color={isDark ? '#444' : '#ccc'} />
                      <Text style={[styles.emptyTabText, { color: textSecondary }]}>{t('auto.scecdb838', 'Nenhum link compartilhado neste grupo')}</Text>
                    </View>
                  ) : (
                    <View style={styles.linksList}>
                      {groupLinks.map(item => (
                        <TouchableOpacity 
                          key={item.id} 
                          style={[styles.linkItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}
                          onPress={() => {
                            import('react-native').then(({ Linking }) => {
                              Linking.openURL(item.url).catch(err => console.error("Couldn't open URL", err));
                            });
                          }}
                        >
                          <View style={[styles.linkIconCircle, { backgroundColor: accent }]}>
                            <Link size={16} color="#fff" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.linkUrlText, { color: accent }]} numberOfLines={1}>{item.url}</Text>
                            <Text style={[styles.linkSnippetText, { color: textSecondary }]} numberOfLines={2}>{item.text}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Events Tab Content */}
              {activeTab === 'events' && (
                <View style={styles.eventsTabContent}>
                  {groupEvents.length === 0 ? (
                    <View style={styles.emptyTabState}>
                      <Calendar size={40} color={isDark ? '#444' : '#ccc'} />
                      <Text style={[styles.emptyTabText, { color: textSecondary }]}>{t('auto.se8e46371', 'Nenhum evento compartilhado neste grupo')}</Text>
                    </View>
                  ) : (
                    <View style={styles.eventsList}>
                      {groupEvents.map(item => (
                        <TouchableOpacity 
                          key={item.id} 
                          style={[styles.sharedEventItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}
                          onPress={() => {
                            setGroupInfoModalVisible(false);
                            router.push(`/event/${item.event_id}`);
                          }}
                        >
                          {item.image ? (
                            <Image source={{ uri: item.image }} style={styles.sharedEventImage} />
                          ) : (
                            <View style={[styles.sharedEventImagePlaceholder, { backgroundColor: accent }]}>
                              <Text style={styles.sharedEventPlaceholderText}>{t('auto.s7c59a975', 'UNИA')}</Text>
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.sharedEventTitle, { color: textPrimary }]} numberOfLines={1}>{item.title}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                              <Calendar size={12} color={accent} />
                              <Text style={[styles.sharedEventDate, { color: textSecondary }]}>{new Date(item.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {/* CUSTOM MEMBER ACTION BOTTOM SHEET OVERLAY (INSIDE THE DETAILS MODAL!) */}
            {memberActionModalVisible && (
              <Pressable 
                style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'flex-end', zIndex: 9999 }]} 
                onPress={() => setMemberActionModalVisible(false)}
              >
                <Pressable style={[styles.actionSheetContent, { backgroundColor: backgroundPrimary }]}>
                  {/* Linha indicadora de arrasto */}
                  <View style={[styles.dragIndicator, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
                  
                  <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>{t('auto.s831f1027', 'Gerenciar Membro')}</Text>
                  
                  {/* Info do usuário selecionado */}
                  {selectedMemberForAction && (
                    <View style={styles.actionSheetUserCard}>
                      {selectedMemberForAction.profiles?.avatar_url ? (
                        <Image source={{ uri: selectedMemberForAction.profiles.avatar_url }} style={styles.actionSheetAvatar} />
                      ) : (
                        <View style={[styles.actionSheetAvatar, { backgroundColor: accent, justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>
                            {(selectedMemberForAction.profiles?.username || selectedMemberForAction.profiles?.full_name || '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.actionSheetUserName, { color: textPrimary }]}>
                          {selectedMemberForAction.profiles?.full_name}
                        </Text>
                        <Text style={[styles.actionSheetUserHandle, { color: textSecondary }]}>
                          @{selectedMemberForAction.profiles?.username}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Ações */}
                  <View style={styles.actionSheetButtons}>
                    {selectedMemberForAction && !selectedMemberForAction.is_admin && (
                      <TouchableOpacity 
                        style={[styles.actionSheetBtn, { borderColor: '#8000ff', borderWidth: 1.5 }]}
                        onPress={() => {
                          setMemberActionModalVisible(false);
                          Alert.alert(
                            'Promover a Admin 👑',
                            `Deseja promover ${selectedMemberForAction.profiles?.full_name} a administrador?`,
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Confirmar', onPress: () => promoteToAdmin(selectedMemberForAction.user_id) }
                            ]
                          );
                        }}
                      >
                        <Crown size={20} color="#8000ff" />
                        <Text style={[styles.actionSheetBtnText, { color: '#8000ff' }]}>{t('auto.s7e5a826b', 'Tornar Administrador')}</Text>
                      </TouchableOpacity>
                    )}

                    {selectedMemberForAction && (
                      <TouchableOpacity 
                        style={[styles.actionSheetBtn, { borderColor: '#ff3b30', borderWidth: 1.5 }]}
                        onPress={() => {
                          setMemberActionModalVisible(false);
                          Alert.alert(
                            'Remover do Grupo ❌',
                            `Tem certeza que deseja remover ${selectedMemberForAction.profiles?.full_name} do grupo?`,
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Remover', style: 'destructive', onPress: () => removeFromGroup(selectedMemberForAction.user_id) }
                            ]
                          );
                        }}
                      >
                        <Trash2 size={20} color="#ff3b30" />
                        <Text style={[styles.actionSheetBtnText, { color: '#ff3b30' }]}>{t('auto.s85b3d9d0', 'Remover do Grupo')}</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                      style={[styles.actionSheetBtn, { backgroundColor: isDark ? '#222' : '#f0f0f0', marginTop: 8 }]}
                      onPress={() => setMemberActionModalVisible(false)}
                    >
                      <Text style={[styles.actionSheetBtnText, { color: textPrimary }]}>{t('auto.s847607d7', 'Cancelar')}</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Pressable>
            )}

            {/* CUSTOM ADD MEMBER OVERLAY (INSIDE THE DETAILS MODAL!) */}
            {addUserModalVisible && (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: backgroundPrimary, zIndex: 9998, paddingTop: 20 }]}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: textPrimary }]}>{t('auto.s8628de65', 'Adicionar Membro')}</Text>
                  <TouchableOpacity 
                    onPress={() => setAddUserModalVisible(false)}
                    style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                  >
                    <X size={20} color={textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Barra de Pesquisa */}
                <View style={[styles.modalSearchBar, { backgroundColor: isDark ? '#1a1a1a' : '#f0f0f2' }]}>
                  <Search size={18} color="#8E8E93" style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.modalSearchInput, { color: textPrimary }]}
                    placeholder={t('auto.sd26fa724', 'Pesquisar por nome ou username...')}
                    placeholderTextColor="#8E8E93"
                    value={searchUserQuery}
                    onChangeText={setSearchUserQuery}
                  />
                </View>

                {/* Lista de Usuários Disponíveis */}
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                >
                  {availableUsersToAdd
                    .filter(u => 
                      u.full_name?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                      u.username?.toLowerCase().includes(searchUserQuery.toLowerCase())
                    )
                    .map((availableUser: any) => (
                      <View 
                        key={availableUser.id}
                        style={[styles.participantItem, { borderBottomColor: isDark ? '#1a1a1a' : '#f0f0f0' }]}
                      >
                        {availableUser.avatar_url ? (
                          <Image source={{ uri: availableUser.avatar_url }} style={styles.participantAvatar} />
                        ) : (
                          <View style={[styles.participantAvatar, styles.participantAvatarPlaceholder, { backgroundColor: accent }]}>
                            <Text style={styles.participantAvatarText}>
                              {(availableUser.username || availableUser.full_name || '?').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={styles.participantInfo}>
                          <Text style={[styles.participantName, { color: textPrimary }]} numberOfLines={1}>
                            {availableUser.full_name}
                          </Text>
                          <Text style={[styles.participantUsername, { color: textSecondary }]} numberOfLines={1}>
                            @{availableUser.username}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.addMemberBtn, { backgroundColor: accent }]}
                          onPress={() => addUserToGroup(availableUser.id)}
                        >
                          <Text style={styles.addMemberBtnText}>{t('auto.sdbaee1c1', 'Adicionar')}</Text>
                        </TouchableOpacity>
                      </View>
                    ))
                  }
                  {availableUsersToAdd.length === 0 && (
                    <Text style={[styles.emptyModalText, { color: textSecondary }]}>
                      Todos os usuários já estão no grupo ou não foram encontrados.
                    </Text>
                  )}
                </ScrollView>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* MESSAGE ACTION BOTTOM SHEET OVERLAY */}
      {messageActionModalVisible && selectedMessageForAction && (
        <Modal
          transparent
          animationType="fade"
          visible={messageActionModalVisible}
          onRequestClose={() => setMessageActionModalVisible(false)}
        >
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', zIndex: 99999 }]}>
            {/* Backdrop */}
            <Pressable 
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]} 
              onPress={() => setMessageActionModalVisible(false)}
            />
            
            {/* Action Sheet Content */}
            <View style={[styles.actionSheetContent, { backgroundColor: backgroundPrimary }]}>
              {/* Linha indicadora de arrasto */}
              <View style={[styles.dragIndicator, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
              
              <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>{t('messages.messageOptions', 'Opções de Mensagem')}</Text>
              
              {/* Quick Emojis */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 }}>
                {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => {
                  const hasReacted = selectedMessageForAction?.reactions?.some((r: any) => r.user_id === user?.id && r.emoji === emoji);
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: hasReacted ? accent + '40' : (isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f2'),
                        borderWidth: hasReacted ? 1 : 0,
                        borderColor: hasReacted ? accent : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onPress={() => handleReaction(selectedMessageForAction.id, emoji)}
                    >
                      <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              
              <View style={styles.actionSheetButtons}>
                {/* 1. Responder */}
                <TouchableOpacity 
                  style={[styles.actionSheetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f2' }]}
                  onPress={() => {
                    setMessageActionModalVisible(false);
                    setReplyingMessage(selectedMessageForAction);
                  }}
                >
                  <CornerUpLeft size={18} color={accent} />
                  <Text style={[styles.actionSheetBtnText, { color: textPrimary }]}>{t('common.reply', 'Responder')}</Text>
                </TouchableOpacity>

                {/* 2. Editar (Apenas se for minha mensagem e for texto simples) */}
                {selectedMessageForAction.sender_id === user?.id && !selectedMessageForAction.content.startsWith('{') && (
                  <TouchableOpacity 
                    style={[styles.actionSheetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f2' }]}
                    onPress={() => {
                      setMessageActionModalVisible(false);
                      setIsEditingMessage(true);
                      setEditingMessageId(selectedMessageForAction.id);
                      setMessageText(selectedMessageForAction.content);
                    }}
                  >
                    <Edit3 size={18} color="#ff9500" />
                    <Text style={[styles.actionSheetBtnText, { color: textPrimary }]}>{t('auto.s199d3f5d', 'Editar Mensagem')}</Text>
                  </TouchableOpacity>
                )}

                {/* 3. Favoritar */}
                <TouchableOpacity 
                  style={[styles.actionSheetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f2' }]}
                  onPress={() => {
                    setMessageActionModalVisible(false);
                    toggleFavorite(selectedMessageForAction.id);
                    hapticFeedback.success();
                  }}
                >
                  <Star 
                    size={18} 
                    color="#ffb900" 
                    fill={favoritedMessageIds.includes(selectedMessageForAction.id) ? "#ffb900" : "transparent"} 
                  />
                  <Text style={[styles.actionSheetBtnText, { color: textPrimary }]}>
                    {favoritedMessageIds.includes(selectedMessageForAction.id) ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                  </Text>
                </TouchableOpacity>

                {/* 4. Excluir (Apenas se for minha mensagem ou for admin do grupo) */}
                {(selectedMessageForAction.sender_id === user?.id || isAdminOfGroup) && (
                  <TouchableOpacity 
                    style={[styles.actionSheetBtn, { backgroundColor: 'rgba(255,59,48,0.1)' }]}
                    onPress={() => {
                      setMessageActionModalVisible(false);
                      deleteMessage(selectedMessageForAction.id);
                    }}
                  >
                    <Trash2 size={18} color="#ff3b30" />
                    <Text style={[styles.actionSheetBtnText, { color: '#ff3b30' }]}>{t('auto.sa25b794d', 'Excluir Mensagem')}</Text>
                  </TouchableOpacity>
                )}

                {/* Cancelar */}
                <TouchableOpacity 
                  style={[styles.actionSheetBtn, { marginTop: 8 }]}
                  onPress={() => setMessageActionModalVisible(false)}
                >
                  <Text style={[styles.actionSheetBtnText, { color: textSecondary }]}>{t('auto.s847607d7', 'Cancelar')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MEDIA PICKER BOTTOM SHEET OVERLAY */}
      {mediaSourceModalVisible && (
        <Modal
          transparent
          animationType="fade"
          visible={mediaSourceModalVisible}
          onRequestClose={() => setMediaSourceModalVisible(false)}
        >
          <View style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', zIndex: 99999 }]}>
            {/* Backdrop */}
            <Pressable 
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]} 
              onPress={() => setMediaSourceModalVisible(false)}
            />
            
            {/* Action Sheet Content */}
            <View style={[styles.actionSheetContent, { backgroundColor: backgroundPrimary }]}>
              {/* Linha indicadora de arrasto */}
              <View style={[styles.dragIndicator, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]} />
              
              <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>{t('messages.sendMedia', 'Enviar Mídia')}</Text>
              
              <View style={styles.actionSheetButtons}>
                {/* 1. Escolher da Galeria */}
                <TouchableOpacity 
                  style={[styles.actionSheetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f2' }]}
                  onPress={handlePickFromGallery}
                >
                  <ImageIcon size={18} color={accent} />
                  <Text style={[styles.actionSheetBtnText, { color: textPrimary }]}>{t('messages.chooseGallery', 'Escolher da Galeria')}</Text>
                </TouchableOpacity>

                {/* 2. Tirar Foto com a Câmera */}
                <TouchableOpacity 
                  style={[styles.actionSheetBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f2' }]}
                  onPress={handleTakePhoto}
                >
                  <Camera size={18} color="#FF9500" />
                  <Text style={[styles.actionSheetBtnText, { color: textPrimary }]}>{t('messages.takePhoto', 'Tirar Foto (Câmera)')}</Text>
                </TouchableOpacity>

                {/* Cancelar */}
                <TouchableOpacity 
                  style={[styles.actionSheetBtn, { marginTop: 8 }]}
                  onPress={() => setMediaSourceModalVisible(false)}
                >
                  <Text style={[styles.actionSheetBtnText, { color: textSecondary }]}>{t('auto.s847607d7', 'Cancelar')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* CONTACT INFO MODAL (WhatsApp Style) */}
      <Modal
        visible={contactInfoVisible}
        animationType="slide"
        onRequestClose={() => setContactInfoVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#f2f2f6' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 10, backgroundColor: isDark ? '#000' : '#f2f2f6' }}>
            <TouchableOpacity onPress={() => setContactInfoVisible(false)} style={{ padding: 8, marginLeft: -8 }}>
              <Text style={{ fontSize: 32, color: isDark ? '#fff' : '#000', lineHeight: 32 }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '600', color: isDark ? '#fff' : '#000' }}>{t('auto.sbc3da4fb', 'Dados do contato')}</Text>
            <TouchableOpacity style={{ padding: 8, marginRight: -8 }}>
              <Text style={{ fontSize: 17, color: '#007AFF' }}>{t('auto.sef485eb6', 'Editar')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Avatar and Name */}
            <View style={{ alignItems: 'center', marginTop: 10 }}>
              {otherUser?.avatar_url ? (
                <Image source={{ uri: otherUser.avatar_url }} style={{ width: 120, height: 120, borderRadius: 60 }} />
              ) : (
                <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 40, color: '#fff', fontWeight: 'bold' }}>{otherUser?.full_name?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: isDark ? '#fff' : '#000', marginTop: 12 }}>{otherUser?.full_name}</Text>
            </View>

            {/* Settings Sections */}
            <View style={{ marginTop: 24 }}>
              <View style={{ backgroundColor: isDark ? '#1c1c1e' : '#fff', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' }}>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#e5e5ea' }}
                  onPress={() => { setContactInfoVisible(false); setIsSearchingMessages(true); }}
                >
                  <Search size={22} color={isDark ? '#fff' : '#000'} />
                  <Text style={{ flex: 1, fontSize: 16, marginLeft: 12, color: isDark ? '#fff' : '#000' }}>{t('auto.s31da956d', 'Pesquisar')}</Text>
                  <ChevronRight size={20} color="#C7C7CC" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#e5e5ea' }}
                  onPress={() => {
                    setContactInfoVisible(false);
                    setTimeout(() => setMediaLinksModalVisible(true), 300);
                  }}
                >
                  <ImageIcon size={22} color={isDark ? '#fff' : '#000'} />
                  <Text style={{ flex: 1, fontSize: 16, marginLeft: 12, color: isDark ? '#fff' : '#000' }}>{t('auto.sa5ec3450', 'Mídia, links e docs')}</Text>
                  <ChevronRight size={20} color="#C7C7CC" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
                  onPress={() => {
                    setContactInfoVisible(false);
                    setTimeout(() => setFavoritesModalVisible(true), 300);
                  }}
                >
                  <Star size={22} color={isDark ? '#fff' : '#000'} />
                  <Text style={{ flex: 1, fontSize: 16, marginLeft: 12, color: isDark ? '#fff' : '#000' }}>{t('auto.sa94cb900', 'Favoritas')}</Text>
                  <ChevronRight size={20} color="#C7C7CC" />
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: isDark ? '#1c1c1e' : '#fff', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#e5e5ea' }}
                  onPress={toggleMute}
                >
                  <Bell size={22} color={isDark ? '#fff' : '#000'} />
                  <Text style={{ flex: 1, fontSize: 16, marginLeft: 12, color: isDark ? '#fff' : '#000' }}>{t('auto.sc5786b62', 'Notificações')}</Text>
                  <Text style={{ color: '#8E8E93', marginRight: 8, fontSize: 16 }}>{isChatMuted ? 'Silenciado' : 'Ativado'}</Text>
                  <ChevronRight size={20} color="#C7C7CC" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#e5e5ea' }}
                  onPress={() => Alert.alert('Tema', 'O tema escuro/claro está acompanhando o sistema do seu celular.')}
                >
                  <Palette size={22} color={isDark ? '#fff' : '#000'} />
                  <Text style={{ flex: 1, fontSize: 16, marginLeft: 12, color: isDark ? '#fff' : '#000' }}>{t('auto.sc1e6050f', 'Tema da conversa')}</Text>
                  <ChevronRight size={20} color="#C7C7CC" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
                  onPress={toggleSavePhotos}
                >
                  <Download size={22} color={isDark ? '#fff' : '#000'} />
                  <Text style={{ flex: 1, fontSize: 16, marginLeft: 12, color: isDark ? '#fff' : '#000' }}>{t('auto.sbfc77d54', 'Salvar no Fotos')}</Text>
                  <Text style={{ color: '#8E8E93', marginRight: 8, fontSize: 16 }}>{saveToPhotos ? 'Padrão' : 'Nunca'}</Text>
                  <ChevronRight size={20} color="#C7C7CC" />
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: isDark ? '#1c1c1e' : '#fff', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', marginTop: 16 }}>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#e5e5ea' }}
                  onPress={changeDisappearingTimer}
                >
                  <Clock size={22} color={isDark ? '#fff' : '#000'} />
                  <Text style={{ flex: 1, fontSize: 16, marginLeft: 12, color: isDark ? '#fff' : '#000' }}>{t('auto.s344456cb', 'Mensagens temporárias')}</Text>
                  <Text style={{ color: '#8E8E93', marginRight: 8, fontSize: 16 }}>
                    {disappearingTimer === 86400 ? '24 horas' : disappearingTimer === 604800 ? '7 dias' : 'Desativadas'}
                  </Text>
                  <ChevronRight size={20} color="#C7C7CC" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}
                  onPress={toggleChatLock}
                >
                  <Lock size={22} color={isDark ? '#fff' : '#000'} />
                  <Text style={{ flex: 1, fontSize: 16, marginLeft: 12, color: isDark ? '#fff' : '#000' }}>{t('auto.scf1ff5da', 'Trancar conversa')}</Text>
                  <View style={{ width: 44, height: 26, borderRadius: 13, backgroundColor: isChatLocked ? '#34C759' : (isDark ? '#3a3a3c' : '#e9e9ea'), justifyContent: 'center' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', margin: 2, transform: [{ translateX: isChatLocked ? 18 : 0 }] }} />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* FULLSCREEN IMAGE VIEWER */}
      <Modal visible={!!fullscreenMessage} transparent animationType="fade" onRequestClose={() => setFullscreenMessage(null)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 10, backgroundColor: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setFullscreenMessage(null)} style={{ padding: 8, marginLeft: -8 }}>
                <ArrowLeft size={24} color="#fff" />
              </TouchableOpacity>
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff' }}>
                  {fullscreenMessage?.message?.sender?.full_name || 'Você'}
                </Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  {fullscreenMessage?.message?.created_at ? formatDate(fullscreenMessage.message.created_at) : ''}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={{ padding: 8 }} onPress={() => { if (fullscreenMessage?.message?.id) toggleFavorite(fullscreenMessage.message.id); }}>
                <Star size={24} color="#fff" fill={fullscreenMessage?.message?.id && favoritedMessageIds.includes(fullscreenMessage.message.id) ? '#fff' : 'transparent'} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {fullscreenMessage?.uri && (
              <Image source={{ uri: fullscreenMessage.uri }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
            )}
          </View>
        </View>
      </Modal>

      {/* MEDIA LINKS MODAL */}
<Modal visible={mediaLinksModalVisible} animationType="slide" onRequestClose={() => setMediaLinksModalVisible(false)}>
  <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#f2f2f6' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 10, backgroundColor: isDark ? '#000' : '#f2f2f6' }}>
      <TouchableOpacity onPress={() => setMediaLinksModalVisible(false)} style={{ padding: 8, marginLeft: -8 }}>
        <Text style={{ fontSize: 32, color: isDark ? '#fff' : '#000', lineHeight: 32 }}>‹</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 17, fontWeight: '600', color: isDark ? '#fff' : '#000' }}>{t('auto.sb00008c3', 'Mídia e links')}</Text>
      <View style={{ padding: 8, marginRight: -8, width: 40 }} />
    </View>

    {/* Custom Tabs */}
    <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#000' : '#f2f2f6', borderBottomWidth: 1, borderBottomColor: isDark ? '#333' : '#e5e5ea' }}>
      <TouchableOpacity 
        style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: activeTab === 'media' ? 2 : 0, borderBottomColor: accent }}
        onPress={() => setActiveTab('media')}
      >
        <Text style={{ color: activeTab === 'media' ? accent : (isDark ? '#888' : '#666'), fontWeight: '600' }}>Mídias</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: activeTab === 'links' ? 2 : 0, borderBottomColor: accent }}
        onPress={() => setActiveTab('links')}
      >
        <Text style={{ color: activeTab === 'links' ? accent : (isDark ? '#888' : '#666'), fontWeight: '600' }}>Links</Text>
      </TouchableOpacity>
    </View>

    <ScrollView contentContainerStyle={{ padding: 2 }}>
      {activeTab === 'media' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {messages.filter(m => {
            try {
              if (!m.content) return false;
              if ((m as any).media_url) return true; // Legacy media
              const p = JSON.parse(m.content);
              return p.type === 'image' || p.type === 'video';
            } catch { return false; }
          }).length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', marginTop: 100 }}>
              <ImageIcon size={40} color={isDark ? '#444' : '#ccc'} />
              <Text style={{ color: isDark ? '#888' : '#666', marginTop: 10 }}>Nenhuma mídia compartilhada</Text>
            </View>
          ) : messages.filter(m => {
            try {
              if (!m.content) return false;
              if ((m as any).media_url) return true;
              const p = JSON.parse(m.content);
              return p.type === 'image' || p.type === 'video';
            } catch { return false; }
          }).map((msg, i) => {
            let imgUri = (msg as any).media_url;
            let type = 'image';
            if (msg.content && msg.content.startsWith('{')) {
              try {
                const p = JSON.parse(msg.content);
                imgUri = p.url || p.uri || p.thumbnail;
                type = p.type;
              } catch {}
            }
            if (!imgUri) return null;
            return (
              <TouchableOpacity key={msg.id} style={{ width: '33.3%', aspectRatio: 1, padding: 2 }} onPress={() => {
                if (type === 'image') setFullscreenMessage({ uri: imgUri, message: msg });
              }}>
                <Image source={{ uri: imgUri }} style={{ width: '100%', height: '100%', borderRadius: 4 }} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {activeTab === 'links' && (
        <View style={{ padding: 10 }}>
          {messages.reduce((acc, m) => {
            if (!m.content) return acc;
            try {
              // check if it's a caption inside JSON
              let textToParse = m.content;
              if (m.content.startsWith('{')) {
                const p = JSON.parse(m.content);
                if (p.caption) textToParse = p.caption;
              }
              const urls = textToParse.match(/\bhttps?:\/\/\S+/gi);
              if (urls) {
                urls.forEach(url => {
                  acc.push({ id: m.id + url, url, msg: m });
                });
              }
            } catch {}
            return acc;
          }, [] as any[]).length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 100 }}>
              <Link size={40} color={isDark ? '#444' : '#ccc'} />
              <Text style={{ color: isDark ? '#888' : '#666', marginTop: 10 }}>Nenhum link compartilhado</Text>
            </View>
          ) : messages.reduce((acc, m) => {
            if (!m.content) return acc;
            try {
              let textToParse = m.content;
              if (m.content.startsWith('{')) {
                const p = JSON.parse(m.content);
                if (p.caption) textToParse = p.caption;
              }
              const urls = textToParse.match(/\bhttps?:\/\/\S+/gi);
              if (urls) {
                urls.forEach(url => {
                  acc.push({ id: m.id + url, url, msg: m });
                });
              }
            } catch {}
            return acc;
          }, [] as any[]).map((linkObj: any) => (
            <TouchableOpacity 
              key={linkObj.id} 
              style={{ padding: 15, backgroundColor: isDark ? '#1c1c1e' : '#fff', borderRadius: 8, marginBottom: 10 }}
              onPress={() => Linking.openURL(linkObj.url)}
            >
              <Text style={{ color: accent, fontSize: 16 }} numberOfLines={1}>{linkObj.url}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  </View>
</Modal>

      {/* FAVORITES MODAL */}
      <Modal visible={favoritesModalVisible} animationType="slide" onRequestClose={() => setFavoritesModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: isDark ? '#0b141a' : '#efeae2' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 10, backgroundColor: isDark ? '#000' : '#075e54' }}>
            <TouchableOpacity onPress={() => setFavoritesModalVisible(false)} style={{ padding: 8, marginLeft: -8 }}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff' }}>{t('auto.s84ca3589', 'Mensagens Favoritas')}</Text>
            <View style={{ padding: 8, marginRight: -8, width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {messages.filter(m => favoritedMessageIds.includes(m.id)).map((msg) => {
              let textToRender = msg.content;
              try {
                const p = JSON.parse(msg.content);
                textToRender = p.type === 'text' ? p.text : (p.type === 'image' ? '📸 Imagem' : '🎥 Vídeo');
              } catch {}
              return (
                <View key={msg.id} style={{ backgroundColor: isDark ? '#202c33' : '#fff', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                  <Text style={{ color: isDark ? '#e9edef' : '#111b21' }}>{textToRender}</Text>
                  <Text style={{ fontSize: 10, color: '#8E8E93', alignSelf: 'flex-end', marginTop: 4 }}>{formatDate(msg.created_at)}</Text>
                </View>
              );
            })}
            {messages.filter(m => favoritedMessageIds.includes(m.id)).length === 0 && (
              <Text style={{ textAlign: 'center', marginTop: 40, color: '#8E8E93' }}>{t('auto.sc04ae9f0', 'Nenhuma mensagem favoritada.')}</Text>
            )}
          </ScrollView>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  // Faixa sólida que cobre a área da status bar / notch / dynamic island
  statusBarFill: {
    backgroundColor: '#00d9ff',
    width: '100%',
  },
  headerGradient: {
    paddingBottom: 8,
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
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 2,
    position: 'relative',
    minWidth: 80,
  },
  myMessageBubble: {
    borderTopRightRadius: 2,
  },
  otherMessageBubble: {
    borderTopLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12, // espaço pro footer (hora + checks) ficar no canto inferior direito
  },
  myMessageText: {
    // color handled inline
  },
  otherMessageText: {
    // color handled inline
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'absolute',
    bottom: 4,
    right: 8,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
    marginRight: 4,
  },
  myMessageTime: {
    // color handled inline
  },
  otherMessageTime: {
    // color handled inline
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
  headerTopLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    height: '80%',
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupInfoContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  largeGroupAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  largeGroupAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeGroupAvatarText: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '900',
  },
  largeGroupName: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  largeGroupSubtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  groupActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  groupActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    gap: 8,
  },
  groupActionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  leaveGroupBtn: {
    backgroundColor: '#ff3b30',
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 12,
    opacity: 0.8,
  },
  participantsListContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
  },
  participantAvatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '700',
  },
  participantUsername: {
    fontSize: 13,
    marginTop: 2,
  },
  participantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminBadge: {
    backgroundColor: '#ffb900' + '15',
    borderColor: '#ffb900' + '40',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminBadgeText: {
    color: '#ffb900',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  adminActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(150, 150, 150, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addMemberBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addMemberBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderRadius: 23,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  emptyModalText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 30,
    lineHeight: 20,
  },
  avatarEditContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00d9ff',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  groupDescriptionBox: {
    width: '100%',
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  descriptionInput: {
    fontSize: 14,
    fontWeight: '500',
    minHeight: 60,
    maxHeight: 120,
    borderBottomWidth: 1.5,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  descriptionEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  descriptionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionCancelBtn: {
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  descriptionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  groupDescriptionText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
  },
  editHintText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16,
  },
  actionSheetUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.06)',
    marginBottom: 20,
  },
  actionSheetAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  actionSheetUserName: {
    fontSize: 16,
    fontWeight: '800',
  },
  actionSheetUserHandle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  actionSheetButtons: {
    gap: 12,
  },
  actionSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 25,
    gap: 8,
  },
  actionSheetBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  // Segmented Tab Bar styles
  tabBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1.5,
    marginVertical: 15,
    paddingHorizontal: 12,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#00d9ff',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Media Tab Styles
  mediaTabContent: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaGridItem: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(150, 150, 150, 0.08)',
  },
  mediaGridImage: {
    width: '100%',
    height: '100%',
  },
  // Links Tab Styles
  linksTabContent: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  linksList: {
    gap: 10,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  linkIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkUrlText: {
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  linkSnippetText: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  // Events Tab Styles
  eventsTabContent: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  eventsList: {
    gap: 10,
  },
  sharedEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  sharedEventImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  sharedEventImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharedEventPlaceholderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sharedEventTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sharedEventDate: {
    fontSize: 12,
  },
  // Universal Empty States Styles
  emptyTabState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTabText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Premium Event Card Styles
  premiumEventCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    width: 250,
    marginTop: 4,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  premiumEventHeaderTag: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
    color: '#00d9ff',
  },
  premiumEventImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  premiumEventImagePlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumEventPlaceholderText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  premiumEventDetails: {
    padding: 12,
    gap: 8,
  },
  premiumEventTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  premiumEventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  premiumEventDateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  premiumEventButton: {
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  premiumEventButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  // Reply Quote Styles
  replyQuoteBubble: {
    borderLeftWidth: 3.5,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  replyQuoteName: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  replyQuoteText: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  // Input Reply Preview Banner
  replyPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderLeftWidth: 4,
    justifyContent: 'space-between',
    width: '100%',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  replyPreviewTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 12,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    position: 'absolute',
    bottom: -12,
    zIndex: 10,
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  reactionEmoji: {
    fontSize: 12,
  },
  reactionCount: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: '700',
  },
  whatsappInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    gap: 8,
  },
  whatsappInputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 4,
  },
  whatsappEmojiBtn: {
    padding: 8,
  },
  whatsappSendCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00a884',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  whatsappAudioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 260,
    paddingVertical: 4,
    paddingRight: 4,
  },
  whatsappAudioPlayBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappAudioWaveformArea: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
    marginLeft: 4,
  },
  whatsappAudioWaveformBars: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    height: 32,
  },
  whatsappAudioSlider: {
    position: 'absolute',
    left: -12, // Offset default margin of slider thumb
    right: -12,
    top: 4,
    height: 32,
  },
  whatsappAudioTime: {
    fontSize: 10,
    color: '#8E8E93',
    position: 'absolute',
    bottom: -10,
    left: 0,
  },
  whatsappAudioAvatarContainer: {
    width: 36,
    height: 36,
    position: 'relative',
    marginLeft: 8,
  },
  whatsappAudioAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
  },
  whatsappAudioAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappAudioMicBadge: {
    position: 'absolute',
    bottom: -4,
    left: -6,
    backgroundColor: '#53bdeb',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

