
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence, 
  withDelay,
  Easing,
  runOnJS
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COUNT = 40;
const COLORS = ['#ff1493', '#00d9ff', '#7b2fff', '#34C759', '#FF9500', '#FF3B30'];

const ConfettiPiece = ({ index, onComplete }: { index: number, onComplete: () => void }) => {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(Math.random() * SCREEN_WIDTH);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const size = Math.random() * 8 + 6;
  const delay = Math.random() * 2000;

  useEffect(() => {
    translateY.value = withDelay(delay, withTiming(SCREEN_HEIGHT + 20, {
      duration: 2500 + Math.random() * 1000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }, (finished) => {
      if (finished && index === CONFETTI_COUNT - 1) {
        runOnJS(onComplete)();
      }
    }));

    translateX.value = withDelay(delay, withTiming(translateX.value + (Math.random() - 0.5) * 200, {
      duration: 3000,
    }));

    rotate.value = withDelay(delay, withTiming(720, {
      duration: 3000,
    }));

    opacity.value = withDelay(delay + 2000, withTiming(0, { duration: 1000 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` as any }
    ],
    opacity: opacity.value,
    backgroundColor: color,
    width: size,
    height: size,
    borderRadius: size / 4,
  } as any));

  return <Animated.View style={[styles.confetti, animatedStyle as any]} />;
};

export const ConfettiView = ({ visible, onComplete }: { visible: boolean, onComplete: () => void }) => {
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {[...Array(CONFETTI_COUNT)].map((_, i) => (
        <ConfettiPiece key={i} index={i} onComplete={onComplete} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
});
