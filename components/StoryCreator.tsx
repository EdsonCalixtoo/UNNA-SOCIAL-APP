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
import StoryCameraModal from './StoryCameraModal';
import StoryAdvancedEditor from './StoryAdvancedEditor';

interface StoryCreatorProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function StoryCreator({ visible, onClose, onSuccess }: StoryCreatorProps) {
  const { user } = useAuth();
  const [showEditor, setShowEditor] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);

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
      console.log('🚀 [UPLOAD] Publicando Story...');
      const type = selectedMedia?.type || 'image';
      
      // Detecta a extensão real do arquivo (iOS grava .mov, não .mp4)
      const uriExtension = finalUri.split('.').pop()?.toLowerCase() || (type === 'video' ? 'mov' : 'jpg');
      const extension = type === 'video' ? uriExtension : 'jpg';
      const contentType = type === 'video' 
        ? (extension === 'mov' ? 'video/quicktime' : 'video/mp4')
        : 'image/jpeg';
      
      const fileName = `stories/${user.id}/${Date.now()}.${extension}`;
      console.log(`📦 Upload: ${fileName} (${contentType})`);

      const publicUrl = await uploadFile(finalUri, fileName, contentType);

      if (!publicUrl) throw new Error('Falha no upload para o R2');

      const { error: dbError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: type,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      if (dbError) throw dbError;

      setSelectedMedia(null);
      if (onSuccess) onSuccess();
      onClose();
      // Mostra o alerta após fechar para não travar a UI
      setTimeout(() => {
        Alert.alert('Sucesso', 'Seu story foi publicado! ✨');
      }, 100);
    } catch (e: any) {
      console.error('❌ Erro no Story:', e);
      Alert.alert('Erro', 'Não foi possível publicar seu story.');
    } finally {
      // Já fechamos no sucesso, aqui apenas garante se houver erro e não fechou
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
    </>
  );
}
