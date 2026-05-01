import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, RefreshControl,
  Animated, useWindowDimensions, Dimensions,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Event } from '@/types/database';
import { 
  LogOut, 
  Settings, 
  Calendar, 
  Users, 
  TrendingUp, 
  Sparkles, 
  Search, 
  Moon, 
  Sun, 
  Edit3, 
  Grid3X3, 
  Clock, 
  Star,
  ChevronRight,
  MapPin,
  Heart
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import EventCard from '@/components/EventCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '@/utils/responsive';
import PageTransition from '@/components/PageTransition';
import { useUI } from '@/contexts/UIContext';

type TabType = 'created' | 'participating' | 'past';

const TABS: { key: TabType; label: string; icon: any }[] = [
  { key: 'created', label: 'Criados', icon: Grid3X3 },
  { key: 'participating', label: 'Participando', icon: Heart },
  { key: 'past', label: 'Passados', icon: Clock },
];

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showTabBar } = useUI();
  const { width } = useWindowDimensions();

  useEffect(() => {
    showTabBar();
  }, []);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('created');
  const [events, setEvents] = useState<Event[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [eventsCount, setEventsCount] = useState(0);
  const [userInterests, setUserInterests] = useState<any[]>([]);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const tabIndicatorPos = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [activeTab]);

  useEffect(() => {
    const tabIndex = TABS.findIndex(t => t.key === activeTab);
    Animated.spring(tabIndicatorPos, {
      toValue: tabIndex * ((width - 32) / 3),
      useNativeDriver: true,
      tension: 50,
      friction: 8
    }).start();
  }, [activeTab, width]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [f1, f2, f3, catRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user?.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user?.id),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('creator_id', user?.id),
        supabase.from('categories').select('*')
      ]);
      setFollowersCount(f1.count || 0);
      setFollowingCount(f2.count || 0);
      setEventsCount(f3.count || 0);

      if (profile?.preferred_categories && catRes.data) {
        const interests = catRes.data.filter(c => profile.preferred_categories?.includes(c.id));
        setUserInterests(interests);
      }

      await loadEvents();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadEvents = async () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 20, duration: 120, useNativeDriver: true }),
    ]).start();

    const today = new Date().toISOString().split('T')[0];
    let data: any[] = [];
    try {
      if (activeTab === 'created') {
        const r = await supabase.from('events').select('*, categories:category_id (name, icon), subcategories:subcategory_id (name)').eq('creator_id', user?.id).order('event_date', { ascending: true });
        data = r.data || [];
      } else if (activeTab === 'participating') {
        const r = await supabase.from('event_participants').select('event_id, events:event_id (*, categories:category_id (name, icon), subcategories:subcategory_id (name))').eq('user_id', user?.id);
        data = (r.data || []).map((i: any) => i.events).filter(Boolean);
      } else {
        const r = await supabase.from('events').select('*, categories:category_id (name, icon), subcategories:subcategory_id (name)').eq('creator_id', user?.id).lt('event_date', today).order('event_date', { ascending: false });
        data = r.data || [];
      }
    } catch { }
    setEvents(data);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const handleSignOut = () => {
    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { await signOut(); router.replace('/(auth)'); } },
    ]);
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : profile?.username?.charAt(0).toUpperCase() ?? '?';

  if (loading && events.length === 0) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: backgroundPrimary }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const bannerScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.5, 1],
    extrapolate: 'clamp',
  });

  return (
    <PageTransition>
      <View style={[styles.root, { backgroundColor: backgroundPrimary }]}>
      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); loadProfileData(); }} 
            tintColor={accent} 
          />
        }
      >
        {/* TOP BANNER */}
        <Animated.View style={[styles.bannerContainer, { transform: [{ scale: bannerScale }] }]}>
          <LinearGradient 
            colors={[accent, '#7b2fff', '#ff1493']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={StyleSheet.absoluteFill} 
          />
        </Animated.View>

        {/* HEADER ACTIONS */}
        <View style={[styles.topActions, { top: insets.top + 10 }]}>
          <TouchableOpacity onPress={toggleTheme} style={styles.glassBtn}>
            {isDark ? <Sun size={20} color="#fff" /> : <Moon size={20} color="#fff" />}
          </TouchableOpacity>
          <View style={styles.topActionsRight}>
            <TouchableOpacity onPress={() => router.push('/search-users')} style={styles.glassBtn}>
              <Search size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile/edit')} style={styles.glassBtn}>
              <Settings size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut} style={styles.glassBtn}>
              <LogOut size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* PROFILE INFO */}
        <View style={styles.profileInfo}>
          <View style={[styles.avatarWrapper, { shadowColor: accent }]}>
            <LinearGradient colors={[accent, '#ff1493']} style={styles.avatarGradient}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </LinearGradient>
            <View style={styles.verifiedBadge}>
              <Sparkles size={14} color="#fff" fill="#fff" />
            </View>
          </View>

          <Text style={[styles.profileName, { color: textPrimary }]}>{profile?.full_name}</Text>
          <Text style={[styles.profileUsername, { color: textSecondary }]}>@{profile?.username}</Text>

          {profile?.bio && (
            <Text style={[styles.profileBio, { color: textSecondary }]}>{profile.bio}</Text>
          )}

          {/* INTERESTS */}
          {userInterests.length > 0 && (
            <View style={styles.interestsContainer}>
              {userInterests.map((cat) => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.interestChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={() => router.push({ pathname: '/(tabs)', params: { categoryId: cat.id } })}
                >
                  <Text style={styles.interestEmoji}>{cat.icon || '✨'}</Text>
                  <Text style={[styles.interestText, { color: textPrimary }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity 
            onPress={() => router.push('/profile/edit')} 
            style={[styles.mainEditBtn, { backgroundColor: accent }]}
            activeOpacity={0.8}
          >
            <Edit3 size={16} color="#fff" />
            <Text style={styles.mainEditBtnText}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* STATS */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textPrimary }]}>{eventsCount}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Eventos</Text>
          </View>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push(`/profile/${user?.id}/followers`)}
          >
            <Text style={[styles.statValue, { color: textPrimary }]}>{followersCount}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Seguidores</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push(`/profile/${user?.id}/following`)}
          >
            <Text style={[styles.statValue, { color: textPrimary }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Seguindo</Text>
          </TouchableOpacity>
        </View>

        {/* MODERN TABS */}
        <View style={styles.tabsContainer}>
          <View style={[styles.tabsTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <Animated.View 
              style={[
                styles.tabIndicator, 
                { 
                  backgroundColor: backgroundSecondary,
                  transform: [{ translateX: tabIndicatorPos }]
                }
              ]} 
            />
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabButton}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Icon size={18} color={isActive ? accent : textSecondary} />
                  <Text style={[styles.tabText, { color: isActive ? textPrimary : textSecondary }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* LIST */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Calendar size={40} color={textSecondary} strokeWidth={1} />
              </View>
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>Nada por aqui ainda</Text>
              <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
                Comece explorando a comunidade e participando de eventos incríveis!
              </Text>
            </View>
          ) : (
            <View style={styles.eventsGrid}>
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </View>
          )}
        </Animated.View>
      </Animated.ScrollView>
    </View>
    </PageTransition>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bannerContainer: { height: vs(180), width: '100%', position: 'absolute', top: 0 },
  topActions: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 100 },
  topActionsRight: { flexDirection: 'row', gap: 10 },
  glassBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  profileInfo: { alignItems: 'center', marginTop: vs(120), paddingHorizontal: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 20, elevation: 20, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  avatarGradient: { width: 130, height: 130, borderRadius: 65, padding: 4, justifyContent: 'center', alignItems: 'center' },
  avatarImg: { width: 122, height: 122, borderRadius: 61, borderWidth: 4, borderColor: '#fff' },
  avatarPlaceholder: { width: 122, height: 122, borderRadius: 61, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  avatarInitials: { fontSize: ms(48), fontWeight: '900', color: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#00d9ff', width: 32, height: 32, borderRadius: 16, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: ms(28), fontWeight: '900', letterSpacing: -1, marginBottom: 4 },
  profileUsername: { fontSize: ms(16), fontWeight: '600', marginBottom: 16 },
  profileBio: { fontSize: ms(15), textAlign: 'center', lineHeight: 22, marginBottom: 20, paddingHorizontal: 20 },
  interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 24 },
  interestChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 6 },
  interestEmoji: { fontSize: ms(16) },
  interestText: { fontSize: ms(13), fontWeight: '700' },
  mainEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, marginBottom: 32, elevation: 4 },
  mainEditBtnText: { color: '#fff', fontWeight: '800', fontSize: ms(14) },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 20, marginHorizontal: 20, marginBottom: 32 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: ms(22), fontWeight: '900' },
  statLabel: { fontSize: ms(12), fontWeight: '700', textTransform: 'uppercase', marginTop: 4, letterSpacing: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.1)' },
  tabsContainer: { paddingHorizontal: 16, marginBottom: 20 },
  tabsTrack: { flexDirection: 'row', borderRadius: 30, height: 56, padding: 4, position: 'relative' },
  tabIndicator: { position: 'absolute', top: 4, bottom: 4, left: 4, width: (Dimensions.get('window').width - 32) / 3 - 2.6, borderRadius: 26, elevation: 2 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabText: { fontSize: ms(13), fontWeight: '800' },
  eventsGrid: { gap: 16 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: ms(20), fontWeight: '900', marginBottom: 10 },
  emptySubtitle: { fontSize: ms(15), textAlign: 'center', lineHeight: 22 },
});
