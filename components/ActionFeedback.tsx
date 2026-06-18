
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  ZoomIn, 
  ZoomOut 
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { CheckCircle, XCircle, Sparkles } from 'lucide-react-native';
import { ms } from '@/utils/responsive';
import { useTheme } from '@/contexts/ThemeContext';

interface ActionFeedbackProps {
  visible: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
}

export const ActionFeedback = ({ visible, type, title, message, onClose }: ActionFeedbackProps) => {
  const { accent, backgroundSecondary, textPrimary, textSecondary, isDark } = useTheme();

  useEffect(() => {
    if (visible && type === 'success') {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeIn} 
          exiting={FadeOut} 
          style={StyleSheet.absoluteFill}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={onClose} 
            style={StyleSheet.absoluteFill} 
          >
            <BlurView intensity={20} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View 
          entering={ZoomIn} 
          exiting={ZoomOut} 
          style={[styles.content, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          <View style={[
            styles.iconCircle, 
            { backgroundColor: type === 'success' ? '#34C75922' : type === 'error' ? '#FF3B3022' : accent + '22' }
          ]}>
            {type === 'success' && <CheckCircle size={40} color="#34C759" />}
            {type === 'error' && <XCircle size={40} color="#FF3B30" />}
            {type === 'info' && <Sparkles size={40} color={accent} />}
          </View>

          <Text style={[styles.title, { color: textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: textSecondary }]}>{message}</Text>

          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: type === 'success' ? '#34C759' : type === 'error' ? '#FF3B30' : accent }]} 
            onPress={onClose}
          >
            <Text style={styles.btnText}>{type === 'success' ? 'Entendido!' : 'Fechar'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  content: {
    width: '100%',
    borderRadius: 35,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: ms(20), fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  message: { fontSize: ms(14), textAlign: 'center', lineHeight: 22, marginBottom: 25, opacity: 0.8 },
  btn: { width: '100%', height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
