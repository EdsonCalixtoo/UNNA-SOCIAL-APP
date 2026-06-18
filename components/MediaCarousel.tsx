
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { Image } from 'expo-image';
import { ResizeMode } from 'expo-av';
import { Volume2, VolumeX } from 'lucide-react-native';
import { s, vs, ms } from '@/utils/responsive';
import { useTheme } from '@/contexts/ThemeContext';
import FullscreenMediaViewer from './FullscreenMediaViewer';
import CachedVideo from './CachedVideo';
import { useIsFocused } from '@react-navigation/native';

import Animated from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MediaCarouselProps {
  mediaUrls: string[];
  mediaTypes?: ('image' | 'video')[];
  height?: number;
  width?: number;
  borderRadius?: number;
  isVisible?: boolean;
  onFullScreenChange?: (visible: boolean) => void;
  eventId?: string;
  onPress?: () => void;
  onDoublePress?: () => void;
}

export default function MediaCarousel({ 
  mediaUrls, 
  mediaTypes, 
  height = vs(240),
  width = SCREEN_WIDTH, 
  borderRadius = 0, // Padrao para premium e full width
  isVisible = true,
  onFullScreenChange,
  eventId,
  onPress,
  onDoublePress
}: MediaCarouselProps) {
  const { accent } = useTheme();
  const isFocused = useIsFocused();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50
  }), []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: width,
    offset: width * index,
    index,
  }), []);

  const lastTapRef = useRef<{ [key: number]: number }>({});

  const renderItem = ({ item, index }: { item: string, index: number }) => {
    const type = mediaTypes ? mediaTypes[index] : (item.toLowerCase().endsWith('.mp4') ? 'video' : 'image');
    const isVideo = type === 'video';

    const handleMediaPress = () => {
      const now = Date.now();
      const lastTap = lastTapRef.current[index] || 0;
      const DOUBLE_PRESS_DELAY = 300;

      if (now - lastTap < DOUBLE_PRESS_DELAY) {
        // Double tap detected
        if (onDoublePress) {
          onDoublePress();
        } else if (onPress) {
          onPress();
        }
        lastTapRef.current[index] = 0; // reset
        return;
      }
      
      lastTapRef.current[index] = now;

      if (onDoublePress) {
        setTimeout(() => {
          if (lastTapRef.current[index] === now) { // no second tap occurred
            if (onPress) {
              onPress();
            } else {
              setFullScreenIndex(index);
              setFullScreenVisible(true);
              onFullScreenChange?.(true);
            }
          }
        }, DOUBLE_PRESS_DELAY);
      } else {
        if (onPress) {
          onPress();
        } else {
          setFullScreenIndex(index);
          setFullScreenVisible(true);
          onFullScreenChange?.(true);
        }
      }
    };

    return (
      <View style={[styles.mediaWrapper, { width: width, height, borderRadius }]}>
        {isVideo ? (
          <View style={styles.videoContainer}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={handleMediaPress}
              style={styles.media}
            >
              <CachedVideo
                source={{ uri: item }}
                style={styles.media}
                resizeMode={ResizeMode.COVER}
                isLooping
                shouldPlay={isFocused && isVisible && activeIndex === index && !fullScreenVisible}
                isMuted={isMuted}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.muteBtn} 
              onPress={() => {
                setIsMuted(!isMuted);
              }}
              activeOpacity={0.7}
            >
              {isMuted ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={handleMediaPress}
            style={styles.media}
          >
            <Image 
              source={{ uri: item }} 
              style={styles.media} 
              contentFit="cover" 
              transition={200}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { height, width }]}>
      <FlatList
        ref={flatListRef}
        data={mediaUrls}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        snapToAlignment="center"
        decelerationRate="fast"
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={false}
        keyExtractor={(item, index) => `${item}-${index}`}
      />
      
      {mediaUrls.length > 1 && (
        <View style={styles.paginationContainer}>
          <View style={styles.paginationPill}>
            {mediaUrls.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.dot, 
                  activeIndex === index ? styles.activeDotToki : { backgroundColor: '#FF1493' }
                ]} 
              />
            ))}
          </View>
        </View>
      )}

      <FullscreenMediaViewer
        visible={fullScreenVisible}
        onClose={() => {
          setFullScreenVisible(false);
          onFullScreenChange?.(false);
        }}
        mediaUrls={mediaUrls}
        mediaTypes={mediaTypes}
        initialIndex={fullScreenIndex}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  mediaWrapper: {
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  muteBtn: {
    position: 'absolute',
    bottom: vs(16),
    left: s(22),
    width: s(38),
    height: s(38),
    borderRadius: ms(19),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: vs(12),
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  paginationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: s(10),
    paddingVertical: vs(6),
    borderRadius: 20,
    gap: s(6),
  },

  activeDotToki: {
    width: s(10),
    height: s(10),
    borderRadius: s(5),
    borderWidth: 2,
    borderColor: '#FF1493',
    backgroundColor: 'transparent',
    opacity: 1,
  },
  dot: {
    width: s(6),
    height: s(6),
    borderRadius: ms(3),
  },

});
