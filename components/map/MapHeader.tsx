import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';

interface MapHeaderProps {
  onFilterPress: () => void;
  eventCount: number;
}

const MapHeader = ({ onFilterPress, eventCount }: MapHeaderProps) => {
  const insets = useSafeAreaInsets();
  const { textPrimary, accent, isDark } = useTheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <BlurView intensity={20} style={styles.content} tint={isDark ? 'dark' : 'light'}>
        <View style={styles.left}>
          <Text style={[styles.title, { color: textPrimary }]}>Explorar</Text>
          <View style={styles.badge}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[styles.count, { color: textPrimary }]}>{eventCount} ao vivo</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.filterBtn} onPress={onFilterPress}>
          <SlidersHorizontal size={20} color={textPrimary} />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  left: {
    gap: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  count: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default MapHeader;
