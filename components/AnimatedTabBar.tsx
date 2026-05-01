import React from 'react';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useUI } from '@/contexts/UIContext';
import { StyleSheet } from 'react-native';

export function AnimatedTabBar(props: BottomTabBarProps) {
  const { tabBarOffset } = useUI();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: tabBarOffset.value }],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
});
