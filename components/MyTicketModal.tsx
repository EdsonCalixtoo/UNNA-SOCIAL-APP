import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { X, QrCode, Sparkles, RefreshCcw, BellRing } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeIn, SlideInUp, SlideOutDown, 
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, vs } from '@/utils/responsive';
import TicketResaleModal from './TicketResaleModal';
import WakeUpAlarmModal from './WakeUpAlarmModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MyTicketModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function MyTicketModal({ visible, onClose }: MyTicketModalProps) {
  const scanLinePos = useSharedValue(0);
  const [showResale, setShowResale] = React.useState(false);
  const [showAlarm, setShowAlarm] = React.useState(false);

  useEffect(() => {
    if (visible) {
      scanLinePos.value = withRepeat(
        withSequence(
          withTiming(150, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        true
      );
    } else {
      scanLinePos.value = 0;
    }
  }, [visible]);

  const scanLineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: scanLinePos.value }],
    };
  });

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Animated.View entering={SlideInUp.springify()} exiting={SlideOutDown} style={styles.ticketContainer}>
          <LinearGradient
            colors={['#1a1a1a', '#000']}
            style={styles.ticketCard}
          >
            {/* EFEITO HOLOGRÁFICO */}
            <LinearGradient
              colors={['rgba(0,217,255,0.1)', 'transparent', 'rgba(255,20,147,0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.ticketHeader}>
              <Text style={styles.eventName}>Baile do UNNA</Text>
              <Text style={styles.eventDate}>SÁB, 24 AGO • 22:00</Text>
            </View>

            <View style={styles.divider}>
              <View style={styles.notchLeft} />
              <View style={styles.dashedLine} />
              <View style={styles.notchRight} />
            </View>

            <View style={styles.qrSection}>
              <Text style={styles.qrTitle}>APROXIME DO LEITOR</Text>
              
              <View style={styles.qrBox}>
                <QrCode size={150} color="#00d9ff" strokeWidth={1} />
                <Animated.View style={[styles.scanLine, scanLineStyle]} />
              </View>

              <View style={styles.dynamicCodeBox}>
                <Sparkles size={14} color="#00E676" />
                <Text style={styles.dynamicCodeText}>Código renova em 5s</Text>
              </View>
            </View>

            <View style={styles.ticketFooter}>
              <View>
                <Text style={styles.label}>NOME</Text>
                <Text style={styles.value}>EDSON CALIXTO</Text>
              </View>
              <View>
                <Text style={styles.label}>SETOR</Text>
                <Text style={styles.value}>CAMAROTE VIP</Text>
              </View>
            </View>

            {/* BOTAO REVENDA SEGURA E ALARME (FASE 8 E 10) */}
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: 'rgba(255,20,147,0.1)', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)' }}
                onPress={() => setShowResale(true)}
              >
                <RefreshCcw size={18} color="#ff1493" />
                <Text style={{ color: '#ff1493', fontWeight: '800', fontSize: 13 }}>Revender</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: 'rgba(255,149,0,0.1)', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onPress={() => setShowAlarm(true)}
              >
                <BellRing size={18} color="#FF9500" />
                <Text style={{ color: '#FF9500', fontWeight: '800', fontSize: 13 }}>Despertador</Text>
              </TouchableOpacity>
            </View>

          </LinearGradient>
        </Animated.View>

        <TicketResaleModal visible={showResale} onClose={() => setShowResale(false)} />
        <WakeUpAlarmModal visible={showAlarm} onClose={() => setShowAlarm(false)} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
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
  ticketContainer: {
    width: SCREEN_WIDTH * 0.85,
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  ticketCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
  },
  ticketHeader: {
    padding: 24,
    alignItems: 'center',
  },
  eventName: {
    color: '#fff',
    fontSize: ms(24),
    fontWeight: '900',
    marginBottom: 4,
  },
  eventDate: {
    color: '#00d9ff',
    fontSize: ms(13),
    fontWeight: '800',
    letterSpacing: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 30,
  },
  notchLeft: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.9)', // Matches overlay bg
    marginLeft: -15,
  },
  notchRight: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.9)',
    marginRight: -15,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  qrSection: {
    padding: 24,
    alignItems: 'center',
  },
  qrTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: ms(12),
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 20,
  },
  qrBox: {
    width: 170,
    height: 170,
    backgroundColor: 'rgba(0,217,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.2)',
    overflow: 'hidden',
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00d9ff',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  dynamicCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,230,118,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 20,
    gap: 6,
  },
  dynamicCodeText: {
    color: '#00E676',
    fontSize: ms(12),
    fontWeight: '800',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: ms(10),
    fontWeight: '700',
    marginBottom: 4,
  },
  value: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '900',
  }
});
