import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { BlurView } from 'expo-blur';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  categories: any[];
  selectedCategory: string | null;
  onSelectCategory: (id: string | null) => void;
}

const FilterModal = ({ visible, onClose, categories, selectedCategory, onSelectCategory }: FilterModalProps) => {
  const { backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={[styles.container, { backgroundColor: backgroundSecondary }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: textPrimary }]}>Categorias</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {/* All Categories Option */}
            <TouchableOpacity
              style={[
                styles.item,
                selectedCategory === null && [styles.activeItem, { borderColor: accent }]
              ]}
              onPress={() => onSelectCategory(null)}
            >
              <View style={styles.itemContent}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                  <Text style={styles.emoji}>🌍</Text>
                </View>
                <Text style={[styles.itemName, { color: selectedCategory === null ? accent : textPrimary }]}>
                  Todos os Eventos
                </Text>
              </View>
              {selectedCategory === null && <Check size={18} color={accent} />}
            </TouchableOpacity>

            {/* Custom Categories */}
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.item,
                  selectedCategory === cat.id && [styles.activeItem, { borderColor: accent }]
                ]}
                onPress={() => onSelectCategory(cat.id)}
              >
                <View style={styles.itemContent}>
                  <View style={[styles.iconContainer, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                    <Text style={styles.emoji}>{cat.icon}</Text>
                  </View>
                  <Text style={[styles.itemName, { color: selectedCategory === cat.id ? accent : textPrimary }]}>
                    {cat.name}
                  </Text>
                </View>
                {selectedCategory === cat.id && <Check size={18} color={accent} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  activeItem: {
    backgroundColor: 'rgba(0, 217, 255, 0.08)',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FilterModal;
