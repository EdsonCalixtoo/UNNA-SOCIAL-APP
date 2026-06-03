import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EyeOff, ChevronRight, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { ms, vs } from '@/utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BlindTicketCard() {
  const { backgroundSecondary, textPrimary, textSecondary, isDark } = useTheme();

  return (
    <Animated.View entering={FadeInUp.delay(200)} style={styles.container}>
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          // In a real app, opens the blind ticket details
        }}
      >
        <LinearGradient
          colors={['#8000ff', '#4b0082', '#000000']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Fundo misterioso com padrão de interrogação (mocked com texto) */}
          <Text style={styles.bgPattern}>? ? ? ? ?</Text>

          <View style={styles.header}>
            <View style={styles.badge}>
              <Lock size={12} color="#fff" />
              <Text style={styles.badgeText}>SECRETO</Text>
            </View>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-50%</Text>
            </View>
          </View>

          <View style={styles.content}>
            <EyeOff size={40} color="#fff" style={{ marginBottom: 12, opacity: 0.8 }} />
            <Text style={styles.title}>Rolê no Escuro 🤫</Text>
            <Text style={styles.subtitle}>
              Compre às cegas. Atrações reveladas apenas 24h antes. Confie na nossa curadoria.
            </Text>
            
            <View style={styles.footer}>
              <View>
                <Text style={styles.oldPrice}>R$ 100,00</Text>
                <Text style={styles.newPrice}>R$ 50,00</Text>
              </View>
              <View style={styles.btn}>
                <Text style={styles.btnText}>Arriscar</Text>
                <ChevronRight size={16} color="#fff" />
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#8000ff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    minHeight: vs(200),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  bgPattern: {
    position: 'absolute',
    fontSize: 100,
    color: 'rgba(255,255,255,0.03)',
    fontWeight: '900',
    top: -20,
    right: -20,
    transform: [{ rotate: '15deg' }],
    width: 300,
    textAlign: 'right',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: ms(10),
    fontWeight: '800',
    letterSpacing: 1,
  },
  discountBadge: {
    backgroundColor: '#00E676',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountText: {
    color: '#000',
    fontSize: ms(11),
    fontWeight: '900',
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: ms(22),
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: ms(13),
    lineHeight: 18,
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  oldPrice: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: ms(12),
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  newPrice: {
    color: '#00E676',
    fontSize: ms(20),
    fontWeight: '900',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  btnText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '800',
  }
});
