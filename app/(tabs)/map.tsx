import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Dimensions, Platform, ScrollView, Linking, Alert, GestureResponderEvent, Modal, Animated } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Event } from '@/types/database';
import { MapPin, Calendar, Navigation2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { showError } from '@/components/ErrorDisplay';
import * as Location from 'expo-location';

let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  const mapImport = require('react-native-maps');
  MapView = mapImport.default;
  Marker = mapImport.Marker;
  PROVIDER_GOOGLE = mapImport.PROVIDER_GOOGLE;
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
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('📍 Map component mounted');
    if (Platform.OS !== 'web') {
      console.log('📍 Getting user location...');
      getUserLocation();
    }
    console.log('📍 Loading categories and events...');
    loadCategories();
    loadEvents();
    
    // Iniciar animação de pulsação contínua
    const pulsing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );
    pulsing.start();
    
    const interval = setInterval(loadEvents, 60000);
    return () => {
      console.log('📍 Map component unmounted');
      clearInterval(interval);
      pulsing.stop();
    };
  }, [pulseAnim]);

  const getUserLocation = async () => {
    try {
      console.log('📍 getUserLocation: Platform check');
      if (Platform.OS === 'web' || !Location) {
        console.log('📍 getUserLocation: Web or no Location module');
        return;
      }

      console.log('📍 getUserLocation: Requesting permissions');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📍 getUserLocation: Permission status:', status);
      
      if (status !== 'granted') {
        console.log('📍 getUserLocation: Permission denied');
        return;
      }

      console.log('📍 getUserLocation: Getting position');
      const location = await Location.getCurrentPositionAsync({});
      console.log('📍 getUserLocation: Position received:', location.coords);
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('❌ Error getting location:', error);
      showError(`Erro ao obter localização: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const loadCategories = async () => {
    try {
      console.log('📍 loadCategories: Starting');
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Supabase error:', error);
        return;
      }

      setCategories(data || []);
      console.log('📍 loadCategories: Loaded', (data || []).length, 'categories');
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadEvents = async () => {
    try {
      console.log('📍 loadEvents: Starting');
      
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
        .limit(50);

      console.log('📍 loadEvents: Query complete, rows:', data?.length);

      if (error) {
        console.error('❌ Supabase error:', error);
        showError(`Erro Supabase: ${error.message}`, JSON.stringify(error));
        throw error;
      }

      // Filtrar eventos que já terminaram (passaram de 4 horas após início)
      const now = new Date();
      const eventsData = (data || []).filter((event) => {
        try {
          if (!event.event_date || !event.event_time) return false;
          
          const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
          if (isNaN(eventDateTime.getTime())) return false;
          
          const eventEndTime = new Date(eventDateTime.getTime() + 4 * 60 * 60 * 1000);
          
          // Manter apenas eventos que ainda não terminaram
          return eventEndTime > now;
        } catch (error) {
          console.error('Error filtering event:', error);
          showError(`Erro ao filtrar evento: ${error instanceof Error ? error.message : String(error)}`);
          return false;
        }
      });

      setEvents(eventsData);

      if (eventsData.length > 0 && mapRef.current && !userLocation) {
        try {
          const coordinates = eventsData.slice(0, 10).map((event) => ({
            latitude: event.latitude!,
            longitude: event.longitude!,
          }));

          if (coordinates.length > 0) {
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
              animated: true,
            });
          }
        } catch (mapError) {
          console.error('Map error:', mapError);
          showError(`Erro ao animar mapa: ${mapError instanceof Error ? mapError.message : String(mapError)}`, mapError instanceof Error ? mapError.stack : undefined);
        }
      }
    } catch (error) {
      console.error('Error loading events:', error);
      showError(`Erro ao carregar eventos: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      Alert.alert('Aviso', 'Erro ao carregar eventos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (event: Event): EventStatus => {
    try {
      const now = new Date();
      const eventDate = event.event_date;
      const eventTime = event.event_time;
      
      if (!eventDate || !eventTime) return 'upcoming';
      
      const eventDateTime = new Date(`${eventDate}T${eventTime}`);
      
      if (isNaN(eventDateTime.getTime())) {
        console.warn('Invalid event date/time:', eventDate, eventTime);
        return 'upcoming';
      }
      
      const eventEndTime = new Date(eventDateTime.getTime() + 4 * 60 * 60 * 1000);
      const diff = eventDateTime.getTime() - now.getTime();
      const diffFromEnd = eventEndTime.getTime() - now.getTime();

      // Se o evento já terminou, retornar null como indicador
      if (diffFromEnd <= 0) return 'upcoming'; // Será filtrado no render

      if (diff < 0 && diffFromEnd > 0) return 'happening';
      if (diff < 2 * 60 * 60 * 1000) return 'starting-soon';
      return 'upcoming';
    } catch (error) {
      console.error('Error calculating event status:', error);
      return 'upcoming';
    }
  };

  const getMarkerColor = (status: EventStatus) => {
    switch (status) {
      case 'happening': return '#34C759';
      case 'starting-soon': return '#FF9500';
      default: return '#00d9ff';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '--/--/--';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '--/--/--';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleMarkerPress = (event: Event) => {
    try {
      // Validações rigorosas
      if (!event) {
        console.warn('Event is null or undefined');
        showError('Evento inválido (nulo ou indefinido)');
        return;
      }

      // Validar ID do evento
      const eventId = event?.id;
      if (!eventId) {
        console.warn('Event ID is missing');
        showError('ID do evento está faltando');
        return;
      }

      // Validar que o evento tem dados básicos
      const isValidEvent = event.title && event.event_date;
      if (!isValidEvent) {
        console.warn('Event missing required fields');
        showError(`Evento incompleto - Título: ${event.title}, Data: ${event.event_date}`);
        return;
      }

      // Definir o evento selecionado com segurança
      setSelectedEvent(event);

      // Animar mapa com proteções e delay
      if (mapRef?.current) {
        try {
          const lat = parseFloat(String(event.latitude));
          const lng = parseFloat(String(event.longitude));

          if (!isNaN(lat) && !isNaN(lng)) {
            requestAnimationFrame(() => {
              mapRef.current?.animateToRegion(
                {
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                },
                500
              );
            });
          } else {
            console.warn('Invalid coordinates for animation:', lat, lng);
            showError(`Coordenadas inválidas: lat=${lat}, lng=${lng}`);
          }
        } catch (mapError) {
          console.error('Map animation error:', mapError);
          showError(`Erro ao animar mapa: ${mapError instanceof Error ? mapError.message : String(mapError)}`, mapError instanceof Error ? mapError.stack : undefined);
        }
      }
    } catch (error) {
      console.error('Error in handleMarkerPress:', error);
      showError(`Erro ao pressionar marcador: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
    }
  };

  const openNavigation = (event: Event) => {
    try {
      if (!event || !event.latitude || !event.longitude) {
        showError('Localização do evento não disponível');
        Alert.alert('Erro', 'Localização do evento não disponível');
        return;
      }

      const lat = Number(event.latitude);
      const lng = Number(event.longitude);
      
      // Validar se os números são válidos
      if (isNaN(lat) || isNaN(lng)) {
        showError(`Coordenadas inválidas: lat=${lat}, lng=${lng}`);
        Alert.alert('Erro', 'Coordenadas inválidas');
        return;
      }

      const label = encodeURIComponent(event.title || 'Evento');

      Alert.alert(
        'Navegar até o evento',
        'Escolha o aplicativo de navegação:',
        [
          {
            text: 'Google Maps',
            onPress: () => {
              try {
                const url = Platform.select({
                  ios: `comgooglemaps://?q=${lat},${lng}&center=${lat},${lng}&zoom=14&views=traffic`,
                  android: `google.navigation:q=${lat},${lng}`,
                  default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                });
                if (url) {
                  Linking.openURL(url).catch((error) => {
                    console.error('Google Maps open error:', error);
                    showError(`Erro ao abrir Google Maps: ${error instanceof Error ? error.message : String(error)}`);
                    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
                  });
                }
              } catch (error) {
                console.error('Google Maps error:', error);
                showError(`Erro no Google Maps: ${error instanceof Error ? error.message : String(error)}`);
                Alert.alert('Erro', 'Não foi possível abrir o Google Maps');
              }
            },
          },
          {
            text: 'Waze',
            onPress: () => {
              try {
                const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&z=10`;
                Linking.openURL(url).catch((error) => {
                  console.error('Waze open error:', error);
                  showError(`Erro ao abrir Waze: ${error instanceof Error ? error.message : String(error)}`);
                  Alert.alert('Erro', 'Waze não está instalado');
                });
              } catch (error) {
                console.error('Waze error:', error);
                showError(`Erro no Waze: ${error instanceof Error ? error.message : String(error)}`);
                Alert.alert('Erro', 'Não foi possível abrir o Waze');
              }
            },
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Navigation error:', error);
      showError(`Erro na navegação: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      Alert.alert('Erro', 'Erro ao abrir navegação');
    }
  };

  if (loading) {
    console.log('📍 render: Loading...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  console.log('📍 render: Rendering map, platform:', Platform.OS, 'MapView:', !!MapView);

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
          // Filtrar eventos finalizados
          const now = new Date();
          if (event.event_date && event.event_time) {
            const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
            const eventEndTime = new Date(eventDateTime.getTime() + 4 * 60 * 60 * 1000);
            if (eventEndTime <= now) return null; // Evento finalizado, não renderizar
          }

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
                    {event.event_date ? new Date(event.event_date).toLocaleDateString('pt-BR') : '--/--/--'}
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
    console.log('📍 renderNativeMap: Rendering map');
    
    try {
      // Filtrar eventos por categoria selecionada
      const filteredEvents = selectedCategory 
        ? events.filter(e => e.category_id === selectedCategory)
        : events;

      console.log('📍 Events filtered:', filteredEvents.length, 'from', events.length);

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
            onPress={() => {
              try {
                setSelectedEvent(null);
              } catch (error) {
                console.error('Error handling map press:', error);
                showError(`Erro ao pressionar mapa: ${error instanceof Error ? error.message : String(error)}`);
              }
            }}
          >
            {filteredEvents.map((event) => {
              try {
                if (!event || !event.id) {
                  console.warn('Event or event ID missing');
                  return null;
                }
                
                // Validar coordenadas de forma segura
                const lat = parseFloat(String(event.latitude));
                const lng = parseFloat(String(event.longitude));
                
                if (isNaN(lat) || isNaN(lng)) {
                  console.warn('Invalid coordinates for event:', event.id, 'lat:', event.latitude, 'lng:', event.longitude);
                  return null;
                }

                // Verificar se o evento já terminou
                const now = new Date();
                if (event.event_date && event.event_time) {
                  try {
                    const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
                    if (!isNaN(eventDateTime.getTime())) {
                      const eventEndTime = new Date(eventDateTime.getTime() + 4 * 60 * 60 * 1000);
                      if (eventEndTime <= now) return null;
                    }
                  } catch (dateError) {
                    console.warn('Error parsing event date:', dateError);
                    showError(`Erro ao parsear data do evento: ${dateError instanceof Error ? dateError.message : String(dateError)}`);
                  }
                }

                const status = getEventStatus(event);
                const markerColor = getMarkerColor(status);

                const pulseScale = pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.4],
                });
                const pulseOpacity = pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 0.1],
                });

                return (
                  <Marker
                    key={`marker-${event.id}`}
                    coordinate={{
                      latitude: lat,
                      longitude: lng,
                    }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    title={event.title || 'Evento'}
                    description={event.location_name || 'Local não especificado'}
                    onPress={() => {
                      try {
                        console.log('🎯 Marker pressed:', event.id, event.title);
                        handleMarkerPress(event);
                      } catch (error) {
                        console.error('Marker press error:', error);
                        showError(`Erro ao pressionar marcador: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
                      }
                    }}
                  >
                    <View style={styles.markerWrapper}>
                      {/* Anel de pulsação */}
                      <Animated.View
                        style={[
                          styles.markerPulse,
                          {
                            backgroundColor: markerColor,
                            transform: [{ scale: pulseScale }],
                            opacity: pulseOpacity,
                          },
                        ]}
                      />
                      
                      {/* Círculo redondo */}
                      <View style={[styles.markerCircle, { backgroundColor: markerColor }]}>
                        <Text style={styles.markerIcon}>{event?.categories?.icon || '📍'}</Text>
                      </View>
                    </View>
                  </Marker>
                );
              } catch (markerError) {
                console.error('Error rendering marker for event:', event?.id, markerError);
                showError(`Erro ao renderizar marcador do evento ${event?.id}: ${markerError instanceof Error ? markerError.message : String(markerError)}`, markerError instanceof Error ? markerError.stack : undefined);
                return null;
              }
            })}
          </MapView>

        {/* Botão de Filtro Flutuante */}
        <TouchableOpacity
          style={styles.filterButtonFloating}
          onPress={() => {
            console.log('🔧 Filter button pressed');
            setShowFilterModal(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.filterButtonFloatingIcon}>⚙️</Text>
          <Text style={styles.filterButtonFloatingText}>Filtros</Text>
        </TouchableOpacity>

        {/* Modal de Filtro */}
        <Modal
          visible={showFilterModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFilterModal(false)}
        >
          <View style={styles.filterModalOverlay}>
            <View style={styles.filterModalContainer}>
              {/* Header */}
              <View style={styles.filterModalHeader}>
                <Text style={styles.filterModalTitle}>Filtrar Eventos</Text>
                <TouchableOpacity
                  style={styles.filterModalClose}
                  onPress={() => setShowFilterModal(false)}
                >
                  <X size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Conteúdo */}
              <ScrollView
                style={styles.filterModalContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Botão Todos */}
                <TouchableOpacity
                  style={[
                    styles.filterModalOption,
                    selectedCategory === null && styles.filterModalOptionActive
                  ]}
                  onPress={() => {
                    setSelectedCategory(null);
                    setShowFilterModal(false);
                  }}
                >
                  <View style={styles.filterModalOptionContent}>
                    <Text style={styles.filterModalOptionIcon}>🌍</Text>
                    <Text style={[
                      styles.filterModalOptionText,
                      selectedCategory === null && styles.filterModalOptionTextActive
                    ]}>
                      Todos os Eventos
                    </Text>
                  </View>
                  {selectedCategory === null && (
                    <Text style={styles.filterModalCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>

                {/* Categorias */}
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.filterModalOption,
                      selectedCategory === cat.id && styles.filterModalOptionActive
                    ]}
                    onPress={() => {
                      console.log('📌 Category selected:', cat.id, cat.name);
                      setSelectedCategory(cat.id);
                      setShowFilterModal(false);
                    }}
                  >
                    <View style={styles.filterModalOptionContent}>
                      <Text style={styles.filterModalOptionIcon}>{cat.icon}</Text>
                      <Text style={[
                        styles.filterModalOptionText,
                        selectedCategory === cat.id && styles.filterModalOptionTextActive
                      ]}>
                        {cat.name}
                      </Text>
                    </View>
                    {selectedCategory === cat.id && (
                      <Text style={styles.filterModalCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Footer */}
              <View style={styles.filterModalFooter}>
                <TouchableOpacity
                  style={styles.filterModalClearButton}
                  onPress={() => {
                    setSelectedCategory(null);
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={styles.filterModalClearButtonText}>Limpar Filtros</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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

        {selectedEvent && selectedEvent?.id && (
          <TouchableOpacity 
            style={styles.selectedEventCard}
            activeOpacity={0.95}
            onPress={() => {
              console.log('📱 Card pressed, selectedEvent:', selectedEvent?.id);
              const eventId = selectedEvent?.id;
              if (eventId) {
                console.log('✅ Pushing to event:', `/event/${eventId}`);
                router.push(`/event/${eventId}`);
              } else {
                console.warn('❌ Event ID is missing');
              }
            }}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                console.log('🔄 Closing event');
                setSelectedEvent(null);
              }}
              activeOpacity={0.6}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.cardTouchable}>
              {selectedEvent.image_url && (
                <Image
                  source={{ uri: selectedEvent.image_url }}
                  style={styles.selectedEventImage}
                  resizeMode="cover"
                  onError={(error) => {
                    console.warn('Error loading event image:', error);
                    showError(`Erro ao carregar imagem: ${JSON.stringify(error)}`);
                  }}
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
                  {selectedEvent.title || 'Evento sem título'}
                </Text>

                <View style={styles.selectedEventInfo}>
                  <View style={styles.selectedEventInfoItem}>
                    <Calendar size={16} color="#fff" />
                    <Text style={styles.selectedEventInfoText}>
                      {selectedEvent.event_date ? formatDate(selectedEvent.event_date) : '--/--/--'} às {selectedEvent.event_time ? selectedEvent.event_time.slice(0, 5) : '--:--'}
                    </Text>
                  </View>

                  <View style={styles.selectedEventInfoItem}>
                    <MapPin size={16} color="#fff" />
                    <Text style={styles.selectedEventInfoText} numberOfLines={1}>
                      {selectedEvent.location_name || 'Local não especificado'}
                    </Text>
                  </View>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => {
                      try {
                        console.log('🗺️ Opening navigation');
                        openNavigation(selectedEvent);
                      } catch (error) {
                        console.error('Navigation button error:', error);
                        showError(`Erro ao abrir navegação: ${error instanceof Error ? error.message : String(error)}`);
                        Alert.alert('Erro', 'Não foi possível abrir navegação');
                      }
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
            </View>
          </TouchableOpacity>
        )}
      </>
      );
    } catch (error) {
      console.error('❌ Error rendering native map:', error);
      showError(`Erro ao renderizar mapa: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      return renderListView();
    }
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

      {Platform.OS === 'web' ? renderListView() : renderNativeMap()}

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
  filterButtonFloating: {
    position: 'absolute',
    top: 130,
    right: 20,
    backgroundColor: '#00d9ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 50,
    zIndex: 1000,
  },
  filterButtonFloatingIcon: {
    fontSize: 18,
  },
  filterButtonFloatingText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#1a1a1a',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  filterModalGradient: {
    flex: 1,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#2d2d2d',
  },
  filterModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  filterModalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
  },
  filterModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterModalOptionActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderColor: '#00d9ff',
  },
  filterModalOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  filterModalOptionIcon: {
    fontSize: 28,
  },
  filterModalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ccc',
  },
  filterModalOptionTextActive: {
    color: '#00d9ff',
    fontWeight: '700',
  },
  filterModalCheckmark: {
    fontSize: 20,
    color: '#00d9ff',
    fontWeight: '700',
  },
  filterModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#2d2d2d',
  },
  filterModalClearButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalClearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  markerWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 15,
  },
  markerCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    position: 'absolute',
    top: 10,
    left: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  markerIcon: {
    fontSize: 20,
    lineHeight: 20,
  },
  markerPulse: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
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
