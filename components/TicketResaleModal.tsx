import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { X, ArrowRightLeft, ShieldCheck, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

interface TicketResaleModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TicketResaleModal({ visible, onClose }: TicketResaleModalProps) {
  const [success, setSuccess] = useState(false);

  const handleResale = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 3000);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        
        <Animated.View entering={SlideInUp.springify()} exiting={SlideOutDown} style={styles.container}>
          {success ? (
            <View style={styles.successView}>
              <CheckCircle2 size={80} color="#00E676" />
              <Text style={styles.successTitle}>Ingresso no Mercado!</Text>
              <Text style={styles.successText}>Seu ingresso agora está disponível para compra segura por outros usuários. O dinheiro cairá na sua carteira UNNA Coins assim que for vendido.</Text>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.iconContainer}>
                <ArrowRightLeft size={40} color="#ff1493" />
              </View>

              <Text style={styles.title}>Revenda Segura (P2P)</Text>
              <Text style={styles.subtitle}>Não vai mais conseguir ir? Venda seu ingresso sem burocracia e acabe com os cambistas.</Text>

              <LinearGradient colors={['rgba(0,230,118,0.15)', 'rgba(0,230,118,0.02)']} style={styles.infoCard}>
                <ShieldCheck size={24} color="#00E676" style={{ marginBottom: 8 }} />
                <Text style={styles.infoTitle}>Como funciona?</Text>
                <Text style={styles.infoText}>1. Seu QR Code atual é bloqueado.</Text>
                <Text style={styles.infoText}>2. O ingresso entra no Mercado UNNA.</Text>
                <Text style={styles.infoText}>3. O comprador paga no app e gera um novo QR.</Text>
              </LinearGradient>

              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>VALOR DE REVENDA PERMITIDO</Text>
                <Text style={styles.priceValue}>R$ 150,00</Text>
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={handleResale}>
                <Text style={styles.actionBtnText}>Colocar à Venda</Text>
              </TouchableOpacity>
            </>
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
    width: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,20,147,0.3)',
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,20,147,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: ms(22),
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: ms(13),
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  infoCard: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  infoTitle: {
    color: '#00E676',
    fontSize: ms(14),
    fontWeight: '800',
    marginBottom: 8,
  },
  infoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: ms(12),
    marginBottom: 4,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  priceLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: ms(10),
    fontWeight: '800',
    letterSpacing: 1,
  },
  priceValue: {
    color: '#fff',
    fontSize: ms(32),
    fontWeight: '900',
    marginTop: 4,
  },
  actionBtn: {
    backgroundColor: '#ff1493',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '900',
  },
  successView: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successTitle: {
    color: '#fff',
    fontSize: ms(24),
    fontWeight: '900',
    marginTop: 20,
    marginBottom: 12,
  },
  successText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontSize: ms(14),
    lineHeight: 22,
  }
});
