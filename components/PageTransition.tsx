import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  Easing 
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const isFocused = useIsFocused();
  
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(15);
  const scale = useSharedValue(0.98);

  useEffect(() => {
    if (isFocused) {
      // Entrada
      opacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      scale.value = withSpring(1, { damping: 15, stiffness: 100 });
    } else {
      // Saída (opcional, para quando perde o foco)
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(10, { duration: 200 });
      scale.value = withTiming(0.98, { duration: 200 });
    }
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value }
      ] as any,
    } as any;
  });

  return (
    <Animated.View style={[styles.container, animatedStyle] as any}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
