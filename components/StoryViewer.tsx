import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
  FlatList,
  StatusBar,
  Easing,
  Animated,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Audio } from 'expo-av';
import { X, Heart, Send, Trash2, Share2 } from 'lucide-react-native';
import { Story } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width: W, height: H } = Dimensions.get('window');

// ─── StoryItem: componente de topo, NUNCA dentro de outro componente ───────────
interface StoryItemProps {
  item: Story;
  index: number;
  currentIndex: number;
  visible: boolean;
  onNext: () => void;
  onPrev: () => void;
}

function StoryItem({ item, index, currentIndex, visible, onNext, onPrev }: StoryItemProps) {
  const isCurrent = index === currentIndex;
  const [loaded, setLoaded] = useState(false);
  const isVideo = item.media_type === 'video';

  // Cria o player de vídeo (expo-video) — Pré-carrega o próximo para ser instantâneo
  const player = useVideoPlayer(
    (isCurrent || index === currentIndex + 1) && isVideo ? { uri: item.media_url } : null,
    (p) => {
      p.loop = false;
      p.muted = false;
      if (visible && isCurrent) p.play();
    }
  );

  // Controla play/pause quando o item entra/sai do foco
  useEffect(() => {
    if (!isVideo || !player) return;
    if (visible && isCurrent) {
      player.play();
    } else {
      player.pause();
    }
  }, [isCurrent, visible]);

  // Timeout de segurança: 6s sem carregar → remove spinner
  useEffect(() => {
    if (!isCurrent) return;
    // Se mudar o item, resetamos o loaded local se for vídeo para o novo buffering
    // mas se for imagem e já pre-fetchada, o onLoad do Image cuidará disso.
    const t = setTimeout(() => setLoaded(true), 6000);
    return () => clearTimeout(t);
  }, [item.id, isCurrent]);

  // Efeito de Auto-Advance para Imagens
  useEffect(() => {
    if (!isCurrent || !visible || isVideo) return;
    
    // Timer de 5 segundos para imagens
    const timer = setTimeout(() => {
      onNext();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isCurrent, visible, isVideo]);

  // Efeito de Auto-Advance para Vídeos (ao terminar)
  useEffect(() => {
    if (!isCurrent || !visible || !isVideo || !player) return;

    const subscription = player.addListener('playToEnd', () => {
      onNext();
    });

    return () => subscription.remove();
  }, [isCurrent, visible, isVideo, player]);

  return (
    <View style={s.page}>
      <View style={s.mediaWrap}>
        {isVideo ? (
          isCurrent ? (
            <VideoView
              player={player}
              style={s.media}
              contentFit="cover"
              nativeControls={false}
              onFirstFrameRender={() => setLoaded(true)}
            />
          ) : (
            <View style={[s.media, { backgroundColor: '#000' }]} />
          )
        ) : (
          <Image
            source={{ uri: item.media_url }}
            style={s.media}
            resizeMode="cover"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        )}

        {!loaded && isCurrent && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>

      <View style={s.tapRow} pointerEvents="box-none">
        <TouchableOpacity style={s.tap} onPress={onPrev} activeOpacity={1} />
        <TouchableOpacity style={[s.tap, { flex: 2 }]} onPress={onNext} activeOpacity={1} />
      </View>
    </View>
  );
}


// ─── StoryViewer principal ────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function StoryViewer({ visible, stories, initialIndex = 0, onClose, onRefresh }: Props) {
  const { user } = useAuth();
  const listRef = useRef<FlatList>(null);
  const [idx, setIdx] = useState(initialIndex);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [liked, setLiked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animação da barra de progresso
  useEffect(() => {
    if (!visible) return;
    
    progressAnim.setValue(0);
    const story = stories[idx];
    const duration = story.media_type === 'video' ? 15000 : 5000; // 15s max para vídeo se não soubermos a duração

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    return () => progressAnim.stopAnimation();
  }, [idx, visible]);

  // Configura áudio ao abrir (resolve vídeo mudo no iOS modo silencioso)
  useEffect(() => {
    if (!visible) return;
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
    setIdx(initialIndex);
    setLiked(false);

    // Scroll para o índice inicial após o FlatList montar
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      // Pré-carrega próximas 2 imagens
      prefetch(initialIndex);
    }, 150);
    return () => clearTimeout(t);
  }, [visible]);

  const prefetch = (i: number) => {
    // Pré-carrega as próximas 4 imagens para garantir fluidez total
    for (let k = 1; k <= 4; k++) {
      const next = stories[i + k];
      if (next?.media_type === 'image') {
        Image.prefetch(next.media_url);
      }
    }
  };

  const goNext = useCallback(() => {
    if (idx < stories.length - 1) {
      const n = idx + 1;
      listRef.current?.scrollToIndex({ index: n, animated: true });
      setIdx(n);
      setLiked(false);
      prefetch(n);
    } else {
      onClose();
    }
  }, [idx, stories.length]);

  const goPrev = useCallback(() => {
    if (idx > 0) {
      const n = idx - 1;
      listRef.current?.scrollToIndex({ index: n, animated: true });
      setIdx(n);
      setLiked(false);
    }
  }, [idx]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;
    setSending(true);
    try {
      const ownerId = stories[idx].user_id;
      const { data: chat } = await supabase
        .from('chats').select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${ownerId}),and(user1_id.eq.${ownerId},user2_id.eq.${user.id})`)
        .maybeSingle();

      let chatId = chat?.id;
      if (!chatId) {
        const { data: nc } = await supabase
          .from('chats').insert({ user1_id: user.id, user2_id: ownerId }).select().single();
        chatId = nc?.id;
      }
      await supabase.from('messages').insert({
        chat_id: chatId,
        sender_id: user.id,
        content: `Respondeu ao seu story: "${message}"`,
        metadata: { story_id: stories[idx].id },
      });
      setMessage('');
      Alert.alert('✅', 'Mensagem enviada!');
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Deletar story?', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar' },
      {
        text: 'Deletar', style: 'destructive', onPress: async () => {
          setDeleting(true);
          await supabase.from('stories').delete().eq('id', stories[idx].id);
          if (onRefresh) onRefresh();
          onClose();
        },
      },
    ]);
  };

  const renderItem = useCallback(({ item, index }: { item: Story; index: number }) => (
    <StoryItem
      item={item}
      index={index}
      currentIndex={idx}
      visible={visible}
      onNext={goNext}
      onPrev={goPrev}
    />
  ), [idx, visible, goNext, goPrev]);

  if (!visible || stories.length === 0) return null;

  const story = stories[idx];
  const profile = Array.isArray(story.profiles) ? story.profiles[0] : story.profiles;
  const isOwner = user?.id === story.user_id;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <StatusBar hidden />
      <View style={s.root}>

        {/* LISTA HORIZONTAL DE STORIES */}
        <FlatList
          ref={listRef}
          data={stories}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          horizontal
          pagingEnabled
          scrollEnabled={false}          // navegação só por toque
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
          windowSize={5}
          updateCellsBatchingPeriod={10}
          maxToRenderPerBatch={5}
          initialNumToRender={2}
        />

        {/* BARRAS DE PROGRESSO (ESTILO INSTAGRAM) */}
        <View style={s.progressContainer}>
          {stories.map((_, i) => (
            <View key={i} style={s.progressBarBg}>
              <Animated.View 
                style={[
                  s.progressBarFill, 
                  { 
                    width: i < idx ? '100%' : i === idx ? progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }) : '0%',
                    backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.3)' 
                  }
                ]} 
              />
            </View>
          ))}
        </View>

        {/* HUD FIXO: avatar + botões */}
        <View style={s.hud} pointerEvents="box-none">
          {/* Cabeçalho */}
          <View style={s.header} pointerEvents="box-none">
            <View style={s.userRow}>
              {profile?.avatar_url
                ? <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
                : <View style={s.avatarFallback}><Text style={s.avatarLetter}>{profile?.username?.[0]?.toUpperCase()}</Text></View>
              }
              <View>
                <Text style={s.username}>{profile?.username}</Text>
                <Text style={s.timeLabel}>agora</Text>
              </View>
            </View>
            <View style={s.headerRight}>
              {isOwner && (
                <TouchableOpacity onPress={handleDelete} style={s.btn} disabled={deleting}>
                  <Trash2 size={22} color="#ff3b30" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={s.btn}>
                <X size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Rodapé */}
          <View style={s.footer}>
            {!isOwner ? (
              <View style={s.replyRow}>
                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    placeholder="Responder..."
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    value={message}
                    onChangeText={setMessage}
                    returnKeyType="send"
                    onSubmitEditing={handleSendMessage}
                  />
                </View>
                <TouchableOpacity onPress={handleSendMessage} style={s.btn} disabled={sending}>
                  <Send size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLiked(l => !l)} style={s.btn}>
                  <Heart size={24} color={liked ? '#ff3b30' : '#fff'} fill={liked ? '#ff3b30' : 'transparent'} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.ownerRow}>
                <TouchableOpacity style={s.shareBtn} onPress={() => Alert.alert('Compartilhar', 'Em breve!')}>
                  <Share2 size={20} color="#fff" />
                  <Text style={s.shareTxt}>Compartilhar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#000' },
  page:          { width: W, height: H },
  mediaWrap:     { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  media:         { width: W, height: H },
  placeholder:   { width: W, height: H, backgroundColor: '#000' },
  loadingBox:    { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  tapRow:        { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 5 },
  tap:           { flex: 1 },
  hud:           { ...StyleSheet.absoluteFillObject, zIndex: 10, justifyContent: 'space-between' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: Platform.OS === 'ios' ? 55 : 40 },
  userRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:        { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#fff' },
  avatarFallback:{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#00d9ff', justifyContent: 'center', alignItems: 'center' },
  avatarLetter:  { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  username:      { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  timeLabel:     { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  headerRight:   { flexDirection: 'row', gap: 8 },
  btn:           { padding: 6 },
  footer:        { paddingHorizontal: 14, paddingBottom: Platform.OS === 'ios' ? 44 : 28 },
  replyRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inputWrap:     { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', paddingHorizontal: 16, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  input:         { color: '#fff', fontSize: 14 },
  ownerRow:      { alignItems: 'center' },
  shareBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.18)', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  shareTxt:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  
  // Progress Bar
  progressContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 45 : 20,
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 4,
    zIndex: 20,
  },
  progressBarBg: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
});
