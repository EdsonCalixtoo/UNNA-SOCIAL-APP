import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Dimensions, Platform, ScrollView, Linking, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Event } from '@/types/database';
import { MapPin, Calendar, Navigation2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
let Location: any = null;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
    Location = require('expo-location');
  } catch (error) {
    console.log('react-native-maps not available');
  }
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;

type EventStatus = 'happening' | 'starting-soon' | 'upcoming';

export default function Map() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      getUserLocation();
    }
    loadEvents();
    const interval = setInterval(loadEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  const getUserLocation = async () => {
    if (Platform.OS === 'web' || !Location) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles:creator_id (
            id,
            username,
            full_name,
            avatar_url
          ),
          categories:category_id (
            id,
            name,
            icon
          ),
          subcategories:subcategory_id (
            id,
            name
          )
        `)
        .eq('status', 'ao_vivo')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('event_date', { ascending: true })
        .limit(100);

      if (error) throw error;

      const eventsData = data || [];
      setEvents(eventsData);

      if (eventsData.length > 0 && mapRef.current && !userLocation) {
        const coordinates = eventsData.map((event) => ({
          latitude: event.latitude!,
          longitude: event.longitude!,
        }));

        mapRef.current.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        });
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (event: Event): EventStatus => {
    const now = new Date();
    const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
    const eventEndTime = new Date(eventDateTime.getTime() + 4 * 60 * 60 * 1000);
    const diff = eventDateTime.getTime() - now.getTime();
    const diffFromEnd = eventEndTime.getTime() - now.getTime();

    if (diff < 0 && diffFromEnd > 0) return 'happening';
    if (diff < 2 * 60 * 60 * 1000) return 'starting-soon';
    return 'upcoming';
  };

  const getMarkerColor = (status: EventStatus) => {
    switch (status) {
      case 'happening': return '#34C759';
      case 'starting-soon': return '#FF9500';
      default: return '#00d9ff';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleMarkerPress = (event: Event) => {
    setSelectedEvent(event);
    if (mapRef.current && event.latitude && event.longitude) {
      mapRef.current.animateToRegion({
        latitude: event.latitude,
        longitude: event.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 500);
    }
  };

  const openNavigation = (event: Event) => {
    if (!event.latitude || !event.longitude) {
      Alert.alert('Erro', 'Localização do evento não disponível');
      return;
    }

    const lat = event.latitude;
    const lng = event.longitude;
    const label = encodeURIComponent(event.title);

    Alert.alert(
      'Navegar até o evento',
      'Escolha o aplicativo de navegação:',
      [
        {
          text: 'Google Maps',
          onPress: () => {
            const url = Platform.select({
              ios: `comgooglemaps://?q=${lat},${lng}&center=${lat},${lng}&zoom=14&views=traffic`,
              android: `google.navigation:q=${lat},${lng}`,
              default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
            });
            Linking.openURL(url!).catch(() => {
              Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
            });
          },
        },
        {
          text: 'Waze',
          onPress: () => {
            const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&z=10`;
            Linking.openURL(url).catch(() => {
              Alert.alert('Erro', 'Waze não está instalado');
            });
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  const initialRegion = userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : (events.length > 0 && events[0].latitude && events[0].longitude
    ? {
        latitude: events[0].latitude,
        longitude: events[0].longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : {
        latitude: -23.5505,
        longitude: -46.6333,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });

  const renderListView = () => (
    <ScrollView style={styles.webContainer}>
      <View style={styles.webMapPlaceholder}>
        <MapPin size={64} color="#00d9ff" />
        <Text style={styles.webMapTitle}>Eventos por Localização</Text>
        <Text style={styles.webMapText}>
          O mapa interativo está disponível no aplicativo móvel com geolocalização em tempo real.
        </Text>
        <Text style={styles.webMapSubtext}>
          Visualize todos os {events.length} eventos disponíveis abaixo
        </Text>
      </View>

      <View style={styles.eventsGrid}>
        {events.map((event) => {
          const status = getEventStatus(event);
          const markerColor = getMarkerColor(status);

          return (
            <TouchableOpacity
              key={event.id}
              style={styles.webEventCard}
              onPress={() => router.push(`/event/${event.id}`)}
            >
              {event.image_url && (
                <Image
                  source={{ uri: event.image_url }}
                  style={styles.webEventImage}
                  resizeMode="cover"
                />
              )}

              <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.95)']}
                style={styles.webEventGradient}
              />

              <View style={[styles.webStatusBadge, { backgroundColor: markerColor }]}>
                <Text style={styles.webStatusText}>
                  {status === 'happening' ? 'AO VIVO' : status === 'starting-soon' ? 'EM BREVE' : 'PRÓXIMO'}
                </Text>
              </View>

              <View style={styles.webEventContent}>
                <Text style={styles.webEventTitle} numberOfLines={2}>
                  {event.title}
                </Text>
                <View style={styles.webEventMeta}>
                  <Calendar size={14} color="#fff" />
                  <Text style={styles.webEventMetaText}>
                    {new Date(event.event_date).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                <View style={styles.webEventMeta}>
                  <MapPin size={14} color="#fff" />
                  <Text style={styles.webEventMetaText} numberOfLines={1}>
                    {event.location_name}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );

  const renderNativeMap = () => {
    if (!MapView) return renderListView();

    return (
      <>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={initialRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsCompass={true}
          showsScale={true}
          customMapStyle={darkMapStyle}
        >
          {events.map((event) => {
            if (!event.latitude || !event.longitude) return null;
            const status = getEventStatus(event);
            const markerColor = getMarkerColor(status);

            return (
              <Marker
                key={event.id}
                coordinate={{
                  latitude: event.latitude,
                  longitude: event.longitude,
                }}
                onPress={() => handleMarkerPress(event)}
              >
                <View style={[styles.markerContainer, { backgroundColor: markerColor }]}>
                  <Text style={styles.markerIcon}>{event.categories?.icon || '📍'}</Text>
                  {status === 'happening' && <View style={styles.pulseRing} />}
                </View>
              </Marker>
            );
          })}
        </MapView>

        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
            <Text style={styles.legendText}>Ao Vivo</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
            <Text style={styles.legendText}>Em até 2h</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#00d9ff' }]} />
            <Text style={styles.legendText}>Próximos</Text>
          </View>
        </View>

        {selectedEvent && (
          <View style={styles.selectedEventCard}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedEvent(null)}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardTouchable}
              onPress={() => router.push(`/event/${selectedEvent.id}`)}
              activeOpacity={0.95}
            >
              {selectedEvent.image_url && (
                <Image
                  source={{ uri: selectedEvent.image_url }}
                  style={styles.selectedEventImage}
                  resizeMode="cover"
                />
              )}

              <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.95)']}
                style={styles.selectedEventGradient}
              />

              <View style={[
                styles.statusIndicator,
                { backgroundColor: getMarkerColor(getEventStatus(selectedEvent)) }
              ]}>
                <Text style={styles.statusText}>
                  {getEventStatus(selectedEvent) === 'happening' ? 'AO VIVO' : 'EM BREVE'}
                </Text>
              </View>

              <View style={styles.selectedEventContent}>
                <Text style={styles.selectedEventTitle} numberOfLines={2}>
                  {selectedEvent.title}
                </Text>

                <View style={styles.selectedEventInfo}>
                  <View style={styles.selectedEventInfoItem}>
                    <Calendar size={16} color="#fff" />
                    <Text style={styles.selectedEventInfoText}>
                      {formatDate(selectedEvent.event_date)} às {selectedEvent.event_time.slice(0, 5)}
                    </Text>
                  </View>

                  <View style={styles.selectedEventInfoItem}>
                    <MapPin size={16} color="#fff" />
                    <Text style={styles.selectedEventInfoText} numberOfLines={1}>
                      {selectedEvent.location_name}
                    </Text>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      openNavigation(selectedEvent);
                    }}
                  >
                    <Navigation2 size={18} color="#fff" />
                    <Text style={styles.navButtonText}>Ir até o local</Text>
                  </TouchableOpacity>
                  <View style={styles.viewEventBadge}>
                    <Text style={styles.viewEventBadgeText}>Toque para ver mais</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(45, 45, 45, 0.95)', 'transparent']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Mapa de Eventos</Text>
        <Text style={styles.headerSubtitle}>{events.length} eventos disponíveis</Text>
      </LinearGradient>

      {Platform.OS === 'web' || !MapView ? renderListView() : renderNativeMap()}

    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9E9E93',
    marginTop: 4,
    fontWeight: '500',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  markerIcon: {
    fontSize: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#34C759',
    opacity: 0.3,
  },
  mapLegend: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#3d3d3d',
    zIndex: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  selectedEventCard: {
    position: 'absolute',
    bottom: 100,
    left: (width - CARD_WIDTH) / 2,
    width: CARD_WIDTH,
    height: 240,
    backgroundColor: '#2d2d2d',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
    zIndex: 100,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cardTouchable: {
    flex: 1,
  },
  selectedEventImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  selectedEventGradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  statusIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 2,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  selectedEventContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    zIndex: 2,
  },
  selectedEventTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  selectedEventInfo: {
    gap: 8,
    marginBottom: 16,
  },
  selectedEventInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedEventInfoText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  navButton: {
    backgroundColor: '#00d9ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  viewEventBadge: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewEventBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  webContainer: {
    flex: 1,
    marginTop: 140,
  },
  webMapPlaceholder: {
    height: 300,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
  },
  webMapTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 16,
    letterSpacing: -0.5,
  },
  webMapText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  webMapSubtext: {
    fontSize: 14,
    color: '#636366',
    textAlign: 'center',
    marginTop: 4,
  },
  eventsGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  webEventCard: {
    width: width > 768 ? (width - 64) / 3 : (width - 48) / 2,
    height: 280,
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  webEventImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  webEventGradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  webStatusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 2,
  },
  webStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  webEventContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 2,
  },
  webEventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  webEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  webEventMetaText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
});
