import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  Modal, ActivityIndicator, Alert 
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { supabase } from '@/lib/supabase';
import { X, CheckCircle, AlertCircle, Scan } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { s, vs, ms } from '@/utils/responsive';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
}

export const QRScannerModal = ({ visible, onClose, eventId }: QRScannerModalProps) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning || processing) return;
    
    setScanning(false);
    setProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // O QR Code contém o ticket_id
      const ticketId = data;

      // Chama a função RPC no Supabase para validar o check-in com segurança
      const { data: result, error } = await supabase.rpc('confirm_event_checkin', {
        p_event_id: eventId,
        p_ticket_id: ticketId
      });

      if (error || !result) {
        setScanResult('error');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Erro na Validação', error?.message || 'Ingresso inválido ou já utilizado.');
      } else {
        setScanResult('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      setScanResult('error');
    } finally {
      setProcessing(false);
      // Aguarda 2 segundos e libera para o próximo scan
      setTimeout(() => {
        setScanning(true);
        setScanResult(null);
      }, 2500);
    }
  };

  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Precisamos de acesso à câmera para escanear os ingressos.</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.btnText}>Dar Permissão</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />

        {/* Overlay de Scan */}
        <View style={styles.overlay}>
          <View style={styles.topDim} />
          <View style={styles.centerRow}>
            <View style={styles.sideDim} />
            <View style={[
              styles.scanWindow, 
              scanResult === 'success' && styles.scanSuccess,
              scanResult === 'error' && styles.scanError
            ]}>
              {processing && <ActivityIndicator size="large" color="#fff" />}
              {scanResult === 'success' && <CheckCircle size={80} color="#34C759" />}
              {scanResult === 'error' && <AlertCircle size={80} color="#FF3B30" />}
              {!processing && !scanResult && <View style={styles.scanLine} />}
            </View>
            <View style={styles.sideDim} />
          </View>
          <View style={styles.bottomDim}>
             <Text style={styles.instructionText}>
                {scanResult === 'success' ? '✅ Check-in Realizado!' : 
                 scanResult === 'error' ? '❌ Erro no Ingresso' : 
                 'Aponte para o QR Code do convidado'}
             </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.closeAbsolute} onPress={onClose}>
          <BlurView intensity={30} style={styles.blurBtn}>
            <X size={24} color="#fff" />
          </BlurView>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 40 },
  permissionText: { color: '#fff', textAlign: 'center', fontSize: 18, marginBottom: 20 },
  permissionBtn: { backgroundColor: '#00d9ff', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  btnText: { fontWeight: 'bold', fontSize: 16 },
  closeBtn: { marginTop: 40 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center' },
  topDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  bottomDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 30 },
  sideDim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  centerRow: { flexDirection: 'row', height: 280 },
  scanWindow: { width: 280, height: 280, borderWidth: 2, borderColor: '#00d9ff', borderRadius: 30, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  scanSuccess: { borderColor: '#34C759', backgroundColor: 'rgba(52, 199, 89, 0.2)' },
  scanError: { borderColor: '#FF3B30', backgroundColor: 'rgba(255, 59, 48, 0.2)' },
  scanLine: { width: '80%', height: 2, backgroundColor: '#00d9ff', position: 'absolute' },
  instructionText: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  closeAbsolute: { position: 'absolute', top: 60, right: 20 },
  blurBtn: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }
});
