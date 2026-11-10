import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Updates from 'expo-updates';
import { DownloadCloud, Sparkles } from 'lucide-react-native';

export default function UpdateManager() {
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();
  const [updateVisible, setUpdateVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Escuta reativa nativa do Expo (quando o sistema detecta nova versão)
  useEffect(() => {
    if (isUpdateAvailable || isUpdatePending) {
      setUpdateVisible(true);
    }
  }, [isUpdateAvailable, isUpdatePending]);

  // 2. Checagem manual de reforço imediata
  useEffect(() => {
    if (!__DEV__) {
      const checkManual = async () => {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            setUpdateVisible(true);
          }
        } catch (error) {
          console.log('Error checking update:', error);
        }
      };
      checkManual();
    }
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      if (!isUpdatePending) {
        try {
          await Updates.fetchUpdateAsync();
        } catch (fetchErr) {
          console.log('Fetch update in progress or already fetched:', fetchErr);
        }
      }
      await Updates.reloadAsync();
    } catch (e) {
      setIsUpdating(false);
      Alert.alert('Erro', 'Não foi possível aplicar a atualização agora. Tente novamente mais tarde.');
    }
  };

  if (!updateVisible) return null;

  return (
    <Modal transparent visible={updateVisible} animationType="fade">
      <BlurView
        intensity={80}
        tint="dark"
        style={StyleSheet.absoluteFill}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <DownloadCloud size={44} color="#ff1493" />
              <View style={styles.sparkleFloating}>
                <Sparkles size={24} color="#34C759" />
              </View>
            </View>

            <Text style={styles.title}>Nova Atualização</Text>

            <Text style={styles.description}>
              Há uma nova versão do aplicativo repleta de novidades e melhorias de performance. Atualize agora para aproveitar!
            </Text>

            <TouchableOpacity
              onPress={handleUpdate}
              disabled={isUpdating}
              activeOpacity={0.85}
              style={styles.updateButton}
            >
              {isUpdating ? (
                <>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.buttonText}>Atualizando...</Text>
                </>
              ) : (
                <>
                  <DownloadCloud size={20} color="#fff" />
                  <Text style={styles.buttonText}>Atualizar Agora</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setUpdateVisible(false)}
              disabled={isUpdating}
              style={styles.laterButton}
            >
              <Text style={styles.laterText}>Lembrar mais tarde</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 20, 147, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  sparkleFloating: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  updateButton: {
    backgroundColor: '#ff1493',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  laterButton: {
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  laterText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
