import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { X, Car, MapPin, Plus, UserCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';

interface RideShareModalProps {
  visible: boolean;
  onClose: () => void;
}

const mockRides = [
  { id: '1', driver: 'Laura Silva', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80', from: 'Zona Sul (Copacabana)', spots: 2, time: '22:30', price: 'R$ 15' },
  { id: '2', driver: 'Pedro Alves', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80', from: 'Barra da Tijuca', spots: 3, time: '23:00', price: 'Grátis' },
];

export default function RideShareModal({ visible, onClose }: RideShareModalProps) {
  const [activeTab, setActiveTab] = useState<'find' | 'offer'>('find');

  const handleAction = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    alert(activeTab === 'find' ? 'Solicitação de carona enviada ao motorista!' : 'Sua rota foi publicada no evento!');
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        
        <Animated.View entering={SlideInUp.springify()} exiting={SlideOutDown} style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>UNИA Ride 🚗</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'find' && styles.activeTab]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('find'); }}
            >
              <Text style={[styles.tabText, activeTab === 'find' && styles.activeTabText]}>Achar Carona</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'offer' && styles.activeTab]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab('offer'); }}
            >
              <Text style={[styles.tabText, activeTab === 'offer' && styles.activeTabText]}>Oferecer Carona</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'find' ? (
            <ScrollView style={styles.list}>
              {mockRides.map(ride => (
                <View key={ride.id} style={styles.rideCard}>
                  <View style={styles.rideHeader}>
                    <Image source={{ uri: ride.avatar }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.driverName}>{ride.driver} <UserCheck size={14} color="#00E676" /></Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <MapPin size={12} color="#00d9ff" />
                        <Text style={styles.routeText}>Saindo de: {ride.from}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.rideFooter}>
                    <View style={styles.infoBadge}>
                      <Text style={styles.infoBadgeText}>{ride.spots} vagas</Text>
                    </View>
                    <View style={styles.infoBadge}>
                      <Text style={styles.infoBadgeText}>Sai às {ride.time}</Text>
                    </View>
                    <View style={[styles.infoBadge, { backgroundColor: ride.price === 'Grátis' ? 'rgba(0,230,118,0.2)' : 'rgba(255,215,0,0.2)' }]}>
                      <Text style={[styles.infoBadgeText, { color: ride.price === 'Grátis' ? '#00E676' : '#FFD700' }]}>{ride.price}</Text>
                    </View>
                    
                    <TouchableOpacity style={styles.requestBtn} onPress={handleAction}>
                      <Text style={styles.requestBtnText}>Pedir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.offerForm}>
              <View style={styles.inputMock}>
                <MapPin size={20} color="#00d9ff" />
                <Text style={styles.inputMockText}>De onde você vai sair?</Text>
              </View>
              <View style={styles.inputMock}>
                <Car size={20} color="#fff" />
                <Text style={styles.inputMockText}>Quantas vagas disponíveis?</Text>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAction}>
                <Plus size={20} color="#000" />
                <Text style={styles.submitBtnText}>Publicar Rota</Text>
              </TouchableOpacity>
            </View>
          )}

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
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    minHeight: vs(450),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#00d9ff',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '800',
    fontSize: ms(14),
  },
  activeTabText: {
    color: '#000',
  },
  list: {
    flex: 1,
  },
  rideCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  driverName: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '800',
  },
  routeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: ms(12),
    marginLeft: 4,
  },
  rideFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  infoBadgeText: {
    color: '#fff',
    fontSize: ms(10),
    fontWeight: '800',
  },
  requestBtn: {
    backgroundColor: '#00d9ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  requestBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: ms(12),
  },
  offerForm: {
    flex: 1,
    justifyContent: 'center',
  },
  inputMock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputMockText: {
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 12,
    fontSize: ms(14),
  },
  submitBtn: {
    backgroundColor: '#00d9ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    gap: 8,
  },
  submitBtnText: {
    color: '#000',
    fontSize: ms(16),
    fontWeight: '900',
  }
});
