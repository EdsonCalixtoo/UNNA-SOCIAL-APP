import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Image, Modal, ScrollView, Platform, Dimensions, AppState, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Post, Category, Subcategory } from '@/types/database';
import { useLanguage } from '@/lib/i18n';
import StoriesBar from '@/components/StoriesBar';
import PostCard from '@/components/PostCard';
import EventCard from '@/components/EventCard';
import { EventCardSkeleton } from '@/components/Skeleton';
import { EventParticipantsModal } from '@/components/EventParticipantsModal';
import CommentsModal from '@/components/CommentsModal';
import { ListFilter as Filter, X, Calendar, ChevronRight, Bell, MessageCircle, MapPin, Search } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/utils/responsive';
import PageTransition from '@/components/PageTransition';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  runOnJS
} from 'react-native-reanimated';
import { useUI } from '@/contexts/UIContext';
import { notifyEventLike } from '@/lib/notifications';
import { mapService } from '@/services/mapService';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { soundService } from '@/utils/soundService';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList as any) as any;

const { width } = Dimensions.get('window');

interface ExtendedPost {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  event_id?: string;
  created_at: string;
  is_liked?: boolean;
  likes_count?: number;
  profiles?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  events?: {
    id: string;
    creator_id: string;
    title: string;
    description: string;
    image_url?: string;
    event_date: string;
    event_time: string;
    location_name: string;
    max_participants: number;
    is_paid: boolean;
    price: number;
    category_id?: string;
    subcategory_id?: string;
    is_liked?: boolean;
    likes_count?: number;
    participants_count?: number;
    created_at: string;
    updated_at: string;
    categories?: {
      id: string;
      name: string;
      icon?: string;
      created_at: string;
    };
    subcategories?: {
      id: string;
      category_id: string;
      name: string;
      created_at: string;
    };
    profiles?: {
      id: string;
      username: string;
      full_name: string;
      avatar_url?: string;
      is_verified?: boolean;
      bio?: string;
      is_private?: boolean;
      primary_color?: string;
      secondary_color?: string;
      accent_color?: string;
      preferred_categories?: string[];
      onboarding_completed?: boolean;
      created_at: string;
      updated_at: string;
    };
  };
}

export default function Feed() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isDark, accent, backgroundPrimary, backgroundSecondary, textPrimary, textSecondary } = useTheme();
  const [showConfetti, setShowConfetti] = useState(false);
  const params = useLocalSearchParams();
  const [posts, setPosts] = useState<ExtendedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [selectedEventIdForParticipants, setSelectedEventIdForParticipants] = useState<string | null>(null);
  const [commentsEventId, setCommentsEventId] = useState<string | null>(null);
  const [visibleItems, setVisibleItems] = useState<string[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(0);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchWidth = useSharedValue(0);

  const toggleSearch = () => {
    if (searchExpanded) {
      searchWidth.value = withTiming(0, { duration: 300 });
      setTimeout(() => setSearchExpanded(false), 300);
      setSearchQuery('');
    } else {
      setSearchExpanded(true);
      searchWidth.value = withTiming(width - s(140), { duration: 300 });
    }
  };

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    width: searchWidth.value,
    opacity: searchWidth.value > 10 ? 1 : 0,
    overflow: 'hidden'
  }));

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 15;

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => {
      appStateSubscription.remove();
    };
  }, []);

  const listRef = useRef(null);
  useScrollToTop(listRef);

  const scrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = insets.top + vs(44);

  const { hideTabBar, showTabBar } = useUI();

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;
      
      if (currentY > HEADER_HEIGHT) {
        headerTranslateY.value = withTiming(diff > 0 ? -HEADER_HEIGHT : 0, { duration: 300 });
        
        if (diff > 10 && currentY > 100) {
          runOnJS(hideTabBar)();
        } else if (diff < -10) {
          runOnJS(showTabBar)();
        }
      } else {
        headerTranslateY.value = withTiming(0, { duration: 300 });
        runOnJS(showTabBar)();
      }
      
      scrollY.value = currentY;
      lastScrollY.value = currentY;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    opacity: interpolate(headerTranslateY.value, [-HEADER_HEIGHT, 0], [0, 1], Extrapolation.CLAMP),
  }));


  useEffect(() => {
    loadUnreadNotifications();
    loadUnreadMessages();
    
    const instanceId = Math.random().toString(36).substring(7);

    const notificationSubscription = supabase
      .channel(`notifications-badge:${user?.id}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          loadUnreadNotifications();
        }
      )
      .subscribe();

    const eventsSubscription = supabase
      .channel(`events-realtime:${user?.id}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    const postsSubscription = supabase
      .channel(`posts-realtime:${user?.id}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    const interactionsSubscription = supabase
      .channel(`interactions-realtime:${user?.id}:${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_likes' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => loadPosts())
      .subscribe();

    const messagesSubscription = supabase
      .channel(`messages-badge:${user?.id}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationSubscription);
      supabase.removeChannel(eventsSubscription);
      supabase.removeChannel(postsSubscription);
      supabase.removeChannel(interactionsSubscription);
      supabase.removeChannel(messagesSubscription);
    };
  }, [user]);

  const loadUnreadMessages = async () => {
    if (!user) return;
    try {
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
        
      const myConvIds = myConvs?.map(c => c.conversation_id) || [];
      
      if (myConvIds.length === 0) {
        setUnreadMessagesCount(0);
        return;
      }

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', myConvIds)
        .neq('sender_id', user.id)
        .eq('read', false);
        
      setUnreadMessagesCount(count || 0);
    } catch (error) {
      console.error('Error loading unread messages:', error);
    }
  };

  const loadUnreadNotifications = async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('type', 'message')
        .neq('type', 'new_message')
        .neq('title', 'Nova mensagem')
        .eq('read', false);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread notifications:', error);
    }
  };

  useEffect(() => {
    loadCategories();
    loadPosts();
  }, []);

  useEffect(() => {
    if (params.filterCategoryId) {
      const categoryId = params.filterCategoryId as string;
      setSelectedCategories([categoryId]);
      setExpandedCategory(categoryId);

      if (params.filterSubcategoryId) {
        setSelectedSubcategories([params.filterSubcategoryId as string]);
      } else {
        setSelectedSubcategories([]);
      }
    }
  }, [params.filterCategoryId, params.filterSubcategoryId]);

  useEffect(() => {
    if (showFilters) {
      loadCategories();
    }
  }, [showFilters]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setPosts([]);
    loadPosts(0, true);
  }, [selectedCategories, selectedSubcategories, dateFilter, searchRadius]);

  // User preferences are no longer loaded here to avoid automatically filtering the feed

  const loadCategories = async () => {
    try {
      const [categoriesRes, subcategoriesRes] = await Promise.all([
        supabase.from('categories').select('*').order('order'),
        supabase.from('subcategories').select('*').order('name')
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (subcategoriesRes.error) throw subcategoriesRes.error;

      setCategories(categoriesRes.data || []);
      setSubcategories(subcategoriesRes.data || []);
    } catch (error) {
      console.error('Error loading categories and subcategories:', error);
    }
  };

  const loadPosts = async (currentPage = page, isRefresh = false) => {
    if (loading && !isRefresh) return;
    if (!isRefresh && !hasMore) return;
    
    if (isRefresh) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Pegar todas as curtidas do usuário de uma vez
      let userEventLikesSet = new Set<string>();
      let userPostLikesSet = new Set<string>();
      
      if (user) {
        const [uEventLikes, uPostLikes] = await Promise.all([
          supabase.from('event_likes').select('event_id').eq('user_id', user.id),
          supabase.from('post_likes').select('post_id').eq('user_id', user.id)
        ]);
        userEventLikesSet = new Set(uEventLikes.data?.map(l => l.event_id) || []);
        userPostLikesSet = new Set(uPostLikes.data?.map(l => l.post_id) || []);
      }

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          likes:post_likes(count),
          profiles:user_id (id, username, full_name, avatar_url, is_verified),
          events:event_id (
            id, title, description, image_url, image_urls, media_types, event_date, event_time, 
            location_name, latitude, longitude, max_participants, is_paid, price, 
            category_id, subcategory_id, created_at,
            categories:category_id (name, icon),
            subcategories:subcategory_id (name),
            profiles:creator_id (id, username, full_name, avatar_url, is_verified),
            likes:event_likes(count),
            comments:event_comments(count),
            participants:event_participants(count)
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (postsError) throw postsError;

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          likes:event_likes(count),
          comments:event_comments(count),
          participants:event_participants(count),
          categories:category_id (name, icon),
          subcategories:subcategory_id (name),
          profiles:creator_id (id, username, full_name, avatar_url, is_verified)
        `)
        .eq('type', 'event')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .range(from, to);

      if (eventsError) throw eventsError;

      const eventIdsInPosts = new Set(postsData?.map(p => p.event_id).filter(Boolean));
      
      const uniqueEvents = (eventsData || [])
        .filter(e => !eventIdsInPosts.has(e.id))
        .map(e => ({
          id: `event-only-${e.id}`,
          user_id: e.creator_id,
          content: 'Evento disponível',
          created_at: e.created_at,
          event_id: e.id,
          events: e,
          profiles: e.profiles
        }));

      let combinedData = [...(postsData || []), ...uniqueEvents];
      
      // Filter out memory posts from the feed so they don't duplicate the event
      let filteredData = combinedData.filter(post => !(post.event_id && post.content === 'Memória do evento! 📸'));

      if (selectedCategories.length > 0) {
        filteredData = filteredData.filter(post =>
          post.events?.category_id && selectedCategories.includes(post.events.category_id)
        );
      }

      if (selectedSubcategories.length > 0) {
        filteredData = filteredData.filter(post =>
          post.events?.subcategory_id && selectedSubcategories.includes(post.events.subcategory_id)
        );
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        filteredData = filteredData.filter(post => {
          if (!post.events?.event_date) return true;
          const eventDate = new Date(post.events.event_date);

          switch (dateFilter) {
            case 'today':
              return eventDate.toDateString() === now.toDateString();
            case 'week':
              const weekFromNow = new Date(now);
              weekFromNow.setDate(now.getDate() + 7);
              return eventDate >= now && eventDate <= weekFromNow;
            case 'month':
              const monthFromNow = new Date(now);
              monthFromNow.setMonth(now.getMonth() + 1);
              return eventDate >= now && eventDate <= monthFromNow;
            default:
              return true;
          }
        });
      }

      let currentLoc = userLoc;
      if (!currentLoc) {
        currentLoc = await mapService.getUserLocation();
        if (currentLoc) setUserLoc(currentLoc);
      }

      if (currentLoc && searchRadius > 0) {
        filteredData = filteredData.filter(post => {
          const eventLat = post.events?.latitude;
          const eventLon = post.events?.longitude;
          if (eventLat && eventLon) {
             const dist = mapService.getDistanceInKm(currentLoc!.latitude, currentLoc!.longitude, parseFloat(String(eventLat)), parseFloat(String(eventLon)));
             return dist <= searchRadius;
          }
          return true;
        });
      }

      // NO MORE N+1 PROMISE.ALL HERE!
      const processedPosts = filteredData
        .filter(post => {
          const isAutoPost = post.content?.includes('Criei um novo evento') || post.content?.includes('Publiquei algo novo');
          if (isAutoPost && post.event_id && (!post.events || !post.events.id)) return false;
          return post && post.profiles;
        })
        .map(post => {
          const isEventPost = !!post.event_id && !!post.events;
          
          let pLikesCount = 0;
          if (post.likes && Array.isArray(post.likes)) pLikesCount = post.likes[0]?.count || 0;
          
          let eLikesCount = 0;
          let eCommentsCount = 0;
          let eParticipantsCount = 0;
          
          if (post.events) {
            if (post.events.likes && Array.isArray(post.events.likes)) eLikesCount = post.events.likes[0]?.count || 0;
            if (post.events.comments && Array.isArray(post.events.comments)) eCommentsCount = post.events.comments[0]?.count || 0;
            if (post.events.participants && Array.isArray(post.events.participants)) eParticipantsCount = post.events.participants[0]?.count || 0;
          }

          return {
            ...post,
            likes_count: isEventPost ? eLikesCount : pLikesCount,
            comments_count: isEventPost ? eCommentsCount : 0,
            participants_count: isEventPost ? eParticipantsCount : 0,
            is_liked: isEventPost ? userEventLikesSet.has(post.events!.id) : userPostLikesSet.has(post.id),
            events: post.events ? {
              ...post.events,
              likes_count: eLikesCount,
              comments_count: eCommentsCount,
              participants_count: eParticipantsCount,
              is_liked: userEventLikesSet.has(post.events.id)
            } : undefined
          };
        });

      const newPosts = processedPosts.sort((a, b) => {
        const aMatches = a.events?.category_id && selectedCategories.includes(a.events.category_id);
        const bMatches = b.events?.category_id && selectedCategories.includes(b.events.category_id);
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      if (isRefresh) {
        setPosts(newPosts);
      } else {
        setPosts(prev => {
          // Remove duplicates
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newPosts.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
      }

      setHasMore(postsData!.length === PAGE_SIZE || eventsData!.length === PAGE_SIZE);
      
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && !loading) {
      setPage(prev => prev + 1);
      loadPosts(page + 1, false);
    }
  };;

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    soundService.play('pop');
    setPage(0);
    loadPosts(0, true);
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    const ids = viewableItems.map((item: any) => item.key);
    setVisibleItems(ids);

    if (viewableItems && viewableItems.length > 0) {
      const activeItem = viewableItems[0];
      setActiveVideoId(activeItem.key);
    } else {
      setActiveVideoId(null);
    }
  }, []);

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50,
  }), []);

  const handleLike = async (id: string, isLiked: boolean) => {
    if (!user) return;

    const targetPost = posts.find(p => p.id === id || p.events?.id === id);
    const isEvent = !!targetPost?.events && targetPost.events.id === id;

    if (isEvent) {
      if (isLiked) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await supabase.from('event_likes').delete().eq('event_id', id).eq('user_id', user.id);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await supabase.from('event_likes').insert({ event_id: id, user_id: user.id });
        
        if (targetPost?.events) {
          notifyEventLike(
            id, 
            user.id, 
            (targetPost.events as any).creator_id, 
            (targetPost.events as any).title
          );
        }
      }

    } else {
      if (isLiked) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', user.id);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await supabase.from('post_likes').insert({ post_id: id, user_id: user.id });
      }
    }

    setPosts(posts.map(p => {
      if (isEvent && p.events?.id === id) {
        const isLikedNow = !isLiked;
      
        if (isLikedNow) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return {
          ...p,
          events: {
            ...p.events,
            is_liked: !isLiked,
            likes_count: isLiked ? (p.events.likes_count || 1) - 1 : (p.events.likes_count || 0) + 1
          }
        };
      } else if (!isEvent && p.id === id) {
        return {
          ...p,
          is_liked: !isLiked,
          likes_count: isLiked ? (p.likes_count || 1) - 1 : (p.likes_count || 0) + 1
        };
      }
      return p;
    }));
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isItemActive = activeVideoId === item.id && appState === 'active';
    return (
      <View>
        {item.events ? (
          <EventCard 
            event={item.events} 
            onLike={handleLike}
            onParticipantsPress={(id) => {
              setSelectedEventIdForParticipants(id);
              setParticipantsModalVisible(true);
            }}
            onCommentPress={(id) => setCommentsEventId(id)}
            isVisible={isItemActive} 
          />
        ) : (
          <PostCard 
            post={item} 
            onLike={handleLike} 
            isVisible={isItemActive}
          />
        )}
      </View>
    );
  };

  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    const lowerQuery = searchQuery.toLowerCase();
    return posts.filter((post: any) => {
      const isEvent = !!post.events;
      const target = isEvent ? post.events : post;
      
      const titleMatch = target.title?.toLowerCase().includes(lowerQuery);
      const descMatch = target.description?.toLowerCase().includes(lowerQuery);
      const locMatch = target.location_name?.toLowerCase().includes(lowerQuery);
      const categoryMatch = target.categories?.name?.toLowerCase().includes(lowerQuery);
      
      return titleMatch || descMatch || locMatch || categoryMatch;
    });
  }, [posts, searchQuery]);

  return (
    <PageTransition>
      <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <Animated.View style={[
        styles.header, 
        headerAnimatedStyle, 
        { 
          backgroundColor: backgroundSecondary, 
          borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', 
          borderBottomWidth: 1,
          height: HEADER_HEIGHT,
          paddingTop: insets.top,
          paddingHorizontal: s(12),
        }
      ]}>
        <View style={styles.headerLeft}>
          {!searchExpanded && (
            <>
              <Image
                source={require('@/assets/images/icone.jpg')}
                style={styles.logoImage}
              />
              <Text style={[styles.logo, { color: textPrimary }]} numberOfLines={1}>U<Text style={styles.logoSpecial}>N</Text><Text style={styles.logoPink}>И</Text>A</Text>
            </>
          )}
        </View>
        <View style={styles.headerRight}>
          <Animated.View style={[searchAnimatedStyle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderRadius: 20, height: 36, justifyContent: 'center', marginRight: 8 }]}>
            <TextInput
              placeholder="Buscar..."
              placeholderTextColor={textSecondary}
              style={{ color: textPrimary, paddingHorizontal: 16, height: '100%', fontFamily: 'Inter-Medium', fontSize: 14 }}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={searchExpanded}
            />
          </Animated.View>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.08)' : 'rgba(0, 217, 255, 0.12)', borderColor: isDark ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 217, 255, 0.3)' }]}
            onPress={toggleSearch}
          >
            {searchExpanded ? <X size={18} color={accent} /> : <Search size={18} color={accent} />}
          </TouchableOpacity>
          
          {!searchExpanded && (
            <>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.08)' : 'rgba(0, 217, 255, 0.12)', borderColor: isDark ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 217, 255, 0.3)' }]}
                onPress={() => router.push('/messages')}
              >
                <MessageCircle size={18} color={accent} />
                {unreadMessagesCount > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: accent }]}>
                    <Text style={styles.notificationBadgeText}>{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.08)' : 'rgba(0, 217, 255, 0.12)', borderColor: isDark ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 217, 255, 0.3)' }]}
                onPress={() => router.push('/notifications')}
              >
                <Bell size={18} color={accent} />
                {unreadCount > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: accent }]}>
                    <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, (selectedCategories.length > 0 || dateFilter !== 'all') && styles.filterButtonActive, { backgroundColor: (selectedCategories.length > 0 || dateFilter !== 'all') ? accent : (isDark ? 'rgba(0, 217, 255, 0.08)' : 'rgba(0, 217, 255, 0.12)'), borderColor: accent }]}
                onPress={() => setShowFilters(true)}
              >
                <Filter size={18} color={(selectedCategories.length > 0 || dateFilter !== 'all') ? '#fff' : accent} />
                {(selectedCategories.length > 0 || dateFilter !== 'all') && (
                  <View style={styles.filterBadge} />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>

      {/* @ts-ignore - Reanimated drops FlashList typings */}
      <AnimatedFlashList
        ref={listRef as any}
        data={filteredPosts}
        keyExtractor={(item: any) => item.id}
        estimatedItemSize={500}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={{ padding: 20 }}>
              <ActivityIndicator color={accent} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View>
            <StoriesBar />
          </View>
        }
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListEmptyComponent={
          loading ? (
            <View style={{ width: '100%' }}>
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 120 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                <Search size={32} color={accent} opacity={0.7} />
              </View>
              <Text style={{ color: textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>Vazio por aqui</Text>
              <Text style={{ color: textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
                {t('feed.noPosts', 'Ajuste seus filtros ou procure em outras categorias para descobrir eventos incríveis.')}
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            tintColor={accent} 
            colors={[accent]}
            progressViewOffset={HEADER_HEIGHT + vs(10)}
          />
        }
        contentContainerStyle={[
          styles.listContent, 
          { 
            paddingTop: HEADER_HEIGHT,
            paddingBottom: vs(120) // Aumentado para o fade
          }
        ]}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Invisible Fade na parte inferior da lista */}
      <LinearGradient
        colors={[isDark ? 'rgba(28,28,30,0)' : 'rgba(255,255,255,0)', backgroundPrimary]}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: vs(100),
          pointerEvents: 'none',
          zIndex: 10
        }}
      />

        {showConfetti && (
          <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', zIndex: 9999 }]}>
            <LottieView
              source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_u4yrau.json' }}
              autoPlay
              loop={false}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        )}

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowFilters(false)} 
          />
          <View 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: backgroundSecondary, 
                borderTopLeftRadius: ms(32), 
                borderTopRightRadius: ms(32),
                paddingBottom: insets.bottom > 0 ? insets.bottom : vs(15)
              }
            ]}
          >
            <View style={styles.modalIndicator} />
            
            <View style={[styles.modalHeader, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>{t('home.filterExperiences', 'Filtrar Experiências')}</Text>
                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>{t('home.searchGuide', 'Encontre exatamente o que você busca')}</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowFilters(false)}
                style={[styles.modalCloseButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
              >
                <X size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Calendar size={18} color={accent} />
                  <Text style={[styles.filterSectionTitle, { color: textSecondary }]}>{t('home.when', 'Quando?')}</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.dateChipsContainer}
                >
                  {[
                    { key: 'all', label: t('date.all', 'Tudo') },
                    { key: 'today', label: t('date.today', 'Hoje') },
                    { key: 'week', label: t('date.week', 'Esta Semana') },
                    { key: 'month', label: t('date.month', 'Este Mês') }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.dateChip, 
                        dateFilter === option.key && { backgroundColor: accent, borderColor: accent },
                        { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => {
                        setDateFilter(option.key as any);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[
                        styles.dateChipText, 
                        { color: textSecondary }, 
                        dateFilter === option.key && { color: '#fff', fontWeight: '800' }
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <MapPin size={18} color={accent} />
                  <Text style={[styles.filterSectionTitle, { color: textSecondary }]}>{t('home.maxDistance', 'Distância Máxima')}</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.dateChipsContainer}
                >
                  {[
                    { value: 10, label: '10 km' },
                    { value: 50, label: '50 km' },
                    { value: 100, label: '100 km' },
                    { value: 500, label: '500 km' },
                    { value: 0, label: t('home.any', 'Qualquer') }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dateChip, 
                        searchRadius === option.value && { backgroundColor: accent, borderColor: accent },
                        { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => {
                        setSearchRadius(option.value);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[
                        styles.dateChipText, 
                        { color: textSecondary }, 
                        searchRadius === option.value && { color: '#fff', fontWeight: '800' }
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Filter size={18} color={accent} />
                  <Text style={[styles.filterSectionTitle, { color: textSecondary }]}>{t('home.interests', 'O que te interessa?')}</Text>
                </View>
                <View style={styles.modernCategoryList}>
                  {categories.map((category) => {
                    const isExpanded = expandedCategory === category.id;
                    const isSelected = selectedCategories.includes(category.id);
                    const categorySubcategories = subcategories.filter(s => s.category_id === category.id);

                    return (
                      <View key={category.id} style={styles.categoryAccordionItem}>
                        <TouchableOpacity
                          style={[
                            styles.categoryRowItem, 
                            { 
                              backgroundColor: isSelected ? accent + '15' : backgroundSecondary,
                              borderColor: isSelected ? accent : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                            }
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setExpandedCategory(isExpanded ? null : category.id);
                            if (isSelected) {
                              setSelectedCategories(prev => prev.filter(id => id !== category.id));
                            } else {
                              setSelectedCategories([...selectedCategories, category.id]);
                            }
                          }}
                        >
                          <View style={styles.categoryRowLeft}>
                            <Text style={styles.categoryRowIcon}>{category.icon}</Text>
                            <Text style={[styles.categoryRowLabel, { color: textPrimary }]}>{t(`dbCategories.${category.name}`, category.name)}</Text>
                          </View>
                          <View style={styles.categoryRowRight}>
                            {isSelected && (
                              <View style={[styles.miniBadge, { backgroundColor: accent }]}>
                                <Text style={styles.miniBadgeText}>{t('auto.se0aa021e', 'OK')}</Text>
                              </View>
                            )}
                            <View style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}>
                              <ChevronRight size={20} color={textSecondary} />
                            </View>
                          </View>
                        </TouchableOpacity>

                        {isExpanded && categorySubcategories.length > 0 && (
                          <View style={styles.inlineSubcategories}>
                            {categorySubcategories.map((sub, idx) => {
                              const isSubSelected = selectedSubcategories.includes(sub.id);
                              const colors = ['#00d9ff', '#ff1493', '#34C759', '#FF9500', '#8000ff', '#FF3B30', '#00C7B7'];
                              const rowColor = colors[idx % colors.length];

                              return (
                                <TouchableOpacity
                                  key={sub.id}
                                  style={[
                                    styles.subcategoryRow, 
                                    { backgroundColor: isSubSelected ? '#fff' : rowColor }
                                  ]}
                                  onPress={() => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    if (isSubSelected) {
                                      setSelectedSubcategories(prev => prev.filter(id => id !== sub.id));
                                    } else {
                                      setSelectedSubcategories([sub.id]);
                                      setShowFilters(false);
                                    }
                                  }}
                                >
                                  <Text style={[
                                    styles.subcategoryRowText, 
                                    { color: isSubSelected ? rowColor : '#fff' }
                                  ]}>
                                    {t(`dbCategories.${sub.name}`, sub.name)}
                                  </Text>
                                  <View style={[styles.chevronCircle, { backgroundColor: isSubSelected ? rowColor + '22' : 'rgba(255,255,255,0.3)' }]}>
                                    <ChevronRight size={16} color={isSubSelected ? rowColor : '#fff'} strokeWidth={3} />
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter]}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSelectedCategories([]);
                  setSelectedSubcategories([]);
                  setExpandedCategory(null);
                  setDateFilter('all');
                  setSearchRadius(0);
                }}
              >
                <Text style={styles.clearButtonText}>{t('home.clearFilters', 'Limpar Filtros')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>{t('home.apply', 'Aplicar')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <EventParticipantsModal
        visible={participantsModalVisible}
        onClose={() => setParticipantsModalVisible(false)}
        eventId={selectedEventIdForParticipants || ''}
      />
      <CommentsModal
        visible={!!commentsEventId}
        eventId={commentsEventId || ''}
        onClose={() => setCommentsEventId(null)}
      />
    </View>
    </PageTransition>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#0f0f18',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  iconButton: {
    width: s(36),
    height: s(36),
    borderRadius: ms(18),
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  notificationBadge: {
    position: 'absolute',
    top: vs(2),
    right: s(2),
    minWidth: s(18),
    height: s(18),
    borderRadius: ms(9),
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(4),
  },
  notificationBadgeText: {
    fontSize: ms(10),
    fontWeight: '700',
    color: '#fff',
  },
  logoImage: {
    width: s(40),
    height: s(40),
    borderRadius: ms(8),
  },
  logo: {
    fontSize: ms(28),
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
  },
  logoSpecial: {
    color: '#00d9ff',
  },
  logoPink: {
    color: '#ff1493',
  },
  filterButton: {
    width: s(36),
    height: s(36),
    borderRadius: ms(18),
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  filterButtonActive: {
    backgroundColor: '#00d9ff',
  },
  filterBadge: {
    position: 'absolute',
    top: vs(2),
    right: s(2),
    width: s(8),
    height: s(8),
    borderRadius: ms(4),
    backgroundColor: '#FF3B30',
  },
  listContent: {
    paddingBottom: vs(16),
  },
  quickFilterPill: {
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
    borderRadius: ms(20),
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickFilterText: {
    fontSize: ms(13),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    maxHeight: '90%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  modalIndicator: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(24),
    paddingTop: vs(20),
    paddingBottom: vs(16),
  },
  modalTitle: {
    fontSize: ms(22),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: ms(13),
    marginTop: 2,
    opacity: 0.7,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: s(24),
  },
  filterSection: {
    marginBottom: vs(32),
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(16),
  },
  filterSectionTitle: {
    fontSize: ms(15),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateChipsContainer: {
    gap: s(10),
    paddingRight: s(24),
  },
  dateChip: {
    paddingHorizontal: s(20),
    paddingVertical: vs(12),
    borderRadius: ms(16),
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dateChipText: {
    fontSize: ms(14),
    fontWeight: '600',
  },
  modernCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(12),
  },
  modernCategoryWrapper: {
    width: (width - s(48) - s(12)) / 2, // 2 colunas com gap
  },
  modernCategoryCard: {
    height: vs(90),
    borderRadius: ms(20),
    padding: ms(12),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: vs(8),
    position: 'relative',
  },
  modernCategoryIcon: {
    fontSize: ms(28),
  },
  modernCategoryLabel: {
    fontSize: ms(12),
    fontWeight: '600',
    textAlign: 'center',
  },
  modernCategoryBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f0f18',
  },
  subcategoryRow: {
    width: '100%',
    height: vs(65),
    borderRadius: ms(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(20),
    marginBottom: vs(10),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  subcategoryRowText: {
    fontSize: ms(18),
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  chevronCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernSubcategoriesContainer: {
    width: '100%',
    marginTop: vs(15),
    paddingBottom: vs(10),
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(24),
    paddingTop: vs(8),
    paddingBottom: vs(10),
    gap: s(10),
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.05)',
  },
  clearButton: {
    flex: 1,
    height: vs(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: ms(13),
    fontWeight: '700',
  },
  applyButton: {
    flex: 1.2,
    height: vs(40),
    backgroundColor: '#00d9ff',
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: ms(13),
    fontWeight: '800',
  },
  modernCategoryList: {
    width: '100%',
    gap: vs(8),
  },
  categoryAccordionItem: {
    width: '100%',
    marginBottom: vs(4),
  },
  categoryRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(20),
    height: vs(60),
    borderRadius: ms(16),
    borderWidth: 1,
  },
  categoryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  categoryRowIcon: {
    fontSize: ms(22),
  },
  categoryRowLabel: {
    fontSize: ms(16),
    fontWeight: '700',
  },
  categoryRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  miniBadge: {
    paddingHorizontal: s(8),
    paddingVertical: vs(2),
    borderRadius: ms(8),
  },
  miniBadgeText: {
    color: '#fff',
    fontSize: ms(10),
    fontWeight: '900',
  },
  inlineSubcategories: {
    marginTop: vs(8),
    paddingLeft: s(10),
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0, 217, 255, 0.2)',
  },

  bubblyFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: vs(48),
    borderRadius: 24,
    paddingLeft: s(6),
    paddingRight: s(18),
    gap: s(10),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: vs(50),
  },
  emptyText: {
    fontSize: ms(14),
    fontFamily: 'Inter-Medium',
  },
  bubblyFilterIconBox: {
    width: vs(36),
    height: vs(36),
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubblyFilterIcon: {
    fontSize: ms(18),
  },
  bubblyFilterText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: ms(14),
  },
});
