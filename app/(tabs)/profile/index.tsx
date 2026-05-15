import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, RefreshControl,
  Animated, useWindowDimensions, Dimensions,
  Platform, Modal
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Event } from '@/types/database';
import { 
  LogOut, 
  Settings, 
  Calendar, 
  TrendingUp, 
  Sparkles, 
  Search, 
  Moon, 
  Sun, 
  Edit3, 
  Grid3X3, 
  Clock, 
  Award,
  ChevronRight,
  MapPin,
  Heart,
  Camera,
  Share2,
  Bookmark,
  Users,
  Star
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import EventCard from '@/components/EventCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '@/utils/responsive';
import { BlurView } from 'expo-blur';
import { useUI } from '@/contexts/UIContext';
import PageTransition from '@/components/PageTransition';
import FullscreenMediaViewer from '@/components/FullscreenMediaViewer';

type TabType = 'posts' | 'events' | 'achievements';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showTabBar } = useUI();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [events, setEvents] = useState<Event[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [userInterests, setUserInterests] = useState<any[]>([]);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [isViewerVisible, setIsViewerVisible] = useState(false);

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const tabIndicatorPos = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    showTabBar();
    if (user) {
      loadProfileData();
    }
  }, [user]);

  useEffect(() => {
    const tabIndex = activeTab === 'posts' ? 0 : activeTab === 'events' ? 1 : 2;
    Animated.spring(tabIndicatorPos, {
      toValue: tabIndex * ((SCREEN_WIDTH - 40) / 3),
      useNativeDriver: true,
      tension: 50,
      friction: 8
    }).start();
  }, [activeTab]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [f1, f2, catRes, postsRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user?.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user?.id),
        supabase.from('categories').select('*'),
        supabase.from('posts')
          .select('*, profiles:user_id (username, full_name, avatar_url)')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
      ]);

      setFollowersCount(f1.count || 0);
      setFollowingCount(f2.count || 0);
      setPosts(postsRes.data || []);

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
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, profiles:creator_id (id, username, full_name, avatar_url), categories:category_id (name, icon), subcategories:subcategory_id (name)')
        .eq('creator_id', user?.id)
        .order('event_date', { ascending: false });

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

    } catch (e) {
      console.error(e);
    }
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

  // Animation values
  const bannerHeight = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [vs(240), vs(120)],
    extrapolate: 'clamp',
  });

  // Track header visibility for pointerEvents
  scrollY.addListener(({ value }) => {
    if (value > 120 && !headerVisible) setHeaderVisible(true);
    else if (value <= 120 && headerVisible) setHeaderVisible(false);
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0.7],
    extrapolate: 'clamp',
  });

  const avatarTranslateY = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, -vs(40)],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [120, 180],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: backgroundPrimary }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <PageTransition>
      <View style={[styles.root, { backgroundColor: backgroundPrimary }]}>
        {/* SETTINGS MODAL */}
        <Modal
          visible={settingsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1} 
              onPress={() => setSettingsModalVisible(false)} 
            />
            <View style={[styles.settingsModal, { backgroundColor: backgroundSecondary }]}>
              <View style={[styles.modalIndicator, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
              <Text style={[styles.settingsTitle, { color: textPrimary }]}>Opções</Text>
              
              <TouchableOpacity 
                style={styles.settingsItem}
                onPress={() => {
                  setSettingsModalVisible(false);
                  router.push('/profile/edit');
                }}
              >
                <View style={[styles.settingsIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Edit3 size={20} color={accent} />
                </View>
                <Text style={[styles.settingsText, { color: textPrimary }]}>Editar Perfil</Text>
                <ChevronRight size={18} color={textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingsItem}
                onPress={() => {
                  toggleTheme();
                }}
              >
                <View style={[styles.settingsIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  {isDark ? <Sun size={20} color="#FFCC00" /> : <Moon size={20} color="#5856D6" />}
                </View>
                <Text style={[styles.settingsText, { color: textPrimary }]}>
                  Modo {isDark ? 'Claro' : 'Escuro'}
                </Text>
                <View style={[styles.themeToggleMini, { backgroundColor: isDark ? accent : '#D1D1D6' }]}>
                  <View style={[styles.themeToggleCircle, { transform: [{ translateX: isDark ? 16 : 0 }], backgroundColor: '#fff' }]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.settingsItem}
                onPress={() => {
                  setSettingsModalVisible(false);
                  router.push('/profile/notification-settings');
                }}
              >
                <View style={[styles.settingsIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Settings size={20} color={textSecondary} />
                </View>
                <Text style={[styles.settingsText, { color: textPrimary }]}>Configurações</Text>
                <ChevronRight size={18} color={textSecondary} />
              </TouchableOpacity>

              <View style={[styles.settingsDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />

              <TouchableOpacity 
                style={[styles.settingsItem, { marginTop: 10 }]}
                onPress={() => {
                  setSettingsModalVisible(false);
                  handleSignOut();
                }}
              >
                <View style={[styles.settingsIcon, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                  <LogOut size={20} color="#FF3B30" />
                </View>
                <Text style={[styles.settingsText, { color: '#FF3B30', fontWeight: '700' }]}>Sair da Conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* STICKY HEADER */}
        <Animated.View 
          pointerEvents={headerVisible ? 'auto' : 'none'}
          style={[
            styles.stickyHeader, 
            { 
              backgroundColor: backgroundSecondary, 
              paddingTop: insets.top,
              opacity: headerOpacity,
              borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              borderBottomWidth: 1,
            }
          ]}
        >
          <Text style={[styles.stickyTitle, { color: textPrimary }]}>{profile?.full_name}</Text>
        </Animated.View>

        <Animated.ScrollView
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
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
          {/* PREMIUM BANNER AREA */}
          <Animated.View style={[styles.heroContainer, { height: bannerHeight }]}>
            <LinearGradient 
              colors={[accent, '#7b2fff', '#ff1493']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 1 }} 
              style={StyleSheet.absoluteFill} 
            />
            {/* Overlay Pattern */}
            <View style={styles.bannerOverlay}>
              <View style={styles.patternCircle} />
            </View>

            {/* TOP ACTIONS */}
            <View style={[styles.topActions, { marginTop: insets.top + 10 }]}>
              <TouchableOpacity onPress={() => router.push('/search-users')} style={styles.glassBtn}>
                <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                <Search size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.topActionsRight}>
                <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={styles.glassBtn}>
                  <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                  <Settings size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* PROFILE CARD */}
          <View style={[styles.profileCard, { backgroundColor: backgroundSecondary }]}>
            <Animated.View 
              style={[
                styles.avatarContainer, 
                { 
                  transform: [
                    { scale: avatarScale },
                    { translateY: avatarTranslateY }
                  ] 
                }
              ]}
            >
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => profile?.avatar_url && setIsViewerVisible(true)}
              >
                <LinearGradient colors={[accent, '#ff1493']} style={styles.avatarBorder}>
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: backgroundPrimary }]}>
                      <Text style={[styles.avatarInitials, { color: accent }]}>{initials}</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              <View style={[styles.verifiedBadge, { backgroundColor: accent }]}>
                <Sparkles size={12} color="#fff" fill="#fff" />
              </View>
            </Animated.View>

            <View style={styles.infoSection}>
              <Text style={[styles.nameText, { color: textPrimary }]}>{profile?.full_name}</Text>
              <Text style={[styles.usernameText, { color: textSecondary }]}>@{profile?.username}</Text>
              
              {profile?.bio && (
                <Text style={[styles.bioText, { color: textPrimary }]}>{profile.bio}</Text>
              )}

              {/* STATS ROW */}
              <View style={styles.statsRow}>
                <TouchableOpacity style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: textPrimary }]}>{posts.length}</Text>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>Posts</Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                <TouchableOpacity 
                  style={styles.statBox}
                  onPress={() => router.push(`/profile/${user?.id}/followers`)}
                >
                  <Text style={[styles.statNumber, { color: textPrimary }]}>{followersCount}</Text>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>Seguidores</Text>
                </TouchableOpacity>
                <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                <TouchableOpacity 
                  style={styles.statBox}
                  onPress={() => router.push(`/profile/${user?.id}/following`)}
                >
                  <Text style={[styles.statNumber, { color: textPrimary }]}>{followingCount}</Text>
                  <Text style={[styles.statLabel, { color: textSecondary }]}>Seguindo</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* INTERESTS */}
            {userInterests.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.interestsScroll}
              >
                {userInterests.map((cat) => (
                  <View key={cat.id} style={[styles.interestTag, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <Text style={styles.tagEmoji}>{cat.icon || '✨'}</Text>
                    <Text style={[styles.tagText, { color: textSecondary }]}>{cat.name}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* TABS SELECTOR */}
          <View style={[styles.tabsWrapper, { backgroundColor: backgroundPrimary }]}>
            <View style={[styles.tabsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
              <Animated.View 
                style={[
                  styles.tabIndicator, 
                  { 
                    backgroundColor: backgroundSecondary,
                    transform: [{ translateX: tabIndicatorPos }]
                  }
                ]} 
              />
              <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('posts')}>
                <Grid3X3 size={20} color={activeTab === 'posts' ? accent : textSecondary} />
                <Text style={[styles.tabLabel, { color: activeTab === 'posts' ? textPrimary : textSecondary }]}>Mural</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('events')}>
                <Calendar size={20} color={activeTab === 'events' ? accent : textSecondary} />
                <Text style={[styles.tabLabel, { color: activeTab === 'events' ? textPrimary : textSecondary }]}>Experiências</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('achievements')}>
                <Award size={20} color={activeTab === 'achievements' ? accent : textSecondary} />
                <Text style={[styles.tabLabel, { color: activeTab === 'achievements' ? textPrimary : textSecondary }]}>Conquistas</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CONTENT AREA */}
          <View style={styles.contentArea}>
            {activeTab === 'posts' && (
              <View style={styles.postsGrid}>
                {posts.length > 0 ? (
                  posts.map((post, idx) => (
                    <TouchableOpacity 
                      key={post.id} 
                      style={styles.postThumbnail}
                    >
                      {post.image_url ? (
                        <Image source={{ uri: post.image_url }} style={styles.thumbnailImg} />
                      ) : (
                        <View style={[styles.thumbnailPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                          <Text style={[styles.thumbnailText, { color: textSecondary }]} numberOfLines={2}>{post.content}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyContent}>
                    <Camera size={48} color={textSecondary} strokeWidth={1} />
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>Crie sua primeira história</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Sua jornada começa quando você compartilha seu primeiro momento.</Text>
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
                    <Text style={[styles.emptyTitle, { color: textPrimary }]}>Nenhum evento ainda</Text>
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Participe de novas experiências e faça parte da comunidade.</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'achievements' && (
              <View style={styles.achievementsContainer}>
                {/* LEVEL CARD */}
                <View style={[styles.levelCard, { backgroundColor: backgroundSecondary }]}>
                  <View style={[styles.levelProgressContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <LinearGradient 
                      colors={[accent, '#7b2fff']} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 0 }} 
                      style={[styles.levelProgressBar, { width: '65%' }]}
                    />
                  </View>
                  <View style={styles.levelInfo}>
                    <View>
                      <Text style={[styles.levelLabel, { color: textSecondary }]}>Nível Atual</Text>
                      <Text style={[styles.levelValue, { color: textPrimary }]}>Explorador Lvl {profile?.level || 1}</Text>
                    </View>
                    <Text style={[styles.levelPoints, { color: accent }]}>650 / 1000 XP</Text>
                  </View>
                </View>

                {/* STATS GRID */}
                <View style={styles.reputationGrid}>
                  <View style={[styles.repCard, { backgroundColor: backgroundSecondary }]}>
                    <View style={[styles.repIcon, { backgroundColor: 'rgba(0, 217, 255, 0.1)' }]}>
                      <TrendingUp size={22} color={accent} />
                    </View>
                    <Text style={[styles.repValue, { color: textPrimary }]}>{profile?.total_points || 0}</Text>
                    <Text style={[styles.repLabel, { color: textSecondary }]}>UNNA Points</Text>
                  </View>
                  
                  <View style={[styles.repCard, { backgroundColor: backgroundSecondary }]}>
                    <View style={[styles.repIcon, { backgroundColor: (profile?.flaker_count || 0) > 0 ? 'rgba(255, 59, 48, 0.1)' : 'rgba(52, 199, 89, 0.1)' }]}>
                      {(profile?.flaker_count || 0) > 0 ? (
                        <Clock size={22} color="#FF3B30" />
                      ) : (
                        <Star size={22} color="#34C759" fill="#34C759" />
                      )}
                    </View>
                    <Text style={[styles.repValue, { color: (profile?.flaker_count || 0) > 0 ? '#FF3B30' : '#34C759' }]}>
                      {(profile?.flaker_count || 0) > 0 ? `${profile?.flaker_count} Furos` : 'Fiel ao Rolê'}
                    </Text>
                    <Text style={[styles.repLabel, { color: textSecondary }]}>Fura-ô-metro</Text>
                  </View>
                </View>

                {/* BADGES SECTION */}
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Selos Conquistados</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
                  <View style={styles.badgeItem}>
                    <View style={[styles.badgeCircle, { backgroundColor: '#FFD700' }]}>
                      <Award size={30} color="#fff" />
                    </View>
                    <Text style={[styles.badgeName, { color: textPrimary }]}>Pioneiro</Text>
                  </View>
                  <View style={styles.badgeItem}>
                    <View style={[styles.badgeCircle, { backgroundColor: '#C0C0C0' }]}>
                      <Users size={30} color="#fff" />
                    </View>
                    <Text style={[styles.badgeName, { color: textPrimary }]}>Anfitrião</Text>
                  </View>
                  <View style={styles.badgeItem}>
                    <View style={[styles.badgeCircle, { backgroundColor: '#CD7F32' }]}>
                      <TrendingUp size={30} color="#fff" />
                    </View>
                    <Text style={[styles.badgeName, { color: textPrimary }]}>Ativo</Text>
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </Animated.ScrollView>

        {profile?.avatar_url && (
          <FullscreenMediaViewer
            visible={isViewerVisible}
            onClose={() => setIsViewerVisible(false)}
            mediaUrls={[profile.avatar_url]}
            initialIndex={0}
          />
        )}
      </View>
    </PageTransition>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroContainer: { width: '100%', position: 'relative', overflow: 'hidden' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, opacity: 0.3 },
  patternCircle: { position: 'absolute', top: -100, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: '#fff', opacity: 0.15 },
  topActions: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 100 },
  topActionsRight: { flexDirection: 'row', gap: 10 },
  glassBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)' },
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200, height: vs(100), justifyContent: 'center', alignItems: 'center' },
  stickyTitle: { fontSize: ms(17), fontWeight: '800' },
  profileCard: { marginTop: -vs(40), borderTopLeftRadius: ms(40), borderTopRightRadius: ms(40), paddingHorizontal: 20, paddingBottom: 20 },
  avatarContainer: { alignSelf: 'center', marginTop: -vs(50), position: 'relative', zIndex: 10 },
  avatarBorder: { width: ms(120), height: ms(120), borderRadius: ms(60), padding: 4, justifyContent: 'center', alignItems: 'center', elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15 },
  avatarImg: { width: ms(112), height: ms(112), borderRadius: ms(56), borderWidth: 4, borderColor: '#fff' },
  avatarPlaceholder: { width: ms(112), height: ms(112), borderRadius: ms(56), justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  avatarInitials: { fontSize: ms(40), fontWeight: '900' },
  verifiedBadge: { position: 'absolute', bottom: 5, right: 5, width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  infoSection: { alignItems: 'center', marginTop: 15 },
  nameText: { fontSize: ms(24), fontWeight: '900', letterSpacing: -0.5 },
  usernameText: { fontSize: ms(15), opacity: 0.6, marginTop: 2, marginBottom: 15 },
  bioText: { fontSize: ms(14), textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 10, marginBottom: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: ms(20), fontWeight: '900' },
  statLabel: { fontSize: ms(11), opacity: 0.5, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: 1, height: 20, opacity: 0.3 },
  interestsScroll: { gap: 10, paddingBottom: 10 },
  interestTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  tagEmoji: { fontSize: ms(14) },
  tagText: { fontSize: ms(13), fontWeight: '700' },
  tabsWrapper: { paddingVertical: 15, paddingHorizontal: 20, zIndex: 10 },
  tabsContainer: { height: 56, borderRadius: 28, flexDirection: 'row', padding: 4, position: 'relative' },
  tabIndicator: { position: 'absolute', top: 4, bottom: 4, left: 4, width: (SCREEN_WIDTH - 40) / 3 - 2.6, borderRadius: 24, elevation: 3, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  tabLabel: { fontSize: ms(11), fontWeight: '800', textTransform: 'uppercase' },
  contentArea: { paddingHorizontal: 16 },
  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  postThumbnail: { width: (SCREEN_WIDTH - 32 - 16) / 3, height: (SCREEN_WIDTH - 32 - 16) / 3, borderRadius: 12, overflow: 'hidden' },
  thumbnailImg: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', padding: 10 },
  thumbnailText: { fontSize: ms(10), textAlign: 'center', fontWeight: '500' },
  eventsList: { gap: 16 },
  emptyContent: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: ms(18), fontWeight: '900', marginTop: 15, marginBottom: 8 },
  emptySubtitle: { fontSize: ms(14), textAlign: 'center', opacity: 0.6, lineHeight: 20 },

  // ACHIEVEMENTS STYLES
  achievementsContainer: { gap: 20, paddingTop: 10 },
  levelCard: { padding: 20, borderRadius: 24, gap: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  levelProgressContainer: { height: 8, width: '100%', borderRadius: 4, overflow: 'hidden' },
  levelProgressBar: { height: '100%', borderRadius: 4 },
  levelInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  levelLabel: { fontSize: ms(12), fontWeight: '600', marginBottom: 4 },
  levelValue: { fontSize: ms(18), fontWeight: '900' },
  levelPoints: { fontSize: ms(12), fontWeight: '800' },
  reputationGrid: { flexDirection: 'row', gap: 12 },
  repCard: { flex: 1, padding: 16, borderRadius: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  repIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  repValue: { fontSize: ms(16), fontWeight: '900' },
  repLabel: { fontSize: ms(11), fontWeight: '700', textTransform: 'uppercase', opacity: 0.5 },
  sectionTitle: { fontSize: ms(18), fontWeight: '900', marginTop: 10, marginBottom: 15 },
  badgesRow: { gap: 20, paddingBottom: 10 },
  badgeItem: { alignItems: 'center', gap: 8 },
  badgeCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
  badgeName: { fontSize: ms(12), fontWeight: '700' },
  
  // SETTINGS MODAL STYLES
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  settingsModal: { borderTopLeftRadius: ms(32), borderTopRightRadius: ms(32), paddingBottom: 40, paddingHorizontal: 20 },
  modalIndicator: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  settingsTitle: { fontSize: ms(20), fontWeight: '900', marginBottom: 20, paddingHorizontal: 10 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderRadius: 16, gap: 15 },
  settingsIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  settingsText: { flex: 1, fontSize: ms(15), fontWeight: '600' },
  settingsDivider: { height: 1, width: '100%', marginVertical: 10, opacity: 0.5 },
  themeToggleMini: { width: 44, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center' },
  themeToggleCircle: { width: 18, height: 18, borderRadius: 9, elevation: 2 },
});
