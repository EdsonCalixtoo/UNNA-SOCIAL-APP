import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Platform, Alert, Dimensions, Linking } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUI } from '@/contexts/UIContext';

// Services
import { eventService } from '@/services/eventService';
import { mapService } from '@/services/mapService';

// Components
import EventMarker from '@/components/map/EventMarker';
import EventBottomSheet from '@/components/map/EventBottomSheet';
import FilterModal from '@/components/map/FilterModal';
import UserLocationButton from '@/components/map/UserLocationButton';
import MapHeader from '@/components/map/MapHeader';
import { darkMapStyle, lightMapStyle } from '@/utils/mapStyles'; // Preciso garantir que existam

const { width, height } = Dimensions.get('window');

export default function EventsMapScreen() {
  const { isDark, accent } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showTabBar } = useUI();
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    showTabBar();
  }, []);

  // State
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
      try {
        const [cats, evs, loc] = await Promise.all([
          eventService.getCategories(),
          eventService.getLiveEvents(),
          mapService.getUserLocation()
        ]);
        
        setCategories(cats);
        setEvents(evs);
        if (loc) {
          setUserLocation(loc);
          mapRef.current?.animateToRegion({
            ...loc,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        } else if (evs.length > 0) {
          // Se não tem localização, foca nos eventos
          const coords = evs.slice(0, 5).map(e => ({
            latitude: parseFloat(String(e.latitude)),
            longitude: parseFloat(String(e.longitude))
          }));
          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
            animated: true
          });
        }
      } catch (error) {
        console.error('Init map error:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Filter Events
  const filteredEvents = useMemo(() => {
    if (!selectedCategory) return events;
    return events.filter(e => e.category_id === selectedCategory);
  }, [events, selectedCategory]);

  // Handlers
  const handleMarkerPress = useCallback((event: any) => {
    setSelectedEvent(event);
    mapRef.current?.animateToRegion({
      latitude: event.latitude - 0.015, // Offset para não ficar atrás do bottom sheet
      longitude: event.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }, 500);
  }, []);

  const handleCenterUser = useCallback(async () => {
    const loc = await mapService.getUserLocation();
    if (loc) {
      setUserLocation(loc);
      mapRef.current?.animateToRegion({
        ...loc,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 800);
    } else {
      Alert.alert('Localização', 'Não foi possível obter sua localização.');
    }
  }, []);

  const handleNavigate = useCallback((event: any) => {
    const lat = event.latitude;
    const lng = event.longitude;
    const label = encodeURIComponent(event.title);

    const options = [
      {
        name: 'Google Maps',
        url: Platform.select({
          ios: `comgooglemaps://?q=${lat},${lng}&center=${lat},${lng}&zoom=14&views=traffic`,
          android: `google.navigation:q=${lat},${lng}`,
        }),
        web: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      },
      {
        name: 'Waze',
        url: `waze://?ll=${lat},${lng}&navigate=yes`,
        web: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
      }
    ];

    if (Platform.OS === 'ios') {
      options.push({
        name: 'Apple Maps',
        url: `maps://0,0?q=${lat},${lng}(${label})`,
        web: `http://maps.apple.com/?q=${lat},${lng}`
      });
    }

    const showOptions = () => {
      Alert.alert(
        'Como chegar?',
        'Escolha seu aplicativo de navegação favorito:',
        [
          ...options.map(opt => ({
            text: opt.name,
            onPress: () => {
              Linking.canOpenURL(opt.url!).then(supported => {
                Linking.openURL(supported ? opt.url! : opt.web);
              });
            }
          })),
          { text: 'Cancelar', style: 'cancel' }
        ]
      );
    };

    showOptions();
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        key={isDark ? 'dark-map' : 'light-map'}
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_GOOGLE}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={(e) => {
          // Se clicou no mapa (vazio), fecha o card
          if (e.nativeEvent.action !== 'marker-press') {
            setSelectedEvent(null);
          }
        }}
      >
        {filteredEvents.map(event => (
          <EventMarker
            key={event.id}
            event={event}
            markerColor={mapService.getMarkerColor(eventService.getEventStatus(event))}
            isSelected={selectedEvent?.id === event.id}
            onPress={() => handleMarkerPress(event)}
          />
        ))}
      </MapView>

      {/* UI Layers */}
      <MapHeader 
        onFilterPress={() => setIsFilterVisible(true)} 
        eventCount={filteredEvents.length} 
      />

      <UserLocationButton onPress={handleCenterUser} bottomOffset={selectedEvent ? height * 0.48 : 110} />

      <EventBottomSheet
        event={selectedEvent}
        isVisible={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onViewEvent={(id) => router.push(`/event/${id}`)}
        onNavigate={handleNavigate}
        distance={selectedEvent && userLocation ? mapService.calculateDistance(
          userLocation.latitude, 
          userLocation.longitude, 
          selectedEvent.latitude, 
          selectedEvent.longitude
        ) : undefined}
      />

      <FilterModal
        visible={isFilterVisible}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          setIsFilterVisible(false);
        }}
        onClose={() => setIsFilterVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
