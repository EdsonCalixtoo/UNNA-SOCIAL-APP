import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Dimensions, Share, Animated, RefreshControl, Platform, Linking } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Profile, Event } from '@/types/database';
import {
  ArrowLeft,
  UserPlus,
  UserMinus,
  UserCheck,
  Calendar,
  MapPin,
  Users,
  Lock,
  Star,
  Award,
  Eye,
  MessageCircle,
  Share2,
  Sparkles,
  Heart,
  ChevronRight,
  Grid3X3,
  TrendingUp,
  Clock,
  ShieldCheck,
  Camera,
  Trash2
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '@/utils/responsive';
import EventCard from '@/components/EventCard';
import FullscreenMediaViewer from '@/components/FullscreenMediaViewer';
import { notifyNewFollower } from '@/lib/notifications';
import { calculateUserBadges, Badge } from '@/utils/badgeUtils';
import { ConfettiView } from '@/components/ConfettiView';
import { hapticFeedback } from '@/utils/haptics';
import { soundService } from '@/utils/soundService';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'posts' | 'events' | 'achievements';

export default function UserProfile() {
  const { user, profile: currentUserProfile } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();

  const openInstagram = (handle: string) => {
    const username = handle.replace('@', '').trim();
    if (!username) return;
    
    const appUrl = `instagram://user?username=${username}`;
    const webUrl = `https://instagram.com/${username}`;
    
    Linking.canOpenURL(appUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(appUrl);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Linking.openURL(webUrl);
      });
  };

  const openWebsite = (url: string) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    Linking.openURL(cleanUrl).catch((err) => {
      Alert.alert('Erro', 'Não foi possível abrir o link: ' + err.message);
    });
  };

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [events, setEvents] = useState<Event[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [profileStats, setProfileStats] = useState<any>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasRequestPending, setHasRequestPending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [eventsCount, setEventsCount] = useState(0);
  const [sharedInterests, setSharedInterests] = useState<any[]>([]);
  const [userInterests, setUserInterests] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [selectedPostIdx, setSelectedPostIdx] = useState(0);
  const [isPostViewerVisible, setIsPostViewerVisible] = useState(false);
  const [isMemoryViewerVisible, setIsMemoryViewerVisible] = useState(false);
  const [selectedMemoryIdx, setSelectedMemoryIdx] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const tabIndicatorPos = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const formatBirthDate = (dateString?: string) => {
    if (!dateString) return null;
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    
    try {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexado
      const day = parseInt(parts[2], 10);
      
      const birthDate = new Date(year, month, day);
      const today = new Date();
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const monthName = months[month];

      return `${day} de ${monthName} (${age} anos)`;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    if (id) {
      loadUserProfile();
    }
  }, [id]);

  useEffect(() => {
    loadEvents();
  }, [activeTab]);

  useEffect(() => {
    const tabIndex = activeTab === 'posts' ? 0 : activeTab === 'events' ? 1 : 2;
    Animated.spring(tabIndicatorPos, {
      toValue: tabIndex * ((SCREEN_WIDTH - 32) / 3),
      useNativeDriver: true,
      tension: 50,
      friction: 8
    }).start();
  }, [activeTab, SCREEN_WIDTH]);

  const loadUserProfile = async () => {
    if (!id || id === 'undefined') return;
    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        Alert.alert('Erro', 'Perfil não encontrado');
        router.back();
        return;
      }

      setProfile(profileData);

      const [followersData, followingData, followData, requestData, eventsData, catRes, badgesRes, postsRes, statsRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', id),
        supabase.from('follows').select('id').eq('follower_id', user?.id).eq('following_id', id).maybeSingle(),
        supabase.from('follow_requests').select('id, status').eq('requester_id', user?.id).eq('requested_id', id).eq('status', 'pending').maybeSingle(),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('creator_id', id),
        supabase.from('categories').select('*'),
        supabase.from('user_badges').select('earned_at, badges (*)').eq('user_id', id),
        supabase.from('posts').select('*, profiles:user_id (username, full_name, avatar_url)').eq('user_id', id).order('created_at', { ascending: false }),
        supabase.from('profile_stats').select('*').eq('user_id', id).maybeSingle()
      ]);

      setFollowersCount(followersData.count || 0);
      setFollowingCount(followingData.count || 0);
      setIsFollowing(!!followData.data);
      setHasRequestPending(!!requestData.data);
      setEventsCount(eventsData.count || 0);
      setPosts((postsRes.data || []).filter((p: any) => !!p.image_url));
      setProfileStats(statsRes.data);

      // Carregar memórias: fotos que o usuário postou nos eventos (via EventStoriesBar)
      const { data: memPosts } = await supabase
        .from('posts')
        .select('id, image_url, content, created_at, event_id')
        .eq('user_id', id)
        .not('event_id', 'is', null)
        .not('image_url', 'is', null)
        .not('content', 'ilike', 'Criei um novo evento%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (memPosts && memPosts.length > 0) {
        const eventIds = [...new Set(memPosts.map((p: any) => p.event_id))];
        const { data: eventsData2 } = await supabase
          .from('events')
          .select('id, title, event_date, location_name, categories(name, icon)')
          .in('id', eventIds);

        const eventsMap = Object.fromEntries((eventsData2 || []).map((e: any) => [e.id, e]));

        const formattedMemories = memPosts.map((m: any) => {
          const ev = eventsMap[m.event_id];
          return {
            id: m.id,
            title: ev?.title || 'Evento',
            image_url: m.image_url,
            event_date: ev?.event_date || m.created_at,
            location: ev?.location_name,
            category: ev?.categories?.name,
            category_icon: ev?.categories?.icon,
            event_id: m.event_id,
            created_at: m.created_at,
          };
        });
        setMemories(formattedMemories);
      } else {
        setMemories([]);
      }
      
      // Trigger confetti if it's a high level user
      if (statsRes.data?.level >= 10) {
        setTimeout(() => setShowConfetti(true), 1000);
      }
      
      const dynamicBadges = calculateUserBadges(profileData, { 
        followers: followersData.count || 0, 
        events: eventsData.count || 0 
      });
      
      const manualBadges = badgesRes.data ? badgesRes.data.map((b: any) => ({ ...b.badges, earned_at: b.earned_at })) : [];
      const allBadges = [...dynamicBadges, ...manualBadges];
      const uniqueBadges = Array.from(new Map(allBadges.map(item => [item.id, item])).values());
      
      setBadges(uniqueBadges);

      if (catRes.data) {
        const interests = catRes.data.filter(c => profileData.preferred_categories?.includes(c.id));
        setUserInterests(interests);

        if (currentUserProfile?.preferred_categories) {
          const shared = catRes.data.filter(c =>
            profileData.preferred_categories?.includes(c.id) &&
            currentUserProfile.preferred_categories?.includes(c.id)
          );
          setSharedInterests(shared);
        }
      }

      await loadEvents();
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadEvents = async () => {
    if (!id || id === 'undefined') return;
    try {
      // No perfil público, mostramos todos os eventos criados por ele
      const { data, error } = await supabase
        .from('events')
        .select('*, profiles:creator_id (id, username, full_name, avatar_url), categories:category_id (name, icon), subcategories:subcategory_id (name)')
        .eq('creator_id', id)
        .order('event_date', { ascending: true });

      if (error) throw error;

      // Fetch likes count and is_liked status for each event
      const eventsWithLikes = await Promise.all((data || []).map(async (event) => {
        const { count: likesCount } = await supabase
          .from('event_likes')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);

        const { data: userLike } = await supabase
          .from('event_likes')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', user?.id)
          .maybeSingle();

        return {
          ...event,
          likes_count: likesCount || 0,
          is_liked: !!userLike
        };
      }));

      setEvents(eventsWithLikes);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleFollowAction = async () => {
    if (!profile) return;
    try {
      setActionLoading(true);
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user?.id).eq('following_id', id);
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else if (hasRequestPending) {
        await supabase.from('follow_requests').delete().eq('requester_id', user?.id).eq('requested_id', id);
        setHasRequestPending(false);
      } else {
        if (profile.is_private) {
          await supabase.from('follow_requests').insert({ requester_id: user?.id, requested_id: id, status: 'pending' });
          setHasRequestPending(true);
        } else {
          await supabase.from('follows').insert({ follower_id: user?.id, following_id: id });
          setIsFollowing(true);
          setFollowersCount(prev => prev + 1);
          
          // Notificar o usuário
          if (user?.id) {
            notifyNewFollower(user.id, id as string);
          }
        }
      }
    } catch (error) {
      console.error('Error handling follow:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      const shareMessage = `Conheça o perfil de @${profile?.username} no UNИA! 🌟\nhttps://unna.app/profile/${id}`;
      await Share.share({ message: shareMessage });
    } catch (error) {
      console.error('Error sharing profile:', error);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  if (!profile) return null;

  const bannerScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.5, 1],
    extrapolate: 'clamp',
  });

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase()
    : profile.username?.charAt(0).toUpperCase() ?? '?';

  const headerOpacity = scrollY.interpolate({
    inputRange: [120, 180],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.root, { backgroundColor: backgroundPrimary }]}>
      {/* STICKY HEADER */}
      <Animated.View 
        style={[
          styles.stickyHeader, 
          { 
            opacity: headerOpacity,
            paddingTop: insets.top,
          }
        ]}
      >
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={styles.stickyContent}>
           <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
             <ArrowLeft size={20} color={textPrimary} />
           </TouchableOpacity>
           <Text style={[styles.stickyTitle, { color: textPrimary }]}>{profile.full_name}</Text>
           <View style={{ width: 40 }} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadUserProfile(); }} tintColor={accent} />}
      >
        <Animated.View style={[styles.bannerContainer, { transform: [{ scale: bannerScale }] }]}>
          {profile.cover_url ? (
            <Image 
              source={{ uri: profile.cover_url }} 
              style={StyleSheet.absoluteFill} 
              resizeMode="cover"
            />
          ) : (
            <LinearGradient colors={[profile.primary_color || accent, '#7b2fff', '#ff1493']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          )}
        </Animated.View>

        <View style={[styles.topActions, { top: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.glassBtn}>
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShareProfile} style={styles.glassBtn}>
            <Share2 size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => profile.avatar_url && setIsViewerVisible(true)}
            style={[styles.avatarWrapper, { shadowColor: profile.primary_color || accent }]}
          >
            <LinearGradient colors={[profile.primary_color || accent, '#ff1493']} style={styles.avatarGradient}>
              {profile.avatar_url ? (
                <Animated.Image 
                  source={{ uri: profile.avatar_url }} 
                  style={styles.avatarImg as any} 
                  // @ts-ignore
                  sharedTransitionTag={`avatar-${id}`}
                />
              ) : (
                <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitials}>{initials}</Text></View>
              )}
            </LinearGradient>
            {profile.is_private && (
              <View style={[styles.privateBadge, { backgroundColor: '#FF3B30' }]}><Lock size={14} color="#fff" /></View>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.profileName, { color: textPrimary }]}>{profile.full_name}</Text>
            {profile.is_verified && (
              <Sparkles size={22} color={accent} fill={accent} />
            )}
          </View>
          <Text style={[styles.profileUsername, { color: textSecondary }]}>@{profile.username}</Text>

          {profile.bio && <Text style={[styles.profileBio, { color: textSecondary }]}>{profile.bio}</Text>}

          {profile.birth_date && (!profile.is_private || isFollowing || user?.id === profile.id) && (
            <View style={[styles.birthdayContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
              <Text style={[styles.birthdayText, { color: textPrimary }]}>🎂 {formatBirthDate(profile.birth_date)}</Text>
            </View>
          )}

          {/* LINKS SOCIAIS CARD */}
          {(profile?.instagram_url || profile?.website_url) && (!profile.is_private || isFollowing || user?.id === profile.id) ? (
            <View style={[styles.socialSectionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={styles.socialHeader}>
                <View style={[styles.socialIconBg, { backgroundColor: accent + '15' }]}>
                  <Sparkles size={16} color={accent} fill={accent} />
                </View>
                <Text style={[styles.socialTitleText, { color: textPrimary }]}>Links Sociais</Text>
              </View>
              
              <View style={styles.socialButtonsRow}>
                {profile.instagram_url ? (
                  <TouchableOpacity 
                    style={[styles.socialButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)' }]}
                    onPress={() => openInstagram(profile.instagram_url)}
                  >
                    <Text style={[styles.socialButtonLabel, { color: textSecondary }]}>INSTAGRAM</Text>
                    <Text style={[styles.socialButtonValue, { color: accent }]}>@{profile.instagram_url.replace('@', '')}</Text>
                  </TouchableOpacity>
                ) : null}
                
                {profile.website_url ? (
                  <TouchableOpacity 
                    style={[styles.socialButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)' }]}
                    onPress={() => openWebsite(profile.website_url)}
                  >
                    <Text style={[styles.socialButtonLabel, { color: textSecondary }]}>SITE / LINK</Text>
                    <Text style={[styles.socialButtonValue, { color: accent }]} numberOfLines={1}>{profile.website_url.replace('https://', '').replace('http://', '')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {sharedInterests.length > 0 && (
            <View style={[styles.compatibilityBox, { backgroundColor: isDark ? 'rgba(0,217,255,0.06)' : 'rgba(0,217,255,0.03)' }]}>
              <View style={styles.compatibilityHeader}>
                <Heart size={16} color="#ff1493" fill="#ff1493" />
                <Text style={[styles.compatibilityTitle, { color: textPrimary }]}>Vocês dois gostam de:</Text>
              </View>
              <View style={styles.interestsGrid}>
                {sharedInterests.map((cat) => (
                  <View key={cat.id} style={[styles.interestChip, { backgroundColor: backgroundSecondary }]}>
                    <Text style={styles.interestEmoji}>{cat.icon || '✨'}</Text>
                    <Text style={[styles.interestText, { color: textPrimary }]}>{cat.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {userInterests.length > 0 && sharedInterests.length === 0 && (
            <View style={styles.interestsWrapper}>
              <View style={styles.interestsGrid}>
                {userInterests.map((cat) => (
                  <View key={cat.id} style={[styles.interestChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={styles.interestEmoji}>{cat.icon || '✨'}</Text>
                    <Text style={[styles.interestText, { color: textPrimary }]}>{cat.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.mainActions}>
            {user?.id === profile.id ? (
              <TouchableOpacity onPress={() => router.push('/profile/edit')} style={[styles.followBtn, { backgroundColor: backgroundSecondary, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} disabled={actionLoading}>
                <Text style={[styles.followBtnText, { color: textPrimary }]}>Editar Perfil</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity onPress={handleFollowAction} style={[styles.followBtn, { backgroundColor: isFollowing ? backgroundSecondary : (profile.accent_color || '#ff1493') }]} disabled={actionLoading}>
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.followBtnText, { color: isFollowing ? textPrimary : '#fff' }]}>
                      {isFollowing ? 'Seguindo' : hasRequestPending ? 'Solicitado' : profile.is_private ? 'Solicitar para seguir' : 'Seguir'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.messageBtn, { backgroundColor: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(0,217,255,0.05)' }]} onPress={() => router.push(`/messages/${id}?userId=${id}`)}>
                  <MessageCircle size={20} color={accent} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textPrimary }]}>{posts.length}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem} 
            onPress={() => 
              (profile.is_private && !isFollowing && user?.id !== profile.id) 
                ? Alert.alert('Conta Privada', 'Siga esta conta para ver a lista de seguidores.') 
                : router.push(`/profile/${id}/followers`)
            }
          >
            <Text style={[styles.statValue, { color: textPrimary }]}>{followersCount}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Seguidores</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem} 
            onPress={() => 
              (profile.is_private && !isFollowing && user?.id !== profile.id) 
                ? Alert.alert('Conta Privada', 'Siga esta conta para ver quem ela segue.') 
                : router.push(`/profile/${id}/following`)
            }
          >
            <Text style={[styles.statValue, { color: textPrimary }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Seguindo</Text>
          </TouchableOpacity>
        </View>

        {(profile.is_private && !isFollowing && user?.id !== profile.id) ? (
          <View style={styles.privacyWall}>
            <View style={[styles.lockCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <Lock size={40} color={textSecondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.privacyTitle, { color: textPrimary }]}>Esta conta é privada</Text>
            <Text style={[styles.privacySubtext, { color: textSecondary }]}>
              Siga esta conta para ver seus eventos e interações.
            </Text>
            {hasRequestPending && (
              <View style={[styles.pendingBadge, { backgroundColor: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(0,217,255,0.05)' }]}>
                <Text style={[styles.pendingText, { color: accent }]}>Solicitação enviada</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {badges.length > 0 && (
              <View style={styles.badgesWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesList}>
                  {badges.map((badge: Badge) => (
                    <TouchableOpacity 
                      key={badge.id} 
                      style={[styles.badgeChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                      onPress={() => Alert.alert(badge.label, badge.description)}
                    >
                      <View style={[styles.badgeIconBg, { backgroundColor: badge.color + '20' }]}>
                        {badge.icon === 'Sparkles' && <Sparkles size={12} color={badge.color} fill={badge.color} />}
                        {badge.icon === 'Users' && <Users size={12} color={badge.color} />}
                        {badge.icon === 'Award' && <Award size={12} color={badge.color} />}
                        {badge.icon === 'Star' && <Star size={12} color={badge.color} />}
                      </View>
                      <Text style={[styles.badgeLabel, { color: textPrimary }]}>{badge.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.tabsWrapper}>
              <View style={[styles.tabsTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <Animated.View style={[styles.tabIndicator, { backgroundColor: backgroundSecondary, transform: [{ translateX: tabIndicatorPos }] }]} />
                <TouchableOpacity style={styles.tabBtn} onPress={() => { hapticFeedback.selection(); setActiveTab('posts'); }}><Grid3X3 size={18} color={activeTab === 'posts' ? accent : textSecondary} /><Text style={[styles.tabBtnText, { color: activeTab === 'posts' ? textPrimary : textSecondary }]}>Mural</Text></TouchableOpacity>
                <TouchableOpacity style={styles.tabBtn} onPress={() => { hapticFeedback.selection(); setActiveTab('events'); }}><Calendar size={18} color={activeTab === 'events' ? accent : textSecondary} /><Text style={[styles.tabBtnText, { color: activeTab === 'events' ? textPrimary : textSecondary }]}>Experiências</Text></TouchableOpacity>
                <TouchableOpacity style={styles.tabBtn} onPress={() => { hapticFeedback.selection(); setActiveTab('achievements'); }}><Award size={18} color={activeTab === 'achievements' ? accent : textSecondary} /><Text style={[styles.tabBtnText, { color: activeTab === 'achievements' ? textPrimary : textSecondary }]}>Conquistas</Text></TouchableOpacity>
              </View>
            </View>

            <View style={styles.listContainer}>
              {activeTab === 'posts' && (
                <View style={{ paddingHorizontal: 4 }}>
                  {memories.length > 0 ? (
                    memories.map((memory, idx) => {
                      const date = new Date(memory.event_date);
                      const month = date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
                      const year = date.getFullYear();
                      const showYear = idx === 0 || new Date(memories[idx - 1]?.event_date).getFullYear() !== year;

                      return (
                        <View key={memory.id}>
                          {showYear && (
                            <View style={styles.memoryYearDivider}>
                              <View style={[styles.memoryYearLine, { backgroundColor: accent + '40' }]} />
                              <Text style={[styles.memoryYearText, { color: accent }]}>{year}</Text>
                              <View style={[styles.memoryYearLine, { backgroundColor: accent + '40' }]} />
                            </View>
                          )}
                          <TouchableOpacity
                            style={[
                              styles.premiumMemoryCard,
                              {
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
                              }
                            ]}
                            activeOpacity={0.95}
                            onPress={() => {
                              setSelectedMemoryIdx(idx);
                              setIsMemoryViewerVisible(true);
                            }}
                          >
                            <Image source={{ uri: memory.image_url }} style={styles.premiumMemoryImage} />
                            
                            <LinearGradient
                              colors={['transparent', 'rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.85)']}
                              style={styles.premiumMemoryGradient}
                            >
                              <View style={styles.premiumMemoryFooter}>
                                <View style={styles.premiumMemoryMeta}>
                                  <Text style={styles.premiumMemoryTitle} numberOfLines={1}>
                                    📸 {memory.title}
                                  </Text>
                                  <Text style={styles.premiumMemorySub} numberOfLines={1}>
                                    {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    {memory.location ? ` • ${memory.location}` : ''}
                                  </Text>
                                </View>
                                
                                {memory.event_id && (
                                  <TouchableOpacity
                                    style={styles.premiumMemoryEventBtn}
                                    activeOpacity={0.8}
                                    onPress={() => router.push(`/event/${memory.event_id}`)}
                                  >
                                    <BlurView intensity={35} tint="light" style={styles.premiumMemoryBtnBlur}>
                                      <Text style={styles.premiumMemoryBtnText}>Ver Evento</Text>
                                    </BlurView>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyContent}>
                      <Heart size={48} color={textSecondary} strokeWidth={1} />
                      <Text style={[styles.emptyTitle, { color: textPrimary }]}>Sem Memórias Ainda</Text>
                      <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Quando este usuário participar de eventos, as memórias aparecerão aqui.</Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'events' && (
                <View style={styles.eventsList}>
                  {events.length > 0 ? (
                    events.map(event => <EventCard key={event.id} event={event} />)
                  ) : (
                    <View style={styles.emptyContent}>
                      <Calendar size={48} color={textSecondary} strokeWidth={1} />
                      <Text style={[styles.emptyTitle, { color: textPrimary }]}>Nenhum evento</Text>
                      <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Nenhuma experiência criada por este usuário.</Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'achievements' && (
                <View style={styles.achievementsContainer}>
                   {/* LEVEL CARD */}
                   <LinearGradient
                    colors={isDark ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] : ['#fff', '#f0f0f0']}
                    style={[styles.levelCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                  >
                    <View style={styles.levelHeader}>
                      <View style={[styles.levelIconContainer, { backgroundColor: accent + '20' }]}>
                        <TrendingUp size={24} color={accent} />
                      </View>
                      <View style={styles.levelMainInfo}>
                        <Text style={[styles.levelLabel, { color: textSecondary }]}>Nível de Influência</Text>
                        <Text style={[styles.levelValue, { color: textPrimary }]}>
                          {profileStats?.level <= 5 ? 'Explorador' : profileStats?.level <= 15 ? 'Aventureiro' : 'Lenda'} Lvl {profileStats?.level || 1}
                        </Text>
                      </View>
                      <View style={styles.xpBadge}>
                        <Text style={styles.xpBadgeText}>{profileStats?.xp || 0} XP</Text>
                      </View>
                    </View>

                    <View style={styles.progressWrapper}>
                      <View style={[styles.levelProgressContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                        <LinearGradient 
                          colors={[accent, '#7b2fff']} 
                          start={{ x: 0, y: 0 }} 
                          end={{ x: 1, y: 0 }} 
                          style={[styles.levelProgressBar, { width: `${Math.min(((profileStats?.xp || 0) % 100), 100)}%` }]}
                        />
                      </View>
                      <Text style={[styles.progressText, { color: textSecondary }]}>{profileStats?.xp % 100 || 0}/100 para o próximo nível</Text>
                    </View>
                  </LinearGradient>

                  {/* REPUTATION GRID */}
                  <View style={styles.reputationGrid}>
                    <View style={[styles.repCard, { backgroundColor: backgroundSecondary }]}>
                      <View style={[styles.repIcon, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                        <TrendingUp size={20} color="#FFD700" />
                      </View>
                      <Text style={[styles.repValue, { color: textPrimary }]}>{profileStats?.coins || 0}</Text>
                      <Text style={[styles.repLabel, { color: textSecondary }]}>UNNA Coins</Text>
                    </View>
                    
                    <View style={[styles.repCard, { backgroundColor: backgroundSecondary }]}>
                      <View style={[styles.repIcon, { backgroundColor: (profile?.flaker_count || 0) > 0 ? 'rgba(255, 59, 48, 0.15)' : 'rgba(52, 199, 89, 0.15)' }]}>
                        {(profile?.flaker_count || 0) > 0 ? <Clock size={20} color="#FF3B30" /> : <Star size={20} color="#34C759" fill="#34C759" />}
                      </View>
                      <Text style={[styles.repValue, { color: textPrimary }]}>
                        {(profile?.flaker_count || 0) > 0 ? `${profile?.flaker_count} Furos` : 'Fiel ao Rolê'}
                      </Text>
                      <Text style={[styles.repLabel, { color: textSecondary }]}>Fura-ô-metro</Text>
                    </View>
                  </View>

                  {/* BADGES */}
                  <View style={styles.badgesSection}>
                    <Text style={[styles.sectionTitle, { color: textPrimary }]}>Conquistas</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesGrid}>
                      {badges.map((badge: Badge) => (
                        <View key={badge.id} style={styles.badgeItem}>
                          <LinearGradient colors={[badge.color, badge.color + '80']} style={styles.badgeCircle}>
                             {badge.icon === 'Sparkles' && <Sparkles size={24} color="#fff" fill="#fff" />}
                             {badge.icon === 'Users' && <Users size={24} color="#fff" />}
                             {badge.icon === 'Award' && <Award size={24} color="#fff" />}
                             {badge.icon === 'Star' && <Star size={24} color="#fff" />}
                          </LinearGradient>
                          <Text style={[styles.badgeName, { color: textPrimary }]}>{badge.label}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </Animated.ScrollView>

      {profile?.avatar_url && (
        <FullscreenMediaViewer
          visible={isViewerVisible}
          onClose={() => setIsViewerVisible(false)}
          mediaUrls={[profile.avatar_url]}
          initialIndex={0}
        />
      )}
      {posts.length > 0 && (
        <FullscreenMediaViewer
          visible={isPostViewerVisible}
          onClose={() => setIsPostViewerVisible(false)}
          mediaUrls={posts.map(p => p.image_url).filter(Boolean)}
          initialIndex={selectedPostIdx}
        />
      )}
      {memories.length > 0 && (
        <FullscreenMediaViewer
          visible={isMemoryViewerVisible}
          onClose={() => setIsMemoryViewerVisible(false)}
          mediaUrls={memories.map(m => m.image_url).filter(Boolean)}
          initialIndex={selectedMemoryIdx}
        />
      )}

      <ConfettiView visible={showConfetti} onComplete={() => setShowConfetti(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerContainer: { height: vs(180), width: '100%', position: 'absolute', top: 0 },
  topActions: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 100 },
  glassBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  profileInfo: { alignItems: 'center', marginTop: vs(120), paddingHorizontal: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 20, elevation: 20, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  avatarGradient: { width: 130, height: 130, borderRadius: 65, padding: 4, justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 122, height: 122, borderRadius: 61, borderWidth: 4, borderColor: '#fff' },
  avatarPlaceholder: { width: 122, height: 122, borderRadius: 61, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  avatarInitials: { fontSize: 48, fontWeight: '900', color: '#fff' },
  privateBadge: { position: 'absolute', bottom: 5, right: 5, width: 32, height: 32, borderRadius: 16, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: ms(28), fontWeight: '900', letterSpacing: -1, marginBottom: 4 },
  profileUsername: { fontSize: ms(16), fontWeight: '600', marginBottom: 16 },
  profileBio: { fontSize: ms(15), textAlign: 'center', lineHeight: 22, marginBottom: 20, paddingHorizontal: 20 },
  birthdayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'center',
  },
  birthdayText: {
    fontSize: ms(14),
    fontWeight: '600',
  },
  compatibilityBox: { width: '100%', padding: 16, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(0,217,255,0.1)' },
  compatibilityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  compatibilityTitle: { fontSize: ms(14), fontWeight: '800' },
  interestsWrapper: { marginBottom: 24 },
  interestsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  interestChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', gap: 6 },
  interestEmoji: { fontSize: ms(16) },
  interestText: { fontSize: ms(13), fontWeight: '700' },
  mainActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  followBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 30, minWidth: 140, alignItems: 'center' },
  followBtnText: { fontWeight: '800', fontSize: ms(15) },
  messageBtn: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,217,255,0.2)' },
  badgesWrapper: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  badgesList: {
    flexDirection: 'row',
    gap: 10,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 8,
  },
  badgeIconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 20, marginHorizontal: 20, marginBottom: 32 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: ms(22), fontWeight: '900' },
  statLabel: { fontSize: ms(12), fontWeight: '700', textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.1)' },
  tabsWrapper: { paddingHorizontal: 16, marginBottom: 20 },
  tabsTrack: { flexDirection: 'row', borderRadius: 30, height: 56, padding: 4, position: 'relative' },
  tabIndicator: { position: 'absolute', top: 4, bottom: 4, left: 4, width: (Dimensions.get('window').width - 32) / 3 - 4, borderRadius: 26, elevation: 2 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabBtnText: { fontSize: ms(14), fontWeight: '800' },
  listContainer: { paddingHorizontal: 0 },
  postsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    padding: 2,
    gap: 2
  },
  postThumbnail: { 
    width: (SCREEN_WIDTH / 3) - 2.7, 
    height: (SCREEN_WIDTH / 3) - 2.7,
    backgroundColor: '#333'
  },
  thumbnailImg: { 
    width: '100%', 
    height: '100%' 
  },
  eventsList: { 
    paddingHorizontal: 20,
    gap: 16 
  },
  achievementsContainer: { 
    paddingHorizontal: 20,
    gap: 24
  },
  levelCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  levelIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelMainInfo: {
    flex: 1,
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  levelValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  xpBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  xpBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  progressWrapper: {
    gap: 10,
  },
  levelProgressContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  levelProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  reputationGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  repCard: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  repIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  repValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  repLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgesSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  badgesGrid: {
    gap: 20,
    paddingRight: 20,
  },
  badgeItem: {
    alignItems: 'center',
    gap: 8,
  },
  badgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: 70,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.6,
  },
  // Mural de Memórias
  memoryYearDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
    marginHorizontal: 4,
  },
  memoryYearLine: {
    flex: 1,
    height: 1,
  },
  memoryYearText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
  premiumMemoryCard: {
    height: 260,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    position: 'relative',
  },
  premiumMemoryImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  premiumMemoryGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
    justifyContent: 'flex-end',
  },
  premiumMemoryFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  premiumMemoryMeta: {
    flex: 1,
    paddingRight: 12,
    gap: 4,
  },
  premiumMemoryTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  premiumMemorySub: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  premiumMemoryEventBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  premiumMemoryBtnBlur: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
  },
  premiumMemoryBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    height: Platform.OS === 'ios' ? 100 : 80,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
    overflow: 'hidden',
  },
  stickyContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  // Estilos de Privacidade
  privacyWall: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  lockCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  privacySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.6,
  },
  pendingBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  socialSectionCard: {
    width: '100%',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 20,
  },
  socialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  socialIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialTitleText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.08)',
  },
  socialButtonLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  socialButtonValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
