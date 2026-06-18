import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import CryptoJS from 'crypto-js';

const ACCOUNT_ID = process.env.EXPO_PUBLIC_R2_ACCOUNT_ID;
const ACCESS_KEY = process.env.EXPO_PUBLIC_R2_ACCESS_KEY;
const SECRET_KEY = process.env.EXPO_PUBLIC_R2_SECRET_KEY;
const BUCKET_NAME = process.env.EXPO_PUBLIC_R2_BUCKET_NAME;
const PUBLIC_DOMAIN = process.env.EXPO_PUBLIC_R2_PUBLIC_DOMAIN;

async function hmacSHA256(key: string | CryptoJS.lib.WordArray, data: string): Promise<CryptoJS.lib.WordArray> {
  return CryptoJS.HmacSHA256(data, key);
}

async function sha256Hex(data: string): Promise<string> {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

function bufToHex(buf: CryptoJS.lib.WordArray): string {
  return buf.toString(CryptoJS.enc.Hex);
}

async function generatePresignedUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !BUCKET_NAME) {
    throw new Error('R2 configuration is missing.');
  }

  const host = `${ACCOUNT_ID}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}`;
  const now = new Date();

  const datestamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';

  const region = 'auto';
  const service = 's3';
  const scope = `${datestamp}/${region}/${service}/aws4_request`;
  const algorithm = 'AWS4-HMAC-SHA256';

  // Importante: No estilo "path", o nome do bucket faz parte da URI canônica
  const encodedPath = '/' + BUCKET_NAME + '/' + path.split('/').map(encodeURIComponent).join('/');

  const queryParams: Record<string, string> = {
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    'X-Amz-Credential': `${ACCESS_KEY}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'host',
  };

  const sortedKeys = Object.keys(queryParams).sort();
  const canonicalQueryString = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join('&');

  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const canonicalRequest = [
    'PUT',
    encodedPath,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  const stringToSign = [algorithm, amzDate, scope, hashedCanonicalRequest].join('\n');

  const kDate = await hmacSHA256(`AWS4${SECRET_KEY}`, datestamp);
  const kRegion = await hmacSHA256(kDate, region);
  const kService = await hmacSHA256(kRegion, service);
  const kSigning = await hmacSHA256(kService, 'aws4_request');

  const signatureBuf = await hmacSHA256(kSigning, stringToSign);
  const signature = bufToHex(signatureBuf);

  return `${endpoint}${encodedPath}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

export async function uploadToR2(
  uri: string,
  path: string,
  contentType: string
): Promise<string | null> {
  try {
    if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY || !BUCKET_NAME) {
      console.error('R2 configuration is missing.');
      return null;
    }

    console.log(`[R2] Gerando URL pré-assinada para: ${path}`);
    const presignedUrl = await generatePresignedUrl(path);

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': contentType },
      });
      if (!uploadResponse.ok) throw new Error(`R2 upload failed: ${uploadResponse.statusText}`);
    } else {
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

export function generateFileName(userId: string, folder: string, extension: string) {
  return `${userId}/${folder}/${Date.now()}.${extension}`;
}
