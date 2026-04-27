/**
 * Contexto de Linguagem Global
 * Gerencia a linguagem do app em toda a aplicação
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';
import { translations, LanguageCode, SUPPORTED_LANGUAGES } from './translations';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, defaultValue?: string) => string;
  availableLanguages: Record<LanguageCode, { name: string; flag: string }>;
  currentLanguageName: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Detecta a linguagem do dispositivo e retorna uma linguagem suportada
 */
function getDeviceLanguage(): LanguageCode {
  try {
    // Obter linguagem do sistema
    const deviceLanguages = Localization.getLocales();
    if (!deviceLanguages || deviceLanguages.length === 0) {
      return 'en-US';
    }

    const deviceLocale = deviceLanguages[0]?.languageTag || 'en-US';

    // Mapear locales comuns para linguagens suportadas
    const localeMap: Record<string, LanguageCode> = {
      'pt': 'pt-BR',
      'pt-BR': 'pt-BR',
      'pt-PT': 'pt-BR',
      'en': 'en-US',
      'en-US': 'en-US',
      'en-GB': 'en-US',
      'es': 'es-ES',
      'es-ES': 'es-ES',
      'es-MX': 'es-ES',
      'es-AR': 'es-ES',
    };

    // Tentar match exato
    if (localeMap[deviceLocale]) {
      return localeMap[deviceLocale];
    }

    // Tentar match por language tag (ex: 'pt' de 'pt-BR')
    const languageTag = deviceLocale.split('-')[0];
    if (localeMap[languageTag]) {
      return localeMap[languageTag];
    }

    // Default para português se for Brasil (padrão comum)
    return 'pt-BR';
  } catch (error) {
    console.warn('Erro ao detectar linguagem do dispositivo:', error);
    return 'pt-BR';
  }
}

/**
 * Acessa valor aninhado em objetos usando notação de ponto
 * Ex: 'auth.login' => translations.auth.login
 */
function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return '';
    }
  }

  return typeof value === 'string' ? value : '';
}

/**
 * Provider de Contexto de Linguagem
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    // Tentar carregar do AsyncStorage (implementar depois se necessário)
    return getDeviceLanguage();
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    // TODO: Salvar em AsyncStorage para persistir preferência
  };

  /**
   * Função de tradução segura
   * Retorna a tradução ou uma string padrão
   */
  const t = (key: string, defaultValue: string = key): string => {
    const currentTranslations = translations[language];
    if (!currentTranslations) {
      return defaultValue;
    }

    const value = getNestedValue(currentTranslations, key);
    return value || defaultValue;
  };

  const currentLanguageName = SUPPORTED_LANGUAGES[language]?.name || language;

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    availableLanguages: SUPPORTED_LANGUAGES,
    currentLanguageName,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook para usar o contexto de linguagem
 * Use em qualquer componente dentro de LanguageProvider
 */
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage deve ser usado dentro de um LanguageProvider');
  }
  return context;
}

/**
 * Hook alternativo mais simples - apenas para traduzir
 */
export function useTranslation() {
  const { t, language } = useLanguage();
  return { t, language };
}
