import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Dimensions, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Search, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    loadCategories();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setCategories([]);
      loadCategories();
    }, [])
  );

  const loadCategories = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      }
      console.log('[Categories] ========================================');
      console.log('[Categories] Starting to load categories...');
      console.log('[Categories] Timestamp:', new Date().toISOString());

      const { data, error, count } = await supabase
        .from('categories')
        .select('*', { count: 'exact' })
        .order('name');

      console.log('[Categories] ========================================');
      console.log('[Categories] Query completed!');
      console.log('[Categories] Total count from DB:', count);
      console.log('[Categories] Data array length:', data?.length);
      console.log('[Categories] Error:', error);

      if (error) {
        console.error('[Categories] ❌ Error loading categories:', error);
        console.error('[Categories] Error code:', error.code);
        console.error('[Categories] Error message:', error.message);
        throw error;
      }

      if (data) {
        console.log('[Categories] ✅ Successfully loaded categories');
        console.log('[Categories] Total categories:', data.length);
        console.log('[Categories] Category list:');
        data.forEach((cat, index) => {
          console.log(`  ${index + 1}. ${cat.icon} ${cat.name} (ID: ${cat.id})`);
        });
        console.log('[Categories] ========================================');
        setCategories(data);
      } else {
        console.warn('[Categories] ⚠️ No data returned');
      }
    } catch (error) {
      console.error('[Categories] ❌ Exception caught:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadCategories(true);
  };

  const handleCategoryPress = (category: Category) => {
    router.push({
      pathname: '/subcategories',
      params: { categoryId: category.id, categoryName: category.name }
    });
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderCategory = ({ item, index }: { item: Category; index: number }) => {
    const gradients = [
      ['#00d9ff', '#0099cc'],
      ['#ff1493', '#cc0066'],
      ['#34C759', '#28a745'],
      ['#FF9500', '#cc7700'],
      ['#AF52DE', '#8844bb'],
      ['#FF3B30', '#cc2f27'],
      ['#00C9A7', '#00a388'],
      ['#FF6B35', '#e85a2e'],
      ['#5856D6', '#4644bb'],
      ['#FFD60A', '#d9b609'],
    ];

    const gradient = gradients[index % gradients.length];

    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => handleCategoryPress(item)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.categoryGradient}
        >
          <View style={styles.categoryContent}>
            <Text style={styles.categoryIcon}>{item.icon}</Text>
            <Text style={styles.categoryName}>{item.name}</Text>
            <View style={styles.categoryBadge}>
              <Sparkles size={12} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
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
      <LinearGradient
        colors={['#2d2d2d', '#1a1a1a']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Explorar Categorias</Text>
        <View style={styles.categoryCountBadge}>
          <Text style={styles.categoryCountNumber}>{categories.length}</Text>
          <Text style={styles.categoryCountText}>categorias carregadas</Text>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar categorias..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        renderItem={renderCategory}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={() => (
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Exibindo {filteredCategories.length} de {categories.length} categorias
            </Text>
            <Text style={styles.footerSubtext}>
              Puxe para baixo para atualizar
            </Text>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00d9ff"
            colors={['#00d9ff']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9E9E93',
    marginBottom: 20,
  },
  categoryCountBadge: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  categoryCountNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00d9ff',
    marginRight: 8,
  },
  categoryCountText: {
    fontSize: 14,
    color: '#9E9E93',
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH * 1.2,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  categoryContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 8,
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00d9ff',
    marginBottom: 6,
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
