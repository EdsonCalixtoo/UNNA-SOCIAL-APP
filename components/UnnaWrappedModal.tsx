import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { X, Share2, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UnnaWrappedModalProps {
  visible: boolean;
  onClose: () => void;
}

const slides = [
  {
    id: 1,
    title: 'Seu Ano no UNИA',
    value: '2025',
    subtitle: 'Um ano cheio de histórias para não lembrar...',
    colors: ['#000', '#1a0033', '#ff1493'],
  },
  {
    id: 2,
    title: 'Você curtiu',
    value: '42',
    subtitle: 'festas inesquecíveis.',
    colors: ['#000', '#001a00', '#00E676'],
  },
  {
    id: 3,
    title: 'Sua Vibe principal foi',
    value: 'Eletrônica',
    subtitle: 'Você ficou na pista até às 06:00 em 18 festas.',
    colors: ['#000', '#001a33', '#00d9ff'],
  },
  {
    id: 4,
    title: 'Match Maker',
    value: '85',
    subtitle: 'Novos matches feitos durante os rolês. 🔥',
    colors: ['#000', '#33001a', '#ff1493'],
  }
];

export default function UnnaWrappedModal({ visible, onClose }: UnnaWrappedModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progressWidth.value = 0;
      progressWidth.value = withTiming(SCREEN_WIDTH - 40, { duration: 5000 });
      
      const timer = setTimeout(() => {
        handleNext();
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setCurrentSlide(0);
      progressWidth.value = 0;
    }
  }, [visible, currentSlide]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentSlide(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: progressWidth.value,
  }));

  if (!visible) return null;

  const slide = slides[currentSlide];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.overlay}>
        
        <LinearGradient colors={slide.colors as [string, string, string]} style={StyleSheet.absoluteFill} />

        <View style={styles.header}>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, animatedProgressStyle]} />
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.touchArea} onPress={handleNext} activeOpacity={1}>
          <Animated.View key={slide.id} entering={SlideInRight.duration(400)} exiting={SlideOutLeft.duration(400)} style={styles.content}>
            <Sparkles size={40} color="#fff" style={{ marginBottom: 20, alignSelf: 'center' }} />
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.value}>{slide.value}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareBtn}>
          <Share2 size={20} color="#000" />
          <Text style={styles.shareText}>Compartilhar</Text>
        </TouchableOpacity>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginRight: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  closeBtn: {
    padding: 4,
  },
  touchArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: ms(24),
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  value: {
    color: '#fff',
    fontSize: ms(64),
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: ms(18),
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  shareBtn: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  shareText: {
    color: '#000',
    fontSize: ms(16),
    fontWeight: '900',
  }
});
