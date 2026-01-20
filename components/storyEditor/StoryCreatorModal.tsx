/**
 * StoryCreatorModal.tsx
 * Modal para criar stories no app UNNA
 * Wrapper do StoryEditor integrado ao perfil
 */

import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from '@/lib/i18n';

interface StoryCreatorModalProps {
  visible: boolean;
  onClose: () => void;
  onStoryCreated?: (storyData: any) => void;
}

export const StoryCreatorModal: React.FC<StoryCreatorModalProps> = ({
  visible,
  onClose,
  onStoryCreated,
}) => {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExportStory = async (storyData: any) => {
    try {
      setIsExporting(true);
      setError(null);

      // TODO: Enviar para Supabase ou processar a story
      if (onStoryCreated) {
        onStoryCreated(storyData);
      }

      // Fechar modal após sucesso
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar story';
      setError(errorMessage);
      setIsExporting(false);
    }
  };

  const handleError = (err: string | null) => {
    setError(err);
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('stories.createStory')}</Text>
          <TouchableOpacity
            onPress={onClose}
            disabled={isExporting}
            style={styles.closeButton}
          >
            <X size={24} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Story Editor Container */}
        <View style={styles.editorContainer}>
          {isExporting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00d9ff" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>{t('common.error')}</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <TouchableOpacity
                style={styles.errorButton}
                onPress={() => setError(null)}
              >
                <Text style={styles.errorButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>
                {t('stories.createStory')}
              </Text>
              <Text style={styles.placeholderSubtext}>
                Story Editor integrado aqui
              </Text>
            </View>
          )}
        </View>

        {/* Footer Actions */}
        {!isExporting && !error && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => handleExportStory({ test: true })}
            >
              <Text style={[styles.buttonText, styles.primaryText]}>
                {t('stories.export')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  editorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#888',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ff3b30',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 6,
  },
  errorButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  buttonPrimary: {
    backgroundColor: '#00d9ff',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  primaryText: {
    color: '#000',
  },
});
