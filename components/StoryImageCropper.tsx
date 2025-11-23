import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  Animated,
  Modal,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { RotateCw, Maximize2, Square, Copy, Minimize2, Check, X } from 'lucide-react-native';

interface StoryImageCropperProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: (croppedImageUri: string, cropData: CropData) => void;
}

interface CropData {
  crop_width: number;
  crop_height: number;
  crop_top: number;
  crop_left: number;
  rotation: number;
  aspect_ratio: string;
}

interface AspectRatioPreset {
  name: string;
  ratio: string;
  width: number;
  height: number;
  icon: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_SIZE = 300;

const ASPECT_RATIOS: AspectRatioPreset[] = [
  { name: 'Livre', ratio: 'free', width: 1, height: 1, icon: 'Maximize2' },
  { name: '1:1', ratio: '1:1', width: 1, height: 1, icon: 'Square' },
  { name: '4:5', ratio: '4:5', width: 4, height: 5, icon: 'Copy' },
  { name: '16:9', ratio: '16:9', width: 16, height: 9, icon: 'Minimize2' },
];

export default function StoryImageCropper({
  visible,
  imageUri,
  onClose,
  onSave,
}: StoryImageCropperProps) {
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioPreset>(ASPECT_RATIOS[1]); // 1:1 default
  const [croppingArea, setCroppingArea] = useState({ top: 0, left: 0, width: PREVIEW_SIZE, height: PREVIEW_SIZE });
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const newX = position.x + gestureState.dx;
        const newY = position.y + gestureState.dy;
        setPosition({ x: newX, y: newY });
      },
    })
  ).current;

  // Carregar dimensões da imagem
  useEffect(() => {
    if (visible && imageUri) {
      Image.getSize(imageUri, (width, height) => {
        setOriginalDimensions({ width, height });
      });
    }
  }, [visible, imageUri]);

  // Atualizar área de crop quando aspect ratio muda
  useEffect(() => {
    const ratio = aspectRatio.width / aspectRatio.height;
    let newHeight = PREVIEW_SIZE;
    let newWidth = PREVIEW_SIZE * ratio;

    if (newWidth > PREVIEW_SIZE) {
      newWidth = PREVIEW_SIZE;
      newHeight = PREVIEW_SIZE / ratio;
    }

    setCroppingArea({
      top: (PREVIEW_SIZE - newHeight) / 2,
      left: (PREVIEW_SIZE - newWidth) / 2,
      width: newWidth,
      height: newHeight,
    });
  }, [aspectRatio]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSelectAspectRatio = (ratio: AspectRatioPreset) => {
    setAspectRatio(ratio);
  };

  const handleScale = (delta: number) => {
    const newScale = Math.max(1, scale + delta);
    setScale(newScale);
  };

  const handleSave = async () => {
    if (!imageUri) return;

    setIsLoading(true);
    try {
      // Cálculo de crop baseado na posição e escala
      const imgWidth = originalDimensions.width;
      const imgHeight = originalDimensions.height;

      const cropWidth = (croppingArea.width / (PREVIEW_SIZE * scale)) * imgWidth;
      const cropHeight = (croppingArea.height / (PREVIEW_SIZE * scale)) * imgHeight;
      const cropLeft = ((position.x + croppingArea.left) / (PREVIEW_SIZE * scale)) * imgWidth;
      const cropTop = ((position.y + croppingArea.top) / (PREVIEW_SIZE * scale)) * imgHeight;

      // Aplicar rotação e crop
      const actions: ImageManipulator.Action[] = [];

      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      actions.push({
        crop: {
          originX: Math.max(0, cropLeft),
          originY: Math.max(0, cropTop),
          width: Math.min(cropWidth, imgWidth - Math.max(0, cropLeft)),
          height: Math.min(cropHeight, imgHeight - Math.max(0, cropTop)),
        },
      });

      const manipulatedImage = await ImageManipulator.manipulateAsync(imageUri, actions, {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      const cropData: CropData = {
        crop_width: Math.round(cropWidth),
        crop_height: Math.round(cropHeight),
        crop_top: Math.round(cropTop),
        crop_left: Math.round(cropLeft),
        rotation,
        aspect_ratio: aspectRatio.ratio,
      };

      onSave(manipulatedImage.uri, cropData);
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recortar Imagem</Text>
          <TouchableOpacity onPress={handleSave} disabled={isLoading}>
            <Check size={28} color={isLoading ? '#888' : '#fff'} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Preview com Crop Box */}
          <View style={styles.previewContainer}>
            <View
              style={[
                styles.imageWrapper,
                { transform: [{ scale }, { translateX: position.x }, { translateY: position.y }] },
              ]}
              {...panResponder.panHandlers}
            >
              <Image
                source={{ uri: imageUri }}
                style={[
                  styles.image,
                  { transform: [{ rotate: `${rotation}deg` }] },
                  originalDimensions.width > 0 && {
                    width: (PREVIEW_SIZE * originalDimensions.width) / Math.max(originalDimensions.width, originalDimensions.height),
                    height: (PREVIEW_SIZE * originalDimensions.height) / Math.max(originalDimensions.width, originalDimensions.height),
                  },
                ]}
                resizeMode="contain"
              />
            </View>

            {/* Crop Frame (moldura) */}
            <View
              style={[
                styles.cropFrame,
                {
                  top: croppingArea.top,
                  left: croppingArea.left,
                  width: croppingArea.width,
                  height: croppingArea.height,
                },
              ]}
            />

            {/* Overlay escuro (áreas fora do crop) */}
            <View style={[styles.overlay, { top: 0, height: croppingArea.top }]} />
            <View style={[styles.overlay, { bottom: 0, height: PREVIEW_SIZE - croppingArea.top - croppingArea.height }]} />
            <View style={[styles.overlay, { left: 0, width: croppingArea.left }]} />
            <View style={[styles.overlay, { right: 0, width: PREVIEW_SIZE - croppingArea.left - croppingArea.width }]} />
          </View>

          {/* Proporções */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📐 Proporção</Text>
            <View style={styles.ratioGrid}>
              {ASPECT_RATIOS.map((ratio) => (
                <TouchableOpacity
                  key={ratio.ratio}
                  style={[
                    styles.ratioButton,
                    aspectRatio.ratio === ratio.ratio && styles.ratioButtonActive,
                  ]}
                  onPress={() => handleSelectAspectRatio(ratio)}
                >
                  <Text style={styles.ratioButtonText}>{ratio.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Controles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎛️ Controles</Text>

            {/* Rotação */}
            <TouchableOpacity style={styles.controlButton} onPress={handleRotate}>
              <RotateCw size={24} color="#fff" />
              <Text style={styles.controlButtonText}>Girar 90°</Text>
            </TouchableOpacity>

            {/* Zoom In/Out */}
            <View style={styles.zoomContainer}>
              <TouchableOpacity
                style={styles.zoomButton}
                onPress={() => handleScale(-0.2)}
              >
                <Text style={styles.zoomButtonText}>−</Text>
              </TouchableOpacity>

              <View style={styles.zoomDisplay}>
                <Text style={styles.zoomText}>{Math.round(scale * 100)}%</Text>
              </View>

              <TouchableOpacity
                style={styles.zoomButton}
                onPress={() => handleScale(0.2)}
              >
                <Text style={styles.zoomButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>💡 Dica: Arraste a imagem para posicionar</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  previewContainer: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    alignSelf: 'center',
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
  },
  cropFrame: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: 'transparent',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  ratioGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  ratioButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  ratioButtonActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  ratioButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  zoomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoomButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  zoomButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  zoomDisplay: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  zoomText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  infoText: {
    color: '#FFD700',
    fontSize: 14,
  },
});
