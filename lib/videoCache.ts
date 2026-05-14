import * as FileSystem from 'expo-file-system/legacy';

// Forçamos o acesso à propriedade ignorando a tipagem restrita do compilador,
// pois o expo-file-system expõe essas constantes em tempo de execução.
const FileSys = FileSystem as any;
const cacheDir = FileSys.cacheDirectory || FileSys.documentDirectory || '';
const VIDEO_CACHE_DIR = `${cacheDir}video_cache/`;

/**
 * Função de hash simples em JS puro
 */
function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function ensureDirExists() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(VIDEO_CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(VIDEO_CACHE_DIR, { intermediates: true });
    }
  } catch (e) {
    console.error('Error ensuring cache dir:', e);
  }
}

export function getCacheFilename(url: string) {
  const hash = simpleHash(url);
  const extension = url.split('.').pop()?.split('?')[0] || 'mp4';
  return `${VIDEO_CACHE_DIR}${hash}.${extension}`;
}

export async function getCachedVideoUri(remoteUrl: string): Promise<string> {
  if (!remoteUrl) return remoteUrl;
  if (remoteUrl.startsWith('file://')) return remoteUrl;

  try {
    await ensureDirExists();
    const localUri = getCacheFilename(remoteUrl);
    const fileInfo = await FileSystem.getInfoAsync(localUri);

    if (fileInfo.exists) {
      return localUri;
    }

    const download = await FileSystem.downloadAsync(remoteUrl, localUri);
    return download.uri;
  } catch (error) {
    return remoteUrl; 
  }
}

export async function clearVideoCache() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(VIDEO_CACHE_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(VIDEO_CACHE_DIR);
    }
  } catch (e) {}
}
