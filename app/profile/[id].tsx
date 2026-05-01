import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Dimensions, Share, Animated, RefreshControl } from 'react-native';
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
  ChevronRight
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '@/utils/responsive';
import EventCard from '@/components/EventCard';

type TabType = 'created' | 'joined';

export default function UserProfile() {
  const { user, profile: currentUserProfile } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('created');
  const [events, setEvents] = useState<Event[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasRequestPending, setHasRequestPending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [eventsCount, setEventsCount] = useState(0);
  const [sharedInterests, setSharedInterests] = useState<any[]>([]);
  const [userInterests, setUserInterests] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const tabIndicatorPos = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (id) {
      loadUserProfile();
    }
  }, [id]);

  useEffect(() => {
    loadEvents();
  }, [activeTab]);

  useEffect(() => {
    const tabIndex = activeTab === 'created' ? 0 : 1;
    Animated.spring(tabIndicatorPos, {
      toValue: tabIndex * ((width - 32) / 2),
      useNativeDriver: true,
      tension: 50,
      friction: 8
    }).start();
  }, [activeTab, width]);

  const loadUserProfile = async () => {
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

      const [followersData, followingData, followData, requestData, eventsData, catRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', id),
        supabase.from('follows').select('id').eq('follower_id', user?.id).eq('following_id', id).maybeSingle(),
        supabase.from('follow_requests').select('id, status').eq('requester_id', user?.id).eq('requested_id', id).eq('status', 'pending').maybeSingle(),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('creator_id', id),
        supabase.from('categories').select('*')
      ]);

      setFollowersCount(followersData.count || 0);
      setFollowingCount(followingData.count || 0);
      setIsFollowing(!!followData.data);
      setHasRequestPending(!!requestData.data);
      setEventsCount(eventsData.count || 0);

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
    try {
      const today = new Date().toISOString().split('T')[0];

      if (activeTab === 'created') {
        const { data, error } = await supabase
          .from('events')
          .select('*, categories:category_id (name, icon), subcategories:subcategory_id (name)')
          .eq('creator_id', id)
          .order('event_date', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } else {
        const { data: participantData, error: participantError } = await supabase
          .from('event_participants')
          .select('event_id, events:event_id (*, categories:category_id (name, icon), subcategories:subcategory_id (name))')
          .eq('user_id', id);

        if (participantError) throw participantError;
        setEvents((participantData || []).map((i: any) => i.events).filter(Boolean));
      }
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

  return (
    <View style={[styles.root, { backgroundColor: backgroundPrimary }]}>
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
          <LinearGradient colors={[profile.primary_color || accent, '#7b2fff', '#ff1493']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
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
          <View style={[styles.avatarWrapper, { shadowColor: profile.primary_color || accent }]}>
            <LinearGradient colors={[profile.primary_color || accent, '#ff1493']} style={styles.avatarGradient}>
              {profile.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitials}>{initials}</Text></View>
              )}
            </LinearGradient>
            {profile.is_private && (
              <View style={[styles.privateBadge, { backgroundColor: '#FF3B30' }]}><Lock size={14} color="#fff" /></View>
            )}
          </View>

          <Text style={[styles.profileName, { color: textPrimary }]}>{profile.full_name}</Text>
          <Text style={[styles.profileUsername, { color: textSecondary }]}>@{profile.username}</Text>

          {profile.bio && <Text style={[styles.profileBio, { color: textSecondary }]}>{profile.bio}</Text>}

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
            <TouchableOpacity onPress={handleFollowAction} style={[styles.followBtn, { backgroundColor: isFollowing ? backgroundSecondary : (profile.accent_color || '#ff1493') }]} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.followBtnText, { color: isFollowing ? textPrimary : '#fff' }]}>{isFollowing ? 'Seguindo' : hasRequestPending ? 'Pendente' : 'Seguir'}</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.messageBtn, { backgroundColor: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(0,217,255,0.05)' }]} onPress={() => router.push(`/messages/${id}?userId=${id}`)}>
              <MessageCircle size={20} color={accent} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}><Text style={[styles.statValue, { color: textPrimary }]}>{eventsCount}</Text><Text style={[styles.statLabel, { color: textSecondary }]}>Eventos</Text></View>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/profile/${id}/followers`)}><Text style={[styles.statValue, { color: textPrimary }]}>{followersCount}</Text><Text style={[styles.statLabel, { color: textSecondary }]}>Seguidores</Text></TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/profile/${id}/following`)}><Text style={[styles.statValue, { color: textPrimary }]}>{followingCount}</Text><Text style={[styles.statLabel, { color: textSecondary }]}>Seguindo</Text></TouchableOpacity>
        </View>

        <View style={styles.tabsWrapper}>
          <View style={[styles.tabsTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <Animated.View style={[styles.tabIndicator, { backgroundColor: backgroundSecondary, transform: [{ translateX: tabIndicatorPos }] }]} />
            <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('created')}><Calendar size={18} color={activeTab === 'created' ? accent : textSecondary} /><Text style={[styles.tabBtnText, { color: activeTab === 'created' ? textPrimary : textSecondary }]}>Criados</Text></TouchableOpacity>
            <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('joined')}><Users size={18} color={activeTab === 'joined' ? accent : textSecondary} /><Text style={[styles.tabBtnText, { color: activeTab === 'joined' ? textPrimary : textSecondary }]}>Participando</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.listContainer}>
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}><Calendar size={40} color={textSecondary} strokeWidth={1} /></View>
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>Sem eventos ainda</Text>
            </View>
          ) : (
            <View style={styles.eventsGrid}>{events.map((event) => <EventCard key={event.id} event={event} />)}</View>
          )}
        </View>
      </Animated.ScrollView>
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
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 20, marginHorizontal: 20, marginBottom: 32 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: ms(22), fontWeight: '900' },
  statLabel: { fontSize: ms(12), fontWeight: '700', textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.1)' },
  tabsWrapper: { paddingHorizontal: 16, marginBottom: 20 },
  tabsTrack: { flexDirection: 'row', borderRadius: 30, height: 56, padding: 4, position: 'relative' },
  tabIndicator: { position: 'absolute', top: 4, bottom: 4, left: 4, width: (Dimensions.get('window').width - 32) / 2 - 4, borderRadius: 26, elevation: 2 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  tabBtnText: { fontSize: ms(14), fontWeight: '800' },
  listContainer: { paddingHorizontal: 0 },
  eventsGrid: { gap: 16 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: ms(18), fontWeight: '900', marginBottom: 10 },
});
