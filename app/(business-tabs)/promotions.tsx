import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Gift, Plus, X, Tag } from 'lucide-react-native';
import { vs, s, ms } from '@/utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface Reward {
  id: string;
  title: string;
  description: string;
  cost_coins: number;
  icon: string;
  is_active: boolean;
}

export default function PromotionsTab() {
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<Reward[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [icon, setIcon] = useState('🎁');

  useEffect(() => {
    if (user) loadPromotions();
  }, [user]);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      // Usamos any para ignorar tipagem ausente no types gerado (caso provider_id seja recente)
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('provider_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Se a coluna provider_id não existir na view ou algo falhar, apenas não quebra
        console.warn('Erro ao carregar promoções:', error);
      } else {
        setPromotions(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !description.trim() || !cost) {
      return Alert.alert('Aviso', 'Preencha todos os campos!');
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('rewards').insert({
        title,
        description,
        cost_coins: parseInt(cost, 10) || 500,
        icon,
        provider_id: user?.id,
        is_active: true
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Promoção criada!');
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setCost('');
      loadPromotions();
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + vs(10), backgroundColor: backgroundSecondary, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <Gift size={24} color={accent} style={{ marginRight: 8 }} />
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Promoções (UNNA Coins)</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={[styles.addButton, { borderColor: accent }]} onPress={() => setModalVisible(true)}>
            <Plus size={24} color={accent} />
            <Text style={[styles.addText, { color: accent }]}>Criar Nova Promoção</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: textSecondary }]}>Suas Promoções Ativas</Text>
          
          {promotions.length === 0 ? (
             <View style={styles.emptyState}>
               <Gift size={48} color={textSecondary} opacity={0.3} />
               <Text style={[styles.emptyText, { color: textSecondary }]}>Você ainda não criou nenhuma promoção para seus clientes gastarem UNNA Coins.</Text>
             </View>
          ) : (
            promotions.map(promo => (
              <View key={promo.id} style={[styles.promoCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <View style={styles.promoHeader}>
                  <Text style={styles.promoIcon}>{promo.icon}</Text>
                  <View style={styles.promoInfo}>
                    <Text style={[styles.promoTitle, { color: textPrimary }]}>{promo.title}</Text>
                    <Text style={[styles.promoCost, { color: accent }]}>{promo.cost_coins} Coins</Text>
                  </View>
                </View>
                <Text style={[styles.promoDesc, { color: textSecondary }]}>{promo.description}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* CREATE MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContent, { backgroundColor: backgroundSecondary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Nova Promoção</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: textPrimary }]}>Ícone (Emoji)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary }]}
              value={icon}
              onChangeText={setIcon}
              maxLength={2}
            />
            
            <Text style={[styles.inputLabel, { color: textPrimary, marginTop: 16 }]}>Título</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary }]}
              placeholder="Ex: 1 Drink Grátis"
              placeholderTextColor={textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.inputLabel, { color: textPrimary, marginTop: 16 }]}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary }]}
              placeholder="O que o cliente ganha ao resgatar?"
              placeholderTextColor={textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={[styles.inputLabel, { color: textPrimary, marginTop: 16 }]}>Custo (em UNNA Coins)</Text>
            <View style={styles.costInputWrap}>
              <Tag size={20} color={accent} style={styles.costIcon} />
              <TextInput
                style={[styles.input, styles.costInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary }]}
                placeholder="Ex: 500"
                placeholderTextColor={textSecondary}
                value={cost}
                onChangeText={setCost}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: accent, marginTop: 24 }]} 
              onPress={handleCreate}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Criar Promoção</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(16), paddingBottom: vs(12), borderBottomWidth: 1 },
  headerTitle: { fontSize: ms(20), fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: s(16), paddingBottom: vs(100) },
  addButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', marginBottom: 24, gap: 8 },
  addText: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 16 },
  emptyText: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  promoCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  promoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  promoIcon: { fontSize: 32 },
  promoInfo: { flex: 1 },
  promoTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  promoCost: { fontSize: 14, fontWeight: '800' },
  promoDesc: { fontSize: 14, lineHeight: 20 },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: ms(24), borderTopRightRadius: ms(24), padding: ms(24), paddingBottom: ms(40) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(24) },
  modalTitle: { fontSize: ms(20), fontWeight: '800' },
  inputLabel: { fontSize: ms(14), fontWeight: '700', marginBottom: 8 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: ms(15) },
  textArea: { height: 100, paddingTop: 16, textAlignVertical: 'top' },
  costInputWrap: { flexDirection: 'row', alignItems: 'center' },
  costIcon: { position: 'absolute', left: 16, zIndex: 1 },
  costInput: { flex: 1, paddingLeft: 44 },
  primaryBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#000', fontSize: ms(16), fontWeight: '800' },
});
