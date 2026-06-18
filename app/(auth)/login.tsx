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
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import Animated, {
  FadeInDown, FadeInUp, FadeIn,
  useAnimatedStyle, useSharedValue,
  withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated';

const AnimatedView = Animated.View;

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { signIn, signInWithGoogle, signInWithApple, resendOtp, getUserEmailByUsername } = useAuth();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const isSmall = height < 700;
  const glowAnim = useSharedValue(0.6);

  useEffect(() => {
    glowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.5, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowAnim.value }));

  const shakeX = useSharedValue(0);
  const shakeError = () => {
    shakeX.value = withSequence(
      withTiming(10, { duration: 70 }), withTiming(-10, { duration: 70 }),
      withTiming(8, { duration: 70 }), withTiming(-8, { duration: 70 }),
      withTiming(0, { duration: 70 })
    );
  };
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] as any }));

  const isEmail = (val: string) => val.includes('@') && val.includes('.');

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Preencha todos os campos'); shakeError(); return;
    }
    setLoading(true); setError('');
    try {
      let methodToUse: 'email' | 'phone' = 'email';
      let idToUse = identifier.trim();
      const digitCount = idToUse.replace(/\D/g, '').length;

      // Se não for email e tiver 10+ números, tentamos como telefone
      if (!isEmail(idToUse) && digitCount >= 10 && !/[a-zA-Z]/.test(idToUse)) {
        methodToUse = 'phone';
        idToUse = idToUse.startsWith('+') ? idToUse.replace(/\s|-|\(|\)/g, '') : `+55${idToUse.replace(/\D/g, '')}`;
      } else if (!isEmail(idToUse)) {
        // Tenta como @usuário
        const found = await getUserEmailByUsername(idToUse);
        if (!found) {
          setError('Usuário não encontrado. Verifique seu @usuário.');
          shakeError(); setLoading(false); return;
        }
        idToUse = found;
      }
      
      const { error: signInError } = await signIn(idToUse, password, methodToUse);
      if (signInError) {
        const errorMsg = signInError.message?.toLowerCase() || '';
        
        // Intercepta se a conta não estiver confirmada
        if (errorMsg.includes('email not confirmed') || errorMsg.includes('phone not confirmed')) {
          setLoading(false);
          Alert.alert(
            'Conta Inativa',
            `Sua conta ainda não foi verificada. Deseja receber um novo código de ativação por ${methodToUse === 'email' ? 'E-mail' : 'SMS'}?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Reenviar Código', 
                onPress: async () => {
                  setLoading(true);
                  const { error: resendErr } = await resendOtp(idToUse, methodToUse);
                  setLoading(false);
                  if (resendErr) {
                    Alert.alert('Erro', resendErr.message || 'Erro ao reenviar o código.');
                  } else {
                    router.push({ pathname: '/(auth)/verify-otp', params: { identifier: idToUse, method: methodToUse } });
                  }
                }
              }
            ]
          );
          return;
        }

        setError('Email, @usuário ou senha incorretos.');
        shakeError(); setLoading(false);
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet.');
      shakeError(); setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true); setError('');
    try {
      const { error: e } = await signInWithGoogle();
      if (e) { setError(e.message); shakeError(); }
    } catch { setError('Erro ao entrar com Google'); shakeError(); }
    finally { setGoogleLoading(false); }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true); setError('');
    try {
      const { error: e } = await signInWithApple();
      if (e) { setError(e.message); shakeError(); }
    } catch { setError('Erro ao entrar com Apple'); shakeError(); }
    finally { setAppleLoading(false); }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) { Alert.alert('Erro', 'Digite seu email'); return; }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (error) Alert.alert('Erro', error.message);
      else { setShowResetModal(false); router.replace({ pathname: '/(auth)/verify-reset-otp', params: { email: resetEmail } }); }
    } catch { Alert.alert('Erro', 'Erro ao processar'); }
    finally { setResetLoading(false); }
  };

  const logoSize = Math.min(width * 0.28, isSmall ? 90 : 110);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0a0916', '#0d0b1e', '#0a0916']} style={StyleSheet.absoluteFill} />

      {/* Purple glow behind logo */}
      <AnimatedView style={[styles.glowCircle, {
        width: width * 1.1, height: width * 1.1,
        borderRadius: width * 0.55,
        top: -width * 0.45,
        left: -width * 0.05,
      }, glowStyle]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: 28, paddingTop: isSmall ? 40 : 60 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <AnimatedView entering={FadeInDown.delay(50).springify()} style={styles.logoArea}>
            <Image
              source={require('@/assets/images/icone.jpg')}
              style={[styles.logoImg, { width: logoSize, height: logoSize, borderRadius: logoSize * 0.28 }]}
            />
            <Text style={[styles.appName, { fontSize: isSmall ? 34 : 42, marginTop: 14 }]}>
              U<Text style={styles.cyan}>N</Text><Text style={styles.pink}>N</Text>A
            </Text>
          </AnimatedView>

          {/* Welcome text */}
          <AnimatedView entering={FadeIn.delay(200)} style={styles.welcomeArea}>
            <Text style={styles.welcomeTitle}>Bem-vindo de volta</Text>
            <Text style={styles.welcomeSub}>Entre para continuar sua experiência</Text>
          </AnimatedView>

          {/* Error */}
          {error ? (
            <AnimatedView style={[styles.errorBox, shakeStyle]}>
              <Text style={styles.errorText}>{error}</Text>
            </AnimatedView>
          ) : null}

          {/* Inputs */}
          <AnimatedView entering={FadeInUp.delay(250).springify()} style={{ gap: 14 }}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                style={styles.input}
                placeholder="Email ou @usuário"
                placeholderTextColor="#8a8aab"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#8a8aab"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                {showPassword ? <EyeOff size={18} color="#8a8aab" /> : <Eye size={18} color="#8a8aab" />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setShowResetModal(true)} style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>

            {/* Entrar */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#6c3bff', '#c026b3', '#e91e8c']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryGradient}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.primaryBtnText}>Entrar</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social */}
            <TouchableOpacity
              style={[styles.socialBtn, (googleLoading) && { opacity: 0.7 }]}
              onPress={handleGoogleLogin}
              disabled={loading || googleLoading || appleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.socialIcon} />
                  <Text style={styles.socialBtnText}>Continuar com Google</Text>
                </>
              )}
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.socialBtn, appleLoading && { opacity: 0.7 }]}
                onPress={handleAppleLogin}
                disabled={loading || googleLoading || appleLoading}
                activeOpacity={0.8}
              >
                {appleLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/0/747.png' }} style={[styles.socialIcon, { tintColor: '#fff' }]} />
                    <Text style={styles.socialBtnText}>Continuar com Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Register link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Não possui conta? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.registerLink}>Criar conta</Text>
              </TouchableOpacity>
            </View>
          </AnimatedView>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Reset Modal */}
      <Modal visible={showResetModal} transparent animationType="slide" onRequestClose={() => setShowResetModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recuperar Senha</Text>
              <TouchableOpacity onPress={() => setShowResetModal(false)} style={{ padding: 6 }}>
                <X size={20} color="#aaa" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>Informe seu email e enviaremos um código de recuperação.</Text>
            <View style={[styles.inputWrap, { marginBottom: 16 }]}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor="#8a8aab"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!resetLoading}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, resetLoading && { opacity: 0.6 }]}
              onPress={handleResetPassword}
              disabled={resetLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#6c3bff', '#c026b3', '#e91e8c']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.primaryGradient}
              >
                {resetLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Enviar Código</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0916' },
  scroll: { flexGrow: 1, justifyContent: 'center' },

  glowCircle: {
    position: 'absolute',
    backgroundColor: '#5a2fff',
    shadowColor: '#7b2fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 120,
    elevation: 20,
  },

  logoArea: { alignItems: 'center', marginBottom: 8 },
  logoImg: {
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 12,
  },
  appName: { fontWeight: '900', color: '#fff', letterSpacing: 5, textShadowColor: 'rgba(168,85,247,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  pink: { color: '#ff1493' },
  cyan: { color: '#00d9ff' },

  welcomeArea: { alignItems: 'center', marginBottom: 28 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  welcomeSub: { fontSize: 13, color: '#6b6b8a' },

  errorBox: { backgroundColor: 'rgba(255,50,50,0.12)', borderWidth: 1, borderColor: 'rgba(255,50,50,0.25)', borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', fontWeight: '600' },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    minHeight: 54,
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14, fontWeight: '400' },
  eyeBtn: { padding: 6 },

  forgotWrap: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { color: '#e91e8c', fontSize: 13, fontWeight: '600' },

  primaryBtn: { borderRadius: 14, overflow: 'hidden' },
  primaryGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: '#44445a', fontSize: 13, fontWeight: '600' },

  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 15,
    gap: 10,
  },
  socialIcon: { width: 20, height: 20 },
  socialBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  registerText: { color: '#6b6b8a', fontSize: 14 },
  registerLink: { color: '#a855f7', fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: { backgroundColor: '#12101f', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalDesc: { color: '#666', fontSize: 14, marginBottom: 18, lineHeight: 20 },
});
