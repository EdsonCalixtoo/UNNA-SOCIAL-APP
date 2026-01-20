import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';

interface FilterState {
  liveOnly: boolean;
  categories: string[];
}

interface MapFiltersModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterState) => void;
  categories?: Array<{ id: string; name: string; color: string; icon: string }>;
}

const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Festas', color: '#FF1B6D', icon: '🎉' },
  { id: '2', name: 'Esportes', color: '#00D084', icon: '⚽' },
  { id: '3', name: 'Música', color: '#FF6B00', icon: '🎵' },
  { id: '4', name: 'Arte', color: '#667EEA', icon: '🎨' },
  { id: '5', name: 'Tecnologia', color: '#00B4DB', icon: '💻' },
  { id: '6', name: 'Gastronomia', color: '#FF9500', icon: '🍽️' },
  { id: '7', name: 'Bem-estar', color: '#34C759', icon: '🧘' },
  { id: '8', name: 'Educação', color: '#764BA2', icon: '📚' },
];

export function MapFiltersModal({
  visible,
  onClose,
  onApplyFilters,
  categories = DEFAULT_CATEGORIES,
}: MapFiltersModalProps) {
  const [filters, setFilters] = useState<FilterState>({
    liveOnly: false,
    categories: [],
  });

  const handleCategoryToggle = (categoryId: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const handleApplyFilters = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleClearFilters = () => {
    setFilters({
      liveOnly: false,
      categories: [],
    });
  };

  const hasActiveFilters = filters.liveOnly || filters.categories.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filtros</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.8}
            >
              <X size={24} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Live Only Toggle */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={styles.filterItem}>
                <View>
                  <Text style={styles.filterLabel}>Apenas Eventos ao Vivo</Text>
                  <Text style={styles.filterDescription}>
                    Mostra apenas eventos acontecendo agora
                  </Text>
                </View>
                <Switch
                  value={filters.liveOnly}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, liveOnly: value }))
                  }
                  trackColor={{ false: '#3d3d3d', true: '#667EEA' }}
                  thumbColor={filters.liveOnly ? '#fff' : '#999'}
                />
              </View>
            </View>

            {/* Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categorias</Text>
              <View style={styles.categoriesGrid}>
                {categories.map((category) => {
                  const isSelected = filters.categories.includes(category.id);
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        isSelected && styles.categoryButtonSelected,
                        { borderColor: category.color },
                      ]}
                      onPress={() => handleCategoryToggle(category.id)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={
                          isSelected
                            ? [category.color, `${category.color}dd`]
                            : ['transparent', 'transparent']
                        }
                        style={styles.categoryGradient}
                      >
                        <Text style={styles.categoryIcon}>{category.icon}</Text>
                        <Text
                          style={[
                            styles.categoryName,
                            isSelected && styles.categoryNameSelected,
                          ]}
                        >
                          {category.name}
                        </Text>
                        {isSelected && (
                          <View style={styles.checkMark}>
                            <Check size={14} color="#fff" strokeWidth={3} />
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClearFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.clearButtonText}>Limpar Filtros</Text>
              </TouchableOpacity>
            )}

            <LinearGradient
              colors={['#667EEA', '#764BA2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.applyButtonGradient}
            >
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d2d',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2d2d2d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  filterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#2d2d2d',
    gap: 16,
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  filterDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  categoryButton: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#2d2d2d',
  },
  categoryButtonSelected: {
    backgroundColor: 'transparent',
  },
  categoryGradient: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: '#fff',
  },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d2d2d',
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#667EEA',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#667EEA',
  },
  applyButtonGradient: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
