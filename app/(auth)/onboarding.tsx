import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Sparkles } from 'lucide-react-native';

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function Onboarding() {
  const { user } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    } else {
      setSelectedCategories(prev => [...prev, categoryId]);
    }
  };

  const handleContinue = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos uma categoria de interesse');
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_categories: selectedCategories,
          onboarding_completed: true
        })
        .eq('id', user.id);

      if (error) throw error;

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      Alert.alert('Erro', 'Não foi possível salvar suas preferências');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/icone.jpg')}
              style={styles.logoImage}
            />
          </View>

          <View style={styles.sparkleContainer}>
            <Sparkles size={32} color="#00d9ff" />
          </View>

          <Text style={styles.title}>Quase lá!</Text>
          <Text style={styles.subtitle}>
            Escolha suas categorias favoritas para personalizarmos seu feed
          </Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {selectedCategories.length} {selectedCategories.length === 1 ? 'selecionada' : 'selecionadas'}
            </Text>
          </View>
        </View>

        <View style={styles.categoriesGrid}>
          {categories.map((category, index) => {
            const isSelected = selectedCategories.includes(category.id);

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
                key={category.id}
                style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
                onPress={() => toggleCategory(category.id)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={isSelected ? [gradient[0], gradient[1], gradient[1]] : ['#2d2d2d', '#2d2d2d']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.categoryGradient}
                >
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={16} color="#fff" strokeWidth={3} />
                    </View>
                  )}

                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
                    {category.name}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, (selectedCategories.length === 0 || saving) && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={selectedCategories.length === 0 || saving}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#00d9ff', '#ff1493']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.continueButtonText}>
              {saving ? 'Salvando...' : 'Continuar'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
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
    backgroundColor: '#1a1a1a',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 120,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#00d9ff',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  sparkleContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#9E9E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  badge: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  badgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00d9ff',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  categoryCardSelected: {
    borderColor: '#00d9ff',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  categoryGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8E8E93',
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: 'transparent',
  },
  continueButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    padding: 20,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
