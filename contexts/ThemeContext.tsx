import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';

type Theme = {
  backgroundPrimary: string;
  backgroundSecondary: string;
  accent: string;
  accentAlt: string;
  textPrimary: string;
};

const ThemeContext = createContext<Theme | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();

  const theme = useMemo<Theme>(() => {
    const primary = profile?.primary_color || '#0a0a0a';
    const secondary = profile?.secondary_color || '#1a1a1a';
    const accent = profile?.accent_color || '#00d9ff';
    // accentAlt: pick a slightly lighter or fallback
    const accentAlt = profile?.primary_color === '#00d9ff' ? '#00e5ff' : profile?.primary_color || '#00e5ff';

    return {
      backgroundPrimary: primary,
      backgroundSecondary: secondary,
      accent,
      accentAlt,
      textPrimary: '#ffffff',
    };
  }, [profile]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
