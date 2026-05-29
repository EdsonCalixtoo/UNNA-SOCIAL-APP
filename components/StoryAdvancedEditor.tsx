import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform,
  PanResponder,
  Animated as RNAnimated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import ViewShot from 'react-native-view-shot';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
} from 'react-native-reanimated';
import { 
  Gesture, 
  GestureDetector, 
  GestureHandlerRootView 
} from 'react-native-gesture-handler';
import { X, Check, Type, Music, MapPin, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ASpectRatio = 9 / 16;
const CONTAINER_HEIGHT = SCREEN_WIDTH / ASpectRatio;

interface StoryAdvancedEditorProps {
  visible: boolean;
  mediaUri: string;
  mediaType: 'image' | 'video';
  onClose: () => void;
  onSave: (finalUri: string) => void;
  mode?: 'story' | 'profile' | 'event';
}

interface TextItem {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

const COLORS = ['#FFFFFF', '#000000', '#FF1493', '#00D9FF', '#FFD700', '#34C759'];

const MOCK_SONGS = [
  { id: '1', title: 'Birds of a Feather', artist: 'Billie Eilish', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: '2', title: 'Espresso', artist: 'Sabrina Carpenter', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: '3', title: 'Dancing in the Dark', artist: 'Lana Del Rey', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

export default function StoryAdvancedEditor({ visible, mediaUri, mediaType, onClose, onSave, mode = 'story' }: StoryAdvancedEditorProps) {
  const { profile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [currentColor, setCurrentColor] = useState('#FFFFFF');
  
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [location, setLocation] = useState('');

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const viewShotRef = useRef<ViewShot>(null);
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioPlayer = useAudioPlayer(audioUrl);

  const videoPlayer = useVideoPlayer(mediaType === 'video' ? { uri: mediaUri } : null, player => {
    player.loop = true;
    player.muted = false;
  });

  useEffect(() => {
    if (videoPlayer) {
      if (visible) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
    }
  }, [visible, videoPlayer]);

  useEffect(() => {
    if (audioPlayer && audioUrl) {
      audioPlayer.loop = true;
      if (visible) {
        audioPlayer.play();
      } else {
        audioPlayer.pause();
      }
    }
  }, [visible, audioPlayer, audioUrl]);

  function playSound(url: string) {
    setAudioUrl(url);
  }

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => { scale.value = savedScale.value * e.scale; })
    .onEnd(() => {
      if (scale.value < 1) scale.value = withSpring(1);
      else if (scale.value > 3) scale.value = withSpring(3);
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const rotationGesture = Gesture.Rotation()
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, rotationGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value }, 
      { translateY: translateY.value }, 
      { scale: scale.value },
      { rotateZ: `${(rotation.value / Math.PI) * 180}deg` }
    ] as any
  }));

  const saveText = () => {
    if (!currentText.trim()) { setEditingTextId(null); return; }
    if (editingTextId === 'new') {
      setTextItems([...textItems, { id: Date.now().toString(), text: currentText, color: currentColor, x: SCREEN_WIDTH / 2 - 50, y: SCREEN_HEIGHT / 2 - 20 }]);
    } else {
      setTextItems(items => items.map(i => i.id === editingTextId ? { ...i, text: currentText, color: currentColor } : i));
    }
    setEditingTextId(null);
    setCurrentText('');
  };

  const handleCapture = async () => {
    if (audioPlayer) audioPlayer.pause();
    if (videoPlayer) videoPlayer.pause();

    if (mediaType === 'video') {
      // Vídeos não podem ser capturados pelo ViewShot (gerariam imagem preta).
      // Retornamos o vídeo original.
      onSave(mediaUri);
      return;
    }

    if (!viewShotRef.current || !viewShotRef.current.capture) return;
    setIsProcessing(true);
    try {
      // Pequeno delay para garantir que a UI assentou
      await new Promise(r => setTimeout(r, 600));
      const uri = await viewShotRef.current.capture();
      onSave(uri);
    } catch (error) {
      console.error('Erro ao capturar imagem:', error);
      onSave(mediaUri); // Fallback para a original em caso de erro
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => { if(audioPlayer) audioPlayer.pause(); if(videoPlayer) videoPlayer.pause(); onClose(); }} style={styles.iconBtn}>
              <X size={28} color="#fff" strokeWidth={2.5} />
           </TouchableOpacity>

        </View>

        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.8 }} style={styles.canvas}>
          <GestureDetector gesture={composedGesture}>
             <View style={styles.gestureContainer}>
                <Animated.View style={[styles.mediaWrapper, animatedStyle as any]}>
                   {mediaType === 'video' ? (
                     <VideoView
                        player={videoPlayer}
                        style={styles.mainMedia}
                        contentFit="contain"
                        nativeControls={false}
                     />
                   ) : (
                     <Image source={{ uri: mediaUri }} style={styles.mainMedia} resizeMode="contain" />
                   )}
                </Animated.View>
             </View>
          </GestureDetector>

          <View style={styles.overlay} pointerEvents="box-none">
             {selectedSong && (
                <DraggableSticker x={50} y={150}>
                   <View style={styles.musicLabel}>
                      <Music size={14} color="#ff1493" fill="#ff1493" />
                      <Text style={styles.musicText}>{selectedSong.title}</Text>
                   </View>
                </DraggableSticker>
             )}
             {location && (
                <DraggableSticker x={100} y={100}>
                   <View style={styles.locationLabel}>
                      <MapPin size={16} color="#00d9ff" fill="#00d9ff" />
                      <Text style={styles.locationText}>{location.toUpperCase()}</Text>
                   </View>
                </DraggableSticker>
             )}
             {textItems.map(item => (
                <DraggableSticker key={item.id} x={item.x} y={item.y}>
                   <TouchableOpacity onPress={() => { setEditingTextId(item.id); setCurrentText(item.text); setCurrentColor(item.color); }}>
                      <Text style={[styles.canvasText, { color: item.color }]}>{item.text}</Text>
                   </TouchableOpacity>
                </DraggableSticker>
             ))}
          </View>
        </ViewShot>

        <View style={styles.footer}>
           <TouchableOpacity style={styles.mainActionBtn} onPress={handleCapture}>
              <View style={styles.avatarMini}>
                 <Image source={{ uri: profile?.avatar_url }} style={styles.avatarImg} />
              </View>
              <Text style={styles.mainActionText}>{mode === 'story' ? 'Seu story' : 'Concluir'}</Text>
           </TouchableOpacity>

           <TouchableOpacity style={styles.sendBtn} onPress={handleCapture} disabled={isProcessing}>
             {isProcessing ? <ActivityIndicator color="#000" /> : <ChevronRight size={26} color="#000" strokeWidth={3} />}
           </TouchableOpacity>
        </View>

        {editingTextId && (
          <Modal transparent animationType="fade">
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
               <View style={styles.textEditHeader}>
                  <TouchableOpacity onPress={() => setEditingTextId(null)}><Text style={styles.headerAction}>Cancelar</Text></TouchableOpacity>
                  <TouchableOpacity onPress={saveText}><Text style={styles.headerActionBold}>Concluir</Text></TouchableOpacity>
               </View>
               <TextInput autoFocus multiline style={[styles.mainInput, { color: currentColor }]} value={currentText} onChangeText={setCurrentText} selectionColor={currentColor} />
               <View style={styles.colorRow}>
                  {COLORS.map(c => <TouchableOpacity key={c} onPress={() => setCurrentColor(c)} style={[styles.colorDot, { backgroundColor: c }, currentColor === c && styles.activeDot]} />)}
               </View>
            </BlurView>
          </Modal>
        )}

        <Modal visible={showMusicModal} animationType="slide" transparent>
           <BlurView intensity={95} tint="dark" style={styles.modalOverlay}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>Música</Text><TouchableOpacity onPress={() => setShowMusicModal(false)}><X size={24} color="#fff" /></TouchableOpacity></View>
              <FlatList data={MOCK_SONGS} renderItem={({ item }) => (
                <TouchableOpacity style={styles.songItem} onPress={() => { setSelectedSong(item); playSound(item.url); setShowMusicModal(false); }}>
                  <View style={styles.songArtwork} /><View><Text style={styles.songTitle}>{item.title}</Text><Text style={styles.songArtist}>{item.artist}</Text></View>
                </TouchableOpacity>
              )} />
           </BlurView>
        </Modal>

        <Modal visible={showLocationInput} animationType="slide" transparent>
           <BlurView intensity={95} tint="dark" style={styles.modalOverlay}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>Localização</Text><TouchableOpacity onPress={() => setShowLocationInput(false)}><X size={24} color="#fff" /></TouchableOpacity></View>
              <TextInput style={styles.locationInput} value={location} onChangeText={setLocation} autoFocus placeholder="ONDE VOCÊ ESTÁ?" placeholderTextColor="#999" />
              <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowLocationInput(false)}><Text style={styles.confirmText}>CONCLUIR</Text></TouchableOpacity>
           </BlurView>
        </Modal>
      </GestureHandlerRootView>
    </Modal>
  );
}

function DraggableSticker({ children, x, y }: any) {
  const pan = useRef(new RNAnimated.ValueXY({ x, y })).current;
  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value }); },
    onPanResponderMove: RNAnimated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => pan.flattenOffset(),
  })).current;
  return <RNAnimated.View {...responder.panHandlers} style={[styles.sticker, { transform: pan.getTranslateTransform() }]}>{children}</RNAnimated.View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111' },
  header: { position: 'absolute', top: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 100 },
  headerRight: { flexDirection: 'row', gap: 15 },
  iconBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25 },
  canvas: { flex: 1, backgroundColor: '#000' },
  gestureContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  mediaWrapper: { width: SCREEN_WIDTH, height: CONTAINER_HEIGHT, backgroundColor: '#000' },
  mainMedia: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  sticker: { position: 'absolute', zIndex: 100 },
  musicLabel: { backgroundColor: '#fff', padding: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  musicText: { color: '#000', fontSize: 13, fontWeight: '900' },
  locationLabel: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { color: '#00d9ff', fontSize: 14, fontWeight: '900' },
  canvasText: { fontSize: 32, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 10 },
  footer: { position: 'absolute', bottom: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 },
  mainActionBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarMini: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#ff1493' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 12 },
  mainActionText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sendBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  textEditHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, marginTop: 40 },
  headerAction: { color: '#fff', fontSize: 17 },
  headerActionBold: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  mainInput: { flex: 1, textAlign: 'center', fontSize: 40, fontWeight: '900' },
  colorRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, paddingBottom: 40 },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  activeDot: { borderColor: '#fff' },
  modalOverlay: { flex: 1, paddingTop: 60 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  songItem: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  songArtwork: { width: 45, height: 45, backgroundColor: '#222', borderRadius: 4 },
  songTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  songArtist: { color: '#aaa', fontSize: 12 },
  locationInput: { backgroundColor: 'rgba(255,255,255,0.1)', margin: 20, padding: 18, borderRadius: 12, color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
  confirmBtn: { backgroundColor: '#fff', marginHorizontal: 20, padding: 16, borderRadius: 30, alignItems: 'center' },
  confirmText: { color: '#000', fontWeight: '900' },
});
