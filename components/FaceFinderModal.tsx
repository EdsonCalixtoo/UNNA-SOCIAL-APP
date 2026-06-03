import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions } from 'react-native';
import { X, ScanFace, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeIn, FadeOut, SlideInUp, SlideOutDown, 
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence
} from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FaceFinderModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FaceFinderModal({ visible, onClose }: FaceFinderModalProps) {
  const scanLinePos = useSharedValue(0);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    if (visible) {
      setScanning(true);
      scanLinePos.value = withRepeat(
        withSequence(
          withTiming(200, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        true
      );

      // Simula fim do escaneamento
      const timer = setTimeout(() => {
        setScanning(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 4500);

      return () => clearTimeout(timer);
    } else {
      scanLinePos.value = 0;
    }
  }, [visible]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLinePos.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.overlay}>
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {scanning ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.scanContainer}>
            <Text style={styles.title}>IA FACE FINDER</Text>
            <Text style={styles.subtitle}>Escaneando 1.402 fotos do evento...</Text>

            <View style={styles.scanBox}>
              {/* O seu avatar simulado */}
              <Image source={{ uri: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=500&q=80' }} style={styles.faceImg} />
              
              <View style={styles.scanGrid}>
                <View style={styles.gridCornerTL} />
                <View style={styles.gridCornerTR} />
                <View style={styles.gridCornerBL} />
                <View style={styles.gridCornerBR} />
              </View>

              <Animated.View style={[styles.scanLine, scanLineStyle]} />
            </View>
            <ScanFace size={32} color="#00d9ff" style={{ marginTop: 40 }} />
          </Animated.View>
        ) : (
          <Animated.View entering={SlideInUp.springify()} style={styles.resultContainer}>
            <CheckCircle2 size={60} color="#00E676" style={{ marginBottom: 20 }} />
            <Text style={styles.successTitle}>Você foi encontrado!</Text>
            <Text style={styles.successSub}>Achamos 3 fotos suas neste evento.</Text>

            <View style={styles.photosGrid}>
              {[
                'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&q=80',
                'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=500&q=80',
                'https://images.unsplash.com/photo-1470229722913-7c090be5faa3?w=500&q=80',
              ].map((img, i) => (
                <View key={i} style={styles.resultPhotoWrap}>
                  <Image source={{ uri: img }} style={styles.resultPhoto} />
                  <LinearGradient colors={['transparent', 'rgba(0,230,118,0.8)']} style={styles.photoOverlay} />
                  <ScanFace size={24} color="#fff" style={styles.matchIcon} />
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.downloadBtn}>
              <Text style={styles.downloadText}>Salvar Fotos</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanContainer: {
    alignItems: 'center',
  },
  title: {
    color: '#00d9ff',
    fontSize: ms(24),
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    color: '#fff',
    fontSize: ms(14),
    opacity: 0.6,
    marginBottom: vs(50),
  },
  scanBox: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  faceImg: {
    width: '100%',
    height: '100%',
    borderRadius: 125,
    opacity: 0.5,
  },
  scanGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridCornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#00d9ff' },
  gridCornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#00d9ff' },
  gridCornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#00d9ff' },
  gridCornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#00d9ff' },
  scanLine: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 3,
    backgroundColor: '#00d9ff',
    shadowColor: '#00d9ff',
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  resultContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  successTitle: {
    color: '#fff',
    fontSize: ms(28),
    fontWeight: '900',
    marginBottom: 8,
  },
  successSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: ms(16),
    marginBottom: vs(40),
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 40,
  },
  resultPhotoWrap: {
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  resultPhoto: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  matchIcon: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  downloadBtn: {
    backgroundColor: '#00E676',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 20,
  },
  downloadText: {
    color: '#000',
    fontSize: ms(16),
    fontWeight: '900',
  }
});
