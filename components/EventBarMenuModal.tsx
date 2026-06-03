import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { X, Plus, Minus, ShoppingCart, Beer, Coffee } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { ms, vs } from '@/utils/responsive';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Drink {
  id: string;
  name: string;
  price: number;
  icon: string;
  category: 'Cervejas' | 'Combos' | 'Sem Álcool';
}

const MENU: Drink[] = [
  { id: '1', name: 'Combo Vodka Absolut + 4 Energéticos', price: 250, icon: '🧊', category: 'Combos' },
  { id: '2', name: 'Combo Gin Tanqueray + 4 Tônicas', price: 320, icon: '🍸', category: 'Combos' },
  { id: '3', name: 'Heineken Long Neck', price: 15, icon: '🍺', category: 'Cervejas' },
  { id: '4', name: 'Corona Long Neck', price: 18, icon: '🍺', category: 'Cervejas' },
  { id: '5', name: 'Água Mineral', price: 8, icon: '💧', category: 'Sem Álcool' },
  { id: '6', name: 'Energético Red Bull', price: 20, icon: '⚡', category: 'Sem Álcool' },
];

export default function EventBarMenuModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const [cart, setCart] = useState<{ [key: string]: number }>({});

  const addToCart = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart(prev => {
      if (!prev[id]) return prev;
      const newCart = { ...prev };
      if (newCart[id] === 1) delete newCart[id];
      else newCart[id] -= 1;
      return newCart;
    });
  };

  const total = Object.entries(cart).reduce((acc, [id, qty]) => {
    const item = MENU.find(m => m.id === id);
    return acc + (item ? item.price * qty : 0);
  }, 0);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <Animated.View style={StyleSheet.absoluteFill} entering={FadeIn}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View 
          style={[styles.sheet, { backgroundColor: backgroundPrimary }]} 
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown}
        >
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: textPrimary }]}>Cardápio do Bar 🍻</Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>Compre pelo app e evite filas</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: backgroundSecondary }]}>
              <X size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {['Combos', 'Cervejas', 'Sem Álcool'].map(category => (
              <View key={category}>
                <Text style={[styles.categoryTitle, { color: textPrimary }]}>{category}</Text>
                {MENU.filter(m => m.category === category).map(item => {
                  const qty = cart[item.id] || 0;
                  return (
                    <View key={item.id} style={[styles.menuItem, { borderBottomColor: backgroundSecondary }]}>
                      <View style={styles.iconBox}><Text style={{ fontSize: 24 }}>{item.icon}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { color: textPrimary }]}>{item.name}</Text>
                        <Text style={[styles.itemPrice, { color: accent }]}>R$ {item.price.toFixed(2)}</Text>
                      </View>
                      
                      <View style={styles.qtyControls}>
                        {qty > 0 && (
                          <>
                            <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: backgroundSecondary }]} onPress={() => removeFromCart(item.id)}>
                              <Minus size={16} color={textPrimary} />
                            </TouchableOpacity>
                            <Text style={[styles.qtyText, { color: textPrimary }]}>{qty}</Text>
                          </>
                        )}
                        <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: accent }]} onPress={() => addToCart(item.id)}>
                          <Plus size={16} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
            <View style={{ height: 100 }} />
          </ScrollView>

          {total > 0 && (
            <View style={[styles.footer, { backgroundColor: backgroundSecondary, borderTopColor: isDark ? '#333' : '#eee' }]}>
              <View>
                <Text style={[styles.totalLabel, { color: textSecondary }]}>Total</Text>
                <Text style={[styles.totalValue, { color: textPrimary }]}>R$ {total.toFixed(2)}</Text>
              </View>
              <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: accent }]} onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onClose();
              }}>
                <ShoppingCart size={18} color="#FFF" />
                <Text style={styles.checkoutText}>Pagar Ficha</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  sheet: { height: '85%', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 14, marginTop: 4 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 24 },
  categoryTitle: { fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  itemPrice: { fontSize: 15, fontWeight: '800' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 16, fontWeight: '800', minWidth: 12, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 34, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1 },
  totalLabel: { fontSize: 14, fontWeight: '600' },
  totalValue: { fontSize: 24, fontWeight: '900' },
  checkoutBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20, gap: 8 },
  checkoutText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});
