import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { X, Mic2, BarChart3, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

interface SetlistPollModalProps {
  visible: boolean;
  onClose: () => void;
}

const POLL_OPTIONS = [
  { id: 1, text: 'Muito Funk 🍑', percent: 68 },
  { id: 2, text: 'Eletrônica Pesada ⚡', percent: 22 },
  { id: 3, text: 'Hits Anos 2000 🪩', percent: 10 },
];

export default function SetlistPollModal({ visible, onClose }: SetlistPollModalProps) {
  const [voted, setVoted] = useState<number | null>(null);

  const handleVote = (id: number) => {
    if (voted !== null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setVoted(id);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        
        <Animated.View entering={SlideInUp.springify()} exiting={SlideOutDown} style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Mic2 size={24} color="#00d9ff" />
              <Text style={styles.title}>Enquete do Setlist</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>O que o DJ deve tocar na próxima hora?</Text>

          <View style={styles.optionsList}>
            {POLL_OPTIONS.map((option) => {
              const isSelected = voted === option.id;
              
              return (
                <TouchableOpacity 
                  key={option.id}
                  activeOpacity={0.9}
                  style={[
                    styles.optionBtn, 
                    voted !== null && isSelected && styles.optionBtnSelected,
                    voted !== null && !isSelected && styles.optionBtnDisabled
                  ]}
                  onPress={() => handleVote(option.id)}
                >
                  {/* Barra de Progresso quando votado */}
                  {voted !== null && (
                    <Animated.View 
                      entering={FadeIn.duration(500)}
                      style={[styles.progressFill, { width: `${option.percent}%`, backgroundColor: isSelected ? 'rgba(0,217,255,0.2)' : 'rgba(255,255,255,0.05)' }]} 
                    />
                  )}
                  
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option.text}</Text>
                    {voted !== null && (
                      <View style={styles.resultRow}>
                        {isSelected && <CheckCircle2 size={16} color="#00d9ff" style={{ marginRight: 6 }} />}
                        <Text style={[styles.percentText, isSelected && { color: '#00d9ff' }]}>{option.percent}%</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {voted !== null && (
            <Animated.View entering={FadeIn} style={styles.footerInfo}>
              <BarChart3 size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: 6 }} />
              <Text style={styles.footerText}>1.402 pessoas já votaram.</Text>
            </Animated.View>
          )}

        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    backgroundColor: '#1a1a1a',
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#fff',
    fontSize: ms(20),
    fontWeight: '900',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: ms(14),
    marginBottom: 24,
  },
  optionsList: {
    gap: 12,
  },
  optionBtn: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  optionBtnSelected: {
    borderColor: '#00d9ff',
  },
  optionBtnDisabled: {
    opacity: 0.7,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    position: 'relative',
    zIndex: 1,
  },
  optionText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#00d9ff',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '900',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: ms(12),
    fontWeight: '600',
  }
});
