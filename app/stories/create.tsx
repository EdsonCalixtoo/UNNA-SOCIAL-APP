
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import { processMedia } from '@/lib/mediaOptimizer';
import StoryCameraModal from '@/components/StoryCameraModal';
import StoryAdvancedEditor from '@/components/StoryAdvancedEditor';
import { LinearGradient } from 'expo-linear-gradient';
import { ActionFeedback } from '@/components/ActionFeedback';

export default function CreateStoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { backgroundPrimary, accent } = useTheme();
  
  const [cameraActive, setCameraActive] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ visible: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({
    visible: false,
    type: 'success',
    title: '',
    message: ''
  });

  const handleCapture = (uri: string, type: 'image' | 'video') => {
    setSelectedMedia({ uri, type });
    setCameraActive(false);
    setShowEditor(true);
  };

  const handleCancel = () => {
    if (showEditor) {
      setShowEditor(false);
      setCameraActive(true);
    } else {
      router.back();
    }
  };

  const handleSave = async (finalUri: string, stickers?: any[]) => {
    if (!user) return;
    setLoading(true);
    setShowEditor(false);

    try {
      const type = selectedMedia?.type || 'image';
      const optimizedMedia = await processMedia(finalUri, type);

      const fileName = `stories/${user.id}/${Date.now()}.${optimizedMedia.extension}`;
      const publicUrl = await uploadFile(optimizedMedia.uri, fileName, optimizedMedia.contentType);

      if (!publicUrl) throw new Error('Falha no upload');

      let thumbnailUrl = null;
      if (optimizedMedia.thumbnailUri) {
        const thumbName = `stories/${user.id}/${Date.now()}_thumb.webp`;
        thumbnailUrl = await uploadFile(optimizedMedia.thumbnailUri, thumbName, 'image/webp');
      }
      
      const { data: storyData, error: dbError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: type,
          thumbnail_url: thumbnailUrl,
          stickers: stickers || [],
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Disparar notificações para usuários mencionados
      if (stickers && stickers.length > 0) {
        const mentions = stickers.filter(s => s.tag_type === 'person' && s.tagged_user_id);
        if (mentions.length > 0) {
          const notifications = mentions.map(m => ({
            user_id: m.tagged_user_id,
            type: 'story_mention',
            title: 'Nova Menção no Story',
            message: `@${user.user_metadata?.username || 'Alguém'} mencionou você em um story`,
            data: { story_id: storyData?.id, url: `/stories/${storyData?.id}` },
            read: false,
          }));
          await supabase.from('notifications').insert(notifications);
        }
      }

      setFeedback({
        visible: true,
        type: 'success',
        title: 'Sucesso',
        message: 'Story publicado! ✨'
      });
    } catch (e) {
      console.error(e);
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Erro',
        message: 'Não foi possível publicar seu story.'
      });
      setCameraActive(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      )}

      <StoryCameraModal 
         visible={cameraActive} 
         onClose={handleCancel} 
         onCapture={handleCapture} 
      />

      {selectedMedia && (
        <StoryAdvancedEditor
          visible={showEditor}
          mediaUri={selectedMedia.uri}
          mediaType={selectedMedia.type}
          onClose={handleCancel}
          onSave={handleSave}
        />
      )}

      <ActionFeedback 
        {...feedback} 
        onClose={() => {
          setFeedback({ ...feedback, visible: false });
          if (feedback.type === 'success') {
             router.replace('/(tabs)');
          }
        }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
