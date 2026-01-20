import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Alert, ActivityIndicator } from 'react-native';
import { X, Camera, Image as ImageIcon, Edit3 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ImageEditor from './ImageEditor';

interface StoryCreatorProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StoryCreator({ visible, onClose, onSuccess }: StoryCreatorProps) {
  const { user } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    try {
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setShowEditor(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };
  const handleSaveEdit = (editedUri: string) => {
    setSelectedImage(editedUri);
    setShowEditor(false);
  };

  const createStory = async () => {
    if (!selectedImage || !user) return;

    setUploading(true);
    try {
      let mediaUrl: string | null = null;
      
      // Upload OBRIGATÓRIO para o Storage
      console.log('Iniciando upload da imagem para Storage...');
      
      try {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        console.log('Buscando imagem:', selectedImage);
        
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        console.log('Blob criado, tamanho:', blob.size, 'bytes');

        console.log('Enviando para Storage...');
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('stories')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (uploadError) {
          console.error('❌ Erro ao fazer upload:', uploadError.message);
          throw new Error(`Erro no upload: ${uploadError.message}`);
        }

        if (!uploadData) {
          console.error('❌ Upload retornou sem dados');
          throw new Error('Upload falhou: nenhum dado retornado');
        }

        console.log('✅ Upload bem-sucedido!', uploadData);
        
        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);
        
        mediaUrl = urlData.publicUrl;
        console.log('📸 URL Pública gerada:', mediaUrl);

        if (!mediaUrl) {
          throw new Error('Não foi possível gerar URL pública');
        }
        
      } catch (storageError: any) {
        console.error('❌ Erro durante upload:', storageError);
        Alert.alert(
          'Erro ao fazer upload', 
          `${storageError.message || 'Não foi possível fazer upload da imagem'}`
        );
        return;
      }

      // Criar registro da story apenas se o upload foi bem-sucedido
      if (!mediaUrl) {
        Alert.alert('Erro', 'URL da imagem não foi gerada corretamente');
        return;
      }

      console.log('Salvando story no banco de dados com URL:', mediaUrl);

      const { data: storyData_, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: 'image',
        })
        .select('id')
        .single();

      if (storyError || !storyData_?.id) {
        throw storyError || new Error('Falha ao criar o story');
      }

      Alert.alert('Sucesso', 'Story criado com sucesso!');
      setSelectedImage(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating story:', error);
      Alert.alert('Erro', error.message || 'Não foi possível criar o story');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Criar Story</Text>
          <View style={{ width: 28 }} />
        </View>

        {!selectedImage ? (
          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionButton} onPress={() => pickImage(true)}>
              <View style={styles.optionIconContainer}>
                <Camera size={40} color="#00d9ff" />
              </View>
              <Text style={styles.optionText}>Câmera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={() => pickImage(false)}>
              <View style={styles.optionIconContainer}>
                <ImageIcon size={40} color="#00d9ff" />
              </View>
              <Text style={styles.optionText}>Galeria</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowEditor(true)}
              >
                <Edit3 size={20} color="#fff" />
                <Text style={styles.editButtonText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={styles.retakeButtonText}>Escolher outra</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.publishButton, uploading && styles.publishButtonDisabled]}
                onPress={createStory}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.publishButtonText}>Publicar Story</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {selectedImage && (
          <>
            <ImageEditor
              visible={showEditor}
              imageUri={selectedImage}
              onClose={() => setShowEditor(false)}
              onSave={handleSaveEdit}
            />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  optionButton: {
    alignItems: 'center',
    gap: 16,
  },
  optionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    gap: 12,
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 217, 255, 0.9)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  retakeButton: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  publishButton: {
    backgroundColor: '#00d9ff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
});
