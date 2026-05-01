import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  // Carregar o tema salvo ao iniciar
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('user-theme-mode');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (e) {
        console.error('Erro ao carregar tema:', e);
      }
    };
    loadTheme();
  }, []);

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
        backgroundPrimary: '#F8F9FA', 
        backgroundSecondary: '#FFFFFF', 
        accent,
        accentAlt: '#00bcd4',
        textPrimary: '#111111', 
        textSecondary: '#555555', 
        isDark: false,
      };
    }
  }, [profile, isDark]);

  const toggleTheme = async () => {
    const newMode = !isDark;
    setIsDark(newMode);
    try {
      await AsyncStorage.setItem('user-theme-mode', newMode ? 'dark' : 'light');
    } catch (e) {
      console.error('Erro ao salvar tema:', e);
    }
  };

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
