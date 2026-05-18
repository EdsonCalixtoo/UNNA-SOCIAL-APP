import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, RefreshControl,
  Animated, useWindowDimensions, Dimensions,
  Platform, Modal, Share, Linking
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
  Star,
  Trash2
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
import PremiumConfirmationModal from '@/components/PremiumConfirmationModal';
import AdminPanelModal from '@/components/AdminPanelModal';
import * as Haptics from 'expo-haptics';
import { ShieldCheck } from 'lucide-react-native';
import { hapticFeedback } from '@/utils/haptics';
import Skeleton from '@/components/Skeleton';

type TabType = 'posts' | 'events' | 'achievements';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showTabBar } = useUI();

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
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [events, setEvents] = useState<Event[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [userInterests, setUserInterests] = useState<any[]>([]);
  const [profileStats, setProfileStats] = useState<any>(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [selectedPostIdx, setSelectedPostIdx] = useState(0);
  const [isPostViewerVisible, setIsPostViewerVisible] = useState(false);
  const [isMemoryViewerVisible, setIsMemoryViewerVisible] = useState(false);
  const [selectedMemoryIdx, setSelectedMemoryIdx] = useState(0);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState<any>(null);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

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
      
      // Mostra no Mural: Absolutamente tudo que tem mídia (foto/vídeo)
      const filteredPosts = (postsRes.data || []).filter(p => !!p.image_url);
      setPosts(filteredPosts);

      // Memórias: apenas posts vinculados a eventos (excluindo anúncios de criação)
      const memPosts = (postsRes.data || []).filter(p => !!p.image_url && !!p.event_id && !p.content?.startsWith('Criei um novo evento'));
      if (memPosts.length > 0) {
        const eventIds = [...new Set(memPosts.map((p: any) => p.event_id))];
        const { data: eventsInfo } = await supabase
          .from('events')
          .select('id, title, event_date, location_name, categories(name, icon)')
          .in('id', eventIds);
        const eventsMap = Object.fromEntries((eventsInfo || []).map((e: any) => [e.id, e]));
        setMemories(memPosts.map((m: any) => {
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
        }));
      } else {
        setMemories([]);
      }

      if (profile?.preferred_categories && catRes.data) {
        const interests = catRes.data.filter(c => profile.preferred_categories?.includes(c.id));
        setUserInterests(interests);
      }

      const { data: stats } = await supabase.from('profile_stats').select('*').eq('user_id', user?.id).maybeSingle();
      if (stats) setProfileStats(stats);

      await loadEvents();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeletePost = async (post: any) => {
    setPostToDelete(post);
    setDeleteModalVisible(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const { error } = await supabase.from('posts').delete().eq('id', postToDelete.id);
      if (error) throw error;
      
      setDeleteModalVisible(false);
      setPostToDelete(null);
      loadProfileData(); // Atualiza o mural
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível apagar o post: ' + err.message);
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
    setLogoutModalVisible(true);
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : profile?.username?.charAt(0).toUpperCase() ?? '?';

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
      <View style={[styles.root, { backgroundColor: backgroundPrimary }]}>
        <View style={{ height: vs(240), width: '100%', backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0' }} />
        <View style={styles.profileCard}>
          <View style={{ alignSelf: 'center', marginTop: -vs(50) }}>
            <Skeleton width={ms(120)} height={ms(120)} borderRadius={ms(60)} />
          </View>
          <View style={{ alignItems: 'center', marginTop: 20, gap: 10 }}>
            <Skeleton width={200} height={30} />
            <Skeleton width={120} height={20} />
            <Skeleton width="80%" height={60} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 30 }}>
            <Skeleton width={80} height={50} />
            <Skeleton width={80} height={50} />
            <Skeleton width={80} height={50} />
          </View>
        </View>
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
                  setTimeout(async () => {
                    try {
                      await Share.share({
                        message: `Vem pro UNNA Social! Use meu convite para ganhar 500 UNNA Coins: https://unnasocial.app/invite/${user?.id}`,
                        title: 'Convite UNNA Social'
                      });
                      hapticFeedback.success();
                    } catch (e) {
                      console.error(e);
                    }
                  }, 700);
                }}
              >
                <View style={[styles.settingsIcon, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                  <Users size={20} color="#34C759" />
                </View>
                <Text style={[styles.settingsText, { color: textPrimary }]}>Convidar Amigos</Text>
                <ChevronRight size={18} color={textSecondary} />
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

              {(profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.username === 'unnasocialappoficial') && (
                <>
                  <View style={[styles.settingsDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} />
                  <TouchableOpacity 
                    style={styles.settingsItem}
                    onPress={() => {
                      setSettingsModalVisible(false);
                      setAdminModalVisible(true);
                    }}
                  >
                    <View style={[styles.settingsIcon, { backgroundColor: 'rgba(0, 217, 255, 0.1)' }]}>
                      <ShieldCheck size={20} color={accent} />
                    </View>
                    <Text style={[styles.settingsText, { color: textPrimary }]}>Painel Admin</Text>
                    <ChevronRight size={18} color={textSecondary} />
                  </TouchableOpacity>
                </>
              )}

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
              height: insets.top + vs(48),
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
            {profile?.cover_url ? (
              <Image 
                source={{ uri: profile.cover_url }} 
                style={StyleSheet.absoluteFill} 
                resizeMode="cover"
              />
            ) : (
              <LinearGradient 
                colors={[accent, '#7b2fff', '#ff1493']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={StyleSheet.absoluteFill} 
              />
            )}
            {/* Overlay Pattern */}
            {!profile?.cover_url && (
              <View style={styles.bannerOverlay}>
                <View style={styles.patternCircle} />
              </View>
            )}

            {/* TOP ACTIONS */}
            <View style={[styles.topActions, { marginTop: insets.top + 6 }]}>
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
              {profile?.is_verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: accent }]}>
                  <Sparkles size={12} color="#fff" fill="#fff" />
                </View>
              )}
            </Animated.View>

            <View style={styles.infoSection}>
              <Text style={[styles.nameText, { color: textPrimary }]}>{profile?.full_name}</Text>
              <Text style={[styles.usernameText, { color: textSecondary }]}>@{profile?.username}</Text>
              
              {profile?.bio && (
                <Text style={[styles.bioText, { color: textPrimary }]}>{profile.bio}</Text>
              )}

              {profile?.birth_date && (
                <View style={[styles.birthdayContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                  <Text style={[styles.birthdayText, { color: textPrimary }]}>🎂 {formatBirthDate(profile.birth_date)}</Text>
                </View>
              )}

              {/* LINKS SOCIAIS CARD */}
              {(profile?.instagram_url || profile?.website_url) ? (
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
              <TouchableOpacity style={styles.tabItem} onPress={() => { hapticFeedback.selection(); setActiveTab('posts'); }}>
                <Grid3X3 size={20} color={activeTab === 'posts' ? accent : textSecondary} />
                <Text style={[styles.tabLabel, { color: activeTab === 'posts' ? textPrimary : textSecondary }]}>Mural</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabItem} onPress={() => { hapticFeedback.selection(); setActiveTab('events'); }}>
                <Calendar size={20} color={activeTab === 'events' ? accent : textSecondary} />
                <Text style={[styles.tabLabel, { color: activeTab === 'events' ? textPrimary : textSecondary }]}>Experiências</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tabItem} onPress={() => { hapticFeedback.selection(); setActiveTab('achievements'); }}>
                <Award size={20} color={activeTab === 'achievements' ? accent : textSecondary} />
                <Text style={[styles.tabLabel, { color: activeTab === 'achievements' ? textPrimary : textSecondary }]}>Conquistas</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CONTENT AREA */}
          <View style={styles.contentArea}>
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
                    <Text style={[styles.emptySubtitle, { color: textSecondary }]}>Participe de eventos e poste fotos lá para criar seu mural de memórias! 📸</Text>
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
                {/* LEVEL CARD - GLASSMORPHISM STYLE */}
                <LinearGradient
                  colors={isDark ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)'] : ['#fff', '#f0f0f0']}
                  style={[styles.levelCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                >
                  <View style={styles.levelHeader}>
                    <View style={[styles.levelIconContainer, { backgroundColor: accent + '20' }]}>
                      <TrendingUp size={24} color={accent} />
                    </View>
                    <View style={styles.levelMainInfo}>
                      <Text style={[styles.levelLabel, { color: textSecondary }]}>Ranking Atual</Text>
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
                    <View style={styles.progressLabels}>
                      <Text style={[styles.progressText, { color: textSecondary }]}>{profileStats?.xp % 100 || 0}/100 para o próximo nível</Text>
                    </View>
                  </View>
                </LinearGradient>

                {/* STATS GRID - NEOMORPHIC CARDS */}
                <View style={styles.reputationGrid}>
                  <TouchableOpacity style={[styles.repCard, { backgroundColor: backgroundSecondary }]}>
                    <LinearGradient
                      colors={['rgba(255, 215, 0, 0.2)', 'transparent']}
                      style={styles.repGradient}
                    />
                    <View style={[styles.repIcon, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                      <TrendingUp size={20} color="#FFD700" />
                    </View>
                    <Text style={[styles.repValue, { color: textPrimary }]}>{profileStats?.coins || 0}</Text>
                    <Text style={[styles.repLabel, { color: textSecondary }]}>UNNA Coins</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.repCard, { backgroundColor: backgroundSecondary }]}>
                     <LinearGradient
                      colors={[(profile?.flaker_count || 0) > 0 ? 'rgba(255, 59, 48, 0.2)' : 'rgba(52, 199, 89, 0.2)', 'transparent']}
                      style={styles.repGradient}
                    />
                    <View style={[styles.repIcon, { backgroundColor: (profile?.flaker_count || 0) > 0 ? 'rgba(255, 59, 48, 0.15)' : 'rgba(52, 199, 89, 0.15)' }]}>
                      {(profile?.flaker_count || 0) > 0 ? (
                        <Clock size={20} color="#FF3B30" />
                      ) : (
                        <Star size={20} color="#34C759" fill="#34C759" />
                      )}
                    </View>
                    <Text style={[styles.repValue, { color: textPrimary }]}>
                      {(profile?.flaker_count || 0) > 0 ? `${profile?.flaker_count} Furos` : 'Fiel ao Rolê'}
                    </Text>
                    <Text style={[styles.repLabel, { color: textSecondary }]}>Fura-ô-metro</Text>
                  </TouchableOpacity>
                </View>

                {/* BADGES SECTION */}
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: textPrimary }]}>Selos de Conquista</Text>
                  <TouchableOpacity><Text style={{ color: accent, fontWeight: '700', fontSize: 12 }}>Ver Todos</Text></TouchableOpacity>
                </View>

                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.badgesRow}
                >
                  {/* Pioneiro */}
                  <View style={styles.badgeItem}>
                    <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.badgeCircle}>
                      <Award size={32} color="#fff" />
                    </LinearGradient>
                    <Text style={[styles.badgeName, { color: textPrimary }]}>Pioneiro</Text>
                  </View>

                  {/* Anfitrião */}
                  <View style={styles.badgeItem}>
                    <LinearGradient colors={['#7b2fff', '#5856D6']} style={styles.badgeCircle}>
                      <Users size={32} color="#fff" />
                    </LinearGradient>
                    <Text style={[styles.badgeName, { color: textPrimary }]}>Anfitrião</Text>
                  </View>

                  {/* Ativo */}
                  <View style={styles.badgeItem}>
                    <LinearGradient colors={['#FF3B30', '#FF2D55']} style={styles.badgeCircle}>
                      <TrendingUp size={32} color="#fff" />
                    </LinearGradient>
                    <Text style={[styles.badgeName, { color: textPrimary }]}>Ativo</Text>
                  </View>

                  {/* VIP (Exemplo de novo selo) */}
                  <View style={styles.badgeItem}>
                    <LinearGradient colors={['#00d9ff', '#007AFF']} style={styles.badgeCircle}>
                      <Sparkles size={32} color="#fff" />
                    </LinearGradient>
                    <Text style={[styles.badgeName, { color: textPrimary }]}>VIP Member</Text>
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
        <PremiumConfirmationModal
          visible={deleteModalVisible}
          title="Remover do Mural"
          description="Deseja excluir esta publicação permanentemente do seu mural?"
          confirmText="Excluir"
          cancelText="Agora não"
          onConfirm={confirmDeletePost}
          onCancel={() => setDeleteModalVisible(false)}
        />

        <PremiumConfirmationModal
          visible={logoutModalVisible}
          title="Sair da Conta?"
          description="Você precisará fazer login novamente para acessar seus rolês, eventos e grupos."
          confirmText="Sair"
          cancelText="Voltar"
          onConfirm={async () => {
            setLogoutModalVisible(false);
            await signOut();
            router.replace('/(auth)');
          }}
          onCancel={() => setLogoutModalVisible(false)}
          isDestructive
        />

        <AdminPanelModal
          visible={adminModalVisible}
          onClose={() => setAdminModalVisible(false)}
        />
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
  stickyHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 200, justifyContent: 'center', alignItems: 'center' },
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
  levelCard: { 
    padding: 20, 
    borderRadius: 28, 
    gap: 20, 
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  levelIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center'
  },
  levelMainInfo: {
    flex: 1
  },
  xpBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 217, 255, 0.1)'
  },
  xpBadgeText: {
    color: '#00d9ff',
    fontSize: 12,
    fontWeight: '900'
  },
  progressWrapper: {
    gap: 10
  },
  levelProgressContainer: { height: 10, width: '100%', borderRadius: 5, overflow: 'hidden' },
  levelProgressBar: { height: '100%', borderRadius: 5 },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600'
  },
  levelLabel: { fontSize: ms(12), fontWeight: '600', marginBottom: 2 },
  levelValue: { fontSize: ms(20), fontWeight: '900', letterSpacing: -0.5 },
  reputationGrid: { flexDirection: 'row', gap: 12 },
  repCard: { 
    flex: 1, 
    padding: 20, 
    borderRadius: 28, 
    alignItems: 'center', 
    gap: 10, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    position: 'relative'
  },
  repGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%'
  },
  repIcon: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  repValue: { fontSize: ms(18), fontWeight: '900' },
  repLabel: { fontSize: ms(11), fontWeight: '700', textTransform: 'uppercase', opacity: 0.5 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4
  },
  sectionTitle: { fontSize: ms(18), fontWeight: '900' },
  badgesRow: { gap: 18, paddingBottom: 10, paddingHorizontal: 4 },
  badgeItem: { alignItems: 'center', gap: 10 },
  badgeCircle: { 
    width: 76, 
    height: 76, 
    borderRadius: 38, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  badgeName: { fontSize: ms(12), fontWeight: '800' },
  
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
  postThumbnailContainer: { 
    width: (SCREEN_WIDTH - 40) / 3, 
    height: (SCREEN_WIDTH - 40) / 3,
    marginBottom: 2,
    position: 'relative'
  },
  deletePostBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  // Mural de Memórias - Polaroid Premium
  memoryYearDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16, marginHorizontal: 4 },
  memoryYearLine: { flex: 1, height: 1 },
  memoryYearText: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
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
  socialSectionCard: {
    width: '100%',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 16,
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
