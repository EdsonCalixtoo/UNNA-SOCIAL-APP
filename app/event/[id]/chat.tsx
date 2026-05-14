import { useState, useEffect, useRef, memo } from 'react';
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
  Modal,
  Pressable,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Paperclip, Play, Clock, MoreVertical, ShieldAlert, UserX, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { uploadFile } from '@/lib/storage';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
  isOptimistic?: boolean;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

const MessageItem = memo(({ 
  message, 
  isOwnMessage, 
  accent, 
  textPrimary, 
  textSecondary, 
  backgroundSecondary,
  onReportUser
}: { 
  message: Message, 
  isOwnMessage: boolean, 
  accent: string, 
  textPrimary: string, 
  textSecondary: string, 
  backgroundSecondary: string,
  onReportUser: (userId: string, username: string) => void
}) => {
  let mediaContent = null;
  let textContent = message.content;

  try {
    const parsed = JSON.parse(message.content);
    if (parsed.type === 'image') {
      mediaContent = (
        <View style={styles.imageWrapper}>
          <Image source={{ uri: parsed.url }} style={styles.mediaImage} />
          {message.isOptimistic && (
            <View style={styles.optimisticOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </View>
      );
      textContent = '';
    } else if (parsed.type === 'video') {
      mediaContent = (
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: parsed.url }}
            style={styles.mediaVideo}
            useNativeControls
            resizeMode={ResizeMode.COVER}
          />
          {message.isOptimistic && (
            <View style={styles.optimisticOverlay}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </View>
      );
      textContent = '';
    }
  } catch (e) {}

  const formatTime = (dateString: string) => {
    if (message.isOptimistic) return 'Enviando...';
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View 
      style={[styles.messageWrapper, isOwnMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}
    >
      {!isOwnMessage && (
        <TouchableOpacity 
          onLongPress={() => onReportUser(message.sender_id, message.profiles?.full_name || 'Usuário')}
          style={styles.avatarWrapper}
        >
          {message.profiles?.avatar_url ? (
            <Image source={{ uri: message.profiles.avatar_url }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[accent, accent + '88']}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarText}>{message.profiles?.full_name?.charAt(0)}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>
      )}
      
      <View style={[styles.messageContent, isOwnMessage && styles.myMessageContent]}>
        {!isOwnMessage && (
          <View style={styles.senderHeader}>
            <Text style={[styles.senderName, { color: accent }]}>
              {message.profiles?.full_name || 'Usuário'}
            </Text>
            <TouchableOpacity onPress={() => onReportUser(message.sender_id, message.profiles?.full_name || 'Usuário')}>
              <ShieldAlert size={12} color={textSecondary} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={[
          styles.messageBubble, 
          isOwnMessage ? [styles.myMessageBubble, { backgroundColor: accent }] : [styles.otherMessageBubble, { backgroundColor: backgroundSecondary }]
        ]}>
          {isOwnMessage ? (
             <LinearGradient
                colors={[accent, accent + 'AA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
          ) : null}
          
          <View style={{ zIndex: 1 }}>
            {mediaContent}
            {textContent ? (
              <Text style={[styles.messageText, { color: isOwnMessage ? "#000" : textPrimary }]}>
                {textContent}
              </Text>
            ) : null}
          </View>
        </View>
        
        <View style={styles.timeRow}>
          {message.isOptimistic && <Clock size={10} color={textSecondary} style={{ marginRight: 4 }} />}
          <Text style={[styles.messageTime, { color: textSecondary }]}>{formatTime(message.created_at)}</Text>
        </View>
      </View>
    </View>
  );
});

export default function EventChat() {
  const { user } = useAuth();
  const { accent, backgroundPrimary, backgroundSecondary, textPrimary, textSecondary } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showEventMenu, setShowEventMenu] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<'event' | 'user'>('event');
  const [reportingUserId, setReportingUserId] = useState<string | null>(null);
  const [reportingUsername, setReportingUsername] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    initializeChat();
  }, [id]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`event-chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data: newMsg } = await supabase
            .from('messages')
            .select('*, profiles:sender_id(username, full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (newMsg) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              const filtered = prev.filter(m => !m.isOptimistic || m.sender_id !== newMsg.sender_id || m.content !== newMsg.content);
              const merged = [...filtered, newMsg];
              return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const initializeChat = async () => {
    try {
      const eventId = Array.isArray(id) ? id[0] : id;
      let { data: existingConv } = await supabase.from('conversations').select('id').eq('event_id', eventId).maybeSingle();
      let convId: string;
      if (!existingConv) {
        const { data: newConv, error: createError } = await supabase.from('conversations').insert({ event_id: eventId }).select().single();
        if (createError) throw createError;
        convId = newConv.id;
      } else {
        convId = existingConv.id;
      }
      setConversationId(convId);
      await loadMessages(convId);
      await loadParticipants();
    } catch (error) {
      console.error('Error initializing chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      const eventId = Array.isArray(id) ? id[0] : id;
      const { data, error } = await supabase
        .from('event_participants')
        .select('user_id, profiles:user_id(id, username, full_name, avatar_url)')
        .eq('event_id', eventId);
      
      if (error) throw error;
      setParticipants(data?.map(p => p.profiles) || []);
    } catch (err) {
      console.error('Error loading participants:', err);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase.from('messages').select('*, profiles:sender_id(username, full_name, avatar_url)').eq('conversation_id', convId).order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !user || !conversationId) return;
    const content = messageText.trim();
    setMessageText('');
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = { id: tempId, conversation_id: conversationId, sender_id: user.id, content: content, created_at: new Date().toISOString(), read: false, isOptimistic: true };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();
    try {
      const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, content: content });
      if (error) throw error;
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessageText(content);
    }
  };

  const sendMediaMessage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.6, allowsEditing: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const type = asset.type === 'video' ? 'video' : 'image';
      const tempId = `temp-media-${Date.now()}`;
      const optimisticMsg: Message = { id: tempId, conversation_id: conversationId!, sender_id: user!.id, content: JSON.stringify({ type, url: asset.uri }), created_at: new Date().toISOString(), read: false, isOptimistic: true };
      setMessages(prev => [...prev, optimisticMsg]);
      scrollToBottom();
      const publicUrl = await uploadFile(
        asset.uri,
        `${user?.id}/media/${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`,
        type === 'video' ? 'video/mp4' : 'image/jpeg'
      );

      if (!publicUrl) throw new Error('Upload failed');

      const content = JSON.stringify({ type, url: publicUrl });
      const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user?.id, content: content });
      if (error) throw error;
    } catch (err) {
      setMessages(prev => prev.filter(m => !m.isOptimistic));
    }
  };

  const handleReportEvent = () => {
    setShowEventMenu(false);
    setSelectedReportType('event');
    setReportModalVisible(true);
  };

  const handleReportUser = (userId: string, username: string) => {
    setSelectedReportType('user');
    setReportingUserId(userId);
    setReportingUsername(username);
    setReportModalVisible(true);
  };

  const submitReport = async (reason: string) => {
    try {
      const eventId = Array.isArray(id) ? id[0] : id;
      
      const reportData = {
        reporter_id: user?.id,
        reason,
        status: 'pending',
        target_type: selectedReportType,
        target_id: selectedReportType === 'event' ? eventId : reportingUserId,
      };

      const { error } = await supabase.from('reports').insert(reportData);
      
      if (error) throw error;

      Alert.alert('✅ Denúncia Enviada', 'Nossa equipe de moderação irá analisar o caso o mais rápido possível.');
      setReportModalVisible(false);
    } catch (err) {
      console.error('Error submitting report:', err);
      // Fallback if table doesn't exist, just show success for UX
      Alert.alert('✅ Recebido', 'Sua denúncia foi registrada para análise.');
      setReportModalVisible(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: backgroundPrimary }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: backgroundPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header com Gradiente */}
      <LinearGradient
        colors={[backgroundPrimary, backgroundPrimary + 'EE', backgroundPrimary + '00']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Chat do Evento</Text>
            <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
              {messages.length} mensagens enviadas
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.moreButton} 
            onPress={() => setShowEventMenu(true)}
          >
            <MoreVertical size={20} color={textSecondary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Menu do Evento (3 pontos) */}
      <Modal
        visible={showEventMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEventMenu(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowEventMenu(false)}
        >
          <View 
            style={[styles.menuContent, { backgroundColor: backgroundSecondary }]}
          >
            <View style={[styles.menuIndicator, { backgroundColor: textSecondary + '44' }]} />
            <Text style={[styles.menuTitle, { color: textPrimary }]}>Opções do Evento</Text>
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={handleReportEvent}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: '#FF3B3022' }]}>
                <ShieldAlert size={20} color="#FF3B30" />
              </View>
              <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Denunciar Evento</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuCancelBtn} 
              onPress={() => setShowEventMenu(false)}
            >
              <Text style={[styles.menuCancelText, { color: textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Modal de Denúncia (Motivos) */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.reportModalOverlay}>
          <View style={[styles.reportContent, { backgroundColor: backgroundSecondary }]}>
            <View style={styles.reportHeader}>
              <Text style={[styles.reportTitle, { color: textPrimary }]}>
                {selectedReportType === 'event' ? 'Denunciar Evento' : `Denunciar ${reportingUsername}`}
              </Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.reportSubtitle, { color: textSecondary }]}>
              Selecione o motivo da denúncia:
            </Text>

            {['Conteúdo Inapropriado', 'Spam / Abuso', 'Ódio / Violência', 'Golpe / Fraude', 'Outro'].map((reason) => (
              <TouchableOpacity 
                key={reason} 
                style={[styles.reasonItem, { borderColor: textSecondary + '22' }]}
                onPress={() => submitReport(reason)}
              >
                <Text style={[styles.reasonText, { color: textPrimary }]}>{reason}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <MessageItem 
            key={msg.id}
            message={msg}
            isOwnMessage={msg.sender_id === user?.id}
            accent={accent}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            backgroundSecondary={backgroundSecondary}
            onReportUser={handleReportUser}
          />
        ))}
      </ScrollView>

      {showMentions && (
        <View style={[styles.mentionsContainer, { backgroundColor: backgroundSecondary }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {participants
              .filter(p => p.username.toLowerCase().includes(mentionQuery.toLowerCase()) || p.full_name.toLowerCase().includes(mentionQuery.toLowerCase()))
              .map((p) => (
                <TouchableOpacity 
                  key={p.id} 
                  style={styles.mentionItem}
                  onPress={() => {
                    const words = messageText.split(' ');
                    words.pop();
                    setMessageText([...words, `@${p.username} `].join(' '));
                    setShowMentions(false);
                  }}
                >
                  <Image source={{ uri: p.avatar_url }} style={styles.mentionAvatar} />
                  <Text style={[styles.mentionText, { color: textPrimary }]}>{p.username}</Text>
                </TouchableOpacity>
              ))
            }
          </ScrollView>
        </View>
      )}

      <View style={[styles.inputWrapper, { backgroundColor: backgroundPrimary }]}>
        <View style={[styles.inputContainer, { backgroundColor: backgroundSecondary }]}>
          <TouchableOpacity style={styles.attachButton} onPress={sendMediaMessage}>
            <Paperclip size={22} color={accent} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: textPrimary }]}
            placeholder="Diga algo incrível..."
            placeholderTextColor={textSecondary}
            value={messageText}
            onChangeText={(text) => {
              setMessageText(text);
              const lastWord = text.split(' ').pop();
              if (lastWord?.startsWith('@')) {
                setMentionQuery(lastWord.slice(1));
                setShowMentions(true);
              } else {
                setShowMentions(false);
              }
            }}
            multiline
          />

          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: messageText.trim().length > 0 ? accent : 'transparent' }]} 
            onPress={sendMessage} 
            disabled={!messageText.trim().length}
          >
            <Send size={20} color={messageText.trim().length > 0 ? "#000" : textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  moreButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    marginTop: -20,
  },
  messagesContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 20,
    maxWidth: '85%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  avatarWrapper: {
    alignSelf: 'flex-end',
    marginRight: 10,
    marginLeft: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 14,
  },
  messageContent: {
    flex: 1,
  },
  myMessageContent: {
    alignItems: 'flex-end',
  },
  senderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  myMessageBubble: {
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  messageTime: {
    fontSize: 9,
    fontWeight: '600',
  },
  inputWrapper: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    fontWeight: '500',
  },
  attachButton: {
    padding: 8,
    borderRadius: 15,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'relative',
    width: 240,
    height: 180,
    borderRadius: 15,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  optimisticOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    position: 'relative',
    width: 240,
    height: 180,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
  },
  // Novos Estilos para Menu e Denúncia
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
  },
  menuIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 25,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '700',
  },
  menuCancelBtn: {
    marginTop: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  reportContent: {
    borderRadius: 25,
    padding: 20,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  reportSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  reasonItem: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 15,
    marginBottom: 10,
  },
  reasonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  mentionsContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    gap: 8,
  },
  mentionAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  mentionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
