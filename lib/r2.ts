import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// Configurações do R2 via variáveis de ambiente
const ACCOUNT_ID = process.env.EXPO_PUBLIC_R2_ACCOUNT_ID;
const ACCESS_KEY = process.env.EXPO_PUBLIC_R2_ACCESS_KEY;
const SECRET_KEY = process.env.EXPO_PUBLIC_R2_SECRET_KEY;
const BUCKET_NAME = process.env.EXPO_PUBLIC_R2_BUCKET_NAME;
const PUBLIC_DOMAIN = process.env.EXPO_PUBLIC_R2_PUBLIC_DOMAIN;

// Inicializa o cliente S3 configurado para o Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY || '',
    secretAccessKey: SECRET_KEY || '',
  },
});

/**
 * Faz o upload de um arquivo para o Cloudflare R2 de forma otimizada
 */
export async function uploadToR2(
  uri: string,
  path: string,
  contentType: string
): Promise<string | null> {
  try {
    if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !BUCKET_NAME) {
      console.error('R2 configuration is missing. Please check your .env file.');
      return null;
    }

    console.log(`[R2] Gerando URL pré-assinada para: ${path}`);
    
    // 1. Gerar URL pré-assinada (Presigned URL)
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: path,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // 2. Fazer o upload
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': contentType,
        },
      });

      if (!uploadResponse.ok) throw new Error(`R2 upload failed: ${uploadResponse.statusText}`);
    } else {
      // No Native, usamos uploadAsync que é MUITO mais rápido (streaming direto do disco)
      const result = await FileSystem.uploadAsync(presignedUrl, uri, {
        httpMethod: 'PUT',
        mimeType: contentType,
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (result.status >= 400) {
        throw new Error(`R2 Native upload failed: Status ${result.status} - ${result.body}`);
      }
    }

    console.log(`[R2] Upload concluído: ${path}`);
    return `${PUBLIC_DOMAIN}/${path}`;
  } catch (error) {
    console.error('Error uploading to R2:', error);
    return null;
  }
}

/**
 * Gera um nome de arquivo único baseado no timestamp
 */
export function generateFileName(userId: string, folder: string, extension: string) {
  return `${userId}/${folder}/${Date.now()}.${extension}`;
}
