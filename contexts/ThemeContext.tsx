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
  isWorldCupMode: boolean;
};

type ThemeContextType = Theme & {
  toggleTheme: () => void;
  toggleWorldCupMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [isWorldCupMode, setIsWorldCupMode] = useState(false);

  // Carregar o tema salvo ao iniciar
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('user-theme-mode');
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
        const savedWorldCup = await AsyncStorage.getItem('user-world-cup-mode');
        if (savedWorldCup !== null) {
          setIsWorldCupMode(savedWorldCup === 'true');
        }
      } catch (e) {
        console.error('Erro ao carregar tema:', e);
      }
    };
    loadTheme();
  }, []);

  const theme = useMemo<Theme>(() => {
    let accent = profile?.accent_color || '#00d9ff';
    let accentAlt = '#00e5ff';

    if (isWorldCupMode) {
      accent = '#00B32C'; // Verde Brasil
      accentAlt = '#FFD700'; // Amarelo Brasil
    }
    
    if (isDark) {
      return {
        backgroundPrimary: '#000000',
        backgroundSecondary: '#121212',
        accent,
        accentAlt: '#00e5ff',
        textPrimary: '#ffffff',
        textSecondary: '#A0A0A0',
        isDark: true,
        isWorldCupMode,
      };
    } else {
      return {
        backgroundPrimary: '#F8F9FA', 
        backgroundSecondary: '#FFFFFF', 
        accent,
        accentAlt: '#00bcd4',
        textPrimary: '#111111', 
        textSecondary: '#444444', 
        isDark: false,
        isWorldCupMode,
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

  const toggleWorldCupMode = async () => {
    const newMode = !isWorldCupMode;
    setIsWorldCupMode(newMode);
    try {
      await AsyncStorage.setItem('user-world-cup-mode', newMode ? 'true' : 'false');
    } catch (e) {
      console.error('Erro ao salvar tema da copa:', e);
    }
  };

  const value = {
    ...theme,
    toggleTheme,
    toggleWorldCupMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export default ThemeContext;
