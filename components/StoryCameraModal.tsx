import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { X, Zap, ZapOff, RefreshCcw, Image as ImageIcon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryCameraModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string, type: 'image' | 'video') => void;
}

export default function StoryCameraModal({ visible, onClose, onCapture }: StoryCameraModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      if (!permission?.granted) requestPermission();
      if (!micPermission?.granted) requestMicPermission();
    }
  }, [visible, permission, micPermission]);

  if (!visible) return null;

  if (!permission || !micPermission) return <View />;

  if (!permission.granted || !micPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Precisamos de acesso à câmera e microfone</Text>
        <TouchableOpacity onPress={() => { requestPermission(); requestMicPermission(); }} style={styles.btn}>
           <Text style={styles.btnText}>Dar permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleFacing = () => setFacing(f => (f === 'back' ? 'front' : 'back'));
  const toggleFlash = () => setFlash(f => (f === 'off' ? 'on' : 'off'));

  const takePhoto = async () => {
    if (cameraRef.current && !isRecording) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        onCapture(photo.uri, 'image');
      } catch (e) {
        console.log(e);
      }
    }
  };

  const startVideo = async () => {
    if (cameraRef.current && !isRecording) {
      try {
        setIsRecording(true);
        console.log('🎬 Iniciando gravação...');
        const video = await cameraRef.current.recordAsync({
          maxDuration: 15,
          quality: '720p',
        });
        if (video) onCapture(video.uri, 'video');
      } catch (e) {
        console.log('Record error:', e);
        setIsRecording(false);
      }
    }
  };

  const stopVideo = async () => {
    if (cameraRef.current && isRecording) {
      console.log('🛑 Parando gravação...');
      try {
        cameraRef.current.stopRecording();
      } catch (e) {
        console.log(e);
      } finally {
        setIsRecording(false);
      }
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      onCapture(result.assets[0].uri, result.assets[0].type === 'video' ? 'video' : 'image');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flash}
          // Modo 'video' permite tirar fotos E gravar vídeos fluídos
          mode="video"
        >
          <View style={styles.overlay}>
             <View style={styles.topControls}>
                <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                  <X size={30} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleFlash} style={styles.iconBtn}>
                  {flash === 'on' ? <Zap size={24} color="#FFD700" fill="#FFD700" /> : <ZapOff size={24} color="#fff" />}
                </TouchableOpacity>
             </View>

             <View style={styles.bottomControls}>
                <TouchableOpacity onPress={pickFromGallery} style={styles.galleryBtn}>
                   <ImageIcon size={26} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity 
                   onPress={takePhoto}
                   onLongPress={startVideo}
                   onPressOut={stopVideo}
                   activeOpacity={0.7}
                   style={[styles.shutterBtn, isRecording && styles.shutterRecording]}
                >
                   <View style={[styles.shutterInner, isRecording && styles.shutterInnerRecording]} />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleFacing} style={styles.galleryBtn}>
                   <RefreshCcw size={26} color="#fff" />
                </TouchableOpacity>
             </View>

             {isRecording && (
                <View style={styles.recordingTimer}>
                   <View style={styles.recordingDot} />
                   <Text style={styles.recordingText}>GRAVANDO</Text>
                </View>
             )}
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'space-between', paddingVertical: 50 },
  topControls: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  bottomControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 20 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  galleryBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  shutterBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  shutterRecording: { borderColor: '#FF3B30' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  shutterInnerRecording: { backgroundColor: '#FF3B30', borderRadius: 8, width: 30, height: 30 },
  recordingTimer: { position: 'absolute', top: 120, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, gap: 8 },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' },
  recordingText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  text: { color: '#fff', textAlign: 'center', marginTop: 100, fontSize: 18 },
  btn: { backgroundColor: '#00d9ff', padding: 15, borderRadius: 10, alignSelf: 'center', marginTop: 20 },
  btnText: { color: '#000', fontWeight: 'bold' },
});
