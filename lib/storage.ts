import { supabase } from './supabase';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export async function requestMediaLibraryPermission() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    console.error('Permission to access media library was denied');
    return false;
  }
  return true;
}

export async function uploadImage(
  uri: string,
  bucket: string,
  folder: string,
  userId: string
): Promise<string | null> {
  try {
    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/${folder}/${Date.now()}.${fileExt}`;

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
      // Usando a nova API do FileSystem
      // Usando a API legada do FileSystem explicitamente
      base64 = await readAsStringAsync(uri, {
        encoding: 'base64'
      });
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, decode(base64), {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
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
