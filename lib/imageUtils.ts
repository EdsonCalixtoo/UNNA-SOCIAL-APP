import { Platform } from 'react-native';

export const getImageUri = (uri: string): string => {
  if (Platform.OS === 'web') {
    return uri;
  }

  if (uri.startsWith('blob:')) {
    console.warn('Blob URL detected on native platform. This may not work correctly.');
    return uri.replace('blob:', '');
  }

  return uri;
};

export const convertBlobToBase64 = async (blobUrl: string): Promise<string> => {
  try {
    if (!blobUrl.startsWith('blob:')) {
      return blobUrl;
    }

    const response = await fetch(blobUrl);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting blob to base64:', error);
    return blobUrl;
  }
};
