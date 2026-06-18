import { useLanguage } from '@/lib/i18n';
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
  FlatList,
  StatusBar,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Keyboard
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { X, Heart, Send, Trash2, Share2, MoreVertical } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  SharedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Story } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { notifyStoryLike, notifyMessageRecipient } from '@/lib/notifications';
import { ActionFeedback } from './ActionFeedback';
import PremiumConfirmationModal from './PremiumConfirmationModal';

const { width: W, height: H } = Dimensions.get('window');

// --- TIPOS ---
type StoryState = 'IDLE' | 'LOADING' | 'BUFFERING' | 'READY' | 'PLAYING' | 'PAUSED' | 'ENDED' | 'ERROR';

// --- COMPONENTES AUXILIARES ---

const ProgressBar = memo(({ 
  index, 
  currentIndex, 
  progress 
}: { 
  index: number, 
  currentIndex: number, 
  progress: SharedValue<number> 
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    if (index < currentIndex) return { width: '100%' };
    if (index > currentIndex) return { width: '0%' };
    return { width: `${progress.value * 100}%` };
  });

  return (
    <View style={st.progressBg}>
      <Animated.View style={[st.progressFill, animatedStyle]} />
    </View>
  );
});

// --- RENDERIZADOR DE IMAGEM ---
const StoryImageRenderer = memo(({ 
  item, 
  isActive, 
  isPaused, 
  onNext, 
  progress 
}: { 
  item: Story, 
  isActive: boolean, 
  isPaused: boolean, 
  onNext: () => void, 
  progress: SharedValue<number> 
}) => {
  const [status, setStatus] = useState<StoryState>('LOADING');
  const [isLoaded, setIsLoaded] = useState(false);
  const IMAGE_DURATION = 5000;

  useEffect(() => {
    if (!isActive) {
      setStatus('IDLE');
      return;
    }

    if (isLoaded && (status === 'IDLE' || status === 'LOADING')) {
      progress.value = 0;
      setStatus('READY');
      return;
    }

    if (status === 'READY' || status === 'PLAYING') {
      if (isPaused) {
        cancelAnimation(progress);
        setStatus('PAUSED');
      } else {
        const remaining = IMAGE_DURATION * (1 - progress.value);
        progress.value = withTiming(1, { 
          duration: remaining, 
          easing: Easing.linear 
        }, (finished) => {
          if (finished) runOnJS(onNext)();
        });
        setStatus('PLAYING');
      }
    }
  }, [isActive, isPaused, status, isLoaded]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <View style={st.page}>
      <Image
        source={{ uri: item.media_url }}
        style={st.media}
        contentFit="contain"
        cachePolicy="memory-disk"
        onLoad={handleLoad}
        onDisplay={handleLoad}
      />
      {status === 'LOADING' && (
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
});

// --- RENDERIZADOR DE VÍDEO ---
import { getCachedVideoUri } from '@/lib/videoCache';

const StoryVideoRenderer = memo(({ item, isActive, isPaused, onNext, progress, isNext }: { 
  item: Story, 
  isActive: boolean, 
  isPaused: boolean, 
  onNext: () => void, 
  progress: SharedValue<number>,
  isNext?: boolean
}) => {
  const [status, setStatus] = useState<StoryState>('LOADING');
  const [localUri, setLocalUri] = useState<string | null>(null);
  
  // Resolve o cache antes de criar o player
  useEffect(() => {
    if (isActive || isNext) {
      getCachedVideoUri(item.media_url).then(setLocalUri);
    }
  }, [isActive, isNext, item.media_url]);

  const player = useVideoPlayer(localUri, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    if (!isActive || !player || !localUri) {
      if (!isActive) setStatus('IDLE');
      progress.value = 0;
      return;
    }

    const interval = setInterval(() => {
      if (player.duration > 0) {
        progress.value = player.currentTime / player.duration;
      }
    }, 16); // Sync 60fps

    const statusSub = player.addListener('statusChange', (s: any) => {
      if (s.status === 'readyToPlay') setStatus('READY');
      if (s.status === 'loading') setStatus('LOADING');
    });

    // Verificação imediata: Se o player já estiver pronto (cache local), muda o status agora
    if (player.status === 'readyToPlay') {
      setStatus('READY');
    }

    const playSub = player.addListener('playingChange', (event: { isPlaying: boolean }) => {
      if (event.isPlaying) setStatus('PLAYING');
      else if (isActive && !isPaused) setStatus('BUFFERING');
    });

    const finishSub = player.addListener('playToEnd', () => {
      runOnJS(onNext)();
    });

    return () => {
      clearInterval(interval);
      statusSub.remove();
      playSub.remove();
      finishSub.remove();
    };
  }, [isActive, player]);

  useEffect(() => {
    if (!player || !isActive) return;
    if (isPaused || status === 'LOADING' || status === 'BUFFERING') {
      player.pause();
    } else {
      player.play();
    }
  }, [isPaused, status, isActive]);

  return (
    <View style={st.page}>
      {/* Thumbnail de fundo para evitar flickering */}
      <Image 
        source={{ uri: item.thumbnail_url || item.media_url }} 
        style={[st.media, { position: 'absolute' }]} 
        contentFit="contain"
        blurRadius={isActive ? 0 : 10}
      />
      
      {isActive && (
        <VideoView
          player={player}
          style={st.media}
          contentFit="contain"
          nativeControls={false}
        />
      )}

      {(status === 'LOADING' || status === 'BUFFERING') && isActive && (
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
});

const formatStoryTime = (dateString?: string) => {
  if (!dateString) return 'agora';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'agora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch (e) {
    return 'agora';
  }
};

// --- MAIN VIEWER ---
interface Props {
  visible: boolean;
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function StoryViewer({ visible, stories, initialIndex = 0, onClose, onRefresh }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  const listRef = useRef<FlatList>(null);
  const [idx, setIdx] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState({ visible: false, type: 'success' as 'success' | 'error' | 'info', title: '', message: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setIdx(initialIndex);
      progress.value = 0;
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
      checkIfLiked(stories[initialIndex].id);
    }
  }, [visible, initialIndex]);

  useEffect(() => {
    if (stories[idx]) {
      checkIfLiked(stories[idx].id);
    }
  }, [idx]);

  const checkIfLiked = async (storyId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('story_likes')
      .select('id')
      .eq('story_id', storyId)
      .eq('user_id', user.id)
      .maybeSingle();
    setLiked(!!data);
  };

  const handleNext = useCallback(() => {
    if (idx < stories.length - 1) {
      progress.value = 0;
      const nextIdx = idx + 1;
      setIdx(nextIdx);
      listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
    } else {
      onClose();
    }
  }, [idx, stories, onClose]);

  const handlePrev = useCallback(() => {
    if (idx > 0) {
      progress.value = 0;
      const prevIdx = idx - 1;
      setIdx(prevIdx);
      listRef.current?.scrollToIndex({ index: prevIdx, animated: true });
    } else {
      progress.value = 0;
    }
  }, [idx]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;
    setSending(true);
    try {
      const ownerId = stories[idx].user_id;
      
      // Procurar conversa 1:1 existente de forma ultra robusta
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
      
      const myConvIds = myConvs?.map(c => c.conversation_id) || [];
      let chatId = null;

      if (myConvIds.length > 0) {
        const { data: targetConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', ownerId)
          .in('conversation_id', myConvIds);
        
        const commonConvIds = targetConvs?.map(c => c.conversation_id) || [];

        if (commonConvIds.length > 0) {
          // Buscar conversa 1:1 real que NÃO é grupo
          const { data: realConvs } = await supabase
            .from('conversations')
            .select('id')
            .eq('is_group', false)
            .in('id', commonConvIds)
            .order('updated_at', { ascending: false });

          if (realConvs && realConvs.length > 0) {
            chatId = realConvs[0].id;
          }
        }
      }

      if (!chatId) {
        // Criar nova conversa
        const { data: nc } = await supabase
          .from('conversations').insert({ is_group: false }).select().single();
        chatId = nc?.id;
        
        await supabase.from('conversation_participants').insert([
          { conversation_id: chatId, user_id: user.id },
          { conversation_id: chatId, user_id: ownerId }
        ]);
      }

      const content = `Respondeu ao seu story: "${message}"`;
      
      await supabase.from('messages').insert({
        conversation_id: chatId,
        sender_id: user.id,
        content: content,
        read: false
      });

      // Notificar o dono
      await notifyMessageRecipient(ownerId, user.id, content, chatId);

      setMessage('');
      setIsReplying(false);
      Keyboard.dismiss();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error(e);
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Ops!',
        message: 'Não foi possível enviar sua resposta.'
      });
    } finally {
      setSending(false);
    }
  };

  const handleLike = async () => {
    if (!user || sending) return;
    const storyId = stories[idx].id;
    const ownerId = stories[idx].user_id;
    const newLiked = !liked;
    
    setLiked(newLiked);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (newLiked) {
        await supabase.from('story_likes').insert({ story_id: storyId, user_id: user.id });
        await notifyStoryLike(storyId, user.id, ownerId);
      } else {
        await supabase.from('story_likes').delete().eq('story_id', storyId).eq('user_id', user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = () => {
    setIsPaused(true);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    await supabase.from('stories').delete().eq('id', stories[idx].id);
    setShowDeleteConfirm(false);
    if (onRefresh) onRefresh();
    onClose();
  };

  if (!visible || stories.length === 0) return null;

  const story = stories[idx];
  // Tenta extrair perfil de múltiplas fontes possíveis (Edge Function vs Query Direta)
  const rawProfile = story?.profiles || (story as any)?.user || (story as any)?.profile;
  const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
  
  // Garantia: se não houver objeto de perfil, usamos o user_id da história para o redirecionamento
  const targetProfileId = profile?.id || story?.user_id;
  const isOwner = user?.id === story?.user_id;

  // Filtrar histórias apenas do usuário atual para a barra de progresso (estilo Instagram)
  const currentUserStories = stories.filter(s => s.user_id === story?.user_id);
  const currentUserStoryIndex = currentUserStories.findIndex(s => s.id === story?.id);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <StatusBar hidden />
      <View style={st.root}>
        {/* Fundo para Blur */}
        <Image 
          source={{ uri: story?.thumbnail_url || story?.media_url }} 
          style={StyleSheet.absoluteFill} 
          contentFit="cover" 
          blurRadius={50}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />

        <FlatList
          ref={listRef}
          data={stories}
          renderItem={({ item, index }) => {
            const isActive = index === idx;
            const isNext = index === idx + 1;
            
            return item.media_type === 'video' ? (
              <StoryVideoRenderer
                item={item}
                isActive={isActive}
                isNext={isNext}
                isPaused={isPaused}
                onNext={handleNext}
                progress={progress}
              />
            ) : (
              <StoryImageRenderer
                item={item}
                isActive={isActive}
                isPaused={isPaused}
                onNext={handleNext}
                progress={progress}
              />
            );
          }}
          keyExtractor={item => item.id}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
          removeClippedSubviews={true}
        />

        {/* GESTURE OVERLAY */}
        <View style={st.gestureOverlay}>
          <TouchableWithoutFeedback onPressIn={() => setIsPaused(true)} onPressOut={() => setIsPaused(false)} onPress={handlePrev}>
            <View style={st.gestureLeft} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPressIn={() => setIsPaused(true)} onPressOut={() => setIsPaused(false)} onPress={handleNext}>
            <View style={st.gestureRight} />
          </TouchableWithoutFeedback>
        </View>

        {/* HUD TOP */}
        <View style={st.hudTop}>
          <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={st.topGradient} />
          
          <View style={st.progressContainer}>
            {currentUserStories.map((_, i) => (
              <ProgressBar key={i} index={i} currentIndex={currentUserStoryIndex} progress={progress} />
            ))}
          </View>

          <View style={[st.header, { zIndex: 999 }]}>
            <TouchableOpacity 
              style={st.headerLeft} 
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 100 }}
              onPress={() => {
                console.log('👤 [StoryViewer] Navegando para perfil:', targetProfileId);
                if (targetProfileId) {
                  onClose();
                  router.push(`/profile/${targetProfileId}`);
                }
              }}
            >
              {profile?.avatar_url
                ? <Image source={profile.avatar_url} style={st.avatar} cachePolicy="memory-disk" />
                : <View style={st.avatarFallback}><Text style={st.avatarLetter}>{profile?.username?.[0]?.toUpperCase()}</Text></View>
              }
              <View>
                <Text style={st.username}>{profile?.username}</Text>
                <Text style={st.timeLabel}>{formatStoryTime(story?.created_at)}</Text>
              </View>
            </TouchableOpacity>
            <View style={st.headerRight}>
              {isOwner && (
                <TouchableOpacity onPress={handleDelete} style={st.iconBtn} disabled={deleting}>
                  <MoreVertical size={24} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={st.iconBtn}>
                <X size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* HUD BOTTOM */}
        {(!isPaused || isReplying) && (
          <View style={st.hudBottom}>
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={st.bottomGradient} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={st.footer}>
                {!isOwner ? (
                  <View style={st.replyRow}>
                    <BlurView intensity={30} tint="dark" style={st.inputWrap}>
                      <TextInput
                        style={st.input}
                        placeholder={t('auto.s6233ecee', 'Responder...')}
                        placeholderTextColor="rgba(255,255,255,0.8)"
                        value={message}
                        onChangeText={setMessage}
                        onFocus={() => {
                          setIsPaused(true);
                          setIsReplying(true);
                        }}
                        onBlur={() => {
                          setIsPaused(false);
                          setIsReplying(false);
                        }}
                      />
                    </BlurView>
                    <TouchableOpacity onPress={handleLike} style={st.actionBtn}>
                      <Heart size={28} color={liked ? '#ff1493' : '#fff'} fill={liked ? '#ff1493' : 'transparent'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSendMessage} style={st.actionBtn}>
                      <Send size={26} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={st.ownerRow}>
                    <TouchableOpacity style={st.shareBtn}>
                      <Share2 size={20} color="#000" />
                      <Text style={st.shareTxt}>{t('auto.sa3bd2b71', 'Compartilhar')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </KeyboardAvoidingView>
          </View>
        )}

        <ActionFeedback 
          {...feedback} 
          onClose={() => setFeedback({ ...feedback, visible: false })} 
        />

        <PremiumConfirmationModal
          visible={showDeleteConfirm}
          title="Deletar Story?"
          description="Esta ação não pode ser desfeita e seu story sumirá para todos."
          confirmText="Deletar"
          cancelText="Cancelar"
          onConfirm={confirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setIsPaused(false);
          }}
          isDestructive
        />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  page: { width: W, height: H, justifyContent: 'center', alignItems: 'center' },
  media: { width: W, height: H },
  loadingBox: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  gestureOverlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 5 },
  gestureLeft: { flex: 1 },
  gestureRight: { flex: 2 },
  hudTop: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topGradient: { ...StyleSheet.absoluteFillObject, height: 120 },
  progressContainer: { flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingTop: Platform.OS === 'ios' ? 60 : 45, marginBottom: 15 },
  progressBg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#fff' },
  avatarFallback: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#00d9ff', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontWeight: '900', fontSize: 16 },
  username: { color: '#fff', fontWeight: '700', fontSize: 14 },
  timeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  headerRight: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  hudBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 },
  bottomGradient: { ...StyleSheet.absoluteFillObject, height: 150 },
  footer: { paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  replyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputWrap: { flex: 1, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  input: { flex: 1, color: '#fff', fontSize: 14, paddingHorizontal: 18 },
  actionBtn: { padding: 4 },
  ownerRow: { alignItems: 'center' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24 },
  shareTxt: { color: '#000', fontWeight: '700', fontSize: 14 },
});
