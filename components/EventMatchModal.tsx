import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Flame, X, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MOCK_PROFILES = [
  { id: '1', name: 'Laura Silva', age: 24, photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80', bio: 'Amo eletrônica e um bom drink.' },
  { id: '2', name: 'Pedro Alves', age: 27, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80', bio: 'Sempre o último a ir embora.' },
  { id: '3', name: 'Camila Dias', age: 22, photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80', bio: 'Vim pelo open bar.' },
];

interface EventMatchModalProps {
  visible: boolean;
  onClose: () => void;
  eventName?: string;
}

export default function EventMatchModal({ visible, onClose, eventName = 'Evento' }: EventMatchModalProps) {
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleLike = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    nextProfile();
  };

  const handlePass = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextProfile();
  };

  const nextProfile = () => {
    if (currentIndex < MOCK_PROFILES.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
      setTimeout(() => setCurrentIndex(0), 500);
    }
  };

  if (!visible) return null;

  const currentProfile = MOCK_PROFILES[currentIndex];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Flame size={20} color="#FF1493" />
            <Text style={styles.titleText}>Match Mode</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <Text style={styles.subtitle}>Quem também vai no {eventName}</Text>

        <View style={styles.cardContainer}>
          <Animated.View entering={SlideInDown.springify()} exiting={SlideOutDown} style={styles.card}>
            <Image source={{ uri: currentProfile.photo }} style={styles.photo} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)', '#000']}
              style={styles.infoGradient}
            >
              <Text style={styles.name}>{currentProfile.name}, {currentProfile.age}</Text>
              <Text style={styles.bio}>{currentProfile.bio}</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={handlePass}>
            <X size={32} color="#FF3B30" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={handleLike}>
            <Heart size={32} color="#fff" fill="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    paddingTop: vs(50),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    color: '#fff',
    fontSize: ms(20),
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontSize: ms(14),
    fontWeight: '600',
    marginBottom: vs(30),
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.6,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,20,147,0.3)',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  infoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 30,
    paddingTop: 100,
  },
  name: {
    color: '#fff',
    fontSize: ms(28),
    fontWeight: '900',
    marginBottom: 8,
  },
  bio: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: ms(16),
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    paddingBottom: vs(60),
    paddingTop: vs(20),
  },
  actionBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  passBtn: {
    backgroundColor: '#fff',
    shadowColor: '#fff',
  },
  likeBtn: {
    backgroundColor: '#FF1493',
    shadowColor: '#FF1493',
  }
});
