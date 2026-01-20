import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { RotateCcw } from 'lucide-react-native';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: { componentStack: string } | null;
  errorStack: Array<{
    timestamp: string;
    message: string;
    stack: string;
    componentStack: string;
  }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorStack: [],
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error('🔴 ERROR BOUNDARY CAUGHT:', error);
    console.error('Component Stack:', errorInfo.componentStack);

    // Armazenar o erro no estado
    this.setState((prevState) => ({
      errorInfo,
      errorStack: [
        ...prevState.errorStack,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: error.message,
          stack: error.stack || '',
          componentStack: errorInfo.componentStack,
        },
      ].slice(-20), // Manter últimos 20 erros
    }));

    // Também salvar em AsyncStorage para persistência
    this.saveErrorLog(error, errorInfo);
  }

  private async saveErrorLog(error: Error, errorInfo: { componentStack: string }) {
    try {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const timestamp = new Date().toISOString();
        const errorLog = {
          timestamp,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        };

        const existingLogs = await AsyncStorage.getItem('ERROR_LOGS');
        const logs = existingLogs ? JSON.parse(existingLogs) : [];
        logs.push(errorLog);

        // Manter últimos 50 erros
        if (logs.length > 50) {
          logs.shift();
        }

        await AsyncStorage.setItem('ERROR_LOGS', JSON.stringify(logs));
      } catch (storageError) {
        console.warn('AsyncStorage not available:', storageError);
      }
    } catch (storageError) {
      console.error('Error saving error log:', storageError);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorContent}>
            <Text style={styles.errorTitle}>⚠️ Ops! Algo deu errado</Text>
            
            <ScrollView style={styles.errorScroll}>
              <Text style={styles.errorMessage}>
                {this.state.error?.message || 'Erro desconhecido'}
              </Text>

              {this.state.error?.stack && (
                <>
                  <Text style={styles.stackLabel}>Stack Trace:</Text>
                  <Text style={styles.stackTrace}>
                    {this.state.error.stack}
                  </Text>
                </>
              )}

              {this.state.errorInfo?.componentStack && (
                <>
                  <Text style={styles.stackLabel}>Component Stack:</Text>
                  <Text style={styles.stackTrace}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                </>
              )}

              {this.state.errorStack.length > 0 && (
                <>
                  <Text style={styles.historyLabel}>Histórico de Erros:</Text>
                  {this.state.errorStack.map((err, index) => (
                    <View key={index} style={styles.historyItem}>
                      <Text style={styles.historyTime}>{err.timestamp}</Text>
                      <Text style={styles.historyMessage}>{err.message}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                Alert.alert('Reiniciar', 'Deseja reiniciar o aplicativo?', [
                  {
                    text: 'Cancelar',
                    onPress: () => {},
                    style: 'cancel',
                  },
                  {
                    text: 'Reiniciar',
                    onPress: this.resetError,
                  },
                ]);
              }}
            >
              <RotateCcw size={20} color="#fff" />
              <Text style={styles.resetButtonText}>Reiniciar Aplicativo</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    flex: 1,
    width: '100%',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorScroll: {
    flex: 1,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    padding: 12,
    marginVertical: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#ff6666',
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 20,
  },
  stackLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffaa00',
    marginTop: 12,
    marginBottom: 4,
  },
  stackTrace: {
    fontSize: 10,
    color: '#888',
    fontFamily: 'monospace',
    marginBottom: 8,
    lineHeight: 14,
  },
  historyLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffaa00',
    marginTop: 16,
    marginBottom: 8,
  },
  historyItem: {
    backgroundColor: '#333',
    padding: 8,
    marginBottom: 4,
    borderRadius: 4,
    borderLeftColor: '#ff4444',
    borderLeftWidth: 2,
  },
  historyTime: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  historyMessage: {
    fontSize: 10,
    color: '#ff6666',
    fontWeight: '600',
  },
  resetButton: {
    flexDirection: 'row',
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
