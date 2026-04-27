import React, { useState, useEffect } from 'react';
import {
  View,
  Alert,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
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
      const fileName = `${user.id}/${Date.now()}.jpg`;
      const base64 = await FileSystem.readAsStringAsync(finalUri, { encoding: FileSystem.EncodingType.Base64 });
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(`stories/${fileName}`, decode(base64), {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(`stories/${fileName}`);

      const { error: dbError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: 'image',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });

      if (dbError) throw dbError;

      setSelectedMedia(null);
      if (onSuccess) onSuccess();
      Alert.alert('Sucesso', 'Seu story foi publicado! ✨');
    } catch (e: any) {
      console.error('❌ Erro no Story:', e);
      Alert.alert('Erro', 'Não foi possível publicar seu story.');
    } finally {
      onClose();
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
