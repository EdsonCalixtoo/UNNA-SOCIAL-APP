import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { X, CreditCard, Users, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInUp, SlideOutDown } from 'react-native-reanimated';
import { ms, vs } from '@/utils/responsive';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface Friend {
  id: string;
  name: string;
  avatar: string;
  selected: boolean;
}

interface SplitBillModalProps {
  visible: boolean;
  onClose: () => void;
  totalAmount?: number;
}

export default function SplitBillModal({ visible, onClose, totalAmount = 2000 }: SplitBillModalProps) {
  const { backgroundSecondary, textPrimary, textSecondary } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([
    { id: '1', name: 'Laura Silva', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80', selected: false },
    { id: '2', name: 'Pedro Alves', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80', selected: false },
    { id: '3', name: 'Camila Dias', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80', selected: false },
  ]);
  const [success, setSuccess] = useState(false);

  const selectedCount = friends.filter(f => f.selected).length + 1; // +1 for the user
  const splitAmount = totalAmount / selectedCount;

  const toggleFriend = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFriends(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  };

  const handleSplit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 2500);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        
        <Animated.View entering={SlideInUp.springify()} exiting={SlideOutDown} style={[styles.container, { backgroundColor: backgroundSecondary }]}>
          {success ? (
            <View style={styles.successView}>
              <CheckCircle2 size={80} color="#00E676" />
              <Text style={styles.successTitle}>Cobrança Enviada!</Text>
              <Text style={styles.successText}>Seus amigos receberam uma notificação para pagar a parte deles de R$ {splitAmount.toFixed(2)}.</Text>
            </View>
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Rachar Camarote 🥂</Text>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <X size={20} color={textPrimary} />
                </TouchableOpacity>
              </View>

              <LinearGradient colors={['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.02)']} style={styles.amountCard}>
                <Text style={styles.amountLabel}>VALOR TOTAL DO CAMAROTE</Text>
                <Text style={styles.amountValue}>R$ {totalAmount.toFixed(2)}</Text>
                <View style={styles.splitResultBox}>
                  <Text style={styles.splitResultText}>
                    {selectedCount} pessoas = <Text style={{ color: '#00E676' }}>R$ {splitAmount.toFixed(2)}</Text> para cada
                  </Text>
                </View>
              </LinearGradient>

              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Selecionar Amigos ({selectedCount - 1}/3)</Text>
              
              <ScrollView style={styles.friendsList}>
                {friends.map(friend => (
                  <TouchableOpacity 
                    key={friend.id} 
                    style={[styles.friendRow, friend.selected && styles.friendRowSelected]}
                    onPress={() => toggleFriend(friend.id)}
                  >
                    <Image source={{ uri: friend.avatar }} style={styles.avatar} />
                    <Text style={[styles.friendName, { color: textPrimary }]}>{friend.name}</Text>
                    <View style={[styles.checkbox, friend.selected && styles.checkboxSelected]}>
                      {friend.selected && <CheckCircle2 size={16} color="#000" />}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.splitBtn} onPress={handleSplit}>
                <CreditCard size={20} color="#000" />
                <Text style={styles.splitBtnText}>Cobrar Amigos (R$ {splitAmount.toFixed(2)})</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    minHeight: vs(500),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: ms(20),
    fontWeight: '900',
    color: '#fff',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountCard: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  amountLabel: {
    color: '#FFD700',
    fontSize: ms(12),
    fontWeight: '800',
  },
  amountValue: {
    color: '#fff',
    fontSize: ms(36),
    fontWeight: '900',
    marginVertical: 10,
  },
  splitResultBox: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  splitResultText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: ms(16),
    fontWeight: '800',
    marginBottom: 16,
  },
  friendsList: {
    maxHeight: vs(200),
    marginBottom: 20,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 8,
  },
  friendRowSelected: {
    backgroundColor: 'rgba(0,230,118,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendName: {
    flex: 1,
    fontSize: ms(16),
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  splitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  splitBtnText: {
    color: '#000',
    fontSize: ms(16),
    fontWeight: '900',
  },
  successView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  successTitle: {
    color: '#fff',
    fontSize: ms(24),
    fontWeight: '900',
    marginTop: 20,
    marginBottom: 10,
  },
  successText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontSize: ms(14),
  }
});
