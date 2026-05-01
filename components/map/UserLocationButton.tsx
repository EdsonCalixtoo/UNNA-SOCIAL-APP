import React from 'react';
import { TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Navigation } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';

interface UserLocationButtonProps {
  onPress: () => void;
  bottomOffset?: number;
}

const UserLocationButton = ({ onPress, bottomOffset = 100 }: UserLocationButtonProps) => {
  const { accent, isDark } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { bottom: bottomOffset }]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <BlurView intensity={30} style={styles.blur} tint={isDark ? 'dark' : 'light'}>
        <Navigation size={24} color={accent} fill={accent} />
      </BlurView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  blur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default UserLocationButton;
