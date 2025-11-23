import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { X, CircleAlert as AlertCircle } from 'lucide-react-native';
import { Story } from '@/types/database';

interface StoryViewerProps {
  visible: boolean;
  stories: Story[];
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function StoryViewer({ visible, stories, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCurrentIndex(0);
      setImageLoading(true);
      setImageError(false);
    } else {
      setImageLoading(true);
      setImageError(false);
    }
  }, [visible, currentIndex]);

  if (stories.length === 0) return null;

  const currentStory = stories[currentIndex];
  const profile = Array.isArray(currentStory.profiles) ? currentStory.profiles[0] : currentStory.profiles;

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

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <X size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          {stories.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressBar,
                index <= currentIndex && styles.progressBarActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.userInfo}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.userAvatar}
            />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.userAvatarText}>
                {profile?.username?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.userName}>{profile?.username}</Text>
          <Text style={styles.timeAgo}>
            {getTimeAgo(new Date(currentStory.created_at))}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.leftTap}
          onPress={handlePrevious}
          activeOpacity={1}
        />

        <TouchableOpacity
          style={styles.rightTap}
          onPress={handleNext}
          activeOpacity={1}
        />

        {imageLoading && !imageError && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00d9ff" />
          </View>
        )}

        {imageError && (
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color="#ff4444" />
            <Text style={styles.errorText}>Não foi possível carregar a imagem</Text>
          </View>
        )}

        <Image
          source={{ uri: currentStory.media_url }}
          style={styles.storyImage}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false);
            setImageError(true);
          }}
        />
      </View>
    </Modal>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    return `${diffInMinutes}m`;
  }

  return `${diffInHours}h`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  progressContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 60,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  progressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: '#fff',
  },
  userInfo: {
    position: 'absolute',
    top: 80,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  timeAgo: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  leftTap: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width / 3,
    zIndex: 5,
  },
  rightTap: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: width / 3,
    zIndex: 5,
  },
  storyImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    gap: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
