import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch } from 'react-native';
import { X, BellRing, Clock, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

interface WakeUpAlarmModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WakeUpAlarmModal({ visible, onClose }: WakeUpAlarmModalProps) {
  const [isSet, setIsSet] = useState(false);

  const handleSetAlarm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSet(true);
    setTimeout(() => {
      setIsSet(false);
      onClose();
    }, 2500);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        
        <Animated.View entering={SlideInUp.springify()} exiting={SlideOutDown} style={styles.container}>
          {isSet ? (
            <View style={styles.successView}>
              <CheckCircle2 size={80} color="#FF9500" />
              <Text style={styles.successTitle}>Despertador Ativado!</Text>
              <Text style={styles.successText}>O UNИA vai te acordar 2h antes do evento começar tocando a música do Line-up oficial.</Text>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.iconContainer}>
                <BellRing size={40} color="#FF9500" />
              </View>

              <Text style={styles.title}>Wake-Up Bloquinho</Text>
              <Text style={styles.subtitle}>Nunca mais perca a hora de se arrumar pro rolê.</Text>

              <View style={styles.optionsContainer}>
                <View style={styles.optionRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Clock size={20} color="rgba(255,255,255,0.7)" style={{ marginRight: 12 }} />
                    <Text style={styles.optionText}>Despertar 2 horas antes</Text>
                  </View>
                  <Switch value={true} onValueChange={() => {}} trackColor={{ true: '#FF9500' }} />
                </View>

                <View style={styles.optionRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <BellRing size={20} color="rgba(255,255,255,0.7)" style={{ marginRight: 12 }} />
                    <Text style={styles.optionText}>Tocar Playlist do Evento</Text>
                  </View>
                  <Switch value={true} onValueChange={() => {}} trackColor={{ true: '#FF9500' }} />
                </View>
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={handleSetAlarm}>
                <Text style={styles.actionBtnText}>Ativar Despertador</Text>
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
    borderColor: 'rgba(255,149,0,0.3)',
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
    backgroundColor: 'rgba(255,149,0,0.1)',
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
    marginBottom: 30,
    lineHeight: 20,
  },
  optionsContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  optionText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '600',
  },
  actionBtn: {
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#000',
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
