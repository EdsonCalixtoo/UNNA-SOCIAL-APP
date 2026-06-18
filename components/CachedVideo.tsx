
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, VideoProps } from 'expo-av';
import { mediaCacheService } from '@/services/mediaCacheService';

interface CachedVideoProps extends VideoProps {
  source: { uri: string };
  fallbackUri?: string;
}

/**
 * Componente de vídeo que utiliza o sistema de cache para carregamento instantâneo.
 */
export default function CachedVideo({ source, ...props }: CachedVideoProps) {
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadVideo = async () => {
      try {
        const cachedUri = await mediaCacheService.getCachedUri(source.uri);
        if (isMounted) {
          setVideoUri(cachedUri);
          setIsLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setVideoUri(source.uri);
          setIsLoading(false);
        }
      }
    };

    loadVideo();

    return () => {
      isMounted = false;
    };
  }, [source.uri]);

  if (!videoUri) {
    return (
      <View style={[props.style, styles.loadingContainer]}>
        <ActivityIndicator size="small" color="#00d9ff" />
      </View>
    );
  }

  return (
    <Video
      {...props}
      source={{ uri: videoUri }}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
});
