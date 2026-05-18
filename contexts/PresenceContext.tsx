import React, { createContext, useContext, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface PresenceContextType {
  updateStatus: (isOnline: boolean) => Promise<void>;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const appState = useRef(AppState.currentState);

  const updateStatus = async (isOnline: boolean) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('[Presence] Error updating status:', error);
      } else {
        console.log(`[Presence] User ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      }
    } catch (err) {
      console.error('[Presence] Unexpected error:', err);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;

    const setStatus = async (online: boolean) => {
      try {
        await supabase
          .from('user_presence')
          .upsert({
            user_id: userId,
            is_online: online,
            last_seen: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });
        console.log(`[Presence] User ${online ? 'ONLINE' : 'OFFLINE'}`);
      } catch (err) {
        console.error('[Presence] Error:', err);
      }
    };

    // Set online when entering
    setStatus(true);

    // Heartbeat every 2 minutes
    const heartbeatInterval = setInterval(() => {
      if (appState.current === 'active') {
        setStatus(true);
      }
    }, 120000);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        setStatus(true);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        setStatus(false);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      clearInterval(heartbeatInterval);
      // Aqui usamos o userId capturado na closure para garantir que funcione no logout
      setStatus(false);
    };
  }, [user?.id]);

  return (
    <PresenceContext.Provider value={{ updateStatus }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresence must be used within a PresenceProvider');
  }
  return context;
}
