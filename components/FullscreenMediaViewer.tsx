
import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  Image, 
  TouchableOpacity, 
  StatusBar, 
  Platform,
  FlatList,
  Modal
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { X, Volume2, VolumeX } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  interpolate, 
  runOnJS,
  FadeIn,
  FadeOut
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
  mediaUrls: string[];
  mediaTypes?: ('image' | 'video')[];
  initialIndex: number;
}

export default function FullscreenMediaViewer({ 
  visible, 
  onClose, 
  mediaUrls, 
  mediaTypes,
  initialIndex 
}: FullscreenMediaViewerProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(true);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = 0;
      scale.value = 1;
      setActiveIndex(initialIndex);
    } else {
      opacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible, initialIndex]);

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
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => handleClose()}
            >
              <X size={28} color="#fff" />
            </TouchableOpacity>

            <FlatList
              data={mediaUrls}
              horizontal
              pagingEnabled
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
              renderItem={({ item, index }) => {
                const type = mediaTypes ? mediaTypes[index] : (item.toLowerCase().endsWith('.mp4') ? 'video' : 'image');
                return (
                  <View style={styles.mediaWrapper}>
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
                  </View>
                );
              }}
              keyExtractor={(item, index) => `fs-${index}-${item}`}
            />
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
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
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
