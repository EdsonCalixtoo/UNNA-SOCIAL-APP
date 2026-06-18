import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Animated, Platform } from 'react-native';
import { Search, SlidersHorizontal, Map as MapIcon, Layers, Zap } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/lib/i18n';
import { hapticFeedback } from '@/utils/haptics';

interface MapHeaderProps {
  onFilterPress: () => void;
  eventCount: number;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  categories: any[];
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
  trendingOnly: boolean;
  onTrendingChange: (val: boolean) => void;
  showHeatmap: boolean;
  onHeatmapChange: (val: boolean) => void;
  liveOnly: boolean;
  onLiveOnlyChange: (val: boolean) => void;
}

const MapHeader = ({
  onFilterPress,
  eventCount,
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
  trendingOnly,
  onTrendingChange,
  showHeatmap,
  onHeatmapChange,
  liveOnly,
  onLiveOnlyChange
}: MapHeaderProps) => {
  const insets = useSafeAreaInsets();
  const { textPrimary, textSecondary, accent, backgroundSecondary, isDark } = useTheme();
  const { t } = useLanguage();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Floating Main Bar */}
      <View style={styles.mainBarWrapper}>
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 80} style={styles.mainBar} tint={isDark ? 'dark' : 'light'}>
          <View style={styles.searchSection}>
            <Search size={18} color={textSecondary} />
            <TextInput
              style={[styles.input, { color: textPrimary }]}
              placeholder={t('map.searchPlaceholder', 'O que você está procurando?')}
              placeholderTextColor={textSecondary}
              value={searchQuery}
              onChangeText={onSearchChange}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.filterBtn}
            onPress={onFilterPress}
          >
            <SlidersHorizontal size={20} color={accent} />
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* Live Badge & Horizontal Filter */}
      <View style={styles.bottomSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Live Now Button */}
          <TouchableOpacity
            onPress={() => {
              const newState = !liveOnly;
              onLiveOnlyChange(newState);
              if (newState) onTrendingChange(false);
              hapticFeedback.light();
            }}
            style={[
              styles.liveChip,
              { backgroundColor: liveOnly ? (isDark ? 'rgba(52, 199, 89, 0.25)' : 'rgba(52, 199, 89, 0.2)') : (isDark ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.05)') },
              liveOnly && { borderColor: '#34C759', borderWidth: 1 }
            ]}
          >
            <View style={styles.pulseContainer}>
              <Animated.View style={[styles.pulseDot, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.dot} />
            </View>
            <Text style={styles.liveText}>{t('map.liveOnly', 'AO VIVO')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const newState = !trendingOnly;
              onTrendingChange(newState);
              if (newState) onLiveOnlyChange(false);
              hapticFeedback.light();
            }}
            style={[
              styles.trendingChip,
              trendingOnly && { backgroundColor: 'rgba(255, 20, 147, 0.15)', borderColor: '#ff1493', borderWidth: 1 }
            ]}
          >
            <Text style={[styles.trendingText, trendingOnly && { color: '#ff1493' }]}>🔥 {t('map.trending', 'Bombando')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { onHeatmapChange(!showHeatmap); hapticFeedback.light(); }}
            style={[
              styles.trendingChip,
              showHeatmap && { backgroundColor: 'rgba(0, 217, 255, 0.15)', borderColor: accent, borderWidth: 1 }
            ]}
          >
            <Text style={[styles.trendingText, showHeatmap && { color: accent }]}>✨ {t('map.heatmap', 'Calor')}</Text>
          </TouchableOpacity>

          <View style={styles.vDivider} />

          {/* Categories */}
          <TouchableOpacity
            onPress={() => {
              onSelectCategory(null);
              onTrendingChange(false);
              onLiveOnlyChange(false);
              hapticFeedback.light();
            }}
            style={[
              styles.chip,
              (!selectedCategory && !trendingOnly && !liveOnly) && [styles.activeChip, { borderColor: accent }],
              { backgroundColor: backgroundSecondary }
            ]}
          >
            <Text style={[styles.chipText, { color: (!selectedCategory && !trendingOnly && !liveOnly) ? accent : textPrimary }]}>🌍 {t('common.filter', 'Todos')}</Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => onSelectCategory(cat.id)}
              style={[
                styles.chip,
                selectedCategory === cat.id && [styles.activeChip, { borderColor: accent }],
                { backgroundColor: backgroundSecondary }
              ]}
            >
              <Text style={[styles.chipText, { color: selectedCategory === cat.id ? accent : textPrimary }]}>
                {cat.icon} {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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
  },
  mainBarWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  mainBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  searchSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginHorizontal: 12,
  },
  filterBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    height: 40,
  },
  scrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    gap: 8,
  },
  pulseContainer: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  pulseDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    opacity: 0.4,
  },
  liveText: {
    color: '#34C759',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  vDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginHorizontal: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  trendingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8E8E93',
  },
  activeChip: {
    backgroundColor: 'rgba(0, 217, 255, 0.08)',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default MapHeader;
