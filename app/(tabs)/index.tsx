import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Image, Modal, ScrollView, Platform, Dimensions } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Post, Category, Subcategory } from '@/types/database';
import StoriesBar from '@/components/StoriesBar';
import PostCard from '@/components/PostCard';
import EventCard from '@/components/EventCard';
import { EventParticipantsModal } from '@/components/EventParticipantsModal';
import { ListFilter as Filter, X, Calendar, ChevronRight, Bell, MessageCircle } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/utils/responsive';
import PageTransition from '@/components/PageTransition';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  FadeInUp,
  runOnJS
} from 'react-native-reanimated';
import { useUI } from '@/contexts/UIContext';

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
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
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
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [selectedEventIdForParticipants, setSelectedEventIdForParticipants] = useState<string | null>(null);
  const [visibleItems, setVisibleItems] = useState<string[]>([]);

  const scrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = insets.top + vs(70);

  const { hideTabBar, showTabBar } = useUI();

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;
      
      // Esconder header ao subir, mostrar ao descer
      if (currentY > HEADER_HEIGHT) {
        headerTranslateY.value = withTiming(diff > 0 ? -HEADER_HEIGHT : 0, { duration: 300 });
        
        // Controle da TabBar
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
    
    // Gerar um ID único para esta instância da inscrição para evitar conflitos de HMR
    const instanceId = Math.random().toString(36).substring(7);

    // Escutar mudanças em tempo real nas notificações
    const notificationSubscription = supabase
      .channel(`notifications-badge:${user?.id}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE em um só
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          loadUnreadNotifications();
        }
      )
      .subscribe();

    // Escutar mudanças em tempo real nos eventos
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

    // Escutar mudanças em tempo real nos posts
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

    return () => {
      supabase.removeChannel(notificationSubscription);
      supabase.removeChannel(eventsSubscription);
      supabase.removeChannel(postsSubscription);
    };
  }, [user]);

  const loadUnreadNotifications = async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread notifications:', error);
    }
  };

  useEffect(() => {
    loadPosts();
    loadCategories();
    loadUserPreferences();
  }, []);

  useEffect(() => {
    if (params.filterCategoryId && params.filterSubcategoryId) {
      const categoryId = params.filterCategoryId as string;
      const subcategoryId = params.filterSubcategoryId as string;

      setSelectedCategories([categoryId]);
      setSelectedSubcategories([subcategoryId]);
      setExpandedCategory(categoryId);

      setTimeout(() => {
        setShowFilters(true);
      }, 500);
    }
  }, [params.filterCategoryId, params.filterSubcategoryId]);

  useEffect(() => {
    if (expandedCategory) {
      loadSubcategories(expandedCategory);
    } else {
      setSubcategories([]);
    }
  }, [expandedCategory]);

  useEffect(() => {
    loadPosts();
  }, [selectedCategories, selectedSubcategories, dateFilter]);

  const loadUserPreferences = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_categories')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.preferred_categories && data.preferred_categories.length > 0) {
        setSelectedCategories(data.preferred_categories);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };

  const loadPosts = async () => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          ),
          events:event_id (
            id,
            title,
            description,
            image_url,
            event_date,
            event_time,
            location_name,
            max_participants,
            is_paid,
            price,
            category_id,
            subcategory_id,
            categories:category_id (
              name,
              icon
            ),
            subcategories:subcategory_id (
              name
            ),
            profiles:creator_id (
              username,
              full_name,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

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

      const postsWithLikes = await Promise.all(
        filteredData.map(async (post) => {
          const { count: likesCount } = await supabase
            .from('post_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { data: userLike } = await supabase
            .from('post_likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user?.id)
            .maybeSingle();

          return {
            ...post,
            likes_count: likesCount || 0,
            is_liked: !!userLike,
          };
        })
      );

      setPosts(postsWithLikes);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    const ids = viewableItems.map((item: any) => item.key);
    setVisibleItems(ids);
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50, // O item é considerado visível se 50% dele aparecer
  }).current;

  const handleLike = async (id: string, isLiked: boolean) => {
    if (!user) return;

    // Detect if it's an event or a post
    const targetPost = posts.find(p => p.id === id || p.events?.id === id);
    const isEvent = !!targetPost?.events && targetPost.events.id === id;

    if (isEvent) {
      if (isLiked) {
        await supabase.from('event_likes').delete().eq('event_id', id).eq('user_id', user.id);
      } else {
        await supabase.from('event_likes').insert({ event_id: id, user_id: user.id });
      }
    } else {
      if (isLiked) {
        await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', user.id);
      } else {
        await supabase.from('post_likes').insert({ post_id: id, user_id: user.id });
      }
    }

    setPosts(posts.map(p => {
      if (isEvent && p.events?.id === id) {
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

  const renderItem = ({ item, index }: { item: ExtendedPost; index: number }) => {
    return (
      <Animated.View entering={FadeInUp.delay(index * 100).duration(500)}>
        {item.events ? (
          <EventCard 
            event={item.events} 
            onLike={handleLike}
            onParticipantsPress={(id) => {
              setSelectedEventIdForParticipants(id);
              setParticipantsModalVisible(true);
            }}
            isVisible={visibleItems.includes(item.id)} 
          />
        ) : (
          <PostCard 
            post={item} 
            onLike={handleLike} 
            isVisible={visibleItems.includes(item.id)}
          />
        )}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: backgroundPrimary }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

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
          <Image
            source={require('@/assets/images/icone.jpg')}
            style={styles.logoImage}
          />
          <Text style={[styles.logo, { color: textPrimary }]} numberOfLines={1}>U<Text style={styles.logoSpecial}>N</Text><Text style={styles.logoPink}>И</Text>A</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.08)' : 'rgba(0, 217, 255, 0.12)', borderColor: isDark ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 217, 255, 0.3)' }]}
            onPress={() => router.push('/messages')}
          >
            <MessageCircle size={vs(20)} color={accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.08)' : 'rgba(0, 217, 255, 0.12)', borderColor: isDark ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 217, 255, 0.3)' }]}
            onPress={() => router.push('/notifications')}
          >
            <Bell size={vs(20)} color={accent} />
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
            <Filter size={vs(20)} color={(selectedCategories.length > 0 || dateFilter !== 'all') ? '#fff' : accent} />
            {(selectedCategories.length > 0 || dateFilter !== 'all') && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<StoriesBar />}
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
        initialNumToRender={5}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={5}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            tintColor={accent} 
            colors={[accent]}
            progressViewOffset={HEADER_HEIGHT}
          />
        }
        contentContainerStyle={[
          styles.listContent, 
          { 
            paddingTop: HEADER_HEIGHT,
            paddingBottom: vs(100)
          }
        ]}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowFilters(false)} 
          />
          <Animated.View 
            entering={FadeInUp.springify().damping(20)}
            style={[styles.modalContent, { backgroundColor: backgroundSecondary, borderTopLeftRadius: ms(32), borderTopRightRadius: ms(32) }]}
          >
            <View style={styles.modalIndicator} />
            
            <View style={[styles.modalHeader, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>Filtrar Experiências</Text>
                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>Encontre exatamente o que você busca</Text>
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
                  <Text style={[styles.filterSectionTitle, { color: textSecondary }]}>Quando?</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.dateChipsContainer}
                >
                  {[
                    { key: 'all', label: 'Tudo' },
                    { key: 'today', label: 'Hoje' },
                    { key: 'week', label: 'Esta Semana' },
                    { key: 'month', label: 'Este Mês' }
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
                  <Filter size={18} color={accent} />
                  <Text style={[styles.filterSectionTitle, { color: textSecondary }]}>O que te interessa?</Text>
                </View>
                <View style={styles.modernCategoryGrid}>
                  {categories.map(category => {
                    const isSelected = selectedCategories.includes(category.id);
                    const isExpanded = expandedCategory === category.id;

                    return (
                      <View key={category.id} style={styles.modernCategoryWrapper}>
                        <TouchableOpacity
                          style={[
                            styles.modernCategoryCard, 
                            isSelected && { borderColor: accent, backgroundColor: isDark ? accent + '11' : accent + '08' },
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (isSelected) {
                                setSelectedCategories(prev => prev.filter(id => id !== category.id));
                                setSelectedSubcategories(prev => prev.filter(subId => {
                                  const sub = subcategories.find(s => s.id === subId);
                                  return sub?.category_id !== category.id;
                                }));
                            } else {
                                setSelectedCategories(prev => [...prev, category.id]);
                            }
                            setExpandedCategory(isExpanded ? null : category.id);
                          }}
                        >
                          <Text style={styles.modernCategoryIcon}>{category.icon}</Text>
                          <Text style={[styles.modernCategoryLabel, { color: textPrimary }, isSelected && { color: accent, fontWeight: '800' }]} numberOfLines={1}>
                            {category.name}
                          </Text>
                          {isSelected && (
                            <View style={[styles.modernCategoryBadge, { backgroundColor: accent }]}>
                              <Check size={10} color="#fff" strokeWidth={4} />
                            </View>
                          )}
                        </TouchableOpacity>

                        {isExpanded && subcategories.length > 0 && (
                          <Animated.View entering={FadeInUp.duration(300)} style={styles.modernSubcategoriesContainer}>
                            {subcategories.map(subcategory => {
                              const isSubSelected = selectedSubcategories.includes(subcategory.id);
                              return (
                                <TouchableOpacity
                                  key={subcategory.id}
                                  style={[
                                    styles.modernSubcategoryChip, 
                                    isSubSelected && { backgroundColor: accent, borderColor: accent },
                                    { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                                  ]}
                                  onPress={() => {
                                    Haptics.selectionAsync();
                                    if (isSubSelected) {
                                      setSelectedSubcategories(prev => prev.filter(id => id !== subcategory.id));
                                    } else {
                                      setSelectedSubcategories(prev => [...prev, subcategory.id]);
                                    }
                                  }}
                                >
                                  <Text style={[
                                    styles.modernSubcategoryText, 
                                    { color: textSecondary }, 
                                    isSubSelected && { color: '#fff', fontWeight: '700' }
                                  ]}>
                                    {subcategory.name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </Animated.View>
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
                }}
              >
                <Text style={styles.clearButtonText}>Limpar Filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <EventParticipantsModal
        visible={participantsModalVisible}
        onClose={() => setParticipantsModalVisible(false)}
        eventId={selectedEventIdForParticipants || ''}
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
    width: s(44),
    height: s(44),
    borderRadius: ms(22),
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
    width: s(44),
    height: s(44),
    borderRadius: ms(22),
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
    top: vs(4),
    right: s(4),
    width: s(8),
    height: s(8),
    borderRadius: ms(4),
    backgroundColor: '#FF3B30',
  },
  listContent: {
    paddingBottom: vs(16),
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
    maxHeight: '85%',
    paddingBottom: vs(40),
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
  modernSubcategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(6),
    marginTop: vs(10),
    paddingLeft: s(4),
  },
  modernSubcategoryChip: {
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderRadius: ms(10),
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  modernSubcategoryText: {
    fontSize: ms(11),
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(24),
    paddingTop: vs(20),
    gap: s(16),
  },
  clearButton: {
    flex: 1,
    height: vs(56),
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: ms(15),
    fontWeight: '700',
  },
  applyButton: {
    flex: 2,
    height: vs(56),
    backgroundColor: '#00d9ff',
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '800',
  },
});
