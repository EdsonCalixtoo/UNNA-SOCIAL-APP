import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

type Theme = {
  backgroundPrimary: string;
  backgroundSecondary: string;
  accent: string;
  accentAlt: string;
  textPrimary: string;
  textSecondary: string;
  isDark: boolean;
};

type ThemeContextType = Theme & {
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [isDark, setIsDark] = useState(true);

  const theme = useMemo<Theme>(() => {
    const accent = profile?.accent_color || '#00d9ff';
    
    if (isDark) {
      return {
        backgroundPrimary: '#0a0a0a',
        backgroundSecondary: '#1a1a1a',
        accent,
        accentAlt: '#00e5ff',
        textPrimary: '#ffffff',
        textSecondary: '#8E8E93',
        isDark: true,
      };
    } else {
      return {
        backgroundPrimary: '#f8f9fa',
        backgroundSecondary: '#ffffff',
        accent,
        accentAlt: '#00bcd4',
        textPrimary: '#1a1a1a',
        textSecondary: '#666666',
        isDark: false,
      };
    }
  }, [profile, isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  const value = {
    ...theme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
