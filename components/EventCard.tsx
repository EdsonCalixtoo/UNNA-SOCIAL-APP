import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Platform } from 'react-native';
import { MoreVertical, Heart, MessageCircle, MapPin, Sparkles, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/utils/responsive';
import MediaCarousel from './MediaCarousel';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { hapticFeedback } from '@/utils/haptics';
import { soundService } from '@/utils/soundService';
import { mapService } from '@/services/mapService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EventCardProps {
  event: any;
  onPress?: () => void;
  isVisible?: boolean;
  onLike?: (eventId: string, isLiked: boolean) => void;
  onParticipantsPress?: (eventId: string) => void;
  onCommentPress?: (eventId: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function EventCard({ event, onPress, isVisible = true, onLike, onParticipantsPress, onCommentPress }: EventCardProps) {
  const router = useRouter();
  const { backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  
  const likeScale = useSharedValue(1);
  const [distanceKm, setDistanceKm] = useState<string | null>(null);

  useEffect(() => {
    // Calculate distance
    const getDistance = async () => {
      if (event.latitude && event.longitude) {
        const userLoc = await mapService.getUserLocation();
        if (userLoc) {
          const dist = mapService.getDistanceInKm(userLoc.latitude, userLoc.longitude, Number(event.latitude), Number(event.longitude));
          if (dist < 1) {
             setDistanceKm((dist * 1000).toFixed(0) + ' m');
          } else {
             setDistanceKm(dist.toFixed(1) + ' km');
          }
        }
      }
    };
    getDistance();
  }, [event.latitude, event.longitude]);

  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/event/${event.id}`);
  };

  const likeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const handleLikePress = () => {
    hapticFeedback.light();
    soundService.play('pop');
    onLike && onLike(event.id, event.is_liked);
    likeScale.value = withSpring(1.5, { damping: 2, stiffness: 200 }, () => {
      likeScale.value = withSpring(1, { damping: 10, stiffness: 100 });
    });
  };

  const isPublication = event.type === 'publication' || !event.event_date || !event.event_time;
  

  // Base details
  const avatarUrl = event.profiles?.avatar_url;
  const username = event.profiles?.username || 'user';
  const fullName = event.profiles?.full_name || username;
  const timeAgo = formatRelativeTime(event.created_at || new Date().toISOString());
  
  const imageToUse = event.image_urls && event.image_urls.length > 0 
                     ? event.image_urls 
                     : (event.image_url ? [event.image_url] : []);
  
  const mediaTypesToUse = event.media_types || (event.media_type ? [event.media_type] : undefined);

  // Parse Date for Badge
  let eventMonth = '';
  let eventDay = '';
  if (event.event_date) {
    const d = new Date(event.event_date + 'T12:00:00'); // Force midday to avoid timezone shift
    eventDay = d.getDate().toString().padStart(2, '0');
    const months = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
    eventMonth = months[d.getMonth()];
  }

  // Check if LIVE (started up to 4 hours ago) or SOON (starts within 2 hours) or UPCOMING or FINISHED
  let eventStatus = 'none'; // 'live', 'soon', 'finished', 'upcoming', 'none'
  let timeUntilStart = '';
  
  if (event.event_date && event.event_time) {
    const [y, m, d] = event.event_date.split('-');
    const [h, min] = event.event_time.split(':');
    const eventDateTime = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
    const now = new Date();
    const diffMs = eventDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;
    
    if (diffHours <= 0 && diffHours >= -4) {
      eventStatus = 'live';
    } else if (diffHours > 0 && diffHours <= 2) {
      eventStatus = 'soon';
      timeUntilStart = diffHours < 1 ? `${Math.ceil(diffHours * 60)} min` : `${Math.floor(diffHours)}h`;
    } else if (diffHours > 2) {
      eventStatus = 'upcoming';
      timeUntilStart = diffDays >= 1 ? `${Math.floor(diffDays)}d` : `${Math.floor(diffHours)}h`;
    } else if (diffHours < -4) {
      eventStatus = 'finished';
    }
  }

  const getBorderColor = () => {
    if (eventStatus === 'live') return '#00E676'; // Green
    if (eventStatus === 'soon') return '#FFD700'; // Yellow
    if (eventStatus === 'upcoming') return '#9D4EDD'; // Purple
    if (eventStatus === 'finished') return '#FF3B30'; // Red for finished
    return isDark ? '#333' : '#E5E5E5';
  };


  return (
    <Animated.View style={[
      styles.cardContainer, 
      { 
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', 
        borderWidth: eventStatus !== 'none' ? 2 : 1, 
        borderColor: getBorderColor() 
      }
    ]}>
      
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.8} onPress={() => {
          const profileId = event.profiles?.id || event.creator_id || event.user_id;
          if (profileId) router.push(`/profile/${profileId}`);
        }}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' }]}>
               <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{fullName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {/* Pink Status Dot */}
          <View style={styles.statusDot} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerTextWrap} activeOpacity={0.8} onPress={() => {
          const profileId = event.profiles?.id || event.creator_id || event.user_id;
          if (profileId) router.push(`/profile/${profileId}`);
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.fullName, { color: textPrimary }]} numberOfLines={1}>{fullName.toUpperCase()}</Text>
            {event.profiles?.is_verified && <Sparkles size={12} color="#FF1493" fill="#FF1493" />}
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>@{username} • {timeAgo}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreBtn}>
          <MoreVertical size={20} color={textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
          {/* Title & Content */}
          {event.title && (
             <Text style={[styles.contentTitle, { color: textPrimary }]} numberOfLines={1}>{event.title}</Text>
          )}
          {(event.content || event.description) ? (
            <Text style={[styles.contentText, { color: textSecondary }]} numberOfLines={2}>
              {event.content || event.description}
            </Text>
          ) : null}
        </TouchableOpacity>


        {/* Media */}
        {imageToUse.length > 0 && (
          <View style={styles.mediaContainer}>
            <MediaCarousel
              mediaUrls={imageToUse}
              mediaTypes={mediaTypesToUse}
              height={vs(350)}
              width={SCREEN_WIDTH - 64}
              borderRadius={24}
              isVisible={isVisible}
              eventId={event.id}
              onPress={handlePress}
            />
            
            {/* Date Badge */}
            {!isPublication && eventMonth && (
              <View style={[styles.dateBadge, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)' }]}>
                <Text style={[styles.dateBadgeDay, { color: isDark ? '#00D9FF' : '#00b8d4' }]}>{eventDay}</Text>
                <Text style={[styles.dateBadgeMonth, { color: isDark ? '#FFF' : '#333' }]}>{eventMonth}</Text>
              </View>
            )}

            {/* Live/Soon/Upcoming/Finished Badge */}
            {eventStatus !== 'none' && (
              <View style={[styles.liveBadge, { 
                backgroundColor: eventStatus === 'live' ? 'rgba(0,230,118,0.9)' : eventStatus === 'soon' ? 'rgba(255,215,0,0.9)' : eventStatus === 'upcoming' ? 'rgba(157,78,221,0.9)' : 'rgba(255,59,48,0.9)', 
                borderColor: eventStatus === 'live' ? '#00E676' : eventStatus === 'soon' ? '#FFD700' : eventStatus === 'upcoming' ? '#9D4EDD' : '#FF3B30' 
              }]}>
                {(eventStatus === 'live' || eventStatus === 'soon' || eventStatus === 'upcoming') && <View style={[styles.liveDot, { backgroundColor: eventStatus === 'soon' ? '#333' : '#FFF' }]} />}
                <Text style={[styles.liveText, { color: eventStatus === 'soon' ? '#333' : '#FFF' }]}>
                  {eventStatus === 'live' ? 'AO VIVO' : 
                   eventStatus === 'soon' ? `COMEÇA EM ${timeUntilStart.toUpperCase()}` : 
                   eventStatus === 'upcoming' ? `FALTAM ${timeUntilStart.toUpperCase()}` : 
                   'FINALIZADO'}
                </Text>
              </View>
            )}
          </View>
        )}

      </View>

      {/* ── Footer Pills ── */}
      <View style={styles.footer}>
        
        {/* Like Pill */}
        <TouchableOpacity style={[styles.pill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]} onPress={handleLikePress} activeOpacity={0.7}>
          <Animated.View style={likeAnimStyle}>
            <Heart size={18} color={event.is_liked ? "#FF1493" : "#FF69B4"} fill={event.is_liked ? "#FF1493" : "none"} />
          </Animated.View>
          <Text style={[styles.pillText, { color: textPrimary }]}>{event.likes_count || 0}</Text>
        </TouchableOpacity>

        {/* Comments Pill */}
        <TouchableOpacity style={[styles.pill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]} onPress={() => onCommentPress && onCommentPress(event.id)} activeOpacity={0.7}>
          <MessageCircle size={18} color="#A020F0" fill="none" />
          <Text style={[styles.pillText, { color: textPrimary }]}>{event.comments_count || 0}</Text>
        </TouchableOpacity>

        {/* Participants Pill */}
        <TouchableOpacity style={[styles.pill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]} onPress={() => onParticipantsPress && onParticipantsPress(event.id)} activeOpacity={0.7}>
          <Users size={18} color="#00E6B8" fill="none" />
          <Text style={[styles.pillText, { color: textPrimary }]}>{event.participants_count || 0}</Text>
        </TouchableOpacity>

        {/* Distance / Location Pill */}
        <TouchableOpacity style={[styles.pill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]} activeOpacity={0.7}>
          <MapPin size={18} color="#FFD700" fill="none" />
          <Text style={[styles.pillText, { color: textPrimary }]}>
             {distanceKm ? distanceKm : (event.location_name ? event.location_name.split(',')[0] : 'Local')}
          </Text>
        </TouchableOpacity>

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: s(16),
    marginVertical: vs(12),
    borderRadius: 36,
    padding: s(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  avatarWrap: {
    position: 'relative',
    marginRight: s(12),
  },
  avatar: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    borderWidth: 2,
    borderColor: '#333',
  },
  statusDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: ms(12),
    height: ms(12),
    borderRadius: ms(6),
    backgroundColor: '#FF1493',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  headerTextWrap: {
    flex: 1,
  },
  fullName: {
    fontFamily: 'Inter-Bold',
    fontSize: ms(15),
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: ms(12),
    color: '#888888',
    marginTop: 2,
  },
  moreBtn: {
    padding: 8,
  },
  body: {
    marginBottom: vs(16),
  },
  contentTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: ms(16),
    color: '#FFFFFF',
    marginBottom: vs(4),
  },
  contentText: {
    fontFamily: 'Inter-Regular',
    fontSize: ms(14),
    color: '#CCCCCC',
    marginBottom: vs(12),
    lineHeight: ms(20),
  },
  mediaContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  dateBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: s(50),
    height: s(50),
    borderRadius: ms(12),
    borderWidth: 1.5,
    borderColor: '#00D9FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  dateBadgeDay: {
    fontSize: ms(20),
    fontWeight: '900',
    lineHeight: ms(22),
  },
  dateBadgeMonth: {
    fontSize: ms(11),
    fontWeight: '800',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,20,147,0.8)',
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
    borderRadius: ms(8),
    borderWidth: 1,
    borderColor: '#FF1493',
  },
  liveDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: '#FFF',
    marginRight: s(4),
  },
  liveText: {
    color: '#FFF',
    fontSize: ms(10),
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: s(8),
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingVertical: vs(10),
    gap: s(6),
  },
  pillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: ms(13),
    color: '#FFFFFF',
  },
});
