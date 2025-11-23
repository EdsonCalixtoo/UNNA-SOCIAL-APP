import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Calendar, Clock, MapPin, Users, DollarSign } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { Event } from '@/types/database';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
}

type EventStatus = 'happening' | 'starting-soon' | 'upcoming' | 'ended';

export default function EventCard({ event, onPress }: EventCardProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState('');
  const [eventStatus, setEventStatus] = useState<EventStatus>('upcoming');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
      const eventEndTime = new Date(eventDateTime.getTime() + 4 * 60 * 60 * 1000);
      const diff = eventDateTime.getTime() - now.getTime();
      const diffFromEnd = eventEndTime.getTime() - now.getTime();

      if (diffFromEnd < 0) {
        setEventStatus('ended');
        setCountdown('Finalizado');
        return;
      }

      if (diff < 0 && diffFromEnd > 0) {
        setEventStatus('happening');
        setCountdown('AO VIVO');
        return;
      }

      if (diff < 60 * 60 * 1000) {
        setEventStatus('starting-soon');
        const minutes = Math.floor(diff / (1000 * 60));
        setCountdown(`Começa em ${minutes}min`);
        return;
      }

      setEventStatus('upcoming');
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        setCountdown(`${days}d ${hours}h`);
      } else {
        setCountdown(`${hours}h`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [event.event_date, event.event_time]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    }).replace('.', '');
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/event/${event.id}`);
    }
  };

  const getStatusStyle = () => {
    switch (eventStatus) {
      case 'happening':
        return { borderColor: '#34C759', borderWidth: 3 };
      case 'starting-soon':
        return { borderColor: '#FF9500', borderWidth: 3 };
      case 'ended':
        return { borderColor: '#FF3B30', borderWidth: 3, opacity: 0.6 };
      default:
        return { borderColor: '#3d3d3d', borderWidth: 1 };
    }
  };

  const getCountdownStyle = () => {
    switch (eventStatus) {
      case 'happening':
        return styles.countdownHappening;
      case 'starting-soon':
        return styles.countdownSoon;
      case 'ended':
        return styles.countdownEnded;
      default:
        return styles.countdownUpcoming;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, getStatusStyle()]}
      onPress={handlePress}
      activeOpacity={0.95}
    >
      <View style={[styles.countdownBadge, getCountdownStyle()]}>
        <Clock size={14} color="#fff" strokeWidth={3} />
        <Text style={styles.countdownText}>{countdown}</Text>
      </View>
      <View style={styles.imageContainer}>
        {event.image_url ? (
          <Image
            source={{ uri: event.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={['#00d9ff', '#ff1493']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.imagePlaceholder}
          >
            <Text style={styles.imagePlaceholderText}>UNИA</Text>
          </LinearGradient>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.9)']}
          style={styles.imageGradient}
        />

        {event.categories && event.categories.icon && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryIcon}>{event.categories.icon}</Text>
            <Text style={styles.categoryBadgeText}>{event.categories.name}</Text>
          </View>
        )}

        {event.is_paid && (
          <View style={styles.priceBadge}>
            <DollarSign size={16} color="#fff" strokeWidth={3} />
            <Text style={styles.priceBadgeText}>{event.price.toFixed(0)}</Text>
          </View>
        )}

        <View style={styles.dateOverlay}>
          <Text style={styles.dateDay}>
            {new Date(event.event_date).getDate()}
          </Text>
          <Text style={styles.dateMonth}>
            {new Date(event.event_date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}
          </Text>
        </View>

        <View style={styles.titleOverlay}>
          <Text style={styles.titleOverlayText} numberOfLines={2}>
            {event.title}
          </Text>
        </View>
      </View>

      <View style={styles.content}>

        {event.profiles && (
          <View style={styles.creator}>
            {event.profiles.avatar_url ? (
              <Image
                source={{ uri: event.profiles.avatar_url }}
                style={styles.creatorAvatar}
              />
            ) : (
              <View style={styles.creatorAvatarPlaceholder}>
                <Text style={styles.creatorAvatarText}>
                  {(event.profiles.username || event.profiles.full_name)?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.creatorName} numberOfLines={1}>
              por {event.profiles.full_name || event.profiles.username}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Clock size={18} color="#00d9ff" strokeWidth={2.5} />
            </View>
            <Text style={styles.infoText}>{formatTime(event.event_time)}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <MapPin size={18} color="#ff1493" strokeWidth={2.5} />
            </View>
            <Text style={styles.infoText} numberOfLines={1}>
              {event.location_name}
            </Text>
          </View>

          {event.max_participants > 0 && (
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Users size={18} color="#34C759" strokeWidth={2.5} />
              </View>
              <Text style={styles.infoText}>
                Até {event.max_participants} pessoas
              </Text>
            </View>
          )}
        </View>

        {event.subcategories && (
          <View style={styles.tagContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{event.subcategories.name}</Text>
            </View>
          </View>
        )}

        {event.is_paid && (
          <View style={styles.priceContainer}>
            <DollarSign size={18} color="#34C759" strokeWidth={2.5} />
            <Text style={styles.priceText}>R$ {event.price.toFixed(2)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2d2d2d',
    borderRadius: 24,
    marginHorizontal: 16,
    marginVertical: 12,
    marginBottom: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    // Permite que o conteúdo respire
    minHeight: 'auto',
  },
  countdownBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  countdownText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  countdownHappening: {
    backgroundColor: '#34C759',
  },
  countdownSoon: {
    backgroundColor: '#FF9500',
  },
  countdownEnded: {
    backgroundColor: '#FF3B30',
  },
  countdownUpcoming: {
    backgroundColor: 'rgba(0, 217, 255, 0.95)',
  },
  imageContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceBadge: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: 'rgba(52, 199, 89, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  priceBadgeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dateOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 70,
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  dateDay: {
    fontSize: 28,
    fontWeight: '900',
    color: '#00d9ff',
    lineHeight: 32,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 24,
  },
  titleOverlayText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 34,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
    minHeight: 'auto',
  },
  creator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creatorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  creatorAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  creatorAvatarText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  creatorName: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#3d3d3d',
    marginBottom: 16,
  },
  info: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  infoText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  tagText: {
    fontSize: 13,
    color: '#00d9ff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  priceContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#3d3d3d',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceText: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
