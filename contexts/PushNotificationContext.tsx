import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  usePushNotifications();

  return children;
}
