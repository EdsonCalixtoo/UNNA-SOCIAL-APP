import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Volume2, VolumeX } from 'lucide-react-native';
import { s, vs, ms } from '@/utils/responsive';
import { useTheme } from '@/contexts/ThemeContext';
import FullscreenMediaViewer from './FullscreenMediaViewer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MediaCarouselProps {
  mediaUrls: string[];
  mediaTypes?: ('image' | 'video')[];
  height?: number;
  borderRadius?: number;
  isVisible?: boolean;
  onFullScreenChange?: (visible: boolean) => void;
}

export default function MediaCarousel({ 
  mediaUrls, 
  mediaTypes, 
  height = vs(240), 
  borderRadius = 0, // Padrao para premium e full width
  isVisible = true,
  onFullScreenChange
}: MediaCarouselProps) {
  const { accent } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  }), []);

  const renderItem = ({ item, index }: { item: string, index: number }) => {
    const type = mediaTypes ? mediaTypes[index] : (item.toLowerCase().endsWith('.mp4') ? 'video' : 'image');
    const isVideo = type === 'video';

    return (
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={() => {
          setFullScreenIndex(index);
          setFullScreenVisible(true);
          onFullScreenChange?.(true);
        }}
        style={[styles.mediaWrapper, { width: SCREEN_WIDTH, height, borderRadius }]}
      >
        {isVideo ? (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: item }}
              style={styles.media}
              resizeMode={ResizeMode.COVER}
              isLooping
              shouldPlay={isVisible && activeIndex === index && !fullScreenVisible}
              isMuted={isMuted}
            />
            <TouchableOpacity 
              style={styles.muteBtn} 
              onPress={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
            >
              {isMuted ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        ) : (
          <Image 
            source={{ uri: item }} 
            style={styles.media} 
            resizeMode="cover" 
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { height }]}>
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
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        keyExtractor={(item, index) => `${item}-${index}`}
      />
      
      {mediaUrls.length > 1 && (
        <View style={styles.pagination}>
          {mediaUrls.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                { backgroundColor: activeIndex === index ? accent : 'rgba(255,255,255,0.5)' },
                activeIndex === index && styles.activeDot
              ]} 
            />
          ))}
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
    width: SCREEN_WIDTH,
    position: 'relative',
    left: -s(16), // Para compensar o marginHorizontal do card e ficar full screen
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
    bottom: vs(12),
    left: s(12),
    width: s(32),
    height: s(32),
    borderRadius: ms(16),
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  pagination: {
    position: 'absolute',
    bottom: vs(12),
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: s(6),
  },
  dot: {
    width: s(6),
    height: s(6),
    borderRadius: ms(3),
  },
  activeDot: {
    width: s(12),
    height: s(6),
    borderRadius: ms(3),
  },
});
