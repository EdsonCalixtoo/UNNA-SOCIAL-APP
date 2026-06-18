import '@/lib/polyfills';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { PushNotificationProvider } from '@/contexts/PushNotificationContext';
import { LanguageProvider, useLanguage } from '@/lib/i18n';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Audio } from 'expo-av';
import { InAppNotificationProvider } from '@/contexts/InAppNotificationContext';
import { UIProvider } from '@/contexts/UIContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

// Configuração global de áudio
Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  allowsRecordingIOS: false,
  staysActiveInBackground: false,
  shouldDuckAndroid: false,
  playThroughEarpieceAndroid: false,
});

import { PresenceProvider } from '@/contexts/PresenceContext';
import AnimatedSplashScreen from '@/components/AnimatedSplashScreen';
import { mediaCacheService } from '@/services/mediaCacheService';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const { setLanguage, language } = useLanguage();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (profile?.preferred_language && profile.preferred_language !== language) {
      setLanguage(profile.preferred_language as any);
    }
  }, [profile?.preferred_language]);

  useEffect(() => {
    // Garante que a splash animada fique visível por pelo menos 2.5 segundos
    // para dar tempo do Expo Go ocultar a splash nativa dele
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    setIsInitialLoad(false);

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const isCompleteProfile = segments[1] === 'complete-profile';
    const isResetPassword = pathname.includes('reset-password');
    const isVerifyResetOtp = pathname.includes('verify-reset-otp');

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user) {
      if (isResetPassword || isVerifyResetOtp) return; // Allow user to stay on reset-password flow

      const hasUsername = !!profile?.username && !profile.username.startsWith('temp_');
      const onboardingCompleted = !!profile?.onboarding_completed;
      const isOnboarding = segments[1] === 'onboarding';

      if (!hasUsername && !isCompleteProfile) {
        if (!pathname.includes('register')) {
          router.replace('/(auth)/register');
        }
      } else if (hasUsername && !onboardingCompleted) {
        if (!isOnboarding) {
          router.replace('/(auth)/onboarding');
        }
      } else if (onboardingCompleted && inAuthGroup) {
        if (profile?.account_type === 'business') {
          router.replace('/(business-tabs)' as any);
        } else {
          router.replace('/(tabs)');
        }
      }
    }
  }, [user, profile, loading, segments, pathname]);

  if ((loading && isInitialLoad) || !minTimeElapsed) {
    return <AnimatedSplashScreen />;
  }

  return <>{children}</>;
}

function MainAppContent() {
  const { isDark, backgroundPrimary } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'android') {
      // Garantir que a barra de navegação seja transparente e os ícones mudem com o tema
      const setupNavBar = async () => {
        try {
          await NavigationBar.setPositionAsync('absolute');
          await NavigationBar.setBackgroundColorAsync('#00000000');
          await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
          // Configura o comportamento para não ocultar os botões mas permitir conteúdo atrás
          await NavigationBar.setBehaviorAsync('inset-touch');
          
          // Sincroniza a cor de fundo do Root View (evita flash branco)
          await SystemUI.setBackgroundColorAsync(backgroundPrimary);
        } catch (e) {
          console.log('Error setting up NavigationBar:', e);
        }
      };
      setupNavBar();
    }
  }, [isDark, backgroundPrimary]);

  return (
    <View style={styles.container}>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(business-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />

      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} translucent />
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Inicialização básica
    mediaCacheService.init();
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#00000000');
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
            <PresenceProvider>
              <UIProvider>
                <AuthGuard>
                  <InAppNotificationProvider>
                    <PushNotificationProvider>
                      <ThemeProvider>
                        <MainAppContent />
                        <ErrorDisplay />
                      </ThemeProvider>
                    </PushNotificationProvider>
                  </InAppNotificationProvider>
                </AuthGuard>
              </UIProvider>
            </PresenceProvider>
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
