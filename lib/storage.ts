import { supabase } from './supabase';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadToR2 } from './r2';

export async function requestMediaLibraryPermission() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    console.error('Permission to access media library was denied');
    return false;
  }
  return true;
}

/**
 * Função genérica para upload de qualquer arquivo (R2 prioritário)
 */
export async function uploadFile(
  uri: string,
  path: string,
  contentType: string,
  bucket: string = 'media'
): Promise<string | null> {
  try {
    // Tenta R2 primeiro
    const r2Url = await uploadToR2(uri, path, contentType);
    if (r2Url) return r2Url;

    // Fallback Supabase
    let base64: string;
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      base64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      base64 = await readAsStringAsync(uri, { encoding: 'base64' });
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, decode(base64), {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadFile:', error);
    return null;
  }
}

export async function uploadImage(
  uri: string,
  bucket: string,
  folder: string,
  userId: string
): Promise<string | null> {
  const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${userId}/${folder}/${Date.now()}.${fileExt}`;
  const contentType = `image/${fileExt}`;
  
  return uploadFile(uri, fileName, contentType, bucket);
}

export async function deleteImage(url: string, bucket: string): Promise<boolean> {
  try {
    const path = url.split(`${bucket}/`)[1];
    if (!path) return false;

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}
