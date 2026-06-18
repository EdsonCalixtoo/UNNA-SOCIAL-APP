import { useLanguage } from '@/lib/i18n';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';

export default function ScannerScreen() {
  const { t } = useLanguage();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const router = useRouter();
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user) {
      router.back();
    }
  }, [user]);

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator color="#00d9ff" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>{t('auto.sdbc1af06', 'Precisamos da sua permissão para usar a câmera e ler os QR Codes dos clientes.')}</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>{t('auto.scd47622f', 'Conceder Permissão')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: '#333', marginTop: 10 }]} onPress={() => router.back()}>
          <Text style={styles.btnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const { data: userReward, error: fetchError } = await supabase
        .from('user_rewards')
        .select('*, rewards(*)')
        .eq('id', data)
        .maybeSingle();

      if (fetchError || !userReward) {
        setStatus('error');
        setMessage('Cupom inválido ou não encontrado.');
        setLoading(false);
        return;
      }

      if (userReward.status !== 'active') {
        setStatus('error');
        setMessage('Este cupom já foi utilizado.');
        setLoading(false);
        return;
      }

      let isAuthorized = false;
      if (userReward.rewards.provider_id === user?.id) {
        isAuthorized = true;
      } else if (userReward.rewards.provider_id) {
        const { data: staffData } = await supabase
          .from('business_staff')
          .select('id')
          .eq('business_id', userReward.rewards.provider_id)
          .eq('staff_id', user?.id)
          .maybeSingle();
        
        if (staffData) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
         setStatus('error');
         setMessage('Acesso negado: Este cupom pertence a outro estabelecimento.');
         setLoading(false);
         return;
      }

      const { error: updateError } = await supabase
        .from('user_rewards')
        .update({ status: 'used' })
        .eq('id', data);

      if (updateError) throw updateError;

      setStatus('success');
      setMessage(`Prêmio Resgatado: ${userReward.rewards.title}`);
    } catch (err: any) {
      setStatus('error');
      setMessage('Erro ao processar cupom: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('auto.s296d9493', 'Escanear Cupom')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.overlay}>
        <View style={styles.scanArea} />
        <Text style={styles.scanText}>{t('auto.s434befc7', 'Posicione o QR Code do cliente no centro')}</Text>
      </View>

      {scanned && (
        <BlurView intensity={90} tint="dark" style={styles.resultContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#00d9ff" />
          ) : (
            <View style={styles.resultCard}>
              {status === 'success' ? <CheckCircle size={60} color="#00e676" /> : <XCircle size={60} color="#ff4444" />}
              <Text style={styles.resultMessage}>{message}</Text>
              
              <TouchableOpacity style={styles.btn} onPress={() => setScanned(false)}>
                <Text style={styles.btnText}>{t('auto.sde5d9096', 'Ler Novo Cupom')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#fff', marginTop: 10 }]} onPress={() => router.back()}>
                <Text style={styles.btnText}>{t('auto.s1b714bbb', 'Voltar ao Perfil')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center' },
  header: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scanArea: { width: 250, height: 250, borderWidth: 2, borderColor: '#00d9ff', borderRadius: 24, backgroundColor: 'transparent', marginBottom: 20 },
  scanText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center', textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  resultContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 20, zIndex: 20 },
  resultCard: { backgroundColor: '#1a1a2e', borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 40 },
  resultMessage: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 20, marginBottom: 30 },
  message: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  btn: { backgroundColor: '#00d9ff', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 16, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
