import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, Image, ActivityIndicator,
  Modal, Platform
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
import StoryCameraModal from './StoryCameraModal';
import { Image as ImageIcon } from 'lucide-react-native';

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
  const [cameraVisible, setCameraVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);

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

  const handleAddStory = () => {
    if (!isParticipant) return;
    setActionSheetVisible(true);
  };

  const handleOpenGallery = async () => {
    setActionSheetVisible(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.7,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets) {
      setUploading(true);
      await Promise.all(result.assets.map(asset => processImage(asset, true)));
      setUploading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadStories();
      setFeedback({
        visible: true,
        type: 'success',
        title: 'Memórias Adicionadas!',
        message: `${result.assets.length} arq(s) adicionados ao evento.`
      });
    }
  };

  const processImage = async (asset: any, skipFeedback = false) => {
    try {
      if (!skipFeedback) {
        setUploading(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const isVideo = asset.type === 'video' || (asset.uri && asset.uri.toLowerCase().endsWith('.mp4'));
      const extension = isVideo ? 'mp4' : 'jpg';
      const mime = isVideo ? 'video/mp4' : 'image/jpeg';
      
      const fileName = `event-stories/${eventId}/${user?.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
      const publicUrl = await uploadFile(asset.uri, fileName, mime);

      if (publicUrl) {
        const { error: storyError } = await supabase.from('event_stories').insert({
          event_id: eventId,
          user_id: user?.id,
          media_url: publicUrl,
          media_type: isVideo ? 'video' : 'image'
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
          console.log('Erro no Mural:', postError.message);
        }

        if (!skipFeedback) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadStories();
          setFeedback({
            visible: true,
            type: 'success',
            title: 'Memória Criada!',
            message: 'Sua mídia foi adicionada ao evento. 📸'
          });
        }
      }
    } catch (e: any) {
      console.error(e);
      if (!skipFeedback) {
        setFeedback({
          visible: true,
          type: 'error',
          title: 'Ops!',
          message: e.message || 'Erro ao processar imagem'
        });
      }
    } finally {
      if (!skipFeedback) {
        setUploading(false);
      }
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

      {isViewerVisible && (
        <FullscreenMediaViewer 
          visible={isViewerVisible}
          onClose={() => setIsViewerVisible(false)}
          stories={stories}
          initialIndex={selectedIdx}
        />
      )}

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

      {cameraVisible && (
        <StoryCameraModal
          visible={cameraVisible}
          onClose={() => setCameraVisible(false)}
          usageType="event"
          onCapture={(uri, type) => {
            setCameraVisible(false);
            processImage({ uri, type });
          }}
        />
      )}

      {/* Action Sheet para Escolha de Mídia */}
      <Modal visible={actionSheetVisible} transparent animationType="fade" onRequestClose={() => setActionSheetVisible(false)}>
        <View style={styles.actionSheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setActionSheetVisible(false)} />
          <View style={styles.actionSheetContainer}>
            <View style={styles.actionSheetHandle} />
            <Text style={styles.actionSheetTitle}>Adicionar Memória</Text>
            <Text style={styles.actionSheetDesc}>Como deseja adicionar sua mídia?</Text>
            
            <View style={styles.actionSheetOptions}>
              <TouchableOpacity style={styles.actionSheetBtn} onPress={() => { setActionSheetVisible(false); setCameraVisible(true); }}>
                <View style={[styles.actionSheetIconWrapper, { backgroundColor: 'rgba(0, 217, 255, 0.15)' }]}>
                  <Camera size={26} color="#00d9ff" />
                </View>
                <Text style={styles.actionSheetBtnText}>Câmera</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionSheetBtn} onPress={handleOpenGallery}>
                <View style={[styles.actionSheetIconWrapper, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                  <ImageIcon size={26} color="#fff" />
                </View>
                <Text style={styles.actionSheetBtnText}>Galeria</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.actionSheetCancel} onPress={() => setActionSheetVisible(false)}>
              <Text style={styles.actionSheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  actionSheetTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  actionSheetDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  actionSheetOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  actionSheetBtn: {
    alignItems: 'center',
    gap: 12,
  },
  actionSheetIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSheetBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionSheetCancel: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  actionSheetCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
