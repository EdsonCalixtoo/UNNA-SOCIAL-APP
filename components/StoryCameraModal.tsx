import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { X, Zap, ZapOff, RefreshCcw, Image as ImageIcon } from 'lucide-react-native';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string, type: 'image' | 'video') => void;
  usageType?: 'story' | 'event' | 'profile';
}

export default function StoryCameraModal({ visible, onClose, onCapture, usageType = 'story' }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cameraRef = useRef<any>(null);
  const isRecordingRef = useRef(false); // ref para evitar stale closure

  useEffect(() => {
    if (visible) {
      // Monta câmera após 400ms para hardware estabilizar
      const t = setTimeout(() => setMounted(true), 400);
      return () => clearTimeout(t);
    } else {
      setMounted(false);
      setCameraReady(false);
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  }, [visible]);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || isRecordingRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.75,
        skipProcessing: true,
      });
      if (photo?.uri) onCapture(photo.uri, 'image');
    } catch (e) {
      console.log('Photo error:', e);
    }
  }, [cameraReady, onCapture]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || !cameraReady || isRecordingRef.current) return;
    if (!micPermission?.granted) {
      const r = await requestMicPermission();
      if (!r.granted) return;
    }
    try {
      isRecordingRef.current = true;
      setIsRecording(true);
      const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
      if (video?.uri) onCapture(video.uri, 'video');
    } catch (e) {
      console.log('Record error:', e);
    } finally {
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }, [cameraReady, micPermission, onCapture]);

  const stopRecording = useCallback(async () => {
    // Só para se REALMENTE estiver gravando
    if (!isRecordingRef.current || !cameraRef.current) return;
    try {
      await cameraRef.current.stopRecording();
    } catch (e) {
      console.log('Stop error:', e);
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      onCapture(asset.uri, asset.type === 'video' ? 'video' : 'image');
    }
  }, [onCapture]);

  // Permissões não concedidas
  if (permission && !permission.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={[st.root, { justifyContent: 'center', padding: 32 }]}>
          <Text style={st.permText}>
            Precisamos da câmera e microfone para {usageType === 'event' ? 'o seu Evento' : usageType === 'profile' ? 'o seu Perfil' : 'os Stories'}
          </Text>
          <TouchableOpacity style={st.permBtn} onPress={() => { requestPermission(); requestMicPermission(); }}>
            <Text style={st.permBtnTxt}>Dar permissão</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#fff' }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={st.root}>

        {!mounted ? (
          <View style={st.loading}>
            <ActivityIndicator size="large" color="#00d9ff" />
            <Text style={st.loadingTxt}>Iniciando câmera...</Text>
          </View>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={st.camera}
              facing={facing}
              flash={flash}
              mode="video"
              onCameraReady={() => setCameraReady(true)}
            />

            {/* Controles superiores */}
            <View style={st.topRow}>
              <TouchableOpacity onPress={onClose} style={st.iconBtn}>
                <X size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')} style={st.iconBtn}>
                {flash === 'on'
                  ? <Zap size={24} color="#FFD700" fill="#FFD700" />
                  : <ZapOff size={24} color="#fff" />
                }
              </TouchableOpacity>
            </View>

            {/* Indicador de gravação */}
            {isRecording && (
              <View style={st.recBadge}>
                <View style={st.recDot} />
                <Text style={st.recTxt}>GRAVANDO</Text>
              </View>
            )}

            {/* Controles inferiores */}
            <View style={st.bottomRow}>
              <TouchableOpacity onPress={pickFromGallery} style={st.sideBtn}>
                <ImageIcon size={26} color="#fff" />
              </TouchableOpacity>

              {/* Botão principal: toque = foto / segurar = vídeo */}
              <TouchableOpacity
                style={[st.shutter, isRecording && st.shutterRec]}
                onPress={takePhoto}
                onLongPress={startRecording}
                onPressOut={stopRecording}
                delayLongPress={300}
                activeOpacity={0.85}
                disabled={!cameraReady}
              >
                <View style={[st.shutterInner, isRecording && st.shutterInnerRec]} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
                style={st.sideBtn}
              >
                <RefreshCcw size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            {!cameraReady && (
              <View style={st.notReady}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#000' },
  camera:          { ...StyleSheet.absoluteFillObject },
  loading:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingTxt:      { color: '#fff', fontSize: 14 },
  permText:        { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 24 },
  permBtn:         { backgroundColor: '#00d9ff', padding: 16, borderRadius: 12, alignItems: 'center' },
  permBtnTxt:      { color: '#000', fontWeight: 'bold', fontSize: 16 },
  topRow:          { position: 'absolute', top: Platform.OS === 'ios' ? 56 : 36, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  iconBtn:         { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  recBadge:        { position: 'absolute', top: Platform.OS === 'ios' ? 120 : 100, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  recDot:          { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF3B30' },
  recTxt:          { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  bottomRow:       { position: 'absolute', bottom: Platform.OS === 'ios' ? 48 : 32, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 20 },
  sideBtn:         { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  shutter:         { width: 82, height: 82, borderRadius: 41, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  shutterRec:      { borderColor: '#FF3B30' },
  shutterInner:    { width: 66, height: 66, borderRadius: 33, backgroundColor: '#fff' },
  shutterInnerRec: { backgroundColor: '#FF3B30', borderRadius: 10, width: 32, height: 32 },
  notReady:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
});
