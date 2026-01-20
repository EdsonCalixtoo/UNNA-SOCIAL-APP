import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { X } from 'lucide-react-native';

interface ErrorInfo {
  message: string;
  timestamp: string;
  stack?: string;
}

let errorListener: ((error: ErrorInfo) => void) | null = null;

export const showError = (message: string, stack?: string) => {
  const error: ErrorInfo = {
    message,
    timestamp: new Date().toLocaleTimeString(),
    stack,
  };

  console.error('🔴 ERRO CAPTURADO:', message);
  if (stack) {
    console.error('Stack:', stack);
  }

  if (errorListener) {
    errorListener(error);
  }

  // Também mostra um alert nativo
  Alert.alert('Erro Detectado', message, [
    {
      text: 'OK',
      onPress: () => {},
    },
  ]);
};

export const ErrorDisplay: React.FC = () => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    errorListener = (error: ErrorInfo) => {
      setErrors((prev) => [error, ...prev].slice(0, 10)); // Manter últimos 10 erros
      setIsExpanded(true);
    };

    return () => {
      errorListener = null;
    };
  }, []);

  if (errors.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.headerText}>
          🔴 {errors.length} Erro{errors.length > 1 ? 's' : ''} Detectado{errors.length > 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          onPress={() => setErrors([])}
          style={styles.clearButton}
        >
          <X size={20} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView style={styles.errorList} nestedScrollEnabled>
          {errors.map((error, index) => (
            <View key={index} style={styles.errorItem}>
              <View style={styles.errorHeader}>
                <Text style={styles.errorTime}>{error.timestamp}</Text>
              </View>
              <Text style={styles.errorMessage}>{error.message}</Text>
              {error.stack && (
                <Text style={styles.errorStack}>{error.stack}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    borderTopColor: '#ff4444',
    borderTopWidth: 2,
    zIndex: 9999,
    maxHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
    borderBottomColor: '#444',
    borderBottomWidth: 1,
  },
  headerText: {
    color: '#ff4444',
    fontWeight: 'bold',
    fontSize: 12,
    flex: 1,
  },
  clearButton: {
    padding: 4,
  },
  errorList: {
    backgroundColor: '#1a1a1a',
  },
  errorItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorTime: {
    color: '#999',
    fontSize: 10,
  },
  errorMessage: {
    color: '#ff6666',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorStack: {
    color: '#888',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
