import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const CACHE_FOLDER = `${FileSystem.cacheDirectory}video_cache/`;

/**
 * Serviço de cache de vídeos para garantir playback instantâneo (estilo TikTok/Instagram).
 */
export const mediaCacheService = {
  /**
   * Inicializa a pasta de cache
   */
  async init() {
    const info = await FileSystem.getInfoAsync(CACHE_FOLDER);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
    }
  },

  /**
   * Gera um nome de arquivo seguro para o cache baseado na URL
   */
  getCacheFilename(url: string) {
    const extension = url.split('.').pop() || 'mp4';
    const hash = url.split('/').pop()?.split('?')[0] || Math.random().toString(36).substring(7);
    return `${CACHE_FOLDER}${hash}`;
  },

  /**
   * Verifica se o vídeo já está em cache e retorna a URI local.
   * Se não estiver, baixa em background e retorna a URL original.
   */
  async getCachedUri(url: string): Promise<string> {
    if (Platform.OS === 'web') return url; // Web usa cache nativo do browser

    const localUri = this.getCacheFilename(url);
    const info = await FileSystem.getInfoAsync(localUri);

    if (info.exists) {
      return localUri;
    }

    // Se não está em cache, retorna a URL original mas inicia o download silencioso
    this.prefetch(url);
    return url;
  },

  /**
   * Baixa o vídeo para o cache de forma antecipada
   */
  async prefetch(url: string) {
    if (Platform.OS === 'web' || !url) return;

    try {
      const localUri = this.getCacheFilename(url);
      const info = await FileSystem.getInfoAsync(localUri);

      if (!info.exists) {
        console.log(`[Cache] Prefetching: ${url}`);
        await FileSystem.downloadAsync(url, localUri);
      }
    } catch (error) {
      console.warn('[Cache] Prefetch error:', error);
    }
  },

  /**
   * Limpa o cache de vídeos
   */
  async clearCache() {
    try {
      await FileSystem.deleteAsync(CACHE_FOLDER, { idempotent: true });
      await this.init();
    } catch (error) {
      console.error('[Cache] Clear error:', error);
    }
  }
};
