import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Calendar, Clock, MapPin, Users, DollarSign, Volume2, VolumeX, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { Event } from '@/types/database';
import { s, vs, ms } from '@/utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EventCardProps {
  event: Event;
  onPress?: () => void;
}

type EventStatus = 'happening' | 'starting-soon' | 'upcoming' | 'ended';

export default function EventCard({ event, onPress }: EventCardProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState('');
  const [eventStatus, setEventStatus] = useState<EventStatus>('upcoming');
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
      const eventEndTime = new Date(eventDateTime.getTime() + 4 * 60 * 60 * 1000);
      const diff = eventDateTime.getTime() - now.getTime();
      const diffFromEnd = eventEndTime.getTime() - now.getTime();
      if (diffFromEnd < 0) { setEventStatus('ended'); setCountdown('Finalizado'); return; }
      if (diff < 0 && diffFromEnd > 0) { setEventStatus('happening'); setCountdown('AO VIVO'); return; }
      if (diff < 60 * 60 * 1000) { setEventStatus('starting-soon'); setCountdown(`Começa em ${Math.floor(diff / (1000 * 60))}min`); return; }
      setEventStatus('upcoming');
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setCountdown(days > 0 ? `${days}d ${hours}h` : `${hours}h`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [event.event_date, event.event_time]);

  const handlePress = () => { 
    if (event.media_type === 'video' || (event.image_url && event.image_url.toLowerCase().includes('.mp4'))) {
      setIsMuted(!isMuted);
      return;
    }
    if (onPress) onPress(); 
    else router.push(`/event/${event.id}`); 
  };

  const getStatusStyle = () => {
    switch (eventStatus) {
      case 'happening': return { borderColor: '#34C759', borderWidth: 2.5 };
      case 'starting-soon': return { borderColor: '#FF9500', borderWidth: 2.5 };
      case 'ended': return { borderColor: '#FF3B30', borderWidth: 2.5, opacity: 0.7 };
      default: return { borderColor: '#333', borderWidth: 1 };
    }
  };

  const isVideo = (event.media_type === 'video' || (event.image_url && event.image_url.toLowerCase().includes('.mp4'))) && !videoError;

  return (
    <TouchableOpacity 
      style={[styles.card, getStatusStyle()]} 
      onPress={handlePress} 
      activeOpacity={0.95}
    >
      <View style={[styles.countdownBadge, eventStatus === 'happening' ? { backgroundColor: '#34C759' } : { backgroundColor: 'rgba(0, 217, 255, 0.95)' }]}>
        <Clock size={12} color="#fff" strokeWidth={3} />
        <Text style={styles.countdownText}>{countdown}</Text>
      </View>
      
      <View style={styles.imageContainer}>
        {event.image_url ? (
          isVideo ? (
            <Video 
              source={{ uri: event.image_url }} 
              style={styles.image} 
              resizeMode={ResizeMode.COVER} 
              isLooping 
              shouldPlay={true} 
              isMuted={isMuted}
              useNativeControls={false}
              usePoster={true}
              posterSource={{ uri: event.image_url }} // Supabase serves a frame if it's a video in some cases, or we use the same URL
              posterStyle={styles.image}
              onError={(error) => {
                // Silenciamos o erro fatal e usamos o fallback para imagem
                console.log('ℹ️ [EventCard] Vídeo indisponível (usando fallback de imagem):', error);
                setVideoError(true);
              }}
              onPlaybackStatusUpdate={(status: any) => {
                if (status.error) {
                  console.log('ℹ️ [EventCard] AVPlayer fallback ativado.');
                  setVideoError(true);
                }
              }}
            />
          ) : (
            <Image source={{ uri: event.image_url }} style={styles.image} resizeMode="cover" />
          )
        ) : (
          <LinearGradient colors={['#00d9ff', '#ff1493']} style={styles.imagePlaceholder}><Text style={styles.imagePlaceholderText}>UNИA</Text></LinearGradient>
        )}

        {isVideo && (
          <View style={styles.muteBtn}>
             {isMuted ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
          </View>
        )}

        <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.9)']} style={styles.overlay} />

        {event.categories?.icon && (
          <View style={styles.catBadge}><Text style={styles.catIcon}>{event.categories.icon}</Text><Text style={styles.catText}>{event.categories.name}</Text></View>
        )}

        <View style={styles.dateBadge}>
          <Text style={styles.dateDay}>{new Date(event.event_date).getDate()}</Text>
          <Text style={styles.dateMonth}>{new Date(event.event_date).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}</Text>
        </View>

        <View style={styles.titleBox}><Text style={styles.title} numberOfLines={2}>{event.title}</Text></View>
      </View>

      <View style={styles.content}>
        <View style={styles.creatorRow}>
          <Image source={{ uri: event.profiles?.avatar_url || 'https://via.placeholder.com/150' }} style={styles.avatar} />
          <Text style={styles.creatorName} numberOfLines={1}>por {event.profiles?.full_name || event.profiles?.username}</Text>
          {event.is_paid && <View style={styles.priceTag}><Text style={styles.priceText}>R$ {event.price.toFixed(0)}</Text></View>}
        </View>
        <TouchableOpacity 
          style={styles.infoGrid}
          onPress={() => router.push(`/event/${event.id}`)}
        >
           <View style={styles.infoItem}><Clock size={16} color="#00d9ff" /><Text style={styles.infoValue}>{event.event_time.slice(0,5)}</Text></View>
           <View style={[styles.infoItem, { flex: 1 }]}><MapPin size={16} color="#ff1493" /><Text style={styles.infoValue} numberOfLines={1}>{event.location_name}</Text></View>
           <ChevronRight size={18} color="#444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: '#111', 
    borderRadius: ms(25), 
    marginHorizontal: s(16), 
    marginVertical: vs(12), 
    overflow: 'hidden', 
    elevation: 10 
  },
  imageContainer: { 
    width: '100%', 
    height: vs(240), 
    position: 'relative' 
  },
  image: { 
    width: '100%', 
    height: '100%' 
  },
  imagePlaceholder: { 
    width: '100%', 
    height: '100%', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  imagePlaceholderText: { 
    fontSize: ms(40), 
    fontWeight: '900', 
    color: '#fff' 
  },
  overlay: { 
    ...StyleSheet.absoluteFillObject 
  },
  countdownBadge: { 
    position: 'absolute', 
    top: vs(12), 
    right: s(12), 
    paddingHorizontal: s(12), 
    paddingVertical: vs(6), 
    borderRadius: ms(20), 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: s(6), 
    zIndex: 10 
  },
  countdownText: { 
    color: '#fff', 
    fontSize: ms(11), 
    fontWeight: '900' 
  },
  catBadge: { 
    position: 'absolute', 
    top: vs(12), 
    left: s(12), 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: s(10), 
    paddingVertical: vs(6), 
    borderRadius: ms(15), 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: s(5), 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  catIcon: { 
    fontSize: ms(14) 
  },
  catText: { 
    color: '#fff', 
    fontSize: ms(11), 
    fontWeight: '700' 
  },
  muteBtn: { 
    position: 'absolute', 
    bottom: vs(12), 
    left: s(12), 
    width: s(32), 
    height: s(32), 
    borderRadius: ms(16), 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 20 
  },
  dateBadge: { 
    position: 'absolute', 
    bottom: vs(12), 
    right: s(12), 
    backgroundColor: 'rgba(0,0,0,0.8)', 
    padding: ms(10), 
    borderRadius: ms(12), 
    alignItems: 'center', 
    minWidth: s(55), 
    borderWidth: 1.5, 
    borderColor: '#00d9ff' 
  },
  dateDay: { 
    fontSize: ms(22), 
    fontWeight: '900', 
    color: '#00d9ff', 
    lineHeight: vs(24) 
  },
  dateMonth: { 
    fontSize: ms(9), 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  titleBox: { 
    position: 'absolute', 
    bottom: vs(15), 
    left: s(55), 
    right: s(75) 
  },
  title: { 
    fontSize: ms(24), 
    fontWeight: '900', 
    color: '#fff', 
    textShadowColor: '#000', 
    textShadowRadius: 8 
  },
  content: { 
    padding: ms(18) 
  },
  creatorRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: vs(15), 
    gap: s(10) 
  },
  avatar: { 
    width: s(26), 
    height: s(26), 
    borderRadius: ms(13), 
    borderWidth: 1.5, 
    borderColor: '#00d9ff' 
  },
  creatorName: { 
    fontSize: ms(13), 
    color: '#aaa', 
    fontWeight: '700', 
    flex: 1 
  },
  priceTag: { 
    backgroundColor: 'rgba(52, 199, 89, 0.1)', 
    paddingHorizontal: s(10), 
    paddingVertical: vs(4), 
    borderRadius: ms(10) 
  },
  priceText: { 
    color: '#34C759', 
    fontWeight: '900', 
    fontSize: ms(14) 
  },
  infoGrid: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: s(15), 
    paddingTop: vs(12), 
    borderTopWidth: 1, 
    borderTopColor: '#222' 
  },
  infoItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: s(6) 
  },
  infoValue: { 
    color: '#fff', 
    fontSize: ms(14), 
    fontWeight: '600' 
  },
});
