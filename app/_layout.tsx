import '@/lib/polyfills';
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { PushNotificationProvider } from '@/contexts/PushNotificationContext';
import { LanguageProvider } from '@/lib/i18n';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { Audio } from 'expo-av';
import { InAppNotificationProvider } from '@/contexts/InAppNotificationContext';
import { UIProvider } from '@/contexts/UIContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Configuração global de áudio
Audio.setAudioModeAsync({
  playsInSilentModeIOS: true,
  allowsRecordingIOS: false,
  staysActiveInBackground: false,
  shouldDuckAndroid: false,
  playThroughEarpieceAndroid: false,
});

import AnimatedSplashScreen from '@/components/AnimatedSplashScreen';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const isCompleteProfile = segments[1] === 'complete-profile';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user) {
      const hasUsername = !!profile?.username;
      const onboardingCompleted = !!profile?.onboarding_completed;
      const isOnboarding = segments[1] === 'onboarding';

      if (!hasUsername && !isCompleteProfile) {
        router.replace('/(auth)/complete-profile');
      } else if (hasUsername && !onboardingCompleted) {
        if (!isOnboarding) {
          router.replace('/(auth)/onboarding');
        }
      } else if (onboardingCompleted && inAuthGroup) {
        router.replace('/(tabs)');
      }
    }
  }, [user, profile, loading, segments]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return <AnimatedSplashScreen />;
  }

  return <>{children}</>;
}

function MainAppContent() {
  const { isDark } = useTheme();
  
  return (
    <View style={styles.container}>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'fade_from_bottom',
          animationDuration: 400,
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} translucent />
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <AuthProvider>
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
          </AuthProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
