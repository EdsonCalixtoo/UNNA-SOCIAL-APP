import { useLanguage } from '@/lib/i18n';
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function AnimatedSplashScreen() {
  const { t } = useLanguage();
  const fadeIn = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const loadingProgress = useSharedValue(0);
  const dotOpacity1 = useSharedValue(0.2);
  const dotOpacity2 = useSharedValue(0.2);
  const dotOpacity3 = useSharedValue(0.2);

  useEffect(() => {
    // Entrada suave do logo
    fadeIn.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.back(1.5)) });

    // Barra de progresso infinita
    loadingProgress.value = withDelay(
      400,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
        -1,
        false
      )
    );

    // Animação dos 3 pontos piscantes (sequencial)
    const dotDuration = 400;
    dotOpacity1.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(1, { duration: dotDuration }),
        withTiming(0.2, { duration: dotDuration }),
        withTiming(0.2, { duration: dotDuration * 2 })
      ), -1, false
    ));
    dotOpacity2.value = withDelay(600 + dotDuration, withRepeat(
      withSequence(
        withTiming(1, { duration: dotDuration }),
        withTiming(0.2, { duration: dotDuration }),
        withTiming(0.2, { duration: dotDuration * 2 })
      ), -1, false
    ));
    dotOpacity3.value = withDelay(600 + dotDuration * 2, withRepeat(
      withSequence(
        withTiming(1, { duration: dotDuration }),
        withTiming(0.2, { duration: dotDuration }),
        withTiming(0.2, { duration: dotDuration * 2 })
      ), -1, false
    ));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ scale: logoScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(loadingProgress.value, [0, 1], [0, 100])}%`,
    opacity: fadeIn.value,
  }));

  const dot1Style = useAnimatedStyle(() => ({ opacity: dotOpacity1.value }));
  const dot2Style = useAnimatedStyle(() => ({ opacity: dotOpacity2.value }));
  const dot3Style = useAnimatedStyle(() => ({ opacity: dotOpacity3.value }));

  return (
    <View style={styles.container}>
      {/* Gradiente sutil no topo e embaixo para dar profundidade */}
      <LinearGradient
        colors={['rgba(0,217,255,0.05)', 'transparent']}
        style={styles.topGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(255,20,147,0.04)']}
        style={styles.bottomGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Logo central animado */}
      <Animated.View style={[styles.logoArea, containerStyle]}>
        {/* Texto UNNA estilizado */}
        <View style={styles.brandRow}>
          <Text style={styles.letterWhite}>U</Text>
          <Text style={styles.letterPink}>N</Text>
          <Text style={styles.letterCyan}>И</Text>
          <Text style={styles.letterWhite}>A</Text>
        </View>

        {/* Subtítulo */}
        <Text style={styles.tagline}>{t('auto.sab043598', 'SOCIAL · EVENTS · YOU')}</Text>
      </Animated.View>

      {/* Barra de progresso + pontos */}
      <Animated.View style={[styles.loaderArea, { opacity: fadeIn }]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]}>
            <LinearGradient
              colors={['#00d9ff', '#bf00ff', '#ff1493']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          {/* Brilho na ponta da barra */}
          <Animated.View style={[styles.progressGlow, progressStyle]} />
        </View>

        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, dot1Style, { backgroundColor: '#00d9ff' }]} />
          <Animated.View style={[styles.dot, dot2Style, { backgroundColor: '#bf00ff' }]} />
          <Animated.View style={[styles.dot, dot3Style, { backgroundColor: '#ff1493' }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.4,
  },

  // Logo Area
  logoArea: {
    alignItems: 'center',
    marginBottom: 80,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    width: width * 0.6,
  },
  lineLeft: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  lineRight: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  lineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  letterWhite: {
    fontSize: 72,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -2,
    includeFontPadding: false,
  },
  letterPink: {
    fontSize: 72,
    fontWeight: '900',
    color: '#ff1493',
    letterSpacing: -2,
    includeFontPadding: false,
    textShadowColor: 'rgba(255, 20, 147, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  letterCyan: {
    fontSize: 72,
    fontWeight: '900',
    color: '#00d9ff',
    letterSpacing: -2,
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 217, 255, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 5,
    fontWeight: '600',
    marginTop: 2,
  },

  // Progress bar
  loaderArea: {
    position: 'absolute',
    bottom: height * 0.12,
    alignItems: 'center',
    width: width * 0.5,
  },
  progressTrack: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressGlow: {
    position: 'absolute',
    right: 0,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff1493',
    shadowColor: '#ff1493',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
