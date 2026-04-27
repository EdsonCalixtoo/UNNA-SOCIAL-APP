import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { AlertCircle, X, Trash2, Eye } from 'lucide-react-native';
import { getStoredErrorLogs, clearErrorLogs } from '@/lib/errorHandler';

export const ErrorLogsViewer: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    const storedLogs = await getStoredErrorLogs();
    setLogs(storedLogs);
  };

  const handleClearLogs = async () => {
    Alert.alert('Limpar Logs', 'Deseja apagar todos os logs de erro?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await clearErrorLogs();
          setLogs([]);
          Alert.alert('Sucesso', 'Logs apagados');
        },
      },
    ]);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      onRequestClose={() => setIsVisible(false)}
      transparent
      animationType="slide"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📋 Logs de Erro</Text>
          <TouchableOpacity onPress={() => setIsVisible(false)}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total de Erros</Text>
            <Text style={styles.statValue}>{logs.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Erros Fatais</Text>
            <Text style={styles.statValue}>{logs.filter(l => l.fatal).length}</Text>
          </View>
        </View>

        <ScrollView style={styles.logsList}>
          {logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>✅ Nenhum erro registrado</Text>
            </View>
          ) : (
            logs.map((log, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.logItem,
                  log.fatal && styles.logItemFatal,
                ]}
                onPress={() => setSelectedLog(log)}
              >
                <View style={styles.logItemHeader}>
                  <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                  {log.fatal && (
                    <View style={styles.fatalBadge}>
                      <Text style={styles.fatalBadgeText}>FATAL</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.logMessage} numberOfLines={2}>
                  {log.message}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {logs.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearLogs}
          >
            <Trash2 size={18} color="#fff" />
            <Text style={styles.clearButtonText}>Limpar Logs</Text>
          </TouchableOpacity>
        )}

        {selectedLog && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setSelectedLog(null)}
          >
            <View style={styles.detailModal}>
              <View style={styles.detailContent}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailTitle}>Detalhes do Erro</Text>
                  <TouchableOpacity onPress={() => setSelectedLog(null)}>
                    <X size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.detailScroll}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Timestamp:</Text>
                    <Text style={styles.detailValue}>{selectedLog.timestamp}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Mensagem:</Text>
                    <Text style={styles.detailValue}>{selectedLog.message}</Text>
                  </View>

                  {selectedLog.stack && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Stack Trace:</Text>
                      <Text style={styles.detailStack}>{selectedLog.stack}</Text>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Tipo:</Text>
                    <Text style={[
                      styles.detailValue,
                      selectedLog.fatal && { color: '#ff4444' }
                    ]}>
                      {selectedLog.fatal ? '🔴 Fatal' : '⚠️ Aviso'}
                    </Text>
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeDetailButton}
                  onPress={() => setSelectedLog(null)}
                >
                  <Text style={styles.closeDetailButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  logItem: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftColor: '#ff9500',
    borderLeftWidth: 3,
  },
  logItemFatal: {
    borderLeftColor: '#ff4444',
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logTimestamp: {
    color: '#888',
    fontSize: 10,
  },
  fatalBadge: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fatalBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  logMessage: {
    color: '#ff6666',
    fontSize: 12,
    lineHeight: 16,
  },
  clearButton: {
    flexDirection: 'row',
    backgroundColor: '#ff4444',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  detailModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  detailContent: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '80%',
    paddingTop: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  detailTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailSection: {
    marginBottom: 12,
  },
  detailLabel: {
    color: '#ffaa00',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailValue: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
  },
  detailStack: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 14,
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 4,
  },
  closeDetailButton: {
    backgroundColor: '#00d9ff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeDetailButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
