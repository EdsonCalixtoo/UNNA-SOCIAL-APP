import * as ImageManipulator from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface OptimizedMedia {
  uri: string;
  type: 'image' | 'video';
  originalSize: number;
  optimizedSize: number;
  thumbnailUri?: string;
  blurhash?: string; // Base64 tiny placeholder
  contentType: string;
  extension: string;
  width: number;
  height: number;
}

export async function getFileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && !info.isDirectory ? info.size || 0 : 0;
  } catch {
    return 0;
  }
}

/**
 * Gera um placeholder minúsculo (TinyThumb) em base64 para carregamento instantâneo
 */
async function generateTinyPlaceholder(uri: string): Promise<string | undefined> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 20 } }], // 20px é suficiente para um blur elegante
      { compress: 0.1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return `data:image/jpeg;base64,${result.base64}`;
  } catch (e) {
    console.error('[MediaOptimizer] Erro ao gerar TinyThumb:', e);
    return undefined;
  }
}

export async function optimizeImage(uri: string): Promise<OptimizedMedia> {
  const originalSize = await getFileSize(uri);
  
  // Otimização para Stories (9:16 preferencialmente)
  // Maximizamos performance com WEBP e largura controlada
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }], 
    { compress: 0.75, format: ImageManipulator.SaveFormat.WEBP }
  );

  const blurhash = await generateTinyPlaceholder(result.uri);
  const optimizedSize = await getFileSize(result.uri);

  return {
    uri: result.uri,
    type: 'image',
    originalSize,
    optimizedSize,
    blurhash,
    contentType: 'image/webp',
    extension: 'webp',
    width: result.width,
    height: result.height
  };
}

export async function optimizeVideo(uri: string): Promise<OptimizedMedia> {
  const originalSize = await getFileSize(uri);
  let thumbnailUri: string | undefined = undefined;
  let blurhash: string | undefined = undefined;

  try {
    // 1. Gerar Thumbnail em alta qualidade (720p)
    const { uri: thumbUri, width, height } = await VideoThumbnails.getThumbnailAsync(uri, {
      time: 0, // Primeiro frame para ser instantâneo
      quality: 0.8,
    });
    
    const thumbResult = await ImageManipulator.manipulateAsync(
      thumbUri,
      [{ resize: { width: 720 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.WEBP }
    );
    thumbnailUri = thumbResult.uri;

    // 2. Gerar Blurhash/Placeholder do primeiro frame
    blurhash = await generateTinyPlaceholder(thumbnailUri);
  } catch (e) {
    console.warn('[MediaOptimizer] Falha no processamento de vídeo:', e);
  }

  return {
    uri, 
    type: 'video',
    thumbnailUri,
    blurhash,
    originalSize,
    optimizedSize: originalSize,
    contentType: 'video/mp4',
    extension: 'mp4',
    width: 1080, // Default story aspect
    height: 1920
  };
}

export async function processMedia(uri: string, type: 'image' | 'video'): Promise<OptimizedMedia> {
  if (type === 'image') return optimizeImage(uri);
  return optimizeVideo(uri);
}
