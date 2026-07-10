import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, Image, TouchableOpacity, StatusBar, Platform, FlatList, Modal, Share, Text } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { X, Volume2, VolumeX, Share as ShareIcon, Play, Pause, AtSign, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StoryShareModal } from './StoryShareModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolate, 
  runOnJS,
  FadeIn,
  FadeOut,
  useAnimatedScrollHandler,
  Extrapolation
} from 'react-native-reanimated';
import { 
  Gesture, 
  GestureDetector, 
  GestureHandlerRootView 
} from 'react-native-gesture-handler';
import { s, vs, ms } from '@/utils/responsive';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FullscreenMediaViewerProps {
  visible: boolean;
  onClose: () => void;
  mediaUrls?: string[];
  mediaTypes?: ('image' | 'video')[];
  initialIndex: number;
  stories?: any[];
}

const StoryMediaItem = ({ item, index, type, scrollX, visible, activeIndex, isMuted, setIsMuted, isPlayingRecap }: any) => {
  
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    if (isPlayingRecap && activeIndex === index && visible) {
      scaleAnim.value = withTiming(1.15, { duration: 3000 });
    } else {
      scaleAnim.value = 1;
    }
  }, [isPlayingRecap, activeIndex, index, visible]);

  const stylez = useAnimatedStyle(() => {
    const offset = index * SCREEN_WIDTH;
    const progress = interpolate(
      scrollX.value,
      [offset - SCREEN_WIDTH, offset, offset + SCREEN_WIDTH],
      [1, 0, -1],
      Extrapolation.CLAMP
    );
    
    const scale = interpolate(Math.abs(progress), [0, 1], [1, 0.85]);
    const rotateY = `${progress * -45}deg`;
    const translateX = progress * (SCREEN_WIDTH * 0.1);
    
    return {
      transform: [
        { perspective: 800 },
        { scale: scale * scaleAnim.value },
        { rotateY },
        { translateX }
      ] as any,
      opacity: interpolate(Math.abs(progress), [0, 1], [1, 0.3]),
    };
  });

  return (
    <Animated.View style={[styles.mediaWrapper, stylez as any]}>
      {type === 'video' ? (
        <Video
          source={{ uri: item }}
          style={styles.media}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={visible && activeIndex === index}
          isLooping
          isMuted={isMuted}
          useNativeControls={activeIndex === index}
        />
      ) : (
        <Image 
          source={{ uri: item }} 
          style={styles.media} 
          resizeMode="contain" 
        />
      )}
      
      {type === 'video' && (
        <TouchableOpacity 
          style={styles.muteBtn} 
          onPress={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <VolumeX size={20} color="#fff" /> : <Volume2 size={20} color="#fff" />}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default function FullscreenMediaViewer({ 
  visible, 
  onClose, 
  mediaUrls, 
  mediaTypes,
  initialIndex,
  stories
}: FullscreenMediaViewerProps) {
  const { user } = useAuth();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingRecap, setIsPlayingRecap] = useState(false);
  const [likes, setLikes] = useState<{ [key: string]: boolean }>({});
  const [shareModalVisible, setShareModalVisible] = useState(false);
  
  const currentUrls = stories ? stories.map(s => s.media_url) : mediaUrls || [];
  const currentTypes = stories ? stories.map(s => s.media_type) : mediaTypes;

  const scrollX = useSharedValue(initialIndex * SCREEN_WIDTH);
  const flatListRef = useRef<FlatList>(null);
  
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      setActiveIndex(initialIndex);
      setIsPlayingRecap(false);
      translateY.value = 0;
      scale.value = 0.6; // Start small for pop-in effect
      opacity.value = 0;
      
      opacity.value = withTiming(1, { duration: 250 });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 }); // Zoom in like Shared Element
      
      setActiveIndex(initialIndex);
      scrollX.value = initialIndex * SCREEN_WIDTH;
      checkLikes();
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
    }
  }, [visible, initialIndex]);

  const checkLikes = async () => {
    if (!stories || !user) return;
    try {
      const { data } = await supabase
        .from('event_story_likes')
        .select('story_id')
        .eq('user_id', user.id)
        .in('story_id', stories.map(s => s.id));
      
      if (data) {
        const likesMap: any = {};
        data.forEach(d => likesMap[d.story_id] = true);
        setLikes(likesMap);
      }
    } catch (e) {
      console.log('Error checking likes', e);
    }
  };

  const toggleLike = async () => {
    if (!stories || !user) return;
    const storyId = stories[activeIndex]?.id;
    if (!storyId) return;

    const isLiked = !!likes[storyId];
    
    // Optimistic UI
    setLikes(prev => ({ ...prev, [storyId]: !isLiked }));

    try {
      if (isLiked) {
        await supabase.from('event_story_likes').delete().eq('story_id', storyId).eq('user_id', user.id);
      } else {
        await supabase.from('event_story_likes').insert({ story_id: storyId, user_id: user.id });
      }
    } catch (e) {
      // Rollback on error
      setLikes(prev => ({ ...prev, [storyId]: isLiked }));
      console.log('Error toggling like', e);
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    }
  });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlayingRecap && visible) {
      interval = setInterval(() => {
        if (activeIndex < currentUrls.length - 1) {
          flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
        } else {
          setIsPlayingRecap(false);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isPlayingRecap, activeIndex, visible, currentUrls.length]);

  const handleShare = async () => {
    if (stories && stories[activeIndex]) {
      setShareModalVisible(true);
    } else {
      try {
        await Share.share({
          message: 'Veja essa memória incrível no UNNA!',
          url: currentUrls[activeIndex],
        });
      } catch (e) {
        console.log(e);
      }
    }
  };

  const handleClose = () => {
    'worklet';
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = event.translationY;
      opacity.value = interpolate(
        Math.abs(event.translationY),
        [0, 300],
        [1, 0.5]
      );
      scale.value = interpolate(
        Math.abs(event.translationY),
        [0, 300],
        [1, 0.8]
      );
    })
    .onEnd((event) => {
      if (Math.abs(event.translationY) > 150 || Math.abs(event.velocityY) > 1000) {
        handleClose();
      } else {
        translateY.value = withSpring(0);
        opacity.value = withSpring(1);
        scale.value = withSpring(1);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateY: translateY.value as number },
        { scale: scale.value as number },
      ] as any,
    };
  });

  const backgroundOpacityStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <GestureHandlerRootView style={[StyleSheet.absoluteFill, styles.rootContainer]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.background, backgroundOpacityStyle]} />
        
        <StatusBar hidden={visible} />

        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.container, animatedStyle]}>
            {/* Top Gradient */}
            <LinearGradient
              colors={['rgba(0,0,0,0.7)', 'transparent']}
              style={styles.topGradient}
              pointerEvents="none"
            />
            
            <View style={styles.header}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handleClose()}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
              
              <View style={styles.headerActions}>
                {stories && stories.length > 0 && (
                  <TouchableOpacity style={styles.recapBtn} onPress={() => setIsPlayingRecap(!isPlayingRecap)}>
                    {isPlayingRecap ? <Pause size={18} color="#000" fill="#000" /> : <Play size={18} color="#000" fill="#000" />}
                    <Text style={styles.recapText}>{isPlayingRecap ? 'Pausar' : 'Recap'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Animated.FlatList
              ref={flatListRef}
              data={currentUrls}
              horizontal
              pagingEnabled
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              initialScrollIndex={initialIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveIndex(index);
              }}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item, index }: any) => {
                const type = currentTypes ? currentTypes[index] : (item.toLowerCase().endsWith('.mp4') ? 'video' : 'image');
                return (
                  <StoryMediaItem
                    item={item}
                    index={index}
                    type={type}
                    scrollX={scrollX}
                    visible={visible}
                    activeIndex={activeIndex}
                    isMuted={isMuted}
                    setIsMuted={setIsMuted}
                    isPlayingRecap={isPlayingRecap}
                  />
                );
              }}
              keyExtractor={(item, index) => `fs-${index}-${item}`}
            />

            {/* Bottom Overlay Actions */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.bottomGradient}
              pointerEvents="none"
            />
            <View style={styles.bottomActions}>
              <View style={styles.leftActions}>
                <Text style={styles.pageIndicator}>{activeIndex + 1} / {currentUrls.length}</Text>
              </View>
              <View style={styles.rightActions}>
                {stories && stories[activeIndex] && (
                  <TouchableOpacity style={styles.actionCircle} onPress={toggleLike}>
                    <Heart size={20} color={likes[stories[activeIndex].id] ? "#ff2a2a" : "#fff"} fill={likes[stories[activeIndex].id] ? "#ff2a2a" : "transparent"} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionCircle} onPress={handleShare}>
                  <ShareIcon size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
      {shareModalVisible && stories && stories[activeIndex] && (
        <StoryShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          story={stories[activeIndex] as any}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    zIndex: 9999,
    elevation: 9999,
  },
  background: {
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
  },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 120,
    zIndex: 99,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 150,
    zIndex: 99,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 100,
    alignItems: 'center',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  recapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  recapText: {
    color: '#000',
    fontWeight: '800',
    fontSize: 14,
  },
  bottomActions: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 20, right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  pageIndicator: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  leftActions: {
    flexDirection: 'row',
  },
  rightActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  mediaWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  muteBtn: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
