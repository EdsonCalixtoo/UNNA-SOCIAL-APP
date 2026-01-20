import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

// Manter a splash screen visível enquanto o app está carregando
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignorar erros se a splash screen já foi ocultada
});

export function useFrameworkReady() {
  useEffect(() => {
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.warn('Error hiding splash screen:', error);
      }
    };

    // Dar um tempo para a app carregar
    const timer = setTimeout(() => {
      hideSplash();
      window.frameworkReady?.();
    }, 1500);

    return () => clearTimeout(timer);
  });
}
