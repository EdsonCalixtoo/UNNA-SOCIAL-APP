import React, { useState, useEffect } from 'react';
import {
  View,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { uploadFile } from '@/lib/storage';
import { processMedia } from '@/lib/mediaOptimizer';
import StoryCameraModal from './StoryCameraModal';
import StoryAdvancedEditor from './StoryAdvancedEditor';
import { ActionFeedback } from './ActionFeedback';

interface StoryCreatorProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function StoryCreator({ visible, onClose, onSuccess }: StoryCreatorProps) {
  const { user } = useAuth();
  const [showEditor, setShowEditor] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [feedback, setFeedback] = useState({ visible: false, type: 'success' as 'success' | 'error' | 'info', title: '', message: '' });

  // Quando o StoriesBar ativar o 'visible', abrimos a câmera
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    if (visible) {
      setCameraActive(true);
    } else {
      setCameraActive(false);
    }
  }, [visible]);

  const handleCapture = (uri: string, type: 'image' | 'video') => {
    setSelectedMedia({ uri, type });
    setCameraActive(false);
    setShowEditor(true);
  };

  const handleCancelAll = () => {
    setCameraActive(false);
    setShowEditor(false);
    setSelectedMedia(null);
    onClose();
  };

  const handleSave = async (finalUri: string) => {
    if (!user) return;
    setShowEditor(false);

    try {
      console.log('🚀 [UPLOAD] Processando mídia...');
      const type = selectedMedia?.type || 'image';
      
      // OTIMIZAÇÃO: 
      // 1. Imagens viram WEBP e redimensionam para max 1080px
      // 2. Vídeos mantêm original mas geram um thumbnail ultra-leve
      const optimizedMedia = await processMedia(finalUri, type);

      const fileName = `stories/${user.id}/${Date.now()}.${optimizedMedia.extension}`;
      console.log(`📦 Upload: ${fileName} (${optimizedMedia.contentType})`);

      const publicUrl = await uploadFile(optimizedMedia.uri, fileName, optimizedMedia.contentType);

      if (!publicUrl) throw new Error('Falha no upload para o R2');
      
      let thumbnailUrl = null;
      if (optimizedMedia.thumbnailUri) {
        const thumbName = `stories/${user.id}/${Date.now()}_thumb.webp`;
        thumbnailUrl = await uploadFile(optimizedMedia.thumbnailUri, thumbName, 'image/webp');
      }

      const { error: dbError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: type,
          thumbnail_url: thumbnailUrl,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      if (dbError) throw dbError;

      setSelectedMedia(null);
      if (onSuccess) onSuccess();
      
      setFeedback({
        visible: true,
        type: 'success',
        title: 'Sucesso',
        message: 'Seu story foi publicado! ✨'
      });
      
      // Fecha o criador mas mantém o modal de feedback visível
      // O onClose real (que limpa o StoryCreator) deve ser chamado quando o feedback fechar
      // ou se quisermos fechar logo, garantimos que o feedback renderize.
    } catch (e: any) {
      console.error('❌ Erro no Story:', e);
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Ops!',
        message: 'Não foi possível publicar seu story.'
      });
    }
  };

  return (
    <>
      <StoryCameraModal 
         visible={cameraActive} 
         onClose={handleCancelAll} 
         onCapture={handleCapture} 
      />

      {selectedMedia && (
        <StoryAdvancedEditor
          visible={showEditor}
          mediaUri={selectedMedia.uri}
          mediaType={selectedMedia.type}
          onClose={handleCancelAll}
          onSave={handleSave}
        />
      )}

      <ActionFeedback 
        {...feedback} 
        onClose={() => {
          setFeedback({ ...feedback, visible: false });
          if (feedback.type === 'success') {
            onClose();
          }
        }} 
      />
    </>
  );
}
