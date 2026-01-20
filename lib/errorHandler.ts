import { ErrorUtils, Platform } from 'react-native';

let errorLog: Array<{
  timestamp: string;
  message: string;
  stack?: string;
  fatal: boolean;
}> = [];

export const setupGlobalErrorHandler = () => {
  // Capturar erros não capturados
  const originalErrorHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.error('🔴 GLOBAL ERROR HANDLER:', error);
    console.error('Is Fatal:', isFatal);

    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error?.message || String(error),
      stack: error?.stack || '',
      fatal: isFatal === true,
    };

    // Salvar em memória
    errorLog.push(errorEntry);
    if (errorLog.length > 50) {
      errorLog.shift();
    }

    // Salvar em storage
    persistErrorLog(errorEntry);

    // Se há um handler original, chamar também
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    } else if (isFatal) {
      // Se for fatal e não tiver handler original, pelo menos logar
      console.error('FATAL ERROR:', error);
    }
  });
};

const persistErrorLog = async (errorEntry: any) => {
  try {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const existingLogs = await AsyncStorage.getItem('GLOBAL_ERROR_LOGS');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(errorEntry);

      // Manter últimos 100 erros
      if (logs.length > 100) {
        logs.shift();
      }

      await AsyncStorage.setItem('GLOBAL_ERROR_LOGS', JSON.stringify(logs));
    } catch (storageError) {
      // Se não tiver AsyncStorage instalado, apenas logar
      console.warn('AsyncStorage not available:', storageError);
    }
  } catch (error) {
    console.error('Error saving global error log:', error);
  }
};

export const getErrorLogs = () => {
  return errorLog;
};

export const clearErrorLogs = async () => {
  errorLog = [];
  try {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('GLOBAL_ERROR_LOGS');
    } catch (storageError) {
      console.warn('AsyncStorage not available:', storageError);
    }
  } catch (error) {
    console.error('Error clearing logs:', error);
  }
};

export const getStoredErrorLogs = async () => {
  try {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const logs = await AsyncStorage.getItem('GLOBAL_ERROR_LOGS');
      return logs ? JSON.parse(logs) : [];
    } catch (storageError) {
      console.warn('AsyncStorage not available:', storageError);
      return [];
    }
  } catch (error) {
    console.error('Error reading stored logs:', error);
    return [];
  }
};
