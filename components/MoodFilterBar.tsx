import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ms } from '@/utils/responsive';
import * as Haptics from 'expo-haptics';

export type MoodType = 'all' | 'suar' | 'comer' | 'vip' | 'shows';

interface MoodFilterBarProps {
  currentMood: MoodType;
  onSelectMood: (mood: MoodType) => void;
}

const MOODS: { id: MoodType; label: string; icon: string }[] = [
  { id: 'all', label: 'Tudo', icon: '✨' },
  { id: 'suar', label: 'Para Suar', icon: '🔥' },
  { id: 'comer', label: 'Comer & Beber', icon: '🍔' },
  { id: 'shows', label: 'Shows Ao Vivo', icon: '🎶' },
  { id: 'vip', label: 'Exclusivo VIP', icon: '🥂' },
];

export default function MoodFilterBar({ currentMood, onSelectMood }: MoodFilterBarProps) {
  const { backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {MOODS.map((mood) => {
          const isSelected = currentMood === mood.id;
          return (
            <TouchableOpacity
              key={mood.id}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectMood(mood.id);
              }}
              style={[
                styles.pill,
                { 
                  backgroundColor: isSelected ? accent : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                  borderColor: isSelected ? accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                }
              ]}
            >
              <Text style={styles.icon}>{mood.icon}</Text>
              <Text style={[
                styles.label, 
                { color: isSelected ? '#FFF' : textPrimary, fontWeight: isSelected ? '800' : '600' }
              ]}>
                {mood.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
  },
  icon: {
    fontSize: ms(14),
  },
  label: {
    fontSize: ms(13),
  }
});
