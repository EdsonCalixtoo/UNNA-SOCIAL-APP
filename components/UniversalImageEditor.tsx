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
  PanResponder,
  Animated,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { X, Check, Type, RotateCw, Music, MapPin, Search, ChevronRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import ViewShot from 'react-native-view-shot';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UniversalImageEditorProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: (finalUri: string) => void;
  mode?: 'story' | 'profile' | 'event';
}

interface TextItem {
  id: string;
  text: string;
  color: string;
  fontSize: number;
  x: number;
  y: number;
}

const COLORS = ['#FFFFFF', '#000000', '#FF1493', '#00D9FF', '#FFD700', '#34C759', '#FF3B30'];

const MOCK_SONGS = [
  { id: '1', title: 'Birds of a Feather', artist: 'Billie Eilish', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: '2', title: 'Espresso', artist: 'Sabrina Carpenter', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: '3', title: 'Dancing in the Dark', artist: 'Lana Del Rey', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: '4', title: 'Midnight Sun', artist: 'The Weeknd', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
];

export default function UniversalImageEditor({ visible, imageUri, onClose, onSave, mode = 'story' }: UniversalImageEditorProps) {
  const { profile } = useAuth();
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [currentColor, setCurrentColor] = useState('#FFFFFF');
  const [currentFontSize, setCurrentFontSize] = useState(32);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [location, setLocation] = useState('');

  // Pinch/Pan logic for the Background Image
  const imgScale = useRef(new Animated.Value(1)).current;
  const imgTranslateX = useRef(new Animated.Value(0)).current;
  const imgTranslateY = useRef(new Animated.Value(0)).current;
  const lastImgScale = useRef(1);
  const lastImgTranslateX = useRef(0);
  const lastImgTranslateY = useRef(0);
  const dist = useRef(0);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    if (visible) {
      configureAudio();
    }
    return () => {
      if (sound) sound.unloadAsync();
    };
  }, [visible]);

  const configureAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (e) {
      console.log('Audio mode error:', e);
    }
  };

  async function playSound(url: string) {
    try {
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true, isLooping: true }
      );
      setSound(newSound);
    } catch (e) {
      console.log('Playback error:', e);
    }
  }

  const saveText = () => {
    if (!currentText.trim()) {
      setEditingTextId(null);
      return;
    }
    if (editingTextId === 'new') {
      setTextItems([...textItems, {
        id: Date.now().toString(),
        text: currentText,
        color: currentColor,
        fontSize: currentFontSize,
        x: SCREEN_WIDTH / 2 - 50,
        y: SCREEN_HEIGHT / 2 - 20,
      }]);
    } else {
      setTextItems(items => items.map(i => i.id === editingTextId ? { ...i, text: currentText, color: currentColor, fontSize: currentFontSize } : i));
    }
    setEditingTextId(null);
  };

  const handleCapture = async () => {
    if (!viewShotRef.current || !viewShotRef.current.capture) return;
    setIsProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      const uri = await viewShotRef.current.capture();
      if (sound) await sound.stopAsync();
      onSave(uri);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const calcDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(Math.abs(x1 - x2), 2) + Math.pow(Math.abs(y1 - y2), 2));
  };

  const imagePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, gs) => {
        if (gs.numberActiveTouches === 2) {
          let touches = e.nativeEvent.touches;
          dist.current = calcDistance(touches[0].pageX, touches[0].pageY, touches[1].pageX, touches[1].pageY);
        }
      },
      onPanResponderMove: (e, gs) => {
        if (gs.numberActiveTouches === 2) {
          let touches = e.nativeEvent.touches;
          let newDist = calcDistance(touches[0].pageX, touches[0].pageY, touches[1].pageX, touches[1].pageY);
          let zoom = (newDist / dist.current) * lastImgScale.current;
          imgScale.setValue(Math.min(Math.max(zoom, 0.5), 5));
        } else if (gs.numberActiveTouches === 1) {
          imgTranslateX.setValue(lastImgTranslateX.current + gs.dx);
          imgTranslateY.setValue(lastImgTranslateY.current + gs.dy);
        }
      },
      onPanResponderRelease: () => {
        // @ts-ignore
        lastImgScale.current = imgScale._value;
        // @ts-ignore
        lastImgTranslateY.current = imgTranslateY._value;
        // @ts-ignore
        lastImgTranslateX.current = imgTranslateX._value;
      },
    })
  ).current;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { if(sound) sound.stopAsync(); onClose(); }} style={styles.iconButton}>
            <X size={28} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowMusicModal(true)} style={styles.iconButton}>
              <Music size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLocationInput(true)} style={styles.iconButton}>
              <MapPin size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingTextId('new')} style={styles.iconButton}>
              <Type size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 1.0 }} style={styles.canvas}>
          <View style={styles.imageWrapper} collapsable={false} {...imagePanResponder.panHandlers}>
            <Animated.Image 
              source={{ uri: imageUri }} 
              style={[
                styles.mainImage,
                {
                  transform: [
                    { scale: imgScale },
                    { translateX: imgTranslateX },
                    { translateY: imgTranslateY },
                  ]
                }
              ]} 
              resizeMode="cover"
            />
            <View style={styles.overlay} collapsable={false} pointerEvents="none" />
            
            {selectedSong && (
              <DraggableItem x={50} y={150}>
                <View style={styles.musicSticker}>
                   <Music size={14} color="#ff1493" />
                   <View>
                     <Text style={styles.musicTitle}>{selectedSong.title}</Text>
                     <Text style={styles.musicArtist}>{selectedSong.artist}</Text>
                   </View>
                </View>
              </DraggableItem>
            )}

            {location && (
              <DraggableItem x={100} y={100}>
                <View style={styles.locationSticker}>
                   <MapPin size={16} color="#00D9FF" />
                   <Text style={styles.locationText}>{location.toUpperCase()}</Text>
                </View>
              </DraggableItem>
            )}

            {textItems.map(item => (
              <DraggableText key={item.id} item={item} onPress={() => { setEditingTextId(item.id); setCurrentText(item.text); setCurrentColor(item.color); }} onDelete={() => setTextItems(it => it.filter(i => i.id !== item.id))} />
            ))}
          </View>
        </ViewShot>

        <View style={styles.footer}>
           {mode === 'story' ? (
             <TouchableOpacity style={styles.storyBtn} activeOpacity={0.8} onPress={handleCapture}>
                <View style={styles.avatarCircle}>
                   <Image source={{ uri: profile?.avatar_url }} style={styles.avatarImage} />
                </View>
                <Text style={styles.storyBtnText}>Seu story</Text>
             </TouchableOpacity>
           ) : (
             <TouchableOpacity style={styles.confirmMainBtn} activeOpacity={0.8} onPress={handleCapture}>
                <Check size={20} color="#fff" strokeWidth={3} />
                <Text style={styles.confirmMainBtnText}>CONCLUIR</Text>
             </TouchableOpacity>
           )}

           <TouchableOpacity style={styles.publishMainBtn} onPress={handleCapture} disabled={isProcessing}>
             {isProcessing ? <ActivityIndicator color="#000" /> : <ChevronRight size={24} color="#000" strokeWidth={3} />}
           </TouchableOpacity>
        </View>

        {/* Music Modal */}
        <Modal visible={showMusicModal} animationType="slide" transparent>
           <BlurView intensity={95} tint="dark" style={styles.modalOverlay}>
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>Música</Text>
                 <TouchableOpacity onPress={() => setShowMusicModal(false)}><X size={24} color="#fff" /></TouchableOpacity>
              </View>
              <FlatList 
                data={MOCK_SONGS}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.songItem} onPress={() => { setSelectedSong(item); playSound(item.url); setShowMusicModal(false); }}>
                    <View style={styles.songArtwork} />
                    <View><Text style={styles.songTitle}>{item.title}</Text><Text style={styles.songArtist}>{item.artist}</Text></View>
                  </TouchableOpacity>
                )}
              />
           </BlurView>
        </Modal>

        {/* Location Modal */}
        <Modal visible={showLocationInput} animationType="slide" transparent>
           <BlurView intensity={95} tint="dark" style={styles.modalOverlay}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>Localização</Text><TouchableOpacity onPress={() => setShowLocationInput(false)}><X size={24} color="#fff" /></TouchableOpacity></View>
              <TextInput style={styles.locationInput} value={location} onChangeText={setLocation} autoFocus placeholder="ONDE VOCÊ ESTÁ?" placeholderTextColor="#999" />
              <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowLocationInput(false)}><Text style={styles.confirmText}>CONCLUIR</Text></TouchableOpacity>
           </BlurView>
        </Modal>

        {/* Text Editor Overlay */}
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
      </View>
    </Modal>
  );
}

function DraggableItem({ children, x, y }: any) {
  const pan = useRef(new Animated.ValueXY({ x, y })).current;
  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value }); },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => pan.flattenOffset(),
  })).current;
  return <Animated.View {...responder.panHandlers} style={[styles.dragItem, { transform: pan.getTranslateTransform() }]}>{children}</Animated.View>;
}

function DraggableText({ item, onPress, onDelete }: any) {
  const pan = useRef(new Animated.ValueXY({ x: item.x, y: item.y })).current;
  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value }); },
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => pan.flattenOffset(),
  })).current;
  return (
    <Animated.View {...responder.panHandlers} style={[styles.dragItem, { transform: pan.getTranslateTransform() }]}>
      <TouchableOpacity onPress={onPress} onLongPress={onDelete} activeOpacity={0.8}>
        <Text style={[styles.canvasText, { color: item.color }]}>{item.text}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { position: 'absolute', top: 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 100 },
  headerRight: { flexDirection: 'row', gap: 15 },
  iconButton: { padding: 8 },
  canvas: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  imageWrapper: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  mainImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.02)' },
  dragItem: { position: 'absolute', zIndex: 100, top: 100, left: 100 },
  musicSticker: { backgroundColor: '#fff', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  musicTitle: { color: '#000', fontSize: 13, fontWeight: '900' },
  musicArtist: { color: '#666', fontSize: 11 },
  locationSticker: { backgroundColor: '#fff', padding: 12, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { color: '#00D9FF', fontSize: 13, fontWeight: '900' },
  canvasText: { fontSize: 32, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 10 },
  footer: { position: 'absolute', bottom: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 },
  storyBtn: { backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmMainBtn: { backgroundColor: '#34C759', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmMainBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  avatarCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#ff1493' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 12 },
  storyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  publishMainBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
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
  textEditHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, marginTop: 40 },
  headerAction: { color: '#fff', fontSize: 17 },
  headerActionBold: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  mainInput: { flex: 1, textAlign: 'center', fontSize: 40, fontWeight: '900' },
  colorRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, paddingBottom: 40 },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  activeDot: { borderColor: '#fff' },
});
