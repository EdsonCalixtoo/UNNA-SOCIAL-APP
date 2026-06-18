
import { Stack } from 'expo-router/stack';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="complete-profile" />
      <Stack.Screen name="reset-password" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="verify-reset-otp" />
    </Stack>
  );
}
