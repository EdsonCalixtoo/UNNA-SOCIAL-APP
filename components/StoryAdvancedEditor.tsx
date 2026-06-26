import { useLanguage } from '@/lib/i18n';
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
  KeyboardAvoidingView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import ViewShot from 'react-native-view-shot';
import { supabase } from '@/lib/supabase';
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
import { X, Check, Type, Music, MapPin, ChevronRight, Sticker, AtSign, Focus } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ASpectRatio = 9 / 16;
const CONTAINER_HEIGHT = SCREEN_WIDTH / ASpectRatio;

interface StoryAdvancedEditorProps {
  visible: boolean;
  mediaUri: string;
  mediaType: 'image' | 'video';
  onClose: () => void;
  onSave: (finalUri: string, stickers?: any[]) => void;
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

const MOCK_USERS = [
  { id: '1', name: 'João Silva', username: 'joaosilva', avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'Maria Santos', username: 'mariasantos', avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: '3', name: 'Pedro Oliveira', username: 'pedro_ol', avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: '4', name: 'Ana Costa', username: 'anacosta', avatar: 'https://i.pravatar.cc/150?u=4' },
];

const MOCK_LOCATIONS = [
  { id: '1', name: 'São Paulo, Brasil' },
  { id: '2', name: 'Rio de Janeiro' },
  { id: '3', name: 'Praia do Futuro' },
  { id: '4', name: 'Copacabana' },
];

const MOCK_SONGS = [
  { id: '1', title: 'Birds of a Feather', artist: 'Billie Eilish', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: '2', title: 'Espresso', artist: 'Sabrina Carpenter', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
];

export default function StoryAdvancedEditor({ visible, mediaUri, mediaType, onClose, onSave, mode = 'story' }: StoryAdvancedEditorProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [currentColor, setCurrentColor] = useState('#FFFFFF');
  
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);
  const [showMentionInput, setShowMentionInput] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  
  const [showMusicModal, setShowMusicModal] = useState(false);

  const [interactiveStickers, setInteractiveStickers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);

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
    if (visible && profile) {
      supabase
        .from('follows')
        .select('profiles!follows_following_id_fkey(id, username, avatar_url, full_name)')
        .eq('follower_id', profile.id)
        .then(({ data }) => {
           if (data) {
             const profiles = data.map((d: any) => d.profiles).filter(Boolean);
             setFollowing(profiles);
           }
        });
    }
  }, [visible, profile]);

  useEffect(() => {
    if (locationQuery.trim().length > 2) {
       const timer = setTimeout(() => {
          fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&limit=10&addressdetails=1`)
            .then(res => res.json())
            .then((data: any[]) => {
               if (data && Array.isArray(data)) {
                  setLocationResults(data.map((p: any) => {
                     // Extract a friendly name
                     const name = p.address?.city || p.address?.town || p.address?.village || p.name;
                     const state = p.address?.state || p.address?.country;
                     const displayName = name && state ? `${name}, ${state}` : p.display_name.split(',').slice(0,2).join(',');
                     return {
                       id: p.place_id.toString(),
                       name: displayName
                     };
                  }));
               }
            })
            .catch(console.error);
       }, 500);
       return () => clearTimeout(timer);
    } else {
       setLocationResults([]);
    }
  }, [locationQuery]);

  useEffect(() => {
    if (videoPlayer) {
      if (visible) videoPlayer.play();
      else videoPlayer.pause();
    }
  }, [visible, videoPlayer]);

  useEffect(() => {
    if (audioPlayer && audioUrl) {
      audioPlayer.loop = true;
      if (visible) audioPlayer.play();
      else audioPlayer.pause();
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
    .onUpdate((e) => { rotation.value = savedRotation.value + e.rotation; })
    .onEnd(() => { savedRotation.value = rotation.value; });

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
      onSave(mediaUri, interactiveStickers);
      return;
    }

    if (!viewShotRef.current || !viewShotRef.current.capture) return;
    setIsProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 600));
      const uri = await viewShotRef.current.capture();
      onSave(uri, interactiveStickers);
    } catch (error) {
      console.error('Erro ao capturar imagem:', error);
      onSave(mediaUri);
    } finally {
      setIsProcessing(false);
    }
  };

  const addMention = (user: any) => {
    setInteractiveStickers([...interactiveStickers, {
      id: Date.now().toString(),
      tag_type: 'person',
      tag_value: user.username,
      tagged_user_id: user.id,
      x: 0.5,
      y: 0.5
    }]);
    setShowMentionInput(false);
    setMentionQuery('');
  };

  const addLocation = (loc: any) => {
    setInteractiveStickers([...interactiveStickers, {
      id: Date.now().toString(),
      tag_type: 'location',
      tag_value: loc.name,
      x: 0.5,
      y: 0.5
    }]);
    setShowLocationInput(false);
    setLocationQuery('');
  };
  
  const addMusic = (song: any) => {
    setInteractiveStickers([...interactiveStickers, {
      id: Date.now().toString(),
      tag_type: 'music',
      tag_value: song.title,
      x: 0.5,
      y: 0.5
    }]);
    playSound(song.url);
    setShowMusicModal(false);
  }

  const filteredUsers = following.filter(u => 
    u.username?.toLowerCase().includes(mentionQuery.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())
  );
  
  // Se não houver resultados da API e tiver texto, permite criar a localização customizada
  const filteredLocations = locationResults.length > 0 
    ? locationResults 
    : (locationQuery.trim().length > 0 
        ? [{ id: 'custom', name: locationQuery.trim() }] 
        : []);

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => { if(audioPlayer) audioPlayer.pause(); if(videoPlayer) videoPlayer.pause(); onClose(); }} style={styles.iconBtn}>
              <X size={28} color="#fff" strokeWidth={2.5} />
           </TouchableOpacity>
           <View style={styles.headerRight}>
             <TouchableOpacity 
               onPress={() => {
                 scale.value = withSpring(1);
                 translateX.value = withSpring(0);
                 translateY.value = withSpring(0);
                 rotation.value = withSpring(0);
                 savedScale.value = 1;
                 savedTranslateX.value = 0;
                 savedTranslateY.value = 0;
                 savedRotation.value = 0;
               }} 
               style={styles.iconBtn}
             >
                <Focus size={24} color="#fff" />
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setShowStickerDrawer(true)} style={styles.iconBtn}>
                <Sticker size={24} color="#fff" />
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setEditingTextId('new')} style={styles.iconBtn}>
                <Type size={24} color="#fff" />
             </TouchableOpacity>
           </View>
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
             {textItems.map(item => (
                <DraggableSticker key={item.id} x={item.x} y={item.y}>
                   <TouchableOpacity onPress={() => { setEditingTextId(item.id); setCurrentText(item.text); setCurrentColor(item.color); }}>
                      <Text style={[styles.canvasText, { color: item.color }]}>{item.text}</Text>
                   </TouchableOpacity>
                </DraggableSticker>
             ))}
             {interactiveStickers.map(stk => (
                <DraggableSticker key={stk.id} x={150} y={200}>
                   {stk.tag_type === 'person' && (
                     <LinearGradient colors={['#f9ce34', '#ee2a7b', '#6228d7']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.instagramMention}>
                        <Text style={styles.instagramMentionText}>@{stk.tag_value}</Text>
                     </LinearGradient>
                   )}
                   {stk.tag_type === 'location' && (
                     <View style={styles.instagramLocation}>
                        <LinearGradient colors={['#f9ce34', '#ee2a7b']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.instagramLocationIcon}>
                          <MapPin size={16} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.instagramLocationText}>{stk.tag_value.toUpperCase()}</Text>
                     </View>
                   )}
                   {stk.tag_type === 'music' && (
                     <View style={styles.instagramMusic}>
                        <Music size={14} color="#000" />
                        <Text style={styles.instagramMusicText}>{stk.tag_value}</Text>
                     </View>
                   )}
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

        {/* --- MODAIS DE UI INSTAGRAM --- */}
        
        {/* Editor de Texto Simples */}
        {editingTextId && (
          <Modal transparent animationType="fade">
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
               <View style={styles.textEditHeader}>
                  <TouchableOpacity onPress={() => setEditingTextId(null)}><Text style={styles.headerAction}>{t('auto.s847607d7', 'Cancelar')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={saveText}><Text style={styles.headerActionBold}>{t('auto.s9a816aba', 'Concluir')}</Text></TouchableOpacity>
               </View>
               <TextInput autoFocus multiline style={[styles.mainInput, { color: currentColor }]} value={currentText} onChangeText={setCurrentText} selectionColor={currentColor} />
               <View style={styles.colorRow}>
                  {COLORS.map(c => <TouchableOpacity key={c} onPress={() => setCurrentColor(c)} style={[styles.colorDot, { backgroundColor: c }, currentColor === c && styles.activeDot]} />)}
               </View>
            </BlurView>
          </Modal>
        )}

        {/* Gaveta de Adesivos (Sticker Drawer) */}
        <Modal visible={showStickerDrawer} transparent animationType="slide">
          <BlurView intensity={50} tint="dark" style={styles.drawerOverlay}>
            <TouchableOpacity style={{flex: 1}} onPress={() => setShowStickerDrawer(false)} />
            <View style={styles.drawerContent}>
              <View style={styles.drawerHandle} />
              <View style={styles.drawerGrid}>
                {mode !== 'event' && (
                  <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowStickerDrawer(false); setShowLocationInput(true); }}>
                    <LinearGradient colors={['#f9ce34', '#ee2a7b']} style={styles.drawerIconBg}><MapPin size={28} color="#fff" /></LinearGradient>
                    <Text style={styles.drawerItemText}>Localização</Text>
                  </TouchableOpacity>
                )}
                {mode !== 'event' && (
                  <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowStickerDrawer(false); setShowMentionInput(true); }}>
                    <LinearGradient colors={['#f9ce34', '#ee2a7b', '#6228d7']} style={styles.drawerIconBg}><AtSign size={28} color="#fff" /></LinearGradient>
                    <Text style={styles.drawerItemText}>Menção</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.drawerItem} onPress={() => { setShowStickerDrawer(false); setShowMusicModal(true); }}>
                  <LinearGradient colors={['#00D9FF', '#007AFF']} style={styles.drawerIconBg}><Music size={28} color="#fff" /></LinearGradient>
                  <Text style={styles.drawerItemText}>Música</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </Modal>

        {/* Digitação de Menção @ */}
        {showMentionInput && (
          <Modal transparent animationType="fade">
            <BlurView intensity={90} tint="dark" style={styles.mentionOverlay}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <View style={styles.mentionHeader}>
                  <TouchableOpacity onPress={() => setShowMentionInput(false)}>
                    <Text style={styles.headerActionBold}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.mentionInputContainer}>
                  <LinearGradient colors={['#f9ce34', '#ee2a7b', '#6228d7']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.mentionInputGradient}>
                    <Text style={styles.mentionInputPrefix}>@</Text>
                    <TextInput 
                      style={styles.mentionInput} 
                      autoFocus 
                      value={mentionQuery} 
                      onChangeText={setMentionQuery} 
                      placeholder="Menção" 
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      selectionColor="#fff"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </LinearGradient>
                </View>
                
                <View style={styles.mentionSuggestionsRow}>
                  <FlatList
                    horizontal
                    keyboardShouldPersistTaps="always"
                    showsHorizontalScrollIndicator={false}
                    data={filteredUsers}
                    keyExtractor={item => item.id}
                    renderItem={({item}) => (
                      <TouchableOpacity style={styles.mentionSuggestionItem} onPress={() => addMention(item)}>
                        {item.avatar_url ? (
                          <Image source={{ uri: item.avatar_url }} style={styles.mentionSuggestionAvatar} />
                        ) : (
                          <View style={[styles.mentionSuggestionAvatar, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
                             <Text style={{color:'#fff', fontWeight:'bold'}}>{item.username?.[0]?.toUpperCase()}</Text>
                          </View>
                        )}
                        <Text style={styles.mentionSuggestionName} numberOfLines={1}>{item.username}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </KeyboardAvoidingView>
            </BlurView>
          </Modal>
        )}

        {/* Digitação de Localização */}
        {showLocationInput && (
          <Modal transparent animationType="fade">
            <BlurView intensity={90} tint="dark" style={styles.locationOverlay}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <View style={styles.locationHeaderRow}>
                  <View style={styles.locationSearchBar}>
                    <MapPin size={20} color="#999" />
                    <TextInput 
                      style={styles.locationSearchInput} 
                      autoFocus 
                      value={locationQuery} 
                      onChangeText={setLocationQuery} 
                      placeholder="Pesquisar localizações" 
                      placeholderTextColor="#999"
                    />
                  </View>
                  <TouchableOpacity onPress={() => setShowLocationInput(false)} style={{marginLeft: 15}}>
                    <Text style={styles.headerActionBold}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  keyboardShouldPersistTaps="always"
                  data={filteredLocations}
                  keyExtractor={item => item.id}
                  renderItem={({item}) => (
                    <TouchableOpacity style={styles.locationResultItem} onPress={() => addLocation(item)}>
                      <View style={styles.locationResultIcon}><MapPin size={20} color="#fff" /></View>
                      <Text style={styles.locationResultText}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
              </KeyboardAvoidingView>
            </BlurView>
          </Modal>
        )}

        {/* Modal de Música */}
        <Modal visible={showMusicModal} animationType="slide" transparent>
           <BlurView intensity={95} tint="dark" style={styles.drawerOverlay}>
              <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t('auto.s275a856f', 'Música')}</Text><TouchableOpacity onPress={() => setShowMusicModal(false)}><X size={24} color="#fff" /></TouchableOpacity></View>
              <FlatList data={MOCK_SONGS} renderItem={({ item }) => (
                <TouchableOpacity style={styles.songItem} onPress={() => addMusic(item)}>
                  <View style={styles.songArtwork} />
                  <View><Text style={styles.songTitle}>{item.title}</Text><Text style={styles.songArtist}>{item.artist}</Text></View>
                </TouchableOpacity>
              )} />
           </BlurView>
        </Modal>

      </GestureHandlerRootView>
    </Modal>
  );
}

function DraggableSticker({ children, x, y }: any) {
  const translateX = useSharedValue(x);
  const translateY = useSharedValue(y);
  const savedTranslateX = useSharedValue(x);
  const savedTranslateY = useSharedValue(y);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const rotationGesture = Gesture.Rotation()
    .onUpdate((e) => {
      rotation.value = savedRotation.value + e.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture, rotationGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotateZ: `${(rotation.value / Math.PI) * 180}deg` }
    ] as any
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.sticker, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
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
  
  // Instagram Mention & Location Stickers
  instagramMention: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  instagramMentionText: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  instagramLocation: { backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  instagramLocationIcon: { padding: 4, borderRadius: 20 },
  instagramLocationText: { color: '#000', fontSize: 16, fontWeight: '900' },
  instagramMusic: { backgroundColor: '#fff', padding: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  instagramMusicText: { color: '#000', fontSize: 13, fontWeight: '900' },

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

  // Drawer
  drawerOverlay: { flex: 1, justifyContent: 'flex-end' },
  drawerContent: { backgroundColor: 'rgba(0,0,0,0.85)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 50 },
  drawerHandle: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  drawerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'center' },
  drawerItem: { alignItems: 'center', width: 90 },
  drawerIconBg: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  drawerItemText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Mention Input UI
  mentionOverlay: { flex: 1, paddingTop: 60 },
  mentionHeader: { paddingHorizontal: 20, alignItems: 'flex-end', marginBottom: 40 },
  mentionInputContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mentionInputGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  mentionInputPrefix: { color: '#fff', fontSize: 32, fontWeight: '900', marginRight: 5 },
  mentionInput: { color: '#fff', fontSize: 32, fontWeight: '900', minWidth: 100 },
  mentionSuggestionsRow: { padding: 15, paddingBottom: 30 },
  mentionSuggestionItem: { alignItems: 'center', marginRight: 15, width: 70 },
  mentionSuggestionAvatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 5 },
  mentionSuggestionName: { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Location Input UI
  locationOverlay: { flex: 1, paddingTop: 60 },
  locationHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  locationSearchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 15, height: 40, borderRadius: 8 },
  locationSearchInput: { flex: 1, color: '#fff', marginLeft: 10, fontSize: 16 },
  locationResultItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  locationResultIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  locationResultText: { color: '#fff', fontSize: 16, fontWeight: '500' },

  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  songItem: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  songArtwork: { width: 45, height: 45, backgroundColor: '#222', borderRadius: 4 },
  songTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  songArtist: { color: '#aaa', fontSize: 12 },
});
