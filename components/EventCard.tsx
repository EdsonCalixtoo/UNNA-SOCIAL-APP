import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Alert, Share, Modal, ActivityIndicator, FlatList } from 'react-native';
import { Image } from 'expo-image';
import { MoreVertical, MessageCircle, MapPin, Sparkles, Users, Tag, Share2, Flag, Trash2, X } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { HeartBurst } from '@/components/HeartBurst';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import { s, vs, ms } from '@/utils/responsive';
import MediaCarousel from './MediaCarousel';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, withSequence, interpolate, withDelay } from 'react-native-reanimated';
import { hapticFeedback } from '@/utils/haptics';
import { soundService } from '@/utils/soundService';
import { mapService } from '@/services/mapService';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Pressable } from 'react-native';

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

export default React.memo(function EventCard({ event, onPress, isVisible = true, onLike, onParticipantsPress, onCommentPress }: EventCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isDark, accent, textPrimary, textSecondary } = useTheme();
  
  const likeScale = useSharedValue(1);
  const bigHeartScale = useSharedValue(0);
  const bigHeartOpacity = useSharedValue(0);
  const [distanceKm, setDistanceKm] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [recentLikers, setRecentLikers] = useState<string[]>([]);
  const [showLikersModal, setShowLikersModal] = useState(false);
  const [fullLikers, setFullLikers] = useState<any[]>([]);
  const [loadingLikers, setLoadingLikers] = useState(false);
  const isOwner = user?.id === (event?.creator_id || event?.user_id);
  const isPublication = event?.type === 'publication' || !event?.event_date || !event?.event_time;

  useEffect(() => {
    if ((event.likes_count && event.likes_count > 0) || event.is_liked) {
      const fetchLikers = async () => {
        const table = isPublication ? 'post_likes' : 'event_likes';
        const col = isPublication ? 'post_id' : 'event_id';
        const { data } = await supabase
          .from(table)
          .select(`profiles (avatar_url)`)
          .eq(col, event.id)
          .limit(3);
        if (data) {
          setRecentLikers(data.map((d: any) => d.profiles?.avatar_url).filter(Boolean));
        }
      };
      fetchLikers();
    }
  }, [event.id, event.likes_count, event.is_liked, isPublication]);

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

  const bigHeartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bigHeartScale.value }],
    opacity: bigHeartOpacity.value
  }));

  const [showBurst, setShowBurst] = useState(false);

  const handleLikePress = () => {
    // Animação de pulsar
    likeScale.value = withSequence(
      withSpring(1.4, { damping: 10, stiffness: 200 }),
      withSpring(1)
    );
    // Vibe
    hapticFeedback.light();
    soundService.play('pop');
    
    if (onLike) {
      onLike(event.id, event.is_liked);
    }
  };

  const handleDoubleTapLike = () => {
    // 1. Play big heart animation
    bigHeartScale.value = 0;
    bigHeartOpacity.value = 1;
    bigHeartScale.value = withSequence(
      withSpring(1.2, { damping: 10, stiffness: 150 }),
      withDelay(400, withTiming(0, { duration: 300 }))
    );
    bigHeartOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(400, withTiming(0, { duration: 300 }))
    );
    
    // Confetti Particles
    setShowBurst(true);

    // 2. Haptic
    hapticFeedback.heavy();

    // 3. Ensure it is liked
    if (!event.is_liked && onLike) {
      onLike(event.id, false);
    }
  };

  const handleMorePress = () => {
    setShowMoreMenu(true);
    hapticFeedback.light();
  };

  const handleShare = async () => {
    setShowMoreMenu(false);
    try {
      await Share.share({
        message: `Confira este post no UNNA: https://unna.com/event/${event.id}`
      });
    } catch(e) {}
  };

  const handleReport = async () => {
    setShowMoreMenu(false);
    
    if (!user?.id) {
       Alert.alert('Erro', 'Você precisa estar logado para denunciar.');
       return;
    }
    
    try {
        // 1. Inserir na tabela reports
        await supabase.from('reports').insert({
          reporter_id: user.id,
          reason: 'Denunciado pelo botão do Feed',
          status: 'pending',
          target_type: isPublication ? 'post' : 'event',
          target_id: event.id,
        });

        // 2. Enviar DM para o unnasocialappoficial
        const OFFICIAL_ID = 'c8d0f737-f17b-4d2d-97f8-ff3e75a9c116';
        
        const { data: myConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('profile_id', user.id);
          
        let targetConvId = null;
        
        if (myConvs && myConvs.length > 0) {
          const convIds = myConvs.map(c => c.conversation_id);
          const { data: officialConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('profile_id', OFFICIAL_ID)
            .in('conversation_id', convIds);
            
          if (officialConvs && officialConvs.length > 0) {
            targetConvId = officialConvs[0].conversation_id;
          }
        }

        if (!targetConvId) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({ type: 'direct' })
            .select()
            .single();
            
          if (newConv) {
            targetConvId = newConv.id;
            await supabase.from('conversation_participants').insert([
              { conversation_id: targetConvId, profile_id: user.id },
              { conversation_id: targetConvId, profile_id: OFFICIAL_ID }
            ]);
          }
        }

        if (targetConvId) {
          await supabase.from('messages').insert({
            conversation_id: targetConvId,
            sender_id: user.id,
            content: `🚨 NOVA DENÚNCIA 🚨\n\nTipo: ${isPublication ? 'Post' : 'Evento'}\nID: ${event.id}\nAutor do Post: @${username}\n\nPor favor, verifiquem este conteúdo.`,
            read: false,
            delivered: false
          });
        }
        
        Alert.alert('Sucesso', 'Sua denúncia foi enviada diretamente para a equipe UNNA por mensagem e será analisada.');
    } catch(error) {
        console.log('[handleReport] Erro:', error);
        Alert.alert('Erro', 'Não foi possível processar a denúncia no momento.');
    }
  };

  const handleDelete = () => {
    setShowMoreMenu(false);
    setTimeout(() => {
      Alert.alert('Excluir Publicação?', 'Tem certeza que deseja apagar? Essa ação é irreversível.', [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive', 
          onPress: async () => {
            const table = isPublication ? 'posts' : 'events';
            await supabase.from(table).delete().eq('id', event.id);
            Alert.alert('Sucesso', 'Conteúdo excluído. Atualize o feed.');
          }
        }
      ]);
    }, 500);
  };

  const openLikersModal = async () => {
    setShowLikersModal(true);
    setLoadingLikers(true);
    const table = isPublication ? 'post_likes' : 'event_likes';
    const col = isPublication ? 'post_id' : 'event_id';
    const { data } = await supabase
      .from(table)
      .select(`profiles (id, username, full_name, avatar_url)`)
      .eq(col, event.id)
      .order('created_at', { ascending: false });
      
    // Fetch who the current user is following to show correct button state
    let followingSet = new Set();
    if (user?.id) {
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);
      followingSet = new Set((followingData || []).map(f => f.following_id));
    }
    
    if (data) {
      setFullLikers(data.map((d: any) => ({
        ...d.profiles,
        is_following: followingSet.has(d.profiles.id)
      })).filter(Boolean));
    }
    setLoadingLikers(false);
  };
  
  const handleToggleFollow = async (targetUserId: string, isFollowing: boolean) => {
    if (!user) return;
    
    // Optimistic update
    setFullLikers(prev => prev.map(p => p.id === targetUserId ? { ...p, is_following: !isFollowing } : p));
    hapticFeedback.selection();
    
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId);
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
      }
    } catch (e) {
      // Revert if failed
      setFullLikers(prev => prev.map(p => p.id === targetUserId ? { ...p, is_following: isFollowing } : p));
    }
  };
  

  // Base details
  const avatarUrl = event?.profiles?.avatar_url;
  const username = event?.profiles?.username || 'user';
  const fullName = event?.profiles?.full_name || username;
  const timeAgo = formatRelativeTime(event?.created_at || new Date().toISOString());
  
  const imageToUse = event?.image_urls && event.image_urls.length > 0 
                     ? event.image_urls 
                     : (event?.image_url ? [event.image_url] : []);
  
  const mediaTypesToUse = event?.media_types || (event?.media_type ? [event.media_type] : undefined);

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

  const glowOpacity = useSharedValue(0.2);
  useEffect(() => {
    if (eventStatus === 'live') {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.2, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [eventStatus]);

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: glowOpacity.value,
      shadowRadius: 15 + (glowOpacity.value * 5),
    };
  });

  const isOfficial = event?.profiles?.username === 'unnasocialappoficial';
  const officialPulse = useSharedValue(1);
  
  useEffect(() => {
    if (isOfficial) {
      officialPulse.value = withRepeat(
        withSequence(withTiming(1.02, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
        true
      );
    }
  }, [isOfficial]);

  const officialAnimStyle = useAnimatedStyle(() => {
    if (!isOfficial) return {};
    return {
      transform: [{ scale: officialPulse.value }],
      shadowColor: accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: interpolate(officialPulse.value, [1, 1.02], [0.3, 0.8]),
      shadowRadius: 10,
      elevation: interpolate(officialPulse.value, [1, 1.02], [2, 6]),
      borderColor: accent,
      borderWidth: 2,
    };
  });


  return (
    <Animated.View style={[
      styles.cardContainer, 
      { 
        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', 
        borderWidth: eventStatus !== 'none' || isOfficial ? 2 : 1, 
        borderColor: isOfficial ? accent : getBorderColor(),
        shadowColor: eventStatus !== 'none' ? getBorderColor() : (isDark ? accent : 'rgba(0,0,0,0.3)'),
        overflow: 'hidden'
      },
      animatedGlowStyle,
      officialAnimStyle
    ]}>
      

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.avatarWrap} activeOpacity={0.8} onPress={() => {
          const profileId = event.profiles?.id || event.creator_id || event.user_id;
          if (profileId) router.push(`/profile/${profileId}`);
        }}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} transition={200} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' }]}>
               <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{fullName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          {/* Pink Status Dot — hidden when verified badge is shown */}
          {!event.profiles?.is_verified && <View style={styles.statusDot} />}
          
          {/* Verified Badge on Avatar */}
          {event.profiles?.is_verified && (
            <View style={[styles.statusDot, { backgroundColor: '#FF1493', top: undefined, bottom: -2, right: -4, width: ms(16), height: ms(16), borderRadius: ms(8), justifyContent: 'center', alignItems: 'center' }]}>
              <Sparkles size={8} color="#FFF" fill="#FFF" />
            </View>
          )}
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

        <TouchableOpacity style={styles.moreBtn} onPress={handleMorePress}>
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
              onDoublePress={handleDoubleTapLike}
            />

            {/* Big Heart Overlay */}
            <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 999 }]} pointerEvents="none">
               <Animated.View style={bigHeartAnimStyle}>
                 <Ionicons name="heart" size={120} color="#fff" style={{ textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 }} />
               </Animated.View>
               {showBurst && <HeartBurst onComplete={() => setShowBurst(false)} />}
            </View>
            
            {/* Date Badge */}
            {!isPublication && eventMonth && (
              <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={[styles.dateBadge, { overflow: 'hidden', backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)' }]}>
                <Text style={[styles.dateBadgeDay, { color: isDark ? '#00D9FF' : '#00b8d4' }]}>{eventDay}</Text>
                <Text style={[styles.dateBadgeMonth, { color: isDark ? '#FFF' : '#333' }]}>{eventMonth}</Text>
              </BlurView>
            )}

            {/* Top Left Badges */}
            <View style={styles.badgesTopLeft}>

              {/* Live/Soon/Upcoming/Finished Badge */}
              {eventStatus !== 'none' && (
                <BlurView intensity={50} tint="dark" style={[styles.liveBadge, { 
                  overflow: 'hidden',
                  backgroundColor: eventStatus === 'live' ? 'rgba(0,230,118,0.6)' : eventStatus === 'soon' ? 'rgba(255,215,0,0.6)' : eventStatus === 'upcoming' ? 'rgba(157,78,221,0.6)' : 'rgba(255,59,48,0.6)', 
                  borderColor: eventStatus === 'live' ? '#00E676' : eventStatus === 'soon' ? '#FFD700' : eventStatus === 'upcoming' ? '#9D4EDD' : '#FF3B30' 
                }]}>
                  {(eventStatus === 'live' || eventStatus === 'soon' || eventStatus === 'upcoming') && <View style={[styles.liveDot, { backgroundColor: eventStatus === 'soon' ? '#333' : '#FFF' }]} />}
                  <Text style={[styles.liveText, { color: eventStatus === 'soon' ? '#333' : '#FFF' }]}>
                    {eventStatus === 'live' ? 'AO VIVO' : 
                     eventStatus === 'soon' ? `COMEÇA EM ${timeUntilStart.toUpperCase()}` : 
                     eventStatus === 'upcoming' ? `FALTAM ${timeUntilStart.toUpperCase()}` : 
                     'FINALIZADO'}
                  </Text>
                </BlurView>
              )}
            </View>

            {/* Top Right Badges */}
            {event.categories?.name && (
              <View style={[styles.badgesTopRight]}>
                <BlurView intensity={70} tint="dark" style={[styles.categoryBadge, { overflow: 'hidden', borderColor: event.categories.color ? event.categories.color + '50' : accent + '50', backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                  {event.categories.icon ? (
                    <Text style={{ fontSize: 12, marginRight: 4 }}>{event.categories.icon}</Text>
                  ) : (
                    <Tag size={12} color={event.categories.color || accent} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.categoryBadgeText, { color: event.categories.color || accent }]}>{event.categories.name}</Text>
                </BlurView>
              </View>
            )}


          </View>
        )}

      </View>

      {/* ── Footer Pills ── */}
      <View style={styles.footer}>
        
        {/* Like Pill */}
        <View style={[styles.pill, { flex: recentLikers.length > 0 ? 1.2 : 1, paddingHorizontal: 0, paddingVertical: 0, gap: 0 }]}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleLikePress} hitSlop={{ top: 15, bottom: 15, left: 15, right: 10 }} style={{ paddingLeft: 14, paddingRight: 4, paddingVertical: vs(10), justifyContent: 'center' }}>
            <Animated.View style={likeAnimStyle}>
              <Ionicons name={event.is_liked ? "heart" : "heart-outline"} size={22} color={event.is_liked ? "#FF1493" : textPrimary} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={openLikersModal} hitSlop={{ top: 10, bottom: 10, right: 10 }} style={{ flex: 1, paddingLeft: 2, paddingRight: 12, paddingVertical: vs(10), flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
            <Text style={[styles.pillText, { color: textPrimary }]} numberOfLines={1}>{event.likes_count || 0}</Text>
            {recentLikers.length > 0 && (
              <View style={{ flexDirection: 'row', marginLeft: 4 }}>
                {recentLikers.slice(0, 2).map((url, i) => (
                  <Image 
                    key={i} 
                    source={{ uri: url }} 
                    style={{ 
                      width: 18, 
                      height: 18, 
                      borderRadius: 9, 
                      borderWidth: 1.5, 
                      borderColor: isDark ? '#1C1C1E' : '#FFF', 
                      marginLeft: i > 0 ? -6 : 0 
                    }} 
                  />
                ))}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Comments Pill */}
        <Pressable 
          style={({ pressed }) => [
            styles.pill, 
            { backgroundColor: pressed ? (isDark ? 'rgba(160, 32, 240, 0.15)' : 'rgba(160, 32, 240, 0.1)') : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)') }
          ]} 
          onPress={() => onCommentPress && onCommentPress(event.id)}
        >
          <MessageCircle size={18} color="#A020F0" fill="none" />
          <Text style={[styles.pillText, { color: textPrimary }]}>{event.comments_count || 0}</Text>
        </Pressable>

        {/* Participants Pill */}
        <Pressable 
          style={({ pressed }) => [
            styles.pill, 
            { backgroundColor: pressed ? (isDark ? 'rgba(0, 230, 184, 0.15)' : 'rgba(0, 230, 184, 0.1)') : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)') }
          ]} 
          onPress={() => onParticipantsPress && onParticipantsPress(event.id)}
        >
          <Users size={18} color="#00E6B8" fill="none" />
          <Text style={[styles.pillText, { color: textPrimary }]}>{event.participants_count || 0}</Text>
        </Pressable>

        {/* Distance / Location Pill */}
        <Pressable 
          style={({ pressed }) => [
            styles.pill, 
            { backgroundColor: pressed ? (isDark ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 215, 0, 0.1)') : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)') }
          ]}
        >
          <MapPin size={18} color="#FFD700" fill="none" />
          <Text style={[styles.pillText, { color: textPrimary }]}>
             {distanceKm ? distanceKm : (event.location_name ? event.location_name.split(',')[0] : 'Local')}
          </Text>
        </Pressable>

      </View>

      {/* Modal de Curtidas (Likers) */}
      <Modal visible={showLikersModal} transparent animationType="slide" onRequestClose={() => setShowLikersModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowLikersModal(false)} />
          <View style={[styles.bottomSheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', maxHeight: '80%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>Curtidas</Text>
            
            {loadingLikers ? (
              <ActivityIndicator color={accent} style={{ marginVertical: 40 }} />
            ) : (
              <FlatList
                data={fullLikers}
                keyExtractor={(item, index) => item?.id || index.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' }}>
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }} onPress={() => {
                      setShowLikersModal(false);
                      router.push(`/profile/${item.id}`);
                    }}>
                      <Image 
                        source={{ uri: item.avatar_url || `https://ui-avatars.com/api/?name=${item.username || 'U'}&background=333&color=fff` }} 
                        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#333' }}
                      />
                      <View style={{ marginLeft: 12, flex: 1, paddingRight: 10 }}>
                        <Text style={{ color: textPrimary, fontSize: 16, fontWeight: 'bold' }} numberOfLines={1}>{item.username}</Text>
                        <Text style={{ color: textSecondary, fontSize: 14 }} numberOfLines={1}>{item.full_name || ''}</Text>
                      </View>
                    </TouchableOpacity>

                    {user?.id !== item.id && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: item.is_following ? (isDark ? '#333' : '#E0E0E0') : accent,
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 16,
                          minWidth: 90,
                          alignItems: 'center'
                        }}
                        onPress={() => handleToggleFollow(item.id, item.is_following)}
                      >
                        <Text style={{ 
                          color: item.is_following ? textPrimary : '#fff', 
                          fontWeight: 'bold', 
                          fontSize: 14 
                        }}>
                          {item.is_following ? 'Seguindo' : 'Seguir'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                ListEmptyComponent={<Text style={{ color: textSecondary, textAlign: 'center', marginVertical: 20 }}>Ninguém curtiu ainda.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Action Sheet Modal */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMoreMenu(false)}>
          <View style={[styles.bottomSheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: textPrimary }]}>Opções da Publicação</Text>
            
            <TouchableOpacity style={styles.sheetAction} activeOpacity={0.7} onPress={handleShare}>
              <View style={[styles.sheetIconCircle, { backgroundColor: 'rgba(0, 217, 255, 0.1)' }]}>
                <Share2 size={22} color="#00d9ff" />
              </View>
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>Compartilhar link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetAction} activeOpacity={0.7} onPress={handleReport}>
              <View style={[styles.sheetIconCircle, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                <Flag size={22} color="#FF9500" />
              </View>
              <Text style={[styles.sheetActionText, { color: textPrimary }]}>Denunciar conteúdo</Text>
            </TouchableOpacity>

            {isOwner && (
              <TouchableOpacity style={styles.sheetAction} activeOpacity={0.7} onPress={handleDelete}>
                <View style={[styles.sheetIconCircle, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                  <Trash2 size={22} color="#FF3B30" />
                </View>
                <Text style={[styles.sheetActionText, { color: '#FF3B30', fontFamily: 'Inter-Bold' }]}>Excluir publicação</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={[styles.sheetCancelBtn, { backgroundColor: isDark ? '#333' : '#F2F2F7' }]} 
              activeOpacity={0.7} 
              onPress={() => setShowMoreMenu(false)}
            >
              <Text style={[styles.sheetCancelText, { color: textPrimary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </Animated.View>
  );
});

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
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(150,150,150,0.3)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Inter-Black',
    marginBottom: 24,
    textAlign: 'center',
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  sheetIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetActionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  sheetCancelBtn: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Black',
    fontWeight: '900',
    fontSize: ms(16),
    color: '#FFFFFF',
    letterSpacing: -0.5,
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
    fontFamily: 'Inter-Black',
    fontWeight: '900',
    fontSize: ms(18),
    color: '#FFFFFF',
    letterSpacing: -0.5,
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
  badgesTopLeft: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    flexWrap: 'wrap',
    right: 100, // Avoid overlapping with right badges
  },
  badgesTopRight: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(10),
    paddingVertical: vs(5),
    borderRadius: ms(12),
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  categoryBadgeText: {
    fontSize: ms(10),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveBadge: {
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
