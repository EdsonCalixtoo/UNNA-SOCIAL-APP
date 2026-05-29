import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, CheckCircle, Trash2, Award, Beer, Ticket, Gift, Sparkles } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Animated, { FadeIn, FadeInUp, Layout } from 'react-native-reanimated';

const TEMPLATES = [
  { id: 't1', title: 'Bebida Grátis', description: 'Vale 1 Drink Clássico ou Cerveja Long Neck.', cost: 50, icon: <Beer size={30} color="#fff" />, color: '#00d9ff' },
  { id: 't2', title: 'Entrada VIP', description: 'Fura-fila e entrada grátis para 1 pessoa.', cost: 150, icon: <Sparkles size={30} color="#fff" />, color: '#ff1493' },
  { id: 't3', title: 'Voucher R$50', description: 'Desconto de R$50 na conta final.', cost: 100, icon: <Ticket size={30} color="#fff" />, color: '#34C759' },
  { id: 't4', title: 'Brinde Especial', description: 'Caneca, Copo ou Camiseta do local.', cost: 200, icon: <Gift size={30} color="#fff" />, color: '#AF52DE' },
];

export default function BusinessRewardsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark } = useTheme();
  
  const [activeRewards, setActiveRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadActiveRewards();
  }, [user]);

  const loadActiveRewards = async () => {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('provider_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setActiveRewards(data || []);
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível carregar os prêmios ativos.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddReward = async (template: typeof TEMPLATES[0]) => {
    // Check if they already have this reward active to prevent spam
    if (activeRewards.some(r => r.title === template.title)) {
      Alert.alert('Aviso', 'Você já tem este prêmio ativo!');
      return;
    }

    setActionLoading(template.id);
    try {
      const { data, error } = await supabase.from('rewards').insert({
        title: template.title,
        description: template.description,
        cost: template.cost,
        provider_id: user?.id,
        is_active: true
      }).select().single();

      if (error) throw error;
      
      setActiveRewards(prev => [data, ...prev]);
      Alert.alert('Sucesso', `${template.title} adicionado à sua vitrine!`);
    } catch (err: any) {
      Alert.alert('Erro', 'Não foi possível adicionar o prêmio: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveReward = async (rewardId: string) => {
    Alert.alert(
      'Remover Prêmio',
      'Tem certeza que deseja remover este prêmio da sua vitrine?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive',
          onPress: async () => {
            setActionLoading(rewardId);
            try {
              const { error } = await supabase.from('rewards')
                .update({ is_active: false })
                .eq('id', rewardId)
                .eq('provider_id', user?.id);

              if (error) throw error;
              setActiveRewards(prev => prev.filter(r => r.id !== rewardId));
            } catch (err: any) {
              Alert.alert('Erro', 'Não foi possível remover o prêmio: ' + err.message);
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: backgroundPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Gestão de Prêmios</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Ativos */}
        <Animated.View entering={FadeIn.delay(100)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Seus Prêmios Ativos</Text>
          <Text style={[styles.sectionDesc, { color: textSecondary }]}>Estes são os brindes que os usuários podem resgatar no seu estabelecimento neste momento.</Text>

          {loading ? (
            <ActivityIndicator color="#00d9ff" style={{ marginVertical: 30 }} />
          ) : activeRewards.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
              <Award size={40} color={textSecondary} style={{ opacity: 0.5 }} />
              <Text style={{ color: textSecondary, marginTop: 10, textAlign: 'center' }}>Você não tem prêmios ativos.{'\n'}Adicione um abaixo!</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {activeRewards.map((reward, index) => (
                <Animated.View key={reward.id} entering={FadeInUp.delay(100 + index * 50)} layout={Layout.springify()}>
                  <View style={[styles.activeCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <View style={styles.activeContent}>
                      <Text style={[styles.activeTitle, { color: textPrimary }]}>{reward.title}</Text>
                      <View style={styles.costBadge}>
                        <Sparkles size={12} color="#ff1493" />
                        <Text style={styles.costText}>{reward.cost} pts</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleRemoveReward(reward.id)}
                      disabled={actionLoading === reward.id}
                      style={styles.removeBtn}
                    >
                      {actionLoading === reward.id ? <ActivityIndicator size="small" color="#ff4444" /> : <Trash2 size={20} color="#ff4444" />}
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Templates */}
        <Animated.View entering={FadeInUp.delay(200)} style={[styles.section, { marginTop: 10 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <Plus size={20} color="#00d9ff" />
            <Text style={[styles.sectionTitle, { color: textPrimary, marginBottom: 0 }]}>Adicionar Novo Prêmio</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: textSecondary, marginBottom: 20 }]}>Escolha um modelo abaixo para começar a atrair mais clientes para o seu negócio com o poder da recompensa.</Text>

          <View style={styles.grid}>
            {TEMPLATES.map((template, index) => {
              const isActive = activeRewards.some(r => r.title === template.title);
              
              return (
                <Animated.View key={template.id} entering={FadeInUp.delay(300 + index * 50)} style={{ width: '48%' }}>
                  <TouchableOpacity 
                    onPress={() => handleAddReward(template)}
                    disabled={isActive || actionLoading === template.id}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[template.color + '22', template.color + '44']}
                      style={[styles.templateCard, isActive && styles.templateCardDisabled]}
                    >
                      <View style={[styles.iconBg, { backgroundColor: template.color }]}>
                        {template.icon}
                      </View>
                      
                      <Text style={[styles.templateTitle, { color: textPrimary }]}>{template.title}</Text>
                      <Text style={[styles.templateDesc, { color: textSecondary }]} numberOfLines={3}>{template.description}</Text>
                      
                      <View style={[styles.addBtn, { backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : template.color }]}>
                        {actionLoading === template.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : isActive ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <CheckCircle size={14} color="#fff" />
                            <Text style={styles.addBtnText}>Adicionado</Text>
                          </View>
                        ) : (
                          <Text style={styles.addBtnText}>Adicionar por {template.cost}pts</Text>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { 
    height: 100, 
    paddingTop: 45, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scroll: { padding: 20, paddingBottom: 100 },
  
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 5 },
  sectionDesc: { fontSize: 14, marginBottom: 15, lineHeight: 20 },
  
  emptyBox: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 20, padding: 30, alignItems: 'center', justifyContent: 'center' },
  
  activeCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1 },
  activeContent: { flex: 1 },
  activeTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  costBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255, 20, 147, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  costText: { color: '#ff1493', fontSize: 12, fontWeight: '800' },
  removeBtn: { padding: 10, backgroundColor: 'rgba(255,68,68,0.1)', borderRadius: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  templateCard: { borderRadius: 24, padding: 16, alignItems: 'center', height: 230, justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  templateCardDisabled: { opacity: 0.5 },
  iconBg: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  templateTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 5 },
  templateDesc: { fontSize: 12, textAlign: 'center', lineHeight: 16, opacity: 0.8 },
  
  addBtn: { width: '100%', paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' }
});
