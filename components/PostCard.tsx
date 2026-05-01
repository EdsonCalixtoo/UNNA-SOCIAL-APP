import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Heart, MessageCircle as MessageIcon, Calendar, Volume2, VolumeX } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Video, ResizeMode } from 'expo-av';
import { useState, useEffect } from 'react';

interface PostCardProps {
  post: any;
  onLike: (postId: string, isLiked: boolean) => void;
  isVisible?: boolean;
}

export default function PostCard({ post, onLike, isVisible = true }: PostCardProps) {
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (!isVisible && !isMuted) {
      setIsMuted(true);
    }
  }, [isVisible]);

  const isVideo = post.media_type === 'video' || post.image_url?.toLowerCase().endsWith('.mp4');

  return (
    <View style={[styles.card, { backgroundColor: backgroundSecondary, shadowOpacity: isDark ? 0 : 0.05 }]}>
      <View style={styles.header}>
        {post.profiles?.avatar_url ? (
          <Image
            source={{ uri: post.profiles.avatar_url }}
            style={[styles.avatar, { borderColor: accent, borderWidth: 1 }]}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: accent }]}>
            <Text style={styles.avatarText}>
              {post.profiles?.username?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={[styles.username, { color: textPrimary }]}>{post.profiles?.full_name}</Text>
          <Text style={[styles.handle, { color: textSecondary }]}>@{post.profiles?.username}</Text>
        </View>
      </View>

      <Text style={[styles.content, { color: textPrimary }]}>{post.content}</Text>

      {post.image_url && (
        <View style={styles.mediaContainer}>
          {isVideo ? (
            <View>
              <Video
                source={{ uri: post.image_url }}
                style={styles.postImage}
                resizeMode={ResizeMode.COVER}
                shouldPlay={isVisible}
                isLooping
                isMuted={isMuted}
              />
              <TouchableOpacity 
                style={styles.muteButton}
                onPress={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
              </TouchableOpacity>
            </View>
          ) : (
            <Image
              source={{ uri: post.image_url }}
              style={styles.postImage}
              resizeMode="cover"
            />
          )}
        </View>
      )}

      {post.events && (
        <View style={[styles.eventCard, { backgroundColor: backgroundPrimary }]}>
          <Calendar size={16} color={accent} />
          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, { color: textPrimary }]}>{post.events.title}</Text>
            <Text style={[styles.eventDetails, { color: textSecondary }]}>
              {post.events.event_date.split('-').reverse().join('/')} às {post.events.event_time.slice(0, 5)}
            </Text>
            <Text style={[styles.eventLocation, { color: textSecondary }]}>{post.events.location_name}</Text>
          </View>
        </View>
      )}

      <View style={[styles.actions, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onLike(post.id, post.is_liked || false)}
        >
          <Heart
            size={20}
            color={post.is_liked ? '#FF3B30' : textSecondary}
            fill={post.is_liked ? '#FF3B30' : 'none'}
          />
          <Text style={[styles.actionText, { color: textSecondary }, post.is_liked && styles.likedText]}>
            {post.likes_count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <MessageIcon size={20} color={textSecondary} />
          <Text style={[styles.actionText, { color: textSecondary }]}>Comentar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  handle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  content: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  eventInfo: {
    marginLeft: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 6,
  },
  likedText: {
    color: '#FF3B30',
  },
  mediaContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  muteButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 20,
  }
});
