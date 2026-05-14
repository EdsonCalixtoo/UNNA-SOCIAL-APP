import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
  withDelay
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

// Partícula flutuante individual
const Particle = ({ delay, startX, startY }: { delay: number, startX: number, startY: number }) => {
  const moveX = useSharedValue(0);
  const moveY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    moveX.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(Math.random() * 40 - 20, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    ));

    moveY.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(-(Math.random() * 60 + 40), { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    ));

    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    ));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: moveX.value },
      { translateY: moveY.value }
    ] as any,
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        styles.particle, 
        { left: startX, top: startY },
        animatedStyle as any
      ]} 
    />
  );
};

export default function AnimatedSplashScreen() {
  const logoScale = useSharedValue(0.9);
  const logoOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  const loadingProgress = useSharedValue(0);
  const footerOpacity = useSharedValue(0);

  useEffect(() => {
    // Entrada Cinematic
    logoOpacity.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.exp) });
    logoScale.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.back(1.5)) });
    
    // Inicia breathing após entrada
    setTimeout(() => {
      logoScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    }, 1500);

    // Glow Animation
    glowOpacity.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(0.6, { duration: 2500 }),
        withTiming(0.3, { duration: 2500 })
      ),
      -1,
      true
    ));

    glowScale.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(1.2, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.9, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    ));

    // Footer & Loading
    footerOpacity.value = withDelay(800, withTiming(1, { duration: 1000 }));
    loadingProgress.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );

  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }] as any,
    opacity: logoOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }] as any,
    opacity: glowOpacity.value,
  }));

  const loadingStyle = useAnimatedStyle(() => ({
    width: `${loadingProgress.value * 100}%`,
    opacity: interpolate(loadingProgress.value, [0, 0.5, 1], [0.3, 1, 0.3]),
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
    transform: [{ translateY: interpolate(footerOpacity.value, [0, 1], [20, 0]) }]
  }));

  // Gerar partículas em posições estratégicas
  const particles = [
    { x: width * 0.2, y: height * 0.4, d: 0 },
    { x: width * 0.8, y: height * 0.35, d: 500 },
    { x: width * 0.3, y: height * 0.6, d: 1000 },
    { x: width * 0.7, y: height * 0.65, d: 1500 },
    { x: width * 0.5, y: height * 0.3, d: 2000 },
    { x: width * 0.15, y: height * 0.7, d: 2500 },
    { x: width * 0.85, y: height * 0.55, d: 3000 },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050505', '#0f0f18', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Partículas flutuantes */}
      {particles.map((p, i) => (
        <Particle key={i} startX={p.x} startY={p.y} delay={p.d} />
      ))}

      {/* Neon Glow Blue */}
      <Animated.View style={[styles.glow, styles.glowBlue, glowStyle]} />
      
      {/* Neon Glow Pink */}
      <Animated.View style={[styles.glow, styles.glowPink, glowStyle, { transform: [{ scale: glowScale.value }, { rotate: '180deg' }] }]} />

      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <View style={styles.logoShadow}>
          <Image 
            source={require('../assets/images/icon.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      <Animated.View style={[styles.footer, footerStyle]}>
        <Text style={styles.loadingText}>Sincronizando sua experiência</Text>
        <View style={styles.loadingTrack}>
          <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
          <Animated.View style={[styles.loadingFill, loadingStyle]}>
            <LinearGradient
              colors={['#00d9ff', '#7b2fff', '#ff1493']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text style={styles.brandName}>U<Text style={{color: '#ff1493'}}>N</Text><Text style={{color: '#00d9ff'}}>И</Text>A SOCIAL</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 217, 255, 0.4)',
  },
  logoContainer: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logoShadow: {
    width: '100%',
    height: '100%',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.4,
    borderWidth: 2,
  },
  glowBlue: {
    borderColor: 'rgba(0, 217, 255, 0.3)',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
  },
  glowPink: {
    borderColor: 'rgba(255, 20, 147, 0.3)',
    shadowColor: '#ff1493',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 50,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 15,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  loadingTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  loadingFill: {
    height: '100%',
    borderRadius: 2,
  },
  brandName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
    opacity: 0.6,
  }
});
