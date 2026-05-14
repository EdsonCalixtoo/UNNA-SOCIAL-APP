import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import { Calendar, Clock, MapPin, Users, DollarSign, Volume2, VolumeX, ChevronRight, Flag, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { Event } from '@/types/database';
import { s, vs, ms } from '@/utils/responsive';
import { useTheme } from '@/contexts/ThemeContext';
import MediaCarousel from './MediaCarousel';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EventCardProps {
  event: any;
  onPress?: () => void;
  isVisible?: boolean;
  onLike?: (eventId: string, isLiked: boolean) => void;
  onParticipantsPress?: (eventId: string) => void;
}

type EventStatus = 'happening' | 'starting-soon' | 'upcoming' | 'ended';

export default function EventCard({ event, onPress, isVisible = true, onLike, onParticipantsPress }: EventCardProps) {
  const router = useRouter();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const [countdown, setCountdown] = useState('');
  const [eventStatus, setEventStatus] = useState<EventStatus>('upcoming');
  const contentTranslateY = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    if (event.type === 'publication' || !event.event_date || !event.event_time) {
      setCountdown('Publicação');
      setEventStatus('upcoming');
      return;
    }
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
  }, [event.event_date, event.event_time, event.type]);


  const handlePress = () => { 
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

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
    opacity: contentOpacity.value,
  }));

  const handleFullScreenChange = (visible: boolean) => {
    if (visible) {
      contentTranslateY.value = withTiming(vs(100), { duration: 300 });
      contentOpacity.value = withTiming(0, { duration: 250 });
    } else {
      contentTranslateY.value = withSpring(0);
      contentOpacity.value = withTiming(1, { duration: 300 });
    }
  };


  const isPublication = event.type === 'publication' || !event.event_date || !event.event_time;

  return (
    <View 
      style={[styles.card, getStatusStyle(), { backgroundColor: backgroundSecondary, borderColor: isDark ? (getStatusStyle().borderColor || '#333') : 'rgba(0,0,0,0.05)' }]}
    >
      <View style={styles.imageContainer}>
        {event.image_urls && event.image_urls.length > 0 ? (
          <MediaCarousel 
            mediaUrls={event.image_urls} 
            mediaTypes={event.media_types} 
            height={vs(240)}
            borderRadius={0}
            isVisible={isVisible}
            onFullScreenChange={handleFullScreenChange}
          />
        ) : event.image_url ? (
          <MediaCarousel 
            mediaUrls={[event.image_url]} 
            mediaTypes={event.media_type ? [event.media_type] : undefined} 
            height={vs(240)}
            borderRadius={0}
            isVisible={isVisible}
            onFullScreenChange={handleFullScreenChange}
          />
        ) : (
          <LinearGradient colors={['#00d9ff', '#ff1493']} style={styles.imagePlaceholder}><Text style={styles.imagePlaceholderText}>UNИA</Text></LinearGradient>
        )}

        <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.9)']} style={styles.overlay} />

        <View style={[styles.countdownBadge, isPublication ? { backgroundColor: '#ff1493' } : (eventStatus === 'happening' ? { backgroundColor: '#34C759' } : { backgroundColor: 'rgba(0, 217, 255, 0.95)' })]}>
          {isPublication ? <Flag size={12} color="#fff" strokeWidth={3} /> : <Clock size={12} color="#fff" strokeWidth={3} />}
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>

        {event.categories?.icon && (
          <View style={styles.catBadge}><Text style={styles.catIcon}>{event.categories.icon}</Text><Text style={styles.catText}>{event.categories.name}</Text></View>
        )}

        {!isPublication && event.event_date && (
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>{new Date(event.event_date).getDate()}</Text>
            <Text style={styles.dateMonth}>
              {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][new Date(event.event_date).getMonth()]}
            </Text>
          </View>
        )}

        {!isPublication && (
          <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.titleBox}>
            <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Animated.View style={[styles.content, contentAnimatedStyle]}>
        <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
          {isPublication && (
            <Text style={[styles.publicationTitle, { color: textPrimary }]}>{event.title}</Text>
          )}

          <View style={styles.creatorRow}>
            <Image source={{ uri: event.profiles?.avatar_url || 'https://via.placeholder.com/150' }} style={[styles.avatar, { borderColor: accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.creatorName, { color: textPrimary }]} numberOfLines={1}>
                {event.profiles?.full_name || event.profiles?.username}
              </Text>
              <Text style={[styles.creatorHandle, { color: textSecondary }]}>
                @{event.profiles?.username}
              </Text>
            </View>
            {event.is_paid && <View style={styles.priceTag}><Text style={styles.priceText}>R$ {event.price.toFixed(0)}</Text></View>}
          </View>

          {!isPublication ? (
            <View style={[styles.infoGrid, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
               <View style={styles.eventStats}>
                 <TouchableOpacity 
                   style={styles.statBtn} 
                   onPress={() => onLike && onLike(event.id, event.is_liked)}
                 >
                   <Heart 
                     size={18} 
                     color={event.is_liked ? '#FF3B30' : textSecondary} 
                     fill={event.is_liked ? '#FF3B30' : 'none'} 
                   />
                   <Text style={[styles.statText, { color: textSecondary }]}>{event.likes_count || 0}</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   style={styles.statBtn}
                   onPress={() => onParticipantsPress && onParticipantsPress(event.id)}
                 >
                   <Users size={18} color={textSecondary} />
                   <Text style={[styles.statText, { color: textSecondary }]}>{event.participants_count || 0}</Text>
                 </TouchableOpacity>
               </View>
               
               <View style={{ flex: 1 }} />
               
               <TouchableOpacity 
                 style={styles.infoItem} 
                 onPress={() => {
                   router.push({
                     pathname: '/(tabs)/map',
                     params: { 
                       latitude: event.latitude, 
                       longitude: event.longitude,
                       eventId: event.id 
                     }
                   });
                 }}
               >
                 <MapPin size={18} color="#ff1493" />
                 <ChevronRight size={18} color={textSecondary} />
               </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.socialActions, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={styles.socialBtn}>
                <TouchableOpacity 
                  style={styles.statBtn} 
                  onPress={() => onLike && onLike(event.id, event.is_liked)}
                >
                  <Heart 
                    size={20} 
                    color={event.is_liked ? '#FF3B30' : textSecondary} 
                    fill={event.is_liked ? '#FF3B30' : 'none'} 
                  />
                  <Text style={[styles.statText, { color: textSecondary }]}>{event.likes_count || 0}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flex: 1 }} />
              <View style={styles.socialBtn}>
                <Flag size={18} color={textSecondary} />
                <Text style={[styles.socialBtnText, { color: textSecondary }]}>Publicação</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    borderRadius: ms(25), 
    marginHorizontal: s(16), 
    marginVertical: vs(12), 
    overflow: Platform.OS === 'ios' ? 'visible' : 'hidden', // Permite sombra no iOS
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  imageContainer: { 
    width: '100%', 
    height: vs(240), 
    position: 'relative',
    borderTopLeftRadius: ms(25),
    borderTopRightRadius: ms(25),
    overflow: 'hidden',
  },
  image: { 
    width: '100%', 
    height: '100%',
    borderTopLeftRadius: ms(25),
    borderTopRightRadius: ms(25),
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
    textShadowColor: 'rgba(0,0,0,0.5)', 
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
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
  },
  infoItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: s(6) 
  },
  infoValue: { 
    fontSize: ms(14), 
    fontWeight: '600' 
  },
  publicationTitle: {
    fontSize: ms(18),
    fontWeight: '800',
    marginBottom: vs(12),
    lineHeight: vs(24),
  },
  creatorHandle: {
    fontSize: ms(12),
    marginTop: vs(2),
  },
  socialActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: vs(15),
    borderTopWidth: 1,
    marginTop: vs(5),
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  socialBtnText: {
    fontSize: ms(13),
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  eventStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(15),
  },
  statBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
  },
  statText: {
    fontSize: ms(14),
    fontWeight: '700',
  },
});
