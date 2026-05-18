import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Platform, Alert, Dimensions, Linking } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Circle } from 'react-native-maps';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
  const params = useLocalSearchParams();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingOnly, setTrendingOnly] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Load Data on Focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const [cats, evs, loc] = await Promise.all([
            eventService.getCategories(),
            eventService.getLiveEvents(),
            mapService.getUserLocation()
          ]);
          
          setCategories(cats);
          setEvents(evs);
          
          if (loc && !userLocation) {
            setUserLocation(loc);
            mapRef.current?.animateToRegion({
              ...loc,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }, 1000);
          }
        } catch (error) {
          console.error('Map focus load error:', error);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }, [userLocation])
  );

  // Handle incoming navigation parameters (from EventCard click)
  useEffect(() => {
    if (events.length === 0) return;

    const handleParams = () => {
      const eventId = params.eventId as string;
      const latParam = params.latitude ? parseFloat(params.latitude as string) : null;
      const lngParam = params.longitude ? parseFloat(params.longitude as string) : null;

      let targetEvent = null;

      if (eventId && eventId !== 'undefined') {
        targetEvent = events.find(e => e.id === eventId);
      } else if (latParam && lngParam) {
        // Fallback para coordenadas
        targetEvent = events.find(e => 
          Math.abs(parseFloat(String(e.latitude)) - latParam) < 0.005 && 
          Math.abs(parseFloat(String(e.longitude)) - lngParam) < 0.005
        );
      }

      if (targetEvent) {
        const lat = parseFloat(String(targetEvent.latitude));
        const lng = parseFloat(String(targetEvent.longitude));

        setSelectedEvent(targetEvent);
        
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            latitude: lat - 0.012, 
            longitude: lng,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }, 1000);
        }, 500);
      }
    };

    handleParams();
  }, [params.eventId, params.latitude, params.longitude, events]);

  // Filter Events
  const filteredEvents = useMemo(() => {
    let result = events;
    
    if (selectedCategory) {
      result = result.filter(e => e.category_id === selectedCategory);
    }
    
    if (trendingOnly) {
      // Ordena por popularidade: (likes * 2) + (participantes * 1)
      result = [...result].sort((a, b) => {
        const scoreA = (a.likes_count || 0) * 2 + (a.participants_count || 0);
        const scoreB = (b.likes_count || 0) * 2 + (b.participants_count || 0);
        return scoreB - scoreA;
      });
      // Mostra apenas os top 15 se estiver no modo "Bombando"
      result = result.slice(0, 15);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.title?.toLowerCase().includes(q) || 
        e.description?.toLowerCase().includes(q) ||
        e.location_name?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [events, selectedCategory, searchQuery, trendingOnly]);

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
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
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
        {showHeatmap && events.length > 0 && events.map((e, index) => {
          const lat = parseFloat(String(e.latitude));
          const lng = parseFloat(String(e.longitude));
          if (isNaN(lat) || isNaN(lng)) return null;

          const weight = (e.likes_count || 0) + (e.participants_count || 0) + 1;
          const scale = Math.min(1.8, 1 + weight * 0.1);

          return (
            <React.Fragment key={`heat-${e.id}-${index}`}>
              {/* Glow externo ciano */}
              <Circle
                center={{ latitude: lat, longitude: lng }}
                radius={240 * scale}
                fillColor={isDark ? "rgba(0, 217, 255, 0.05)" : "rgba(0, 217, 255, 0.06)"}
                strokeColor="transparent"
              />
              {/* Glow médio roxo */}
              <Circle
                center={{ latitude: lat, longitude: lng }}
                radius={120 * scale}
                fillColor={isDark ? "rgba(123, 47, 255, 0.12)" : "rgba(123, 47, 255, 0.13)"}
                strokeColor="transparent"
              />
              {/* Núcleo denso rosa */}
              <Circle
                center={{ latitude: lat, longitude: lng }}
                radius={50 * scale}
                fillColor={isDark ? "rgba(255, 20, 147, 0.22)" : "rgba(255, 20, 147, 0.24)"}
                strokeColor="transparent"
              />
            </React.Fragment>
          );
        })}

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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        trendingOnly={trendingOnly}
        onTrendingChange={setTrendingOnly}
        showHeatmap={showHeatmap}
        onHeatmapChange={setShowHeatmap}
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
