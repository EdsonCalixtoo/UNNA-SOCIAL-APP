import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Dimensions, RefreshControl, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Search, Sparkles, ChevronRight, Filter } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  FadeInUp, 
  FadeInDown, 
  Layout, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withDelay
} from 'react-native-reanimated';

import { useTheme } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/utils/responsive';
import PageTransition from '@/components/PageTransition';
import { useUI } from '@/contexts/UIContext';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - s(48)) / 2;
interface Category {
  id: string;
  name: string;
  icon: string;
  subcategories?: { id: string, name: string }[];
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function Categories() {
  const insets = useSafeAreaInsets();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const { showTabBar } = useUI();

  useEffect(() => {
    showTabBar();
  }, []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadCategories();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const loadCategories = async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      
      const { data, error } = await supabase
        .from('categories')
        .select('*, subcategories(id, name)')
        .order('order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setCategories(data as any);
    } catch (error) {
      console.error('[Categories] Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => loadCategories(true);

  const handleCategoryPress = (category: Category) => {
    router.push({
      pathname: '/subcategories',
      params: { 
        categoryId: category.id, 
        categoryName: category.name,
        initialSearch: searchQuery
      }
    });
  };

  const filteredResults = searchQuery.trim() === '' 
    ? categories.map(c => ({ ...c, type: 'category' }))
    : (() => {
        const results: any[] = [];
        const searchLower = searchQuery.toLowerCase();

        categories.forEach(cat => {
          // Se a categoria combina, adiciona ela
          if (cat.name.toLowerCase().includes(searchLower)) {
            results.push({ ...cat, type: 'category' });
          }

          // Busca nas subcategorias
          cat.subcategories?.forEach(sub => {
            if (sub.name.toLowerCase().includes(searchLower)) {
              results.push({ ...sub, type: 'subcategory', parentCategory: cat });
            }
          });
        });

        return results;
      })();

  const handleSubcategoryPress = (subcategory: any, category: any) => {
    router.push({
      pathname: '/(tabs)',
      params: {
        filterCategoryId: category.id,
        filterSubcategoryId: subcategory.id,
        filterCategoryName: category.name,
        filterSubcategoryName: subcategory.name
      }
    });
  };

  const SearchResultItem = ({ item, index }: { item: any; index: number }) => {
    if (item.type === 'category') {
      return <CategoryCard item={item} index={index} />;
    }

    // Renderiza subcategoria diretamente
    return (
      <AnimatedTouchableOpacity
        entering={FadeInUp.duration(400).delay(index * 30)}
        style={[styles.subcategoryResult, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        onPress={() => handleSubcategoryPress(item, item.parentCategory)}
      >
        <View style={[styles.subcategoryIconContainer, { backgroundColor: accent + '22' }]}>
          <Text style={styles.subcategoryIcon}>{item.parentCategory.icon}</Text>
        </View>
        <View style={styles.subcategoryInfo}>
          <Text style={[styles.subcategoryNameResult, { color: textPrimary }]}>{item.name}</Text>
          <Text style={[styles.subcategoryParentName, { color: textSecondary }]}>em {item.parentCategory.name}</Text>
        </View>
        <ChevronRight size={18} color={textSecondary} />
      </AnimatedTouchableOpacity>
    );
  };

  const CategoryCard = ({ item, index }: { item: Category; index: number }) => {
    const scale = useSharedValue(1);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const gradients = [
      ['#00d9ff', '#0055ff'],
      ['#ff1493', '#8000ff'],
      ['#34C759', '#1e5a2d'],
      ['#FF9500', '#ff5e00'],
      ['#AF52DE', '#5856D6'],
      ['#FF3B30', '#8b0000'],
      ['#00C9A7', '#008080'],
      ['#FF6B35', '#ff3d00'],
    ];

    const gradient = gradients[index % gradients.length];

    return (
      <AnimatedTouchableOpacity
        entering={FadeInUp.duration(600).delay(index * 50)}
        style={[styles.categoryCard, animatedStyle]}
        onPressIn={() => (scale.value = withSpring(0.98, { damping: 20 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 20 }))}
        onPress={() => handleCategoryPress(item)}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryGradient}
        >
          <View style={styles.glassOverlay} />
          
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Text style={styles.categoryIcon}>{item.icon}</Text>
            </View>
            <View style={styles.sparkleContainer}>
              <Sparkles size={14} color="rgba(255,255,255,0.8)" />
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
            <ChevronRight size={16} color="rgba(255,255,255,0.6)" />
          </View>
        </LinearGradient>
      </AnimatedTouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: backgroundPrimary }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <PageTransition>
      <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <Animated.View 
        entering={FadeInDown.duration(800)}
        style={[styles.headerContainer, { paddingTop: insets.top + vs(20), backgroundColor: backgroundSecondary, borderBottomColor: isDark ? 'transparent' : 'rgba(0,0,0,0.05)', borderBottomWidth: isDark ? 0 : 1 }]}
      >
        <LinearGradient
          colors={isDark ? ['rgba(255,255,255,0.05)', 'transparent'] : ['rgba(0,0,0,0.02)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={{ height: insets.top }} />

        <View style={[
          styles.searchContainer,
          isSearchFocused && styles.searchContainerActive,
          { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)', borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }
        ]}>
          <Search size={20} color={isSearchFocused ? accent : textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder="O que você está procurando?"
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </View>


      </Animated.View>

      <FlatList
        data={filteredResults}
        keyExtractor={(item) => item.type === 'category' ? `cat-${item.id}` : `sub-${item.id}`}
        renderItem={({ item, index }) => <SearchResultItem item={item} index={index} />}
        numColumns={searchQuery.trim() === '' ? 2 : 1}
        key={searchQuery.trim() === '' ? 'grid' : 'list'}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        columnWrapperStyle={searchQuery.trim() === '' ? styles.columnWrapper : null}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accent}
            colors={[accent]}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Search size={48} color={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>Nenhuma categoria encontrada</Text>
          </View>
        )}
      />
    </View>
    </PageTransition>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    paddingHorizontal: s(20),
    paddingBottom: vs(24),
    borderBottomLeftRadius: ms(32),
    borderBottomRightRadius: ms(32),
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(20),
  },
  headerTitle: {
    fontSize: ms(34),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: ms(16),
    color: '#8E8E93',
    fontWeight: '500',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: ms(18),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(16),
    height: vs(56),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchContainerActive: {
    borderColor: 'rgba(0, 217, 255, 0.5)',
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
  },
  searchIcon: {
    marginRight: s(12),
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vs(16),
    gap: s(8),
  },
  statsText: {
    fontSize: ms(14),
    color: '#8E8E93',
    fontWeight: '600',
  },
  statsHighlight: {
    color: '#00d9ff',
    fontWeight: '800',
  },
  listContent: {
    padding: ms(16),
    paddingTop: vs(20),
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: vs(16),
  },
  categoryCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.3,
    borderRadius: ms(24),
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  categoryGradient: {
    flex: 1,
    padding: ms(20),
    justifyContent: 'space-between',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: ms(32),
  },
  sparkleContainer: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    marginHorizontal: -4,
  },
  categoryName: {
    fontSize: ms(13),
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: vs(60),
    gap: vs(12),
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: ms(16),
    fontWeight: '600',
  },
  subcategoryResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(16),
    borderRadius: ms(20),
    marginBottom: vs(12),
    borderWidth: 1,
  },
  subcategoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(16),
  },
  subcategoryIcon: {
    fontSize: ms(24),
  },
  subcategoryInfo: {
    flex: 1,
  },
  subcategoryNameResult: {
    fontSize: ms(17),
    fontWeight: '700',
  },
  subcategoryParentName: {
    fontSize: ms(13),
    fontWeight: '500',
    marginTop: 2,
  },
});
