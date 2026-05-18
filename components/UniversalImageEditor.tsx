import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { 
  Gesture, 
  GestureDetector, 
  GestureHandlerRootView 
} from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWPORT_SIZE = SCREEN_WIDTH;

interface UniversalImageEditorProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: (finalUri: string) => void;
  mode?: 'profile' | 'event' | 'post';
}

export default function UniversalImageEditor({ visible, imageUri, onClose, onSave, mode = 'event' }: UniversalImageEditorProps) {
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });

  // Estados Animados (Reanimated)
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  // Backups para gestos
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Carregar dimensões reais da imagem ao abrir
  useEffect(() => {
    if (visible && imageUri) {
      Image.getSize(imageUri, (w, h) => {
        setOriginalSize({ width: w, height: h });
        
        // Reset para estado inicial "Cover"
        const ratio = w / h;
        const initialScale = ratio > 1 ? (VIEWPORT_SIZE / (VIEWPORT_SIZE / ratio)) : (VIEWPORT_SIZE / (VIEWPORT_SIZE * ratio));
        
        scale.value = initialScale;
        savedScale.value = initialScale;
        translateX.value = 0;
        translateY.value = 0;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      });
    }
  }, [visible, imageUri]);

  // Lógica de Restrições (Não deixa a imagem sair do círculo)
  const applyConstraints = (isEnd = false) => {
    'worklet';
    if (originalSize.width === 0) return;

    const ratio = originalSize.width / originalSize.height;
    const currentW = ratio > 1 ? (VIEWPORT_SIZE * ratio * scale.value) : (VIEWPORT_SIZE * scale.value);
    const currentH = ratio > 1 ? (VIEWPORT_SIZE * scale.value) : (VIEWPORT_SIZE / ratio * scale.value);

    // Zoom mínimo: preencher o viewport
    const minScaleW = VIEWPORT_SIZE / (ratio > 1 ? VIEWPORT_SIZE * ratio : VIEWPORT_SIZE);
    const minScaleH = VIEWPORT_SIZE / (ratio > 1 ? VIEWPORT_SIZE : VIEWPORT_SIZE / ratio);
    const minScale = Math.max(minScaleW, minScaleH);

    if (scale.value < minScale) {
      scale.value = isEnd ? withSpring(minScale) : minScale;
    }

    // Limites de translação
    const maxTx = Math.max(0, (currentW - VIEWPORT_SIZE) / 2);
    const maxTy = Math.max(0, (currentH - VIEWPORT_SIZE) / 2);

    if (translateX.value > maxTx) translateX.value = isEnd ? withSpring(maxTx) : maxTx;
    if (translateX.value < -maxTx) translateX.value = isEnd ? withSpring(-maxTx) : -maxTx;
    if (translateY.value > maxTy) translateY.value = isEnd ? withSpring(maxTy) : maxTy;
    if (translateY.value < -maxTy) translateY.value = isEnd ? withSpring(-maxTy) : -maxTy;
  };

  // Gestos
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
      applyConstraints();
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      applyConstraints(true);
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
      applyConstraints();
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      applyConstraints(true);
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ] as any,
  }));

  // O CROP REAL (Pixel-Perfect)
  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const ratio = originalSize.width / originalSize.height;
      
      // 1. Calcular o tamanho da imagem como ela aparece na "viewport" virtual (VIEWPORT_SIZE)
      const displayW = ratio > 1 ? VIEWPORT_SIZE * ratio : VIEWPORT_SIZE;
      const displayH = ratio > 1 ? VIEWPORT_SIZE : VIEWPORT_SIZE / ratio;

      // 2. Fator de conversão: Pixels reais / Pixels da viewport
      const conv = originalSize.width / (displayW * scale.value);

      // 3. Calcular a origem do crop baseada no translate da UI
      // Centralizado (0,0) significa que estamos pegando o meio da imagem.
      const cropWidth = VIEWPORT_SIZE * conv;
      const originX = (originalSize.width - cropWidth) / 2 - (translateX.value * conv);
      const originY = (originalSize.height - cropWidth) / 2 - (translateY.value * conv);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width: cropWidth, height: cropWidth } }, { resize: { width: 800, height: 800 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      onSave(result.uri);
    } catch (err) {
      console.error("Crop error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <GestureHandlerRootView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={onClose}><Text style={styles.btnText}>Cancelar</Text></TouchableOpacity>
          <Text style={styles.title}>Mover e Escalar</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.viewportContainer}>
          <GestureDetector gesture={composed}>
            <Animated.View style={[styles.imageContainer, animatedStyle as any]}>
              <Image 
                source={{ uri: imageUri }} 
                style={{
                  width: originalSize.width > originalSize.height ? VIEWPORT_SIZE * (originalSize.width / originalSize.height) : VIEWPORT_SIZE,
                  height: originalSize.width > originalSize.height ? VIEWPORT_SIZE : VIEWPORT_SIZE / (originalSize.width / originalSize.height),
                }} 
                resizeMode="cover" 
              />
            </Animated.View>
          </GestureDetector>

          {/* O OVERLAY É REAL E REPRESENTA O CROP */}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.dimmed} />
            <View style={styles.centerRow}>
              <View style={styles.dimmed} />
              <View style={[
                styles.circleHole, 
                mode === 'profile' ? { borderRadius: VIEWPORT_SIZE / 2 } : { borderRadius: 15 }
              ]} />
              <View style={styles.dimmed} />
            </View>
            <View style={styles.dimmed} />
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isProcessing}>
            {isProcessing ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>Escolher</Text>}
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
  btnText: { color: '#fff', fontSize: 17 },
  title: { color: '#fff', fontSize: 17, fontWeight: '600' },
  viewportContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imageContainer: { width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  dimmed: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  centerRow: { flexDirection: 'row', height: VIEWPORT_SIZE },
  circleHole: { width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  footer: { alignItems: 'center' },
  saveBtn: { backgroundColor: '#fff', paddingHorizontal: 40, paddingVertical: 12, borderRadius: 25 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
