import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { DownloadCloud, RefreshCw } from 'lucide-react-native';

export function UpdateAlert() {
  const { isUpdateAvailable, isUpdatePending, currentlyRunning } = Updates.useUpdates();
  const [isChecking, setIsChecking] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      setShowModal(true);
    }
  }, [isUpdateAvailable]);

  useEffect(() => {
    if (isUpdatePending) {
      setShowModal(true);
    }
  }, [isUpdatePending]);

  const handleUpdate = async () => {
    try {
      setIsChecking(true);
      if (isUpdatePending) {
        await Updates.reloadAsync();
      } else if (isUpdateAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (error) {
      console.log('Error fetching update:', error);
      setIsChecking(false);
    }
  };

  if (!showModal) return null;

  return (
    <Modal transparent animationType="fade" visible={showModal}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            {isUpdatePending ? (
              <RefreshCw size={32} color="#00d9ff" />
            ) : (
              <DownloadCloud size={32} color="#00d9ff" />
            )}
          </View>
          
          <Text style={styles.title}>Nova Atualização!</Text>
          <Text style={styles.description}>
            {isUpdatePending 
              ? 'A atualização já foi baixada e está pronta para ser instalada.' 
              : 'Uma nova versão do aplicativo está disponível. Recomendamos atualizar agora para ter acesso às novidades.'}
          </Text>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleUpdate}
            disabled={isChecking}
          >
            {isChecking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isUpdatePending ? 'Reiniciar Agora' : 'Baixar e Atualizar'}
              </Text>
            )}
          </TouchableOpacity>

          {!isUpdatePending && !isChecking && (
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.cancelButtonText}>Lembrar mais tarde</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#A0A0A0',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#00d9ff',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: '600',
  },
});
