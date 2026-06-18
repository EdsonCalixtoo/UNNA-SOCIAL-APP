
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Heart, MessageCircle as MessageIcon, Calendar, Sparkles, MoreHorizontal, Share2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import MediaCarousel from './MediaCarousel';
import { s, vs, ms } from '@/utils/responsive';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  LinearTransition,
  FadeInDown
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { hapticFeedback } from '@/utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PostCardProps {
  post: any;
  onLike: (postId: string, isLiked: boolean) => void;
  isVisible?: boolean;
}

export default React.memo(function PostCard({ post, onLike, isVisible = true }: PostCardProps) {
  const router = useRouter();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  
  const isAutoPost = post.content?.includes('Criei um novo evento') || post.content?.includes('Publiquei algo novo');
  if (isAutoPost && (!post.events || !post.events.id || !post.events.title)) {
    return null;
  }

  const contentTranslateY = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const likeScale = useSharedValue(1);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
    opacity: contentOpacity.value,
  }));

  const likeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const officialPulse = useSharedValue(1);
  const isOfficial = post?.profiles?.username === 'unnasocialappoficial';

  React.useEffect(() => {
    if (isOfficial) {
      officialPulse.value = withRepeat(
        withSequence(withTiming(1.02, { duration: 1000 }), withTiming(1, { duration: 1000 })),
        -1,
        true
      );
    }
  }, [isOfficial]);

  const officialAnimStyle = useAnimatedStyle(() => {
    if (!isOfficial) return {};
    return {
      transform: [{ scale: officialPulse.value }],
      shadowColor: accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: interpolate(officialPulse.value, [1, 1.02], [0.3, 0.8]),
      shadowRadius: 8,
      elevation: interpolate(officialPulse.value, [1, 1.02], [2, 6]),
      borderColor: accent,
      borderWidth: 1.5,
    };
  });

  const handleFullScreenChange = (visible: boolean) => {
    if (visible) {
      contentTranslateY.value = withTiming(vs(100), { duration: 300 });
      contentOpacity.value = withTiming(0, { duration: 250 });
    } else {
      contentTranslateY.value = withSpring(0);
      contentOpacity.value = withTiming(1, { duration: 300 });
    }
  };

  const isLikingRef = React.useRef(false);

  const handleLikePress = () => {
    if (isLikingRef.current) return;
    isLikingRef.current = true;
    
    hapticFeedback.light();
    onLike(post.id, post.is_liked || false);
    likeScale.value = withSpring(1.5, { damping: 2, stiffness: 200 }, () => {
      likeScale.value = withSpring(1, { damping: 10, stiffness: 100 });
    });
    
    setTimeout(() => {
      isLikingRef.current = false;
    }, 500);
  };

  const hasMedia = (post.image_urls && post.image_urls.length > 0) || post.image_url;

  return (
    <Animated.View 
      layout={LinearTransition}
      entering={FadeInDown.delay(50)}
      style={[
        styles.card, 
        { 
          backgroundColor: backgroundSecondary, 
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' 
        },
        officialAnimStyle
      ]}
    >
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerProfile} activeOpacity={0.8} onPress={() => {}}>
          {post.profiles?.avatar_url ? (
            <Image
              source={{ uri: post.profiles.avatar_url }}
              style={[styles.avatar, { borderColor: accent }]}
              transition={200}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: accent }]}>
              <Text style={styles.avatarText}>
                {post.profiles?.username?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.username, { color: textPrimary }]} numberOfLines={1}>
                {post.profiles?.full_name || post.profiles?.username}
              </Text>
              {post.profiles?.is_verified && (
                <Sparkles size={14} color={accent} fill={accent} />
              )}
            </View>
            <Text style={[styles.handle, { color: textSecondary }]}>
              @{post.profiles?.username}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreButton} activeOpacity={0.7}>
          <MoreHorizontal size={20} color={textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── TEXT CONTENT ── */}
      <Animated.View style={contentAnimatedStyle}>
        <Text style={[styles.content, { color: textPrimary }]}>{post.content}</Text>
      </Animated.View>

      {/* ── MEDIA ── */}
      {hasMedia && (
        <View style={styles.mediaContainer}>
          <MediaCarousel 
            mediaUrls={post.image_urls?.length > 0 ? post.image_urls : [post.image_url]} 
            mediaTypes={post.media_type ? [post.media_type] : undefined}
            height={vs(350)}
            borderRadius={0}
            isVisible={isVisible}
            onFullScreenChange={handleFullScreenChange}
            onDoublePress={() => {
              if (!post.is_liked) {
                handleLikePress();
              }
            }}
          />
        </View>
      )}

      <Animated.View style={contentAnimatedStyle}>
        {/* ── EVENT SNIPPET ── */}
        {post.events && post.events.title && post.events.event_date && (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => router.push(`/event/${post.events.id}`)}
            style={[
              styles.eventCard, 
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F2F2F7',
                borderLeftColor: accent 
              }
            ]}
          >
            <View style={[styles.eventIconWrap, { backgroundColor: accent + '20' }]}>
              <Calendar size={18} color={accent} />
            </View>
            <View style={styles.eventInfo}>
              <Text style={[styles.eventTitle, { color: textPrimary }]} numberOfLines={1}>
                {post.events.title}
              </Text>
              <Text style={[styles.eventDetails, { color: textSecondary }]}>
                {post.events.event_date ? post.events.event_date.split('-').reverse().join('/') : ''} • {post.events.event_time ? post.events.event_time.slice(0, 5) : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── ACTIONS ── */}
        <View style={[styles.actions, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLikePress}
            activeOpacity={0.7}
          >
            <Animated.View style={likeAnimStyle}>
              <Heart
                size={24}
                color={post.is_liked ? '#FF3B30' : textSecondary}
                fill={post.is_liked ? '#FF3B30' : 'none'}
              />
            </Animated.View>
            <Text style={[styles.actionText, { color: textSecondary }, post.is_liked && styles.likedText]}>
              {post.likes_count || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <MessageIcon size={24} color={textSecondary} />
            <Text style={[styles.actionText, { color: textSecondary }]}>
              Comentar
            </Text>
          </TouchableOpacity>
          
          <View style={{ flex: 1 }} />
          
          <TouchableOpacity style={styles.actionButtonRight} activeOpacity={0.7}>
            <Share2 size={22} color={textSecondary} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: vs(12),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingTop: vs(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: vs(10),
    paddingHorizontal: s(16),
  },
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: s(44),
    height: s(44),
    borderRadius: ms(22),
    borderWidth: 1.5,
  },
  avatarPlaceholder: {
    width: s(44),
    height: s(44),
    borderRadius: ms(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: ms(18),
    fontWeight: 'bold',
  },
  headerInfo: {
    marginLeft: s(12),
    flex: 1,
  },
  username: {
    fontSize: ms(15),
    fontWeight: '700',
  },
  handle: {
    fontSize: ms(13),
    marginTop: vs(1),
  },
  moreButton: {
    padding: s(5),
  },
  content: {
    fontSize: ms(15),
    lineHeight: vs(22),
    marginBottom: vs(12),
    paddingHorizontal: s(16),
  },
  mediaContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: vs(10),
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: s(16),
    padding: ms(12),
    borderRadius: ms(12),
    marginBottom: vs(12),
    borderLeftWidth: 4,
  },
  eventIconWrap: {
    width: s(36),
    height: s(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    marginLeft: s(12),
    flex: 1,
  },
  eventTitle: {
    fontSize: ms(14),
    fontWeight: '700',
    marginBottom: vs(2),
  },
  eventDetails: {
    fontSize: ms(13),
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(12),
    paddingHorizontal: s(16),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: s(24),
  },
  actionButtonRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: ms(15),
    fontWeight: '600',
    marginLeft: s(6),
  },
  likedText: {
    color: '#FF3B30',
  },
});
