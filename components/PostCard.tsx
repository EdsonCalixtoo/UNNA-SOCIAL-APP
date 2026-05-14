import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Heart, MessageCircle as MessageIcon, Calendar, Volume2, VolumeX } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Video, ResizeMode } from 'expo-av';
import { useState, useEffect } from 'react';
import MediaCarousel from './MediaCarousel';
import { s, vs, ms } from '@/utils/responsive';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

interface PostCardProps {
  post: any;
  onLike: (postId: string, isLiked: boolean) => void;
  isVisible?: boolean;
}

export default function PostCard({ post, onLike, isVisible = true }: PostCardProps) {
  const router = useRouter();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  
  const contentTranslateY = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
    opacity: contentOpacity.value,
  }));

  const handleFullScreenChange = (visible: boolean) => {
    if (visible) {
      contentTranslateY.value = withTiming(vs(100), { duration: 300 });
      contentOpacity.value = withTiming(0, { duration: 250 });
    } else {
      contentTranslateY.value = withSpring(0);
      contentOpacity.value = withTiming(1, { duration: 300 });
    }
  };

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

      <Animated.View style={contentAnimatedStyle}>
        <Text style={[styles.content, { color: textPrimary }]}>{post.content}</Text>
      </Animated.View>

      {post.image_urls && post.image_urls.length > 0 ? (
        <View style={styles.mediaContainer}>
          <MediaCarousel 
            mediaUrls={post.image_urls} 
            height={vs(250)}
            borderRadius={0}
            isVisible={isVisible}
            onFullScreenChange={handleFullScreenChange}
          />
        </View>
      ) : post.image_url ? (
        <View style={styles.mediaContainer}>
          <MediaCarousel 
            mediaUrls={[post.image_url]} 
            mediaTypes={post.media_type ? [post.media_type] : undefined}
            height={vs(250)}
            borderRadius={0}
            isVisible={isVisible}
            onFullScreenChange={handleFullScreenChange}
          />
        </View>
      ) : null}

      <Animated.View style={contentAnimatedStyle}>
        {post.events && (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => router.push(`/event/${post.events.id}`)}
            style={[styles.eventCard, { backgroundColor: backgroundPrimary }]}
          >
            <Calendar size={16} color={accent} />
            <View style={styles.eventInfo}>
              <Text style={[styles.eventTitle, { color: textPrimary }]}>{post.events.title}</Text>
              <Text style={[styles.eventDetails, { color: textSecondary }]}>
                {post.events.event_date.split('-').reverse().join('/')} às {post.events.event_time.slice(0, 5)}
              </Text>
              <Text style={[styles.eventLocation, { color: textSecondary }]}>{post.events.location_name}</Text>
            </View>
          </TouchableOpacity>
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20, // Mais redondo para visual premium
    paddingTop: 16,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16, // Header com padding
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
    paddingHorizontal: 16, // Content com padding
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
    paddingBottom: 12,
    paddingHorizontal: 16,
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
    marginBottom: 0,
  },
});
