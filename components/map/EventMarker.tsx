import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Platform, Animated } from 'react-native';
import { Marker } from 'react-native-maps';

interface EventMarkerProps {
  event: any;
  markerColor: string;
  onPress: () => void;
  isSelected?: boolean;
}

const EventMarker = ({ event, markerColor, onPress, isSelected }: EventMarkerProps) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();
    return () => animation.stop();
  }, []);

  const lat = parseFloat(String(event.latitude));
  const lng = parseFloat(String(event.longitude));
  
  const icon = event?.categories?.icon || '📍';
  const isImageUrl = typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('https'));

  if (isNaN(lat) || isNaN(lng)) return null;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges={Platform.OS === 'android'} 
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[
        styles.markerCircle, 
        { backgroundColor: markerColor },
        isSelected && styles.selectedMarker
      ]}>
        {/* Pulso agora fica dentro do círculo mas expande para fora */}
        <Animated.View 
          style={[
            styles.pulse, 
            { 
              backgroundColor: markerColor,
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim
            }
          ]} 
        />

        <View style={styles.content}>
          {isImageUrl ? (
            <Image 
              source={{ uri: icon }} 
              style={styles.iconImage} 
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.iconEmoji}>{icon}</Text>
          )}
        </View>
      </View>
    </Marker>
  );
};

const styles = StyleSheet.create({
  pulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  markerCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.99,
    overflow: 'visible',
    // Usamos elevação simples para sombra no Android (Shadow normal às vezes buga o snapshot)
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  selectedMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    elevation: 8,
  },
  content: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  iconImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});

export default memo(EventMarker);
