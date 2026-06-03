import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { X, Navigation } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeIn, FadeOut, 
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing 
} from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RadarModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function RadarModal({ visible, onClose }: RadarModalProps) {
  const radarRotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      radarRotation.value = withRepeat(
        withTiming(360, { duration: 4000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      radarRotation.value = 0;
    }
  }, [visible]);

  const animatedRadarStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${radarRotation.value}deg` }]
    };
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(500)} exiting={FadeOut.duration(300)} style={styles.overlay}>
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="#00E676" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>RADAR DE AMIGOS</Text>
        <Text style={styles.subtitle}>Procurando sinal Bluetooth...</Text>

        <View style={styles.radarContainer}>
          {/* Círculos do radar */}
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
          
          {/* Linha de escaneamento */}
          <Animated.View style={[styles.scanner, animatedRadarStyle]}>
            <View style={styles.scannerLine} />
            <View style={styles.scannerGradient} />
          </Animated.View>

          {/* Pontos (amigos) mockados que aparecem */}
          <Animated.View entering={FadeIn.delay(1500)} style={[styles.dot, { top: 60, right: 80 }]}>
            <View style={styles.dotCore} />
            <Text style={styles.dotLabel}>Pedro</Text>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(3000)} style={[styles.dot, { bottom: 100, left: 60 }]}>
            <View style={styles.dotCore} />
            <Text style={styles.dotLabel}>Camila</Text>
          </Animated.View>

          {/* Centro (Usuário) */}
          <View style={styles.centerDot}>
            <Navigation size={20} color="#000" style={{ transform: [{ rotate: '45deg' }] }} />
          </View>
        </View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,10,0,0.95)', // Tom esverdeado escuro
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
    backgroundColor: 'rgba(0,230,118,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  title: {
    color: '#00E676',
    fontSize: ms(24),
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    color: '#00E676',
    fontSize: ms(14),
    opacity: 0.6,
    marginBottom: vs(60),
    fontFamily: 'monospace',
  },
  radarContainer: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: 'rgba(0,230,118,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0,230,118,0.2)',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  circle1: { width: '33%', height: '33%' },
  circle2: { width: '66%', height: '66%' },
  circle3: { width: '100%', height: '100%' },
  scanner: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '50%',
    backgroundColor: '#00E676',
  },
  scannerGradient: {
    position: 'absolute',
    top: 0,
    right: '50%',
    width: '50%',
    height: '50%',
    backgroundColor: 'rgba(0,230,118,0.2)',
    borderTopRightRadius: 100,
  },
  centerDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00E676',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  dot: {
    position: 'absolute',
    alignItems: 'center',
  },
  dotCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  dotLabel: {
    color: '#00E676',
    fontSize: ms(12),
    fontWeight: '800',
    marginTop: 4,
  }
});
