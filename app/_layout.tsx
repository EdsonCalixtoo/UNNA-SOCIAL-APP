import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PushNotificationProvider } from '@/contexts/PushNotificationContext';
import { LanguageProvider } from '@/lib/i18n';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorDisplay } from '@/components/ErrorDisplay';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <PushNotificationProvider>
            <ThemeProvider>
              <View style={styles.container}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
                <ErrorDisplay />
              </View>
            </ThemeProvider>
          </PushNotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
