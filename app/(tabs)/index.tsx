import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Post, Category, Subcategory } from '@/types/database';
import StoriesBar from '@/components/StoriesBar';
import PostCard from '@/components/PostCard';
import EventCard from '@/components/EventCard';
import { ListFilter as Filter, X, Calendar, ChevronRight, Bell, MessageCircle } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

interface ExtendedPost {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  event_id?: string;
  created_at: string;
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
  likes_count?: number;
  is_liked?: boolean;
}

export default function Feed() {
  const { user } = useAuth();
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

  useEffect(() => {
    loadUnreadNotifications();

    // Escutar mudanças em tempo real nas notificações
    const subscription = supabase
      .channel('notifications-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          // Recarregar o count quando houver mudanças
          loadUnreadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
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
    setCategories([]);
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
      console.log('[Feed] Loading categories...');
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      console.log('[Feed] Categories loaded:', { count: data?.length, error });
      if (error) {
        console.error('[Feed] Error:', error);
        throw error;
      }
      setCategories(data || []);
      console.log('[Feed] Categories set:', data?.length);
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

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;

    if (isLiked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });
    }

    setPosts(posts.map(post =>
      post.id === postId
        ? {
            ...post,
            is_liked: !isLiked,
            likes_count: isLiked ? (post.likes_count || 1) - 1 : (post.likes_count || 0) + 1
          }
        : post
    ));
  };

  const renderItem = ({ item }: { item: ExtendedPost }) => {
    if (item.events) {
      return <EventCard event={item.events} />;
    }
    return <PostCard post={item} onLike={handleLike} />;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/icone.jpg')}
            style={styles.logoImage}
          />
          <Text style={styles.logo}>UN<Text style={styles.logoSpecial}>И</Text>A</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/messages')}
          >
            <MessageCircle size={24} color="#00d9ff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/notifications')}
          >
            <Bell size={24} color="#00d9ff" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, (selectedCategories.length > 0 || dateFilter !== 'all') && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Filter size={24} color={(selectedCategories.length > 0 || dateFilter !== 'all') ? '#000' : '#00d9ff'} />
            {(selectedCategories.length > 0 || dateFilter !== 'all') && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<StoriesBar />}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Calendar size={20} color="#00d9ff" />
                  <Text style={styles.filterSectionTitle}>Data do Evento</Text>
                </View>
                <View style={styles.filterOptions}>
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'today', label: 'Hoje' },
                    { key: 'week', label: 'Esta Semana' },
                    { key: 'month', label: 'Este Mês' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.key}
                      style={[styles.filterOption, dateFilter === option.key && styles.filterOptionActive]}
                      onPress={() => setDateFilter(option.key as any)}
                    >
                      <Text style={[styles.filterOptionText, dateFilter === option.key && styles.filterOptionTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Categorias</Text>
                <View style={styles.filterOptions}>
                  {categories.map(category => {
                    const isSelected = selectedCategories.includes(category.id);
                    const isExpanded = expandedCategory === category.id;

                    return (
                      <View key={category.id}>
                        <TouchableOpacity
                          style={[styles.categoryCard, isSelected && styles.categoryCardActive]}
                          onPress={() => {
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
                          <View style={styles.categoryCardContent}>
                            <View style={styles.categoryCardLeft}>
                              <Text style={styles.categoryCardIcon}>{category.icon}</Text>
                              <Text style={[styles.categoryCardText, isSelected && styles.categoryCardTextActive]}>
                                {category.name}
                              </Text>
                            </View>
                            <ChevronRight
                              size={20}
                              color={isSelected ? '#00d9ff' : '#666'}
                              style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                            />
                          </View>
                        </TouchableOpacity>

                        {isExpanded && subcategories.length > 0 && (
                          <View style={styles.subcategoriesContainer}>
                            {subcategories.map(subcategory => {
                              const isSubSelected = selectedSubcategories.includes(subcategory.id);
                              return (
                                <TouchableOpacity
                                  key={subcategory.id}
                                  style={[styles.subcategoryCard, isSubSelected && styles.subcategoryCardActive]}
                                  onPress={() => {
                                    if (isSubSelected) {
                                      setSelectedSubcategories(prev => prev.filter(id => id !== subcategory.id));
                                    } else {
                                      setSelectedSubcategories(prev => [...prev, subcategory.id]);
                                    }
                                  }}
                                >
                                  <Text style={[styles.subcategoryCardText, isSubSelected && styles.subcategoryCardTextActive]}>
                                    {subcategory.name}
                                  </Text>
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

            <View style={styles.modalFooter}>
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
          </View>
        </View>
      </Modal>
    </View>
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
    backgroundColor: '#2d2d2d',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  logo: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  logoSpecial: {
    color: '#00d9ff',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  listContent: {
    paddingBottom: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  filterOptions: {
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  categoryOption: {
    gap: 12,
  },
  filterOptionActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderColor: '#00d9ff',
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    flex: 1,
  },
  filterOptionTextActive: {
    color: '#00d9ff',
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3d3d3d',
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoryCardActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.08)',
    borderColor: '#00d9ff',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
  },
  categoryCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  categoryCardIcon: {
    fontSize: 28,
  },
  categoryCardText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  categoryCardTextActive: {
    color: '#00d9ff',
  },
  subcategoriesContainer: {
    backgroundColor: '#0d0d0d',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
  },
  subcategoryCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3d3d3d',
    padding: 14,
  },
  subcategoryCardActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderColor: '#00d9ff',
  },
  subcategoryCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  subcategoryCardTextActive: {
    color: '#00d9ff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#3d3d3d',
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#3d3d3d',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  applyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#00d9ff',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
