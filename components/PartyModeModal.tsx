import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Car, ShieldAlert, Navigation, Music, Compass } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useAnimatedStyle, withRepeat, withTiming, useSharedValue } from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import RadarModal from './RadarModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PartyModeModalProps {
  visible: boolean;
  onClose: () => void;
  eventName: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export default function PartyModeModal({ visible, onClose, eventName, latitude, longitude, locationName }: PartyModeModalProps) {
  const glowOpacity = useSharedValue(0.5);
  const [showRadar, setShowRadar] = React.useState(false);

  useEffect(() => {
    if (visible) {
      glowOpacity.value = withRepeat(
        withTiming(1, { duration: 1500 }),
        -1,
        true
      );
    }
  }, [visible]);

  const animatedGlow = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handleUber = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    let url = 'uber://?action=setPickup&pickup=my_location';
    if (latitude && longitude) {
      url += `&dropoff[latitude]=${latitude}&dropoff[longitude]=${longitude}&dropoff[nickname]=${encodeURIComponent(eventName)}`;
    }
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Linking.openURL('https://m.uber.com/');
    }
  };

  const handleSOS = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const message = `Estou no evento ${eventName} (${locationName || ''}) e preciso de ajuda!`;
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to SMS
        Linking.openURL(`sms:?body=${encodeURIComponent(message)}`);
      }
    });
  };

  const handleMaps = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (latitude && longitude) {
      const url = Platform.select({
        ios: `maps:0,0?q=${eventName}&ll=${latitude},${longitude}`,
        android: `geo:0,0?q=${latitude},${longitude}(${eventName})`
      });
      if (url) Linking.openURL(url);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Animated.View style={StyleSheet.absoluteFill} entering={FadeIn} exiting={FadeOut}>
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          {/* Fundo preto pesado para economizar bateria e não cegar na balada */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />
        </Animated.View>

        {/* Efeito Neon de fundo */}
        <Animated.View style={[styles.neonGlow, animatedGlow]} />

        <Animated.View 
          style={styles.content}
          entering={SlideInDown.springify().damping(20).stiffness(100)}
          exiting={SlideOutDown}
        >
          <View style={styles.header}>
            <Text style={styles.title}>MODO BALADA</Text>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }} 
              style={styles.closeBtn}
            >
              <X size={28} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>{eventName.toUpperCase()}</Text>

          <View style={styles.buttonsContainer}>
            {/* UBER BUTTON - GIGANTE */}
            <TouchableOpacity activeOpacity={0.9} onPress={handleUber} style={styles.uberBtn}>
              <LinearGradient
                colors={['#000000', '#1f1f1f']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Car size={32} color="#FFF" />
                <Text style={styles.uberBtnText}>CHAMAR UBER</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.rowBtns}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setShowRadar(true)} style={[styles.secondaryBtn, { backgroundColor: '#333' }]}>
                <Compass size={24} color="#00E676" />
                <Text style={styles.secondaryBtnText}>RADAR DE AMIGOS</Text>
              </TouchableOpacity>
            </View>

            {/* MAPS E SOS */}
            <View style={styles.rowBtns}>
              {latitude && longitude && (
                <TouchableOpacity activeOpacity={0.8} onPress={handleMaps} style={[styles.secondaryBtn, { backgroundColor: '#333' }]}>
                  <Navigation size={24} color="#FFF" />
                  <Text style={styles.secondaryBtnText}>ROTAS</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity activeOpacity={0.8} onPress={handleSOS} style={[styles.secondaryBtn, { backgroundColor: '#FF3B30', flex: 1.5 }]}>
                <ShieldAlert size={24} color="#FFF" />
                <Text style={styles.secondaryBtnText}>S.O.S (ANJO)</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerTip}>
            <Music size={16} color="#aaa" />
            <Text style={styles.tipText}>Mantenha este modo aberto durante o rolê. Economiza bateria e sua visão no escuro.</Text>
          </View>

        </Animated.View>

        <RadarModal visible={showRadar} onClose={() => setShowRadar(false)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  neonGlow: {
    position: 'absolute',
    top: '20%',
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    borderRadius: SCREEN_WIDTH * 0.4,
    backgroundColor: '#ff1493',
    opacity: 0.2,
    filter: 'blur(50px)',
  },
  content: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  title: {
    color: '#00E676',
    fontSize: ms(28),
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 230, 118, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  subtitle: {
    color: '#FFF',
    fontSize: ms(16),
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  uberBtn: {
    width: '100%',
    height: vs(80),
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  btnGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  uberBtnText: {
    color: '#FFF',
    fontSize: ms(22),
    fontWeight: '800',
    letterSpacing: 1,
  },
  rowBtns: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  secondaryBtn: {
    flex: 1,
    height: vs(60),
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    color: '#FFF',
    fontSize: ms(16),
    fontWeight: '700',
  },
  footerTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    gap: 8,
    paddingHorizontal: 20,
    opacity: 0.6,
  },
  tipText: {
    color: '#FFF',
    fontSize: ms(12),
    textAlign: 'center',
    flex: 1,
    lineHeight: 18,
  }
});
