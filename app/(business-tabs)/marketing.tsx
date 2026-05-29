import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, Camera, ChevronRight, Megaphone, X, Ticket } from 'lucide-react-native';
import { vs, s, ms } from '@/utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '@/lib/storage';
import { processMedia } from '@/lib/mediaOptimizer';
import * as Haptics from 'expo-haptics';
import StoryCreator from '@/components/StoryCreator';

export default function MarketingTab() {
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Modals
  const [pushModalVisible, setPushModalVisible] = useState(false);
  const [storyCreatorVisible, setStoryCreatorVisible] = useState(false);

  const [pushTitle, setPushTitle] = useState('');
  const [pushMessage, setPushMessage] = useState('');
  const [pushLoading, setPushLoading] = useState(false);

  const handleSendPush = async () => {
    if (!pushTitle.trim() || !pushMessage.trim()) {
      return Alert.alert('Erro', 'Preencha o título e a mensagem.');
    }
    
    setPushLoading(true);
    try {
      // Pega todos os seguidores
      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user?.id);

      if (!followers || followers.length === 0) {
        Alert.alert('Aviso', 'Sua empresa ainda não tem seguidores para notificar.');
        setPushLoading(false);
        return;
      }

      // Insere uma notificação para cada seguidor (MVP. Num sistema real usaria Edge Functions + Expo Push)
      const notificationsToInsert = followers.map(f => ({
        user_id: f.follower_id,
        type: 'business_push',
        title: pushTitle,
        message: pushMessage,
        data: { sender_id: user?.id },
        read: false
      }));

      const { error } = await supabase.from('notifications').insert(notificationsToInsert);
      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', `Notificação enviada para ${followers.length} seguidores!`);
      setPushModalVisible(false);
      setPushTitle('');
      setPushMessage('');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setPushLoading(false);
    }
  };



  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + vs(10), backgroundColor: backgroundSecondary, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <Megaphone size={24} color={accent} style={{ marginRight: 8 }} />
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Marketing</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* PUSH NOTIFICATIONS CARD */}
        <TouchableOpacity 
          style={styles.actionCard} 
          activeOpacity={0.9}
          onPress={() => setPushModalVisible(true)}
        >
          <LinearGradient colors={['#7b2fff', '#ff1493']} style={styles.cardGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrap}>
                <Bell size={24} color="#fff" />
              </View>
              <ChevronRight size={24} color="rgba(255,255,255,0.5)" />
            </View>
            <Text style={styles.cardTitle}>Avisar Seguidores</Text>
            <Text style={styles.cardDesc}>Dispare uma notificação no celular de todos os seus seguidores para avisar de lote virando ou novidades.</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { marginTop: vs(16) }]} 
          activeOpacity={0.9}
          onPress={() => setStoryCreatorVisible(true)}
        >
          <LinearGradient colors={['#00d9ff', '#5856D6']} style={styles.cardGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrap}>
                <Camera size={24} color="#fff" />
              </View>
              <ChevronRight size={24} color="rgba(255,255,255,0.5)" />
            </View>
            <Text style={styles.cardTitle}>Postar Story</Text>
            <Text style={styles.cardDesc}>Mostre os bastidores. Fotos e vídeos de até 15s que somem em 24h e ficam no topo do feed.</Text>
          </LinearGradient>
        </TouchableOpacity>

      </ScrollView>

      {/* PUSH MODAL */}
      <Modal visible={pushModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContent, { backgroundColor: backgroundSecondary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Nova Notificação</Text>
              <TouchableOpacity onPress={() => setPushModalVisible(false)}>
                <X size={24} color={textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.inputLabel, { color: textPrimary }]}>Título da Notificação</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary }]}
              placeholder="Ex: Últimos Ingressos Lote 1!"
              placeholderTextColor={textSecondary}
              value={pushTitle}
              onChangeText={setPushTitle}
              maxLength={40}
            />

            <Text style={[styles.inputLabel, { color: textPrimary, marginTop: 16 }]}>Mensagem</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary }]}
              placeholder="Ex: Corra antes que acabe! Clique aqui para comprar..."
              placeholderTextColor={textSecondary}
              value={pushMessage}
              onChangeText={setPushMessage}
              multiline
              maxLength={120}
            />

            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: '#7b2fff', marginTop: 24 }]} 
              onPress={handleSendPush}
              disabled={pushLoading}
            >
              {pushLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Disparar Notificação</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* STORY CREATOR NATIVO (CAMERA + VIDEO) */}
      <StoryCreator 
        visible={storyCreatorVisible}
        onClose={() => setStoryCreatorVisible(false)}
        onSuccess={() => {
          setStoryCreatorVisible(false);
        }}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(16), paddingBottom: vs(12), borderBottomWidth: 1 },
  headerTitle: { fontSize: ms(20), fontWeight: '800' },
  scrollContent: { padding: s(16), paddingBottom: vs(100) },
  actionCard: { borderRadius: ms(20), overflow: 'hidden' },
  cardGradient: { padding: ms(20) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(16) },
  iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: ms(22), fontWeight: '800', marginBottom: 8 },
  cardDesc: { color: 'rgba(255,255,255,0.9)', fontSize: ms(14), lineHeight: 20 },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: ms(24), borderTopRightRadius: ms(24), padding: ms(24), paddingBottom: ms(40) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(24) },
  modalTitle: { fontSize: ms(20), fontWeight: '800' },
  inputLabel: { fontSize: ms(14), fontWeight: '700', marginBottom: 8 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: ms(15) },
  textArea: { height: 100, paddingTop: 16, textAlignVertical: 'top' },
  primaryBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: ms(16), fontWeight: '800' },
  
  previewContainer: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
});
