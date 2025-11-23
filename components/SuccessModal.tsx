import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Check, PartyPopper, Share2, Eye } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  onViewEvent?: () => void;
  onShare?: () => void;
  title?: string;
  message?: string;
}

export default function SuccessModal({
  visible,
  onClose,
  onViewEvent,
  onShare,
  title = 'Evento Criado!',
  message = 'Seu evento foi publicado e já está disponível no feed'
}: SuccessModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          <LinearGradient
            colors={['#1a1a1a', '#2d2d2d']}
            style={styles.content}
          >
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#34C759', '#30D158']}
                style={styles.iconCircle}
              >
                <Check size={48} color="#fff" strokeWidth={3} />
              </LinearGradient>
              <View style={styles.confettiContainer}>
                <PartyPopper size={32} color="#FFD60A" style={styles.confetti1} />
                <PartyPopper size={24} color="#FF9500" style={styles.confetti2} />
              </View>
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.actions}>
              {onViewEvent && (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={onViewEvent}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#00d9ff', '#0097a7']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Eye size={20} color="#fff" />
                    <Text style={styles.primaryButtonText}>Ver Evento</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {onShare && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onShare}
                  activeOpacity={0.8}
                >
                  <Share2 size={20} color="#00d9ff" />
                  <Text style={styles.secondaryButtonText}>Compartilhar</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>Voltar ao Feed</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  content: {
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  confettiContainer: {
    position: 'absolute',
    width: 140,
    height: 140,
  },
  confetti1: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  confetti2: {
    position: 'absolute',
    bottom: 0,
    left: -10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    color: '#9E9E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#00d9ff',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
});
