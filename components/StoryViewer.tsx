import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { X, CircleAlert as AlertCircle, Heart, Send, Trash2 } from 'lucide-react-native';
import { Story } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface StoryViewerProps {
  visible: boolean;
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function StoryViewer({ visible, stories, initialIndex = 0, onClose, onRefresh }: StoryViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [liked, setLiked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setImageLoading(true);
      setImageError(false);
      setLiked(false);
    }
  }, [visible, initialIndex]);

  if (stories.length === 0) return null;

  const currentStory = stories[currentIndex];
  const profile = Array.isArray(currentStory.profiles) ? currentStory.profiles[0] : currentStory.profiles;
  const isOwner = user?.id === currentStory.user_id;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setImageLoading(true);
      setImageError(false);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setImageLoading(true);
      setImageError(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Deletar Story?',
      'Deseja excluir permanentemente este story?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Deletar', 
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              console.log('🗑️ [DELETE] Story ID:', currentStory.id);
              console.log('👤 [USER] Auth ID:', user?.id);

              const { error } = await supabase
                .from('stories')
                .delete()
                .eq('id', currentStory.id);

              if (error) throw error;
              
              if (onRefresh) onRefresh();
              onClose();
            } catch (e) {
              console.error('❌ Erro no Delete:', e);
              Alert.alert('Erro', 'O Supabase bloqueou a exclusão. Verifique as políticas de RLS da tabela "stories".');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            {stories.map((_, index) => (
              <View key={index} style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarActive,
                    { width: index < currentIndex ? '100%' : index === currentIndex ? '0%' : '0%' }
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={styles.userInfoRow}>
             <View style={styles.userLeft}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{profile?.username?.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.username}>{profile?.username}</Text>
                <Text style={styles.timestamp}>agora</Text>
             </View>
             
             <View style={styles.headerRight}>
                {/* Forçado para aparecer sempre e permitir limpeza manual */}
                <TouchableOpacity onPress={handleDelete} style={styles.iconBtn} disabled={deleting}>
                  <Trash2 size={24} color="#ff3b30" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                  <X size={26} color="#fff" />
                </TouchableOpacity>
             </View>
          </View>
        </View>

        <View style={styles.tapContainer}>
          <TouchableOpacity style={styles.sideTap} onPress={handlePrevious} activeOpacity={1} />
          <TouchableOpacity style={styles.centerTap} activeOpacity={1} />
          <TouchableOpacity style={styles.sideTap} onPress={handleNext} activeOpacity={1} />
        </View>

        <View style={styles.mediaContainer}>
           {imageLoading && !imageError && (
             <View style={styles.loading}>
                <ActivityIndicator color="#fff" size="large" />
             </View>
           )}
           {imageError ? (
             <View style={styles.error}>
                <AlertCircle size={40} color="#ff3b30" />
                <Text style={styles.errorText}>Erro ao carregar</Text>
                <Text style={styles.errorUrl}>{currentStory.media_url}</Text>
             </View>
           ) : (currentStory.media_type === 'video' && !videoError) ? (
              <Video
                source={{ uri: currentStory.media_url }}
                style={styles.media}
                resizeMode={ResizeMode.COVER}
                shouldPlay={visible}
                isLooping
                onLoadStart={() => setImageLoading(true)}
                onLoad={() => setImageLoading(false)}
                onError={(error) => {
                  console.error('❌ [StoryViewer] Video Error:', error);
                  setVideoError(true);
                  setImageLoading(false);
                }}
              />
           ) : (
             <Image
               source={{ uri: currentStory.media_url }}
               style={styles.media}
               resizeMode="cover"
               onLoadStart={() => setImageLoading(true)}
               onLoad={() => setImageLoading(false)}
               onError={() => {
                 setImageLoading(false);
                 setImageError(true);
               }}
             />
           )}
        </View>

        <View style={styles.footer}>
           <View style={styles.messageInputWrapper}>
              <TextInput 
                placeholder="Enviar mensagem" 
                placeholderTextColor="rgba(255,255,255,0.7)" 
                style={styles.messageInput}
              />
           </View>
           <View style={styles.footerIcons}>
              <TouchableOpacity onPress={() => setLiked(!liked)}>
                 <Heart size={26} color={liked ? "#ff3b30" : "#fff"} fill={liked ? "#ff3b30" : "transparent"} />
              </TouchableOpacity>
              <TouchableOpacity>
                 <Send size={26} color="#fff" />
              </TouchableOpacity>
           </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    height: 2,
    gap: 4,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  progressBarBg: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarActive: {
    height: '100%',
    backgroundColor: '#fff',
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconBtn: {
    padding: 5,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  tapContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 50,
  },
  sideTap: {
    flex: 1,
  },
  centerTap: {
    flex: 2,
  },
  mediaContainer: {
    flex: 1,
  },
  media: {
    width: width,
    height: height,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorUrl: {
    color: '#444',
    fontSize: 10,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 15,
    alignItems: 'center',
    gap: 15,
    zIndex: 100,
  },
  messageInputWrapper: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  messageInput: {
    color: '#fff',
    fontSize: 14,
  },
  footerIcons: {
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center',
  },
});
