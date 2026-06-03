import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { Ticket, Clock, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ms, vs } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

export default function VipListBanner() {
  const [claimed, setClaimed] = useState(false);
  const [spots, setSpots] = useState(4);

  // Efeito simulado de alguem pegando a vaga
  useEffect(() => {
    if (!claimed && spots > 1) {
      const timer = setTimeout(() => {
        setSpots(prev => prev - 1);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [spots, claimed]);

  const handleClaim = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setClaimed(true);
  };

  if (claimed) {
    return (
      <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.container}>
        <LinearGradient colors={['rgba(52, 199, 89, 0.2)', 'rgba(52, 199, 89, 0.05)']} style={styles.content}>
          <View style={styles.iconBoxSuccess}>
            <Check size={20} color="#34C759" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.successTitle}>Nome na Lista VIP!</Text>
            <Text style={styles.subtitle}>Baile do UNNA - Você e +1 garantidos.</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown} style={styles.container}>
      <LinearGradient colors={['rgba(255, 149, 0, 0.2)', 'rgba(255, 149, 0, 0.05)']} style={styles.content}>
        <View style={styles.leftContent}>
          <View style={styles.iconBoxWarning}>
            <Ticket size={20} color="#FF9500" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.warningTitle}>Lista Amiga Relâmpago</Text>
            <Text style={styles.subtitle}>
              <Text style={{ fontWeight: '800', color: '#FF9500' }}>{spots} vagas restantes</Text> para hoje!
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.claimBtn} onPress={handleClaim}>
          <Text style={styles.claimBtnText}>Pegar VIP</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.3)',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBoxWarning: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,149,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBoxSuccess: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(52,199,89,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  warningTitle: {
    color: '#FF9500',
    fontSize: ms(15),
    fontWeight: '900',
  },
  successTitle: {
    color: '#34C759',
    fontSize: ms(15),
    fontWeight: '900',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: ms(12),
    marginTop: 2,
  },
  claimBtn: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  claimBtnText: {
    color: '#000',
    fontSize: ms(13),
    fontWeight: '800',
  }
});
