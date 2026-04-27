import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface EventMarker {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  isLive: boolean;
  time: string;
  location: string;
  image?: string;
  goingCount: number;
  position: { x: number; y: number };
}

interface MapMarkerProps {
  event: EventMarker;
  onPress: () => void;
  isSelected: boolean;
}

export function MapMarker({ event, onPress, isSelected }: MapMarkerProps) {
  return (
    <TouchableOpacity
      style={[
        styles.markerContainer,
        {
          left: `${event.position.x}%`,
          top: `${event.position.y}%`,
        },
        isSelected && styles.markerSelected,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[event.categoryColor, event.categoryColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.markerGradient}
      >
        {event.isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>AO VIVO</Text>
          </View>
        )}
        
        <View style={styles.markerContent}>
          <Text style={styles.markerEmoji}>📍</Text>
          <Text style={styles.markerTitle} numberOfLines={1}>
            {event.title}
          </Text>
        </View>

        <View style={styles.markerFooter}>
          <Text style={styles.goingCount}>👥 {event.goingCount}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
    transform: [{ translateX: -60 }, { translateY: -60 }],
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  markerSelected: {
    shadowOpacity: 0.6,
    elevation: 12,
  },
  markerGradient: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#fff',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  markerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  markerEmoji: {
    fontSize: 28,
  },
  markerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  markerFooter: {
    alignItems: 'center',
  },
  goingCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
