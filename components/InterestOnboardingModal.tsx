import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { hapticFeedback } from '@/utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface InterestOnboardingModalProps {
  visible: boolean;
  onComplete: () => void;
}

export function InterestOnboardingModal({ visible, onComplete }: InterestOnboardingModalProps) {
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const { user, refreshProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('order');
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const toggleCategory = (id: string) => {
    hapticFeedback.light();
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      hapticFeedback.success();
      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_categories: selectedCategories,
          onboarding_completed: true
        })
        .eq('id', user.id);

      if (error) throw error;
      
      await refreshProfile?.();
      onComplete();
    } catch (err) {
      console.error('Error saving onboarding preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <LinearGradient 
        colors={isDark ? ['#111', '#000'] : ['#f0f0f2', '#fff']} 
        style={styles.container}
      >
        <View style={{ marginTop: height * 0.1, paddingHorizontal: 24, paddingBottom: 24 }}>
          <Text style={[styles.title, { color: textPrimary }]}>O que te interessa?</Text>
          <Text style={[styles.subtitle, { color: textSecondary }]}>Selecione 1 ou mais categorias para personalizar o seu feed de eventos e publicações.</Text>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategories.includes(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.card,
                  { 
                    backgroundColor: isSelected ? accent : backgroundSecondary,
                    borderColor: isSelected ? accent : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)')
                  }
                ]}
                onPress={() => toggleCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.cardIcon}>{cat.icon}</Text>
                <Text style={[styles.cardTitle, { color: isSelected ? '#fff' : textPrimary }]}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: backgroundPrimary, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <TouchableOpacity 
            style={[
              styles.button, 
              { backgroundColor: selectedCategories.length > 0 ? accent : (isDark ? '#333' : '#ccc') }
            ]}
            disabled={selectedCategories.length === 0 || loading}
            onPress={handleFinish}
          >
            <Text style={[styles.buttonText, { color: selectedCategories.length > 0 ? '#fff' : (isDark ? '#666' : '#888') }]}>
              {loading ? 'Salvando...' : 'Continuar'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    paddingBottom: 120,
    justifyContent: 'space-between'
  },
  card: {
    width: (width - 52) / 2, // 2 items per row
    height: 110,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 24,
    borderTopWidth: 1,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '800',
  }
});
