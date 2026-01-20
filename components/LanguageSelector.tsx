/**
 * LanguageSelector.tsx
 * Componente para seleção de idioma do app
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useLanguage, SUPPORTED_LANGUAGES } from '../lib/i18n';
import { LanguageCode } from '../lib/i18n/translations';
import { Check } from 'lucide-react-native';

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  visible,
  onClose,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const handleLanguageSelect = (lang: LanguageCode) => {
    setLanguage(lang);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('profile.language', 'Idioma')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Language List */}
        <ScrollView style={styles.list}>
          {Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => (
            <TouchableOpacity
              key={code}
              style={[
                styles.languageItem,
                language === code && styles.languageItemActive,
              ]}
              onPress={() => handleLanguageSelect(code as LanguageCode)}
            >
              <View style={styles.languageContent}>
                <Text style={styles.flag}>{info.flag}</Text>
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName}>{info.name}</Text>
                  <Text style={styles.languageCode}>{code}</Text>
                </View>
              </View>

              {language === code && (
                <Check size={24} color="#00d9ff" strokeWidth={3} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('common.loading', 'O idioma será alterado imediatamente')}
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#888',
  },
  list: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginVertical: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  languageItemActive: {
    backgroundColor: '#1a3a3a',
    borderColor: '#00d9ff',
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  languageCode: {
    fontSize: 12,
    color: '#888',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#0a0a0a',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
