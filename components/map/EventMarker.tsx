import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Platform, Animated, Easing } from 'react-native';
import { Marker } from 'react-native-maps';

interface EventMarkerProps {
  event: any;
  markerColor: string;
  onPress: () => void;
  isSelected?: boolean;
}

const EventMarker = ({ event, markerColor, onPress, isSelected }: EventMarkerProps) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim2 = useRef(new Animated.Value(0.4)).current;

  // Um evento é considerado "Bombando" se tiver mais de 5 participantes
  const isHot = (event.participants_count || 0) >= 5;

  useEffect(() => {
    // Animação do Pulso Principal
    const mainPulse = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 2,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    mainPulse.start();

    // Animação do Segundo Pulso (Apenas para eventos populares)
    let secondaryPulse: Animated.CompositeAnimation | null = null;
    if (isHot) {
      secondaryPulse = Animated.loop(
        Animated.sequence([
          Animated.delay(1000),
          Animated.parallel([
            Animated.timing(pulseAnim2, {
              toValue: 2.5,
              duration: 2000,
              useNativeDriver: true,
              easing: Easing.out(Easing.ease),
            }),
            Animated.timing(opacityAnim2, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ])
      );
      secondaryPulse.start();
    }

    return () => {
      mainPulse.stop();
      if (secondaryPulse) secondaryPulse.stop();
    };
  }, [isHot]);

  const lat = parseFloat(String(event.latitude));
  const lng = parseFloat(String(event.longitude));
  
  const icon = event?.categories?.icon || '📍';
  const isImageUrl = typeof icon === 'string' && (icon.startsWith('http') || icon.startsWith('https'));

  if (isNaN(lat) || isNaN(lng)) return null;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges={true} 
      anchor={{ x: 0.5, y: 0.5 }}
    >
        {/* Pulso 1 */}
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

        {/* Pulso 2 (Apenas se estiver Bombando) */}
        {isHot && (
          <Animated.View 
            style={[
              styles.pulse, 
              { 
                backgroundColor: '#FF3B30', 
                transform: [{ scale: pulseAnim2 }],
                opacity: opacityAnim2
              }
            ]} 
          />
        )}

        <View style={[
          styles.markerCircle, 
          { backgroundColor: markerColor },
          isSelected && styles.selectedMarker,
          isHot && styles.hotMarker
        ]}>
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
        
        {/* Badge de "Bombando" */}
        {isHot && !isSelected && (
          <View style={styles.hotBadge}>
            <Text style={styles.hotBadgeText}>🔥</Text>
          </View>
        )}
    </Marker>
  );
};

const styles = StyleSheet.create({
  pulse: {
    position: 'absolute',
    width: 38,
    height: 38,
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
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  hotMarker: {
    borderWidth: 2,
    borderColor: '#FFD700', // Dourado para eventos populares
    shadowColor: '#FFD700',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
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
  hotBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF3B30',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  hotBadgeText: {
    fontSize: 10,
  },
});

export default memo(EventMarker);
