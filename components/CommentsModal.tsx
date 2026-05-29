import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  Pressable,
  Platform
} from 'react-native';
import { X, Send, MessageCircle, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/utils/responsive';

interface Comment {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface CommentsModalProps {
  visible: boolean;
  eventId: string;
  eventTitle?: string;
  onClose: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function CommentsModal({ visible, eventId, eventTitle, onClose }: CommentsModalProps) {
  const { user, profile } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const structuredComments = useMemo(() => {
    const parents = comments.filter(c => !c.parent_id);
    const replies = comments.filter(c => c.parent_id);
    const result: Comment[] = [];
    parents.forEach(p => {
      result.push(p);
      result.push(...replies.filter(r => r.parent_id === p.id));
    });
    return result;
  }, [comments]);

  useEffect(() => {
    if (!visible || !eventId) return;
    loadComments();

    // Realtime subscription
    const channel = supabase
      .channel(`comments:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_comments' },
        () => loadComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [visible, eventId]);

  const loadComments = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_comments')
        .select(`
          *,
          profiles:user_id (username, full_name, avatar_url)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    const content = text.trim();
    setText('');
    Keyboard.dismiss();
    setSending(true);

    try {
      if (editingComment) {
        const { error } = await supabase.from('event_comments').update({ content }).eq('id', editingComment.id);
        if (error) throw error;
        setEditingComment(null);
      } else {
        const { error } = await supabase.from('event_comments').insert({
          event_id: eventId,
          user_id: user.id,
          content,
          parent_id: replyingTo?.id || null
        });
        if (error) throw error;
        setReplyingTo(null);
        // Realtime vai atualizar automaticamente
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 200);

        // Disparar Push Notification
        try {
          let targetUserId = replyingTo?.user_id;
          let notificationMessage = `${profile?.full_name || profile?.username || 'Alguém'} respondeu ao seu comentário.`;
          
          if (!targetUserId) {
            const { data: eventData } = await supabase.from('events').select('user_id, title').eq('id', eventId).maybeSingle();
            if (eventData) {
              targetUserId = eventData.user_id;
              notificationMessage = `${profile?.full_name || profile?.username || 'Alguém'} comentou na sua postagem.`;
            }
          }
          
          if (targetUserId && targetUserId !== user.id) {
            await supabase.functions.invoke('send-notification', {
              body: {
                userId: targetUserId,
                title: 'Novo Comentário',
                message: notificationMessage,
                type: 'comment',
                data: { event_id: eventId },
              }
            });
          }
        } catch (notifErr) {
          console.error('Error sending notification:', notifErr);
        }
      }
    } catch (err) {
      console.error('Error sending comment:', err);
      setText(content); // Restaura o texto em caso de erro
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      // Atualização otimista da UI
      setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
      
      const { error } = await supabase.from('event_comments').delete().eq('id', commentId);
      if (error) {
        loadComments(); // Rollback em caso de erro
        throw error;
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const renderComment = ({ item, index }: { item: Comment; index: number }) => {
    const isOwn = item.user_id === user?.id;
    const isReply = !!item.parent_id;
    const avatarLetter = (item.profiles?.full_name || item.profiles?.username || 'U')
      .charAt(0)
      .toUpperCase();

    return (
      <Animated.View entering={FadeIn.delay(index < 10 ? index * 30 : 0)} style={[styles.commentRow, isReply && { marginLeft: s(44), marginTop: -vs(4) }]}>
        {item.profiles?.avatar_url ? (
          <Image source={{ uri: item.profiles.avatar_url }} style={[styles.commentAvatar, isReply && { width: s(24), height: s(24), borderRadius: ms(12) }, { borderColor: accent }]} />
        ) : (
          <View style={[styles.commentAvatarPlaceholder, isReply && { width: s(24), height: s(24), borderRadius: ms(12) }, { backgroundColor: isOwn ? accent : '#ff1493' }]}>
            <Text style={[styles.commentAvatarLetter, isReply && { fontSize: ms(10) }]}>{avatarLetter}</Text>
          </View>
        )}

        <View style={styles.commentBubbleWrap}>
          <View
            style={[
              styles.commentBubble,
              {
                backgroundColor: isOwn
                  ? isDark ? 'rgba(0,217,255,0.1)' : 'rgba(0,217,255,0.08)'
                  : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: isOwn
                  ? isDark ? 'rgba(0,217,255,0.2)' : 'rgba(0,217,255,0.15)'
                  : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                paddingVertical: isReply ? vs(6) : vs(10),
              },
            ]}
          >
            <View style={styles.commentHeader}>
              <Text style={[styles.commentName, { color: isOwn ? accent : '#ff1493', fontSize: isReply ? ms(12) : ms(13) }]}>
                {item.profiles?.full_name || item.profiles?.username || 'Usuário'}
              </Text>
              <Text style={[styles.commentTime, { color: textSecondary, fontSize: isReply ? ms(10) : ms(11) }]}>
                {formatRelativeTime(item.created_at)}
              </Text>
            </View>
            <Text style={[styles.commentText, { color: textPrimary, fontSize: isReply ? ms(13) : ms(14) }]}>{item.content}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(16), marginTop: vs(2), marginLeft: s(12) }}>
            {!isReply && (
              <TouchableOpacity onPress={() => {
                setReplyingTo(item);
                setEditingComment(null);
                const mention = `@${item.profiles?.username || item.profiles?.full_name} `;
                setText(mention);
                inputRef.current?.focus();
              }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: textSecondary, fontSize: ms(11), fontWeight: '700' }}>Responder</Text>
              </TouchableOpacity>
            )}
            {isOwn && (
              <>
                <TouchableOpacity onPress={() => {
                  setEditingComment(item);
                  setReplyingTo(null);
                  setText(item.content);
                  inputRef.current?.focus();
                }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: textSecondary, opacity: 0.8, fontSize: ms(11), fontWeight: '600' }}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: textSecondary, opacity: 0.6, fontSize: ms(11), fontWeight: '600' }}>Excluir</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {visible && (
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={StyleSheet.absoluteFill}
          >
            <Pressable style={styles.backdrop} onPress={onClose}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
            </Pressable>
          </Animated.View>
        )}

        {visible && (
          <Animated.View
            entering={FadeIn.duration(250)}
            style={[
              styles.sheet,
              {
                backgroundColor: backgroundSecondary,
                paddingBottom: insets.bottom > 0 ? insets.bottom : vs(10),
              },
            ]}
          >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />

          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={styles.sheetHeaderLeft}>
              <MessageCircle size={20} color="#ff1493" />
              <Text style={[styles.sheetTitle, { color: textPrimary }]}>
                Comentários
                {comments.length > 0 && (
                  <Text style={{ color: textSecondary, fontWeight: '500' }}> ({comments.length})</Text>
                )}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}
            >
              <X size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Lista */}
          {loading && comments.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={accent} />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageCircle size={40} color={textSecondary} opacity={0.3} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>Seja o primeiro a comentar!</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={structuredComments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              contentContainerStyle={styles.commentsList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
          )}

          {/* Input */}
          <View style={{ width: '100%' }}>
            {replyingTo && !editingComment && (
              <Animated.View entering={FadeIn} style={[styles.replyBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={{ color: textSecondary, fontSize: ms(12), flex: 1 }}>
                  Respondendo a <Text style={{ fontWeight: 'bold', color: textPrimary }}>@{replyingTo.profiles?.username || replyingTo.profiles?.full_name}</Text>
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={16} color={textSecondary} />
                </TouchableOpacity>
              </Animated.View>
            )}
            {editingComment && (
              <Animated.View entering={FadeIn} style={[styles.replyBanner, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={{ color: textSecondary, fontSize: ms(12), flex: 1 }}>
                  Editando comentário...
                </Text>
                <TouchableOpacity onPress={() => { setEditingComment(null); setText(''); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={16} color={textSecondary} />
                </TouchableOpacity>
              </Animated.View>
            )}
            <View style={[styles.inputRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
              {/* Avatar do usuário logado */}
              {user && (
                profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={[styles.myAvatar, { borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                ) : (
                  <View style={[styles.myAvatar, { backgroundColor: accent }]}>
                    <Text style={styles.myAvatarLetter}>
                      {(profile?.full_name || profile?.username || user.email || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )
              )}

              <View style={[styles.inputWrap, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
              }]}>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: textPrimary }]}
                  placeholder="Adicionar comentário..."
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)'}
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  { backgroundColor: text.trim() ? '#ff1493' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                ]}
                onPress={handleSend}
                disabled={!text.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Send size={18} color={text.trim() ? '#fff' : textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: ms(35),
    borderTopRightRadius: ms(35),
    maxHeight: Dimensions.get('window').height * 0.85,
    minHeight: vs(350),
    width: '100%',
    overflow: 'hidden',
  },
  handle: {
    width: s(40),
    height: vs(4),
    borderRadius: ms(2),
    alignSelf: 'center',
    marginTop: vs(12),
    marginBottom: vs(4),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(20),
    paddingVertical: vs(14),
    borderBottomWidth: 1,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  sheetTitle: {
    fontSize: ms(17),
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: s(34),
    height: s(34),
    borderRadius: ms(17),
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentsList: {
    paddingHorizontal: s(16),
    paddingVertical: vs(12),
    gap: vs(12),
  },
  commentRow: {
    flexDirection: 'row',
    gap: s(10),
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: s(34),
    height: s(34),
    borderRadius: ms(17),
    borderWidth: 1.5,
  },
  commentAvatarPlaceholder: {
    width: s(34),
    height: s(34),
    borderRadius: ms(17),
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarLetter: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '800',
  },
  commentBubbleWrap: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: vs(2),
  },
  commentBubble: {
    maxWidth: '100%',
    borderRadius: ms(16),
    borderWidth: 1,
    paddingHorizontal: s(14),
    paddingVertical: vs(10),
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(3),
  },
  commentName: {
    fontSize: ms(13),
    fontWeight: '800',
  },
  commentTime: {
    fontSize: ms(11),
    fontWeight: '500',
  },
  commentText: {
    fontSize: ms(14),
    lineHeight: vs(20),
    fontWeight: '400',
  },
  deleteBtn: {
    marginTop: vs(8),
    padding: s(4),
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: vs(12),
    minHeight: vs(150),
  },
  emptyText: {
    fontSize: ms(15),
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: s(10),
    paddingHorizontal: s(16),
    paddingTop: vs(12),
    paddingBottom: vs(8),
    borderTopWidth: 1,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(16),
    paddingVertical: vs(8),
    borderTopLeftRadius: ms(12),
    borderTopRightRadius: ms(12),
    marginHorizontal: s(10),
  },
  myAvatar: {
    width: s(34),
    height: s(34),
    borderRadius: ms(17),
    justifyContent: 'center',
    alignItems: 'center',
  },
  myAvatarLetter: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '800',
  },
  inputWrap: {
    flex: 1,
    borderRadius: ms(20),
    borderWidth: 1,
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
    maxHeight: vs(100),
  },
  input: {
    fontSize: ms(15),
    lineHeight: vs(20),
  },
  sendBtn: {
    width: s(40),
    height: s(40),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
