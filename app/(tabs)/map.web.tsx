import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Dimensions, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Event } from '@/types/database';
import { MapPin, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

type EventStatus = 'happening' | 'starting-soon' | 'upcoming';

export default function Map() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 60000);
    return () => clearInterval(interval);
  }, []);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(45, 45, 45, 0.95)', 'transparent']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Mapa de Eventos</Text>
        <Text style={styles.headerSubtitle}>{events.length} eventos disponíveis</Text>
      </LinearGradient>

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
    </View>
  );
}

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
