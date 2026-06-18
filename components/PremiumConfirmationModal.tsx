
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeOut, FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/utils/responsive';

const { width } = Dimensions.get('window');

interface PremiumConfirmationModalProps {
  visible: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function PremiumConfirmationModal({
  visible,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = true,
}: PremiumConfirmationModalProps) {
  const { backgroundPrimary, textPrimary, textSecondary, isDark, accent } = useTheme();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeIn.duration(300)} 
          exiting={FadeOut.duration(300)}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
        </Animated.View>

        <Animated.View 
          entering={FadeInUp.duration(400).springify().damping(20).stiffness(100)}
          exiting={FadeOutDown.duration(300)}
          style={styles.modalContainer}
        >
          <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={isDark ? 'dark' : 'light'} style={styles.blurContent}>
            <View style={[styles.iconContainer, { backgroundColor: isDestructive ? 'rgba(255, 59, 48, 0.1)' : 'rgba(0, 217, 255, 0.1)' }]}>
              <AlertTriangle size={32} color={isDestructive ? '#FF3B30' : accent} />
            </View>

            <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
            <Text style={[styles.description, { color: textSecondary }]}>{description}</Text>

            <View style={styles.actions}>
              <TouchableOpacity 
                style={[styles.btn, styles.cancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} 
                onPress={onCancel}
              >
                <Text style={[styles.btnText, { color: textPrimary }]}>{cancelText}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.btn, { backgroundColor: isDestructive ? '#FF3B30' : accent }]} 
                onPress={onConfirm}
              >
                <Text style={[styles.btnText, { color: '#fff', fontWeight: '900' }]}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  blurContent: {
    padding: 30,
    alignItems: 'center',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: ms(22),
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: ms(15),
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.2)',
  },
  btnText: {
    fontSize: ms(16),
    fontWeight: '700',
  },
});
