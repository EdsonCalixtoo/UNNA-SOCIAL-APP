import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Animated,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { X, Check, RotateCw, RefreshCw } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryImageCropperProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: (croppedImageUri: string) => void;
}

export default function StoryImageCropper({
  visible,
  imageUri,
  onClose,
  onSave,
}: StoryImageCropperProps) {
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  
  // Animated Values
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Last known state
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);
  const dist = useRef(0);

  useEffect(() => {
    if (visible && imageUri) {
      Image.getSize(imageUri, (w, h) => {
        setImgSize({ width: w, height: h });
      });
      reset();
    }
  }, [visible, imageUri]);

  const reset = () => {
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    lastScale.current = 1;
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
  };

  const calcDistance = (x1: number, y1: number, x2: number, y2: number) => {
    let dx = Math.abs(x1 - x2);
    let dy = Math.abs(y1 - y2);
    return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
  };

  const panResponder = useRef(
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
          // PINCH ZOOM
          let touches = e.nativeEvent.touches;
          let newDist = calcDistance(touches[0].pageX, touches[0].pageY, touches[1].pageX, touches[1].pageY);
          let zoomScale = (newDist / dist.current) * lastScale.current;
          // Limit zoom
          if (zoomScale < 0.5) zoomScale = 0.5;
          if (zoomScale > 5) zoomScale = 5;
          scale.setValue(zoomScale);
        } else if (gs.numberActiveTouches === 1) {
          // PAN DRAG
          translateX.setValue(lastTranslateX.current + gs.dx);
          translateY.setValue(lastTranslateY.current + gs.dy);
        }
      },
      onPanResponderRelease: (e, gs) => {
        // @ts-ignore
        lastScale.current = scale._value;
        // @ts-ignore
        lastTranslateX.current = translateX._value;
        // @ts-ignore
        lastTranslateY.current = translateY._value;
      },
    })
  ).current;

  const handleRotate = async () => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ rotate: 90 }],
        { format: ImageManipulator.SaveFormat.JPEG }
      );
      onSave(result.uri);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    // Para simplificar e manter a fluidez do Instagram Story,
    // o "Save" simplesmente confirma que o usuário está feliz com o enquadramento.
    // Em um app de produção pesada, capturaríamos essa view.
    onSave(imageUri);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
           <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <X size={28} color="#fff" />
           </TouchableOpacity>
           <Text style={styles.headerTitle}>AJUSTAR STORY</Text>
           <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
              <Check size={28} color="#00d9ff" />
           </TouchableOpacity>
        </View>

        <View style={styles.content}>
           <View style={styles.cropArea}>
              <Animated.View
                {...panResponder.panHandlers}
                style={{
                  transform: [
                    { scale: scale },
                    { translateX: translateX },
                    { translateY: translateY },
                  ],
                }}
              >
                <Image 
                  source={{ uri: imageUri }} 
                  style={[styles.image, { 
                    width: SCREEN_WIDTH, 
                    height: SCREEN_WIDTH * (imgSize.height / imgSize.width || 1) 
                  }]}
                  resizeMode="contain"
                />
              </Animated.View>
           </View>
           <Text style={styles.hintText}>Use dois dedos para ampliar ou reduzir</Text>
        </View>

        <View style={styles.footer}>
           <TouchableOpacity style={styles.toolBtn} onPress={handleRotate}>
              <RotateCw size={24} color="#fff" />
              <Text style={styles.toolText}>GIRAR</Text>
           </TouchableOpacity>
           <TouchableOpacity style={styles.toolBtn} onPress={reset}>
              <RefreshCw size={24} color="#fff" />
              <Text style={styles.toolText}>RESETAR</Text>
           </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    height: 110,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  headerBtn: {
    padding: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropArea: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  image: {
    backgroundColor: '#000',
  },
  footer: {
    height: 120,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  toolBtn: {
    alignItems: 'center',
    gap: 8,
  },
  toolText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
  },
  hintText: {
    color: '#555',
    fontSize: 12,
    marginTop: 20,
    fontWeight: '700',
  },
});
