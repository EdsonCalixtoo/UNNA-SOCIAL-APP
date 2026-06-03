import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { X, MapPin, Wine, Star } from 'lucide-react-native';
import Animated, { FadeIn, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EventMapModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function EventMapModal({ visible, onClose }: EventMapModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        
        <Animated.View entering={SlideInUp.springify()} exiting={SlideOutDown} style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Mapa do Local 🏟️</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* SIMULAÇÃO DE UM MAPA 3D / ISOMÉTRICO */}
          <View style={styles.mapContainer}>
            
            {/* PISTA */}
            <View style={[styles.zone, styles.pistaZone]}>
              <Text style={styles.zoneText}>PISTA</Text>
            </View>

            {/* PALCO */}
            <View style={[styles.zone, styles.stageZone]}>
              <Star size={16} color="#fff" style={{ marginBottom: 4 }} />
              <Text style={styles.zoneText}>PALCO PRINCIPAL</Text>
            </View>

            {/* CAMAROTE */}
            <View style={[styles.zone, styles.camaroteZone]}>
              <Text style={styles.zoneText}>CAMAROTE VIP</Text>
            </View>

            {/* BAR */}
            <View style={[styles.zone, styles.barZone]}>
              <Wine size={16} color="#fff" style={{ marginBottom: 4 }} />
              <Text style={styles.zoneText}>BAR</Text>
            </View>

          </View>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
              <Text style={styles.legendText}>Banheiros</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF3B30' }]} />
              <Text style={styles.legendText}>Saída de Emergência</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
              <Text style={styles.legendText}>Alimentação</Text>
            </View>
          </View>

        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    backgroundColor: '#1a1a1a',
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
  mapContainer: {
    width: '100%',
    height: vs(300),
    backgroundColor: '#000',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 20,
  },
  zone: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
  },
  zoneText: {
    color: '#fff',
    fontSize: ms(10),
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  stageZone: {
    top: 10,
    left: '10%',
    width: '80%',
    height: '20%',
    backgroundColor: 'rgba(255,20,147,0.3)',
    borderColor: '#ff1493',
  },
  pistaZone: {
    top: '35%',
    left: '10%',
    width: '80%',
    height: '40%',
    backgroundColor: 'rgba(0,217,255,0.1)',
    borderColor: '#00d9ff',
  },
  camaroteZone: {
    top: '20%',
    right: '-5%',
    width: '35%',
    height: '50%',
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderColor: '#FFD700',
    transform: [{ rotate: '-15deg' }], // Efeito isométrico fake
  },
  barZone: {
    bottom: 10,
    left: '10%',
    width: '40%',
    height: '15%',
    backgroundColor: 'rgba(0,230,118,0.2)',
    borderColor: '#00E676',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: ms(12),
  }
});
