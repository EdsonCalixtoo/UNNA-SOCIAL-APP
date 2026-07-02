
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const { isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function EventCardSkeleton() {
  const { isDark } = useTheme();
  const { width } = Dimensions.get('window');
  return (
    <View style={{ width: width - 32, padding: 16, marginHorizontal: 16, marginVertical: 12, gap: 12, borderRadius: 36, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 }}>
      <Skeleton width="100%" height={200} borderRadius={28} />
      <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
        <Skeleton width={50} height={50} borderRadius={25} />
        <View style={{ gap: 5, flex: 1 }}>
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={15} />
        </View>
      </View>
    </View>
  );
}

export default Skeleton;
