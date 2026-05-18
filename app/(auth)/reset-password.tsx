import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowRight, CircleAlert as AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import Animated, { 
  FadeInUp, 
  FadeInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing
} from 'react-native-reanimated';

const AnimatedView = Animated.View;

type PasswordStrength = 'weak' | 'medium' | 'strong';

const getPasswordStrength = (pwd: string): PasswordStrength => {
  if (pwd.length < 6) return 'weak';
  if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return 'strong';
  if (pwd.length >= 6) return 'medium';
  return 'weak';
};

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [pwdFocused, setPwdFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const router = useRouter();
  const { width, height } = useWindowDimensions();

  // Capture recovery token from deep link URL
  const url = Linking.useURL();

  useEffect(() => {
    const handleDeepLink = async (incomingUrl: string | null) => {
      if (!incomingUrl) return;
      console.log('Incoming recovery link detected:', incomingUrl);
      
      try {
        let hash = '';
        if (incomingUrl.includes('#')) {
          hash = incomingUrl.split('#')[1];
        } else if (incomingUrl.includes('?')) {
          hash = incomingUrl.split('?')[1];
        }
        
        if (!hash) return;
        
        const params: Record<string, string> = {};
        hash.split('&').forEach(part => {
          const [key, val] = part.split('=');
          if (key && val) {
            params[key] = decodeURIComponent(val);
          }
        });
        
        const accessToken = params.access_token;
        const refreshToken = params.refresh_token;
        
        if (accessToken && refreshToken) {
          console.log('Authenticating dynamic password-reset session...');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (sessionError) {
            console.error('Session establishment failed:', sessionError.message);
            setError('Link de redefinição expirou ou é inválido. Solicite um novo.');
          } else {
            console.log('Recovery session active and verified!');
          }
        }
      } catch (err: any) {
        console.error('Error parsing recovery deep link:', err);
      }
    };

    if (url) {
      handleDeepLink(url);
    }
  }, [url]);

  const isSmall = height < 680;
  const fs = (size: number) => Math.max(size * 0.85, Math.min(size, width * (size / 390)));
  const sp = (size: number) => Math.max(size * 0.8, Math.min(size, height * (size / 844)));

  const passwordStrength = password ? getPasswordStrength(password) : null;

  // Floating background orbs animation
  const orb1Value = useSharedValue(0);
  const orb2Value = useSharedValue(0);

  useEffect(() => {
    orb1Value.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    orb2Value.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 5500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: orb1Value.value * 25 },
      { translateX: orb1Value.value * 12 },
      { scale: 1 + orb1Value.value * 0.12 }
    ] as any,
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -orb2Value.value * 35 },
      { translateX: -orb2Value.value * 18 },
      { scale: 1 + orb2Value.value * 0.18 }
    ] as any,
  }));

  const shakeX = useSharedValue(0);

  const shakeError = () => {
    shakeX.value = withSequence(
      withTiming(10, { duration: 80 }),
      withTiming(-10, { duration: 80 }),
      withTiming(8, { duration: 80 }),
      withTiming(-8, { duration: 80 }),
      withTiming(0, { duration: 80 })
    );
  };

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }] as any
  }));

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      setError('Por favor, preencha todos os campos');
      shakeError();
      return;
    }
    if (password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      shakeError();
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      shakeError();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Erro ao atualizar senha');
        shakeError();
        setLoading(false);
      } else {
        setLoading(false);
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão. Verifique sua internet.');
      shakeError();
      setLoading(false);
    }
  };

  const strengthColor = passwordStrength === 'strong' ? '#00e676' : passwordStrength === 'medium' ? '#FF9500' : '#ff4444';
  const strengthLabel = passwordStrength === 'strong' ? '🟢 Forte' : passwordStrength === 'medium' ? '🟡 Média' : '🔴 Fraca';

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient colors={['#0a0a12', '#0f0f1e', '#0a0a12']} style={StyleSheet.absoluteFill} />
      <AnimatedView style={[styles.orb, styles.orbBlue, orb1Style, { width: width * 0.7, height: width * 0.7, top: -width * 0.15, right: -width * 0.2 }]} />
      <AnimatedView style={[styles.orb, styles.orbPink, orb2Style, { width: width * 0.5, height: width * 0.5, bottom: -width * 0.05, left: -width * 0.15 }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: Math.max(20, width * 0.06), paddingTop: sp(isSmall ? 40 : 60) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AnimatedView entering={FadeInDown.delay(100).springify()}>
            <View style={styles.header}>
              <LinearGradient
                colors={['#00d9ff', '#7b2fff', '#ff1493']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.logoGradient, { width: 80, height: 80, borderRadius: 28 }]}
              >
                <Lock size={36} color="#fff" />
              </LinearGradient>
              <Text style={[styles.title, { fontSize: fs(26), marginTop: sp(16) }]}>Nova Senha</Text>
              <Text style={[styles.subtitle, { fontSize: fs(14) }]}>Crie uma nova credencial para acessar sua conta</Text>
            </View>

            {error ? (
              <AnimatedView style={[styles.errorBox, shakeStyle]}>
                <AlertCircle size={fs(16)} color="#ff6b6b" />
                <Text style={[styles.errorText, { fontSize: fs(13) }]}>{error}</Text>
              </AnimatedView>
            ) : null}

            <AnimatedView entering={FadeInUp.delay(300).springify()} style={styles.card}>
              <View style={[styles.inputGroup, { marginBottom: sp(14) }]}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { fontSize: fs(11) }]}>NOVA SENHA</Text>
                  {password ? <Text style={[styles.strengthText, { fontSize: fs(11), color: strengthColor }]}>{strengthLabel}</Text> : null}
                </View>
                <View style={[styles.inputRow, pwdFocused && styles.inputRowFocused]}>
                  <Lock size={fs(17)} color={pwdFocused ? '#00d9ff' : '#555'} />
                  <TextInput
                    style={[styles.input, { fontSize: fs(15) }]}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#444"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    onFocus={() => setPwdFocused(true)}
                    onBlur={() => setPwdFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? <EyeOff size={fs(17)} color="#555" /> : <Eye size={fs(17)} color="#555" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.inputGroup, { marginBottom: sp(20) }]}>
                <Text style={[styles.label, { fontSize: fs(11) }]}>CONFIRME A SENHA</Text>
                <View style={[styles.inputRow, confirmFocused && styles.inputRowFocused]}>
                  <Lock size={fs(17)} color={confirmFocused ? '#ff1493' : '#555'} />
                  <TextInput
                    style={[styles.input, { fontSize: fs(15) }]}
                    placeholder="Repita a nova senha"
                    placeholderTextColor="#444"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    editable={!loading}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn}>
                    {showConfirmPassword ? <EyeOff size={fs(17)} color="#555" /> : <Eye size={fs(17)} color="#555" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleUpdatePassword} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={['#00d9ff', '#7b2fff', '#ff1493']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.btnGradient, { paddingVertical: sp(16) }]}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <View style={styles.btnContent}>
                      <Text style={[styles.btnText, { fontSize: fs(16) }]}>Salvar Nova Senha</Text>
                      <ArrowRight size={fs(20)} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </AnimatedView>
          </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* SUCCESS POPUP */}
      <Modal visible={success} transparent animationType="fade">
        <BlurView intensity={95} tint="dark" style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBg}>
              <CheckCircle2 size={36} color="#00e676" />
            </View>
            <Text style={styles.modalTitle}>Senha Atualizada!</Text>
            <Text style={styles.modalDescription}>
              Sua senha foi redefinida com total segurança. Agora você já pode entrar na sua conta com a nova senha criada.
            </Text>
            
            <TouchableOpacity 
              style={styles.modalBtn}
              onPress={() => {
                setSuccess(false);
                router.replace('/(auth)/login');
              }}
            >
              <LinearGradient 
                colors={['#00d9ff', '#7b2fff', '#ff1493']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }} 
                style={styles.modalBtnGradient}
              >
                <Text style={styles.modalBtnText}>Acessar Minha Conta</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a12' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  orb: { position: 'absolute', borderRadius: 9999 },
  orbBlue: { backgroundColor: 'rgba(0, 217, 255, 0.07)' },
  orbPink: { backgroundColor: 'rgba(255, 20, 147, 0.07)' },
  header: { alignItems: 'center', marginBottom: 32 },
  logoGradient: { justifyContent: 'center', alignItems: 'center', shadowColor: '#00d9ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  title: { fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  subtitle: { color: '#666', marginTop: 6, textAlign: 'center', paddingHorizontal: 12 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,60,60,0.12)', borderWidth: 1, borderColor: 'rgba(255,60,60,0.4)', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: '#ff6b6b', fontWeight: '600', flex: 1 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20 },
  inputGroup: {},
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { color: '#666', fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  strengthText: { fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 2, minHeight: 52 },
  inputRowFocused: { borderColor: 'rgba(0,217,255,0.5)', backgroundColor: 'rgba(0,217,255,0.04)' },
  input: { flex: 1, color: '#fff', marginLeft: 10, paddingVertical: 10, fontWeight: '500' },
  eyeBtn: { padding: 6 },
  btn: { borderRadius: 16, overflow: 'hidden' },
  btnDisabled: { opacity: 0.6 },
  btnGradient: { alignItems: 'center', justifyContent: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
  
  // Success Modal
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: 'rgba(20, 20, 35, 0.95)', borderWidth: 1.5, borderColor: 'rgba(0, 217, 255, 0.2)', borderRadius: 28, padding: 24, width: '100%', alignItems: 'center', gap: 16, shadowColor: '#00d8ff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
  modalIconBg: { width: 68, height: 68, borderRadius: 24, backgroundColor: 'rgba(0, 230, 118, 0.1)', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
  modalDescription: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  modalBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  modalBtnGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
