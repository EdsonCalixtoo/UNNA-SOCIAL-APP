import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { Star, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { ms, vs } from '@/utils/responsive';

interface PostEventRatingModalProps {
  visible: boolean;
  onClose: () => void;
  eventName: string;
}

export default function PostEventRatingModal({ visible, onClose, eventName }: PostEventRatingModalProps) {
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent } = useTheme();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');

  const handleStarPress = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRating(index + 1);
  };

  const handleSubmit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // In a real scenario, we would send this to the Supabase database
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={StyleSheet.absoluteFill} entering={FadeIn}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View 
          style={[styles.modalBox, { backgroundColor: backgroundPrimary }]}
          entering={SlideInUp.springify().damping(20)}
          exiting={SlideOutDown}
        >
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: backgroundSecondary }]} onPress={onClose}>
            <X size={20} color={textPrimary} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 32 }}>⭐</Text>
          </View>

          <Text style={[styles.title, { color: textPrimary }]}>E aí, como foi?</Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>Avalie sua experiência no evento</Text>
          <Text style={[styles.eventName, { color: accent }]}>{eventName}</Text>

          <View style={styles.starsContainer}>
            {[0, 1, 2, 3, 4].map((index) => (
              <TouchableOpacity key={index} onPress={() => handleStarPress(index)}>
                <Star 
                  size={40} 
                  color={index < rating ? '#FFD700' : backgroundSecondary} 
                  fill={index < rating ? '#FFD700' : 'transparent'} 
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && (
            <Animated.View entering={FadeIn} style={{ width: '100%', marginTop: 20 }}>
              <TextInput
                style={[styles.input, { backgroundColor: backgroundSecondary, color: textPrimary }]}
                placeholder="Conte-nos o que achou da música, fila, etc..."
                placeholderTextColor={textSecondary}
                multiline
                numberOfLines={3}
                value={review}
                onChangeText={setReview}
              />
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: accent }]} onPress={handleSubmit}>
                <Text style={styles.submitText}>Enviar Avaliação</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', padding: 24, borderRadius: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,215,0,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 8 },
  eventName: { fontSize: 16, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
  starsContainer: { flexDirection: 'row', gap: 8 },
  input: { width: '100%', minHeight: 100, borderRadius: 16, padding: 16, textAlignVertical: 'top', fontSize: 15, marginBottom: 16 },
  submitBtn: { width: '100%', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});
