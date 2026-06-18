import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, Image, ActivityIndicator 
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/utils/responsive';
import { Plus, Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '@/lib/storage';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/lib/i18n';
import { Alert } from 'react-native';
import FullscreenMediaViewer from './FullscreenMediaViewer';
import PremiumConfirmationModal from './PremiumConfirmationModal';
import { ActionFeedback } from './ActionFeedback';

interface EventStory {
  id: string;
  media_url: string;
  media_type: string;
  user_id: string;
  profiles: {
    avatar_url: string;
    username: string;
  }
}

export const EventStoriesBar = ({ eventId, isParticipant }: { eventId: string, isParticipant: boolean }) => {
  const { user } = useAuth();
  const { accent, textPrimary, backgroundSecondary, isDark } = useTheme();
  const { t } = useLanguage();
  
  const [stories, setStories] = useState<EventStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<EventStory | null>(null);
  const [feedback, setFeedback] = useState({ visible: false, type: 'success' as 'success' | 'error' | 'info', title: '', message: '' });

  useEffect(() => {
    loadStories();
    
    const channel = supabase
      .channel(`event_stories:${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_stories', filter: `event_id=eq.${eventId}` }, () => {
        loadStories();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const loadStories = async () => {
    const { data } = await supabase
      .from('event_stories')
      .select('*, profiles:user_id(avatar_url, username)')
      .eq('event_id', eventId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (data) setStories(data as any);
    setLoading(false);
  };

  const handleAddStory = async () => {
    if (!isParticipant) return;
    
    Alert.alert(
      t('common.addMemory', 'Adicionar Memória'),
      t('common.chooseMediaDesc', 'Como deseja adicionar esta foto?'),
      [
        {
          text: t('common.camera', 'Câmera'),
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permissão', 'Precisamos de acesso à câmera.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
              allowsEditing: true,
              aspect: [9, 16]
            });
            if (!result.canceled) processImage(result.assets[0]);
          }
        },
        {
          text: t('common.gallery', 'Galeria'),
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
              allowsEditing: true,
              aspect: [9, 16]
            });
            if (!result.canceled) processImage(result.assets[0]);
          }
        },
        { text: t('common.cancel', 'Cancelar'), style: 'cancel' }
      ]
    );
  };

  const processImage = async (asset: any) => {
    try {
      setUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const fileName = `event-stories/${eventId}/${user?.id}-${Date.now()}.jpg`;
      const publicUrl = await uploadFile(asset.uri, fileName, 'image/jpeg');

      if (publicUrl) {
        const { error: storyError } = await supabase.from('event_stories').insert({
          event_id: eventId,
          user_id: user?.id,
          media_url: publicUrl,
          media_type: 'image'
        });

        if (storyError) {
          Alert.alert('Erro na Memória', storyError.message);
          throw storyError;
        }

        const { error: postError } = await supabase.from('posts').insert({
          user_id: user?.id,
          image_url: publicUrl,
          image_urls: [publicUrl],
          content: `Memória do evento! 📸`,
          event_id: eventId 
        });

        if (postError) {
          Alert.alert('Erro no Mural', 'A foto foi para o evento, mas não conseguimos salvar no seu Mural: ' + postError.message);
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        loadStories();
        setFeedback({
          visible: true,
          type: 'success',
          title: 'Memória Criada!',
          message: 'Sua foto foi adicionada ao evento e ao seu mural. 📸'
        });
      }
    } catch (e: any) {
      console.error(e);
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Ops!',
        message: e.message || 'Erro ao processar imagem'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStory = async (story: EventStory) => {
    setStoryToDelete(story);
    setDeleteModalVisible(true);
  };

  const confirmDeleteStory = async () => {
    if (!storyToDelete) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // 1. Apaga da tabela de stories
      const { error: sError } = await supabase.from('event_stories').delete().eq('id', storyToDelete.id);
      if (sError) {
        Alert.alert('Erro ao apagar no banco', sError.message);
        throw sError;
      }
      
      // 2. Apaga o post vinculado no mural (usando a URL da mídia como chave)
      const { error: pError } = await supabase.from('posts').delete().eq('image_url', storyToDelete.media_url).eq('user_id', user?.id);
      if (pError) console.log('Post already deleted or missing:', pError.message);
      
      setDeleteModalVisible(false);
      setStoryToDelete(null);
      loadStories();
    } catch (err: any) {
      Alert.alert('Erro ao apagar', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: textPrimary }]}>{t('events.eventMemories', 'Memórias do Evento')}</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {isParticipant && (
          <TouchableOpacity 
            style={[styles.addBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} 
            onPress={handleAddStory}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={accent} />
            ) : (
              <View style={[styles.plusCircle, { backgroundColor: accent }]}>
                <Plus size={20} color="#fff" />
              </View>
            )}
            <Text style={[styles.addText, { color: textPrimary }]}>{t('common.post', 'Postar')}</Text>
          </TouchableOpacity>
        )}

        {stories.map((story, index) => {
          const isOwner = story.user_id === user?.id;
          return (
            <View key={story.id} style={styles.storyWrapper}>
              <TouchableOpacity 
                style={styles.storyItem}
                onPress={() => {
                  setSelectedIdx(index);
                  setIsViewerVisible(true);
                }}
              >
                <View style={[styles.storyBorder, { borderColor: isOwner ? accent : 'rgba(150,150,150,0.3)' }]}>
                  <Image source={{ uri: story?.media_url }} style={styles.storyImg} />
                </View>
                <Image source={{ uri: story?.profiles?.avatar_url }} style={styles.miniAvatar} />
              </TouchableOpacity>

              {isOwner && (
                <TouchableOpacity 
                  style={styles.deleteBadge} 
                  onPress={() => handleDeleteStory(story)}
                >
                  <X size={12} color="#fff" strokeWidth={3} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      <FullscreenMediaViewer 
        visible={isViewerVisible}
        onClose={() => setIsViewerVisible(false)}
        mediaUrls={stories.map(s => s.media_url)}
        initialIndex={selectedIdx}
      />

      <PremiumConfirmationModal
        visible={deleteModalVisible}
        title={t('events.removeMemory', 'Remover Memória')}
        description={t('events.removeMemoryConfirm', 'Tem certeza que deseja apagar esta foto do evento e do seu mural permanentemente?')}
        confirmText={t('common.delete', 'Apagar Agora')}
        cancelText={t('common.back', 'Voltar')}
        onConfirm={confirmDeleteStory}
        onCancel={() => setDeleteModalVisible(false)}
      />

      <ActionFeedback 
        {...feedback} 
        onClose={() => setFeedback({ ...feedback, visible: false })} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: vs(15) },
  title: { fontSize: ms(16), fontWeight: '800', marginBottom: vs(12), paddingHorizontal: s(4) },
  scroll: { paddingLeft: s(4), gap: s(15) },
  addBtn: { width: s(70), height: vs(100), borderRadius: ms(15), justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(150,150,150,0.3)' },
  plusCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  addText: { fontSize: ms(11), fontWeight: '700' },
  storyItem: { width: s(70), height: vs(100), position: 'relative' },
  storyBorder: { width: '100%', height: '100%', borderRadius: ms(15), borderWidth: 2, padding: 2 },
  storyImg: { width: '100%', height: '100%', borderRadius: ms(12) },
  miniAvatar: { position: 'absolute', bottom: -5, right: -5, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#fff' },
  storyWrapper: { position: 'relative' },
  deleteBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  }
});
