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
import { View, StyleSheet, ActivityIndicator, Platform, Alert, Modal, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { DownloadCloud, Sparkles } from 'lucide-react-native';
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
import * as Updates from 'expo-updates';

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
  const { isDark, backgroundPrimary, textPrimary, textSecondary } = useTheme();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!__DEV__) {
      const checkUpdate = async () => {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
             setUpdateAvailable(true);
          }
        } catch (error) {
          console.log('Error checking for updates:', error);
        }
      };
      checkUpdate();
    }
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch(e) {
      setIsUpdating(false);
      Alert.alert('Erro', 'Falha ao baixar a atualização.');
    }
  };

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
          animation: 'slide_from_right',
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

      {updateAvailable && (
        <Modal transparent visible animationType="fade">
          <BlurView intensity={isDark ? 60 : 80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)' }}>
              <View style={{ width: '100%', maxWidth: 340, backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', borderRadius: 32, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 20 }}>
                <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255, 20, 147, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
                  <DownloadCloud size={44} color="#ff1493" />
                  <View style={{ position: 'absolute', top: -5, right: -5 }}>
                    <Sparkles size={24} color="#34C759" />
                  </View>
                </View>

                <Text style={{ fontSize: 24, fontWeight: '900', color: textPrimary, marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 }}>Nova Atualização</Text>
                <Text style={{ fontSize: 16, color: textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>Há uma nova versão do aplicativo repleta de novidades e melhorias de performance. Atualize agora para aproveitar!</Text>
                
                <TouchableOpacity 
                  onPress={handleUpdate}
                  disabled={isUpdating}
                  style={{ backgroundColor: '#ff1493', width: '100%', paddingVertical: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginBottom: 12 }}
                >
                  {isUpdating ? (
                    <>
                      <ActivityIndicator color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>Atualizando...</Text>
                    </>
                  ) : (
                    <>
                      <DownloadCloud size={20} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>Atualizar Agora</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setUpdateAvailable(false)}
                  disabled={isUpdating}
                  style={{ paddingVertical: 16, width: '100%', alignItems: 'center' }}
                >
                  <Text style={{ color: textSecondary, fontSize: 15, fontWeight: '700' }}>Lembrar mais tarde</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </Modal>
      )}
    </View>
  );
}


export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Inicialização básica
    mediaCacheService.init();
    import('@/lib/database').then(({ initDatabase }) => {
      initDatabase();
    });
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
