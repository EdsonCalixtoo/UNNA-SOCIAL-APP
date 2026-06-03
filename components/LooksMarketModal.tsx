import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { X, Shirt, Search, Tag, MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LooksMarketModalProps {
  visible: boolean;
  onClose: () => void;
}

const mockLooks = [
  { id: 1, img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80', title: 'Jaqueta Paetê', price: 'R$ 80 (Aluguel)', user: 'Camila Dias' },
  { id: 2, img: 'https://images.unsplash.com/photo-1550614000-4b95d466f914?w=500&q=80', title: 'Top Brilhante', price: 'R$ 150 (Venda)', user: 'Laura Silva' },
  { id: 3, img: 'https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=500&q=80', title: 'Fantasia Fada', price: 'R$ 60 (Aluguel)', user: 'Bia Almeida' },
  { id: 4, img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80', title: 'Bota Neon', price: 'R$ 200 (Venda)', user: 'Mariana Souza' },
];

export default function LooksMarketModal({ visible, onClose }: LooksMarketModalProps) {
  
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        
        <Animated.View entering={SlideInUp.springify()} exiting={SlideOutDown} style={styles.container}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Shirt size={24} color="#ff1493" />
              <Text style={styles.title}>Brechó do Evento</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Compre ou alugue looks incríveis da galera que também vai nessa festa.</Text>

          <View style={styles.searchBar}>
            <Search size={20} color="rgba(255,255,255,0.5)" />
            <Text style={styles.searchText}>Buscar looks, paetês, fantasias...</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {mockLooks.map((look) => (
              <View key={look.id} style={styles.card}>
                <Image source={{ uri: look.img }} style={styles.image} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.cardOverlay}>
                  <View style={styles.tagBox}>
                    <Tag size={12} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={styles.price}>{look.price}</Text>
                  </View>
                  <Text style={styles.lookTitle}>{look.title}</Text>
                  <Text style={styles.userText}>Anunciado por {look.user}</Text>
                  
                  <TouchableOpacity style={styles.chatBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                    <MessageCircle size={16} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.chatBtnText}>Combinar</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.addBtn} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}>
            <Text style={styles.addBtnText}>+ Anunciar Meu Look</Text>
          </TouchableOpacity>

        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    minHeight: vs(600),
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: '#fff',
    fontSize: ms(20),
    fontWeight: '900',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: ms(13),
    marginBottom: 20,
    lineHeight: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  searchText: {
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 12,
    fontSize: ms(14),
  },
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  card: {
    width: (SCREEN_WIDTH - 60) / 2,
    height: vs(240),
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    paddingTop: 40,
  },
  tagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,20,147,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  price: {
    color: '#fff',
    fontSize: ms(10),
    fontWeight: '800',
  },
  lookTitle: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '900',
    marginBottom: 2,
  },
  userText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: ms(10),
    marginBottom: 10,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderRadius: 10,
  },
  chatBtnText: {
    color: '#000',
    fontSize: ms(12),
    fontWeight: '800',
  },
  addBtn: {
    backgroundColor: '#ff1493',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  addBtnText: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '900',
  }
});
