import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width - 40;

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

export default function Subcategories() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryId = params.categoryId as string;
  const categoryName = params.categoryName as string;

  useEffect(() => {
    loadSubcategories();
  }, [categoryId]);

  const loadSubcategories = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .order('name');

      if (error) {
        console.error('Error loading subcategories:', error);
        throw error;
      }

      if (data) {
        console.log('Loaded subcategories:', data.length);
        setSubcategories(data);
      }
    } catch (error) {
      console.error('Error loading subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubcategoryPress = (subcategory: Subcategory) => {
    router.push({
      pathname: '/(tabs)',
      params: {
        filterCategoryId: categoryId,
        filterSubcategoryId: subcategory.id,
        filterCategoryName: categoryName,
        filterSubcategoryName: subcategory.name
      }
    });
  };

  const renderSubcategory = ({ item, index }: { item: Subcategory; index: number }) => {
    const colors = [
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

    const gradient = colors[index % colors.length];

    return (
      <TouchableOpacity
        style={styles.subcategoryCard}
        onPress={() => handleSubcategoryPress(item)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[gradient[0], gradient[1], gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.subcategoryGradient}
        >
          <View style={styles.subcategoryContent}>
            <Text style={styles.subcategoryName}>{item.name}</Text>
            <View style={styles.iconContainer}>
              <ChevronRight size={24} color="#fff" />
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#00d9ff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{categoryName}</Text>
        <Text style={styles.headerSubtitle}>
          Escolha uma subcategoria ({subcategories.length})
        </Text>
      </LinearGradient>

      <FlatList
        data={subcategories}
        keyExtractor={(item) => item.id}
        renderItem={renderSubcategory}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
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
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  subcategoryCard: {
    width: ITEM_WIDTH,
    height: 80,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  subcategoryGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  subcategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subcategoryName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
