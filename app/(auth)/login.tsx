import { useState, useRef, useEffect } from 'react';
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
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, X, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import Animated, { 
  FadeInUp, 
  FadeInDown, 
  FadeIn, 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  withDelay,
  withSpring,
  Easing
} from 'react-native-reanimated';

const AnimatedView = Animated.View;
const AnimatedText = Animated.Text;

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const { signIn, signInWithGoogle, signInWithApple } = useAuth();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  // Responsive helpers
  const isSmall = height < 680;
  const fs = (size: number) => Math.max(size * 0.85, Math.min(size, width * (size / 390)));
  const sp = (size: number) => Math.max(size * 0.8, Math.min(size, height * (size / 844)));

  // Register button animation
  const registerBtnScale = useSharedValue(1);
  const registerBtnOpacity = useSharedValue(1);

  // Floating background orbs animation
  const orb1Value = useSharedValue(0);
  const orb2Value = useSharedValue(0);

  useEffect(() => {
    orb1Value.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    orb2Value.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: orb1Value.value * 20 },
      { translateX: orb1Value.value * 10 },
      { scale: 1 + orb1Value.value * 0.1 }
    ] as any,
  }));

  const orb2Style = useAnimatedStyle(() => ({
    transform: [
      { translateY: -orb2Value.value * 30 },
      { translateX: -orb2Value.value * 15 },
      { scale: 1 + orb2Value.value * 0.15 }
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

  const registerBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: registerBtnScale.value }],
    opacity: registerBtnOpacity.value,
  })) as any;

  const handleNavigateToRegister = () => {
    registerBtnScale.value = withSequence(
      withSpring(0.93, { damping: 10, stiffness: 100 }),
      withSpring(1.05, { damping: 10, stiffness: 100 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );
    registerBtnOpacity.value = withSequence(
      withTiming(0.7, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    
    setTimeout(() => {
      router.push('/(auth)/register');
    }, 300);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      shakeError();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError('Email ou senha incorretos. Tente novamente.');
        shakeError();
        setLoading(false);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError('Erro de conexão. Verifique sua internet.');
      shakeError();
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const { error: googleError } = await signInWithGoogle();
      if (googleError) {
        setError(googleError.message);
        shakeError();
      }
    } catch (err: any) {
      setError('Erro ao entrar com Google');
      shakeError();
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setAppleLoading(true);
    setError('');
    try {
      const { error: appleError } = await signInWithApple();
      if (appleError) {
        setError(appleError.message);
        shakeError();
      }
    } catch (err: any) {
      setError('Erro ao entrar com Apple');
      shakeError();
    } finally {
      setAppleLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Erro', 'Digite seu email para redefinir a senha');
      return;
    }
    setResetLoading(true);
    setResetMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'exp://your-app-url/reset-password',
      });
      if (error) {
        Alert.alert('Erro', error.message || 'Erro ao enviar email de reset');
      } else {
        setResetMessage('✓ Email de recuperação enviado! Verifique sua caixa de entrada.');
        setResetEmail('');
        setTimeout(() => { setShowResetModal(false); setResetMessage(''); }, 3000);
      }
    } catch {
      Alert.alert('Erro', 'Erro ao processar o reset de senha');
    } finally {
      setResetLoading(false);
    }
  };

  const logoSize = Math.min(width * 0.28, isSmall ? 90 : 110);

  return (
    <View style={styles.root}>
      {/* Background gradient layers */}
      <LinearGradient
        colors={['#0a0a12', '#0f0f1e', '#0a0a12']}
        style={StyleSheet.absoluteFill}
      />
      <AnimatedView style={[styles.orb, styles.orbBlue, orb1Style, { width: width * 0.7, height: width * 0.7, top: -width * 0.15, left: -width * 0.2 }]} />
      <AnimatedView style={[styles.orb, styles.orbPink, orb2Style, { width: width * 0.6, height: width * 0.6, bottom: -width * 0.1, right: -width * 0.2 }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: Math.max(20, width * 0.06), paddingTop: sp(isSmall ? 30 : 50) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Area */}
          <AnimatedView 
            entering={FadeInDown.delay(100).springify()}
            style={styles.logoArea}
          >
            <View style={[styles.logoGlow, { width: logoSize + 20, height: logoSize + 20, borderRadius: (logoSize + 20) / 2 }]}>
              <LinearGradient
                colors={['#00d9ff', '#ff1493']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.logoGradient, { width: logoSize, height: logoSize, borderRadius: logoSize * 0.28 }]}
              >
                <Image
                  source={require('@/assets/images/icone.jpg')}
                  style={{ width: logoSize * 0.85, height: logoSize * 0.85, borderRadius: logoSize * 0.22 }}
                />
              </LinearGradient>
            </View>
            <AnimatedText 
              entering={FadeIn.delay(300)}
              style={[styles.appName, { fontSize: fs(38), marginTop: sp(16) }]}
            >
              U<Text style={styles.appNamePink}>N</Text><Text style={styles.appNameCyan}>N</Text>A
            </AnimatedText>
            <AnimatedText 
              entering={FadeIn.delay(400)}
              style={[styles.tagline, { fontSize: fs(14), marginTop: sp(4) }]}
            >
              Descubra eventos incríveis perto de você
            </AnimatedText>
          </AnimatedView>

          {/* Form Card */}
          <AnimatedView 
            entering={FadeInUp.delay(400).springify()}
            style={styles.card}
          >
            <Text style={[styles.cardTitle, { fontSize: fs(22) }]}>Bem-vindo de volta 👋</Text>

            {/* Error */}
            {error ? (
              <AnimatedView style={[styles.errorBox, shakeStyle]}>
                <Text style={[styles.errorText, { fontSize: fs(13) }]}>{error}</Text>
              </AnimatedView>
            ) : null}

            {/* Email Input */}
            <View style={[styles.inputGroup, { marginBottom: sp(14) }]}>
              <Text style={[styles.label, { fontSize: fs(12) }]}>EMAIL</Text>
              <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
                <Mail size={fs(18)} color={emailFocused ? '#00d9ff' : '#555'} />
                <TextInput
                  style={[styles.input, { fontSize: fs(15) }]}
                  placeholder="seu@email.com"
                  placeholderTextColor="#444"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={[styles.inputGroup, { marginBottom: sp(6) }]}>
              <Text style={[styles.label, { fontSize: fs(12) }]}>SENHA</Text>
              <View style={[styles.inputRow, passwordFocused && styles.inputRowFocused]}>
                <Lock size={fs(18)} color={passwordFocused ? '#ff1493' : '#555'} />
                <TextInput
                  style={[styles.input, { fontSize: fs(15) }]}
                  placeholder="Sua senha"
                  placeholderTextColor="#444"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword
                    ? <EyeOff size={fs(18)} color="#555" />
                    : <Eye size={fs(18)} color="#555" />
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={() => setShowResetModal(true)} style={[styles.forgotBtn, { marginBottom: sp(20) }]}>
              <Text style={[styles.forgotText, { fontSize: fs(13) }]}>Esqueci minha senha</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#00d9ff', '#7b2fff', '#ff1493']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.loginGradient, { paddingVertical: sp(16) }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.loginBtnContent}>
                    <Text style={[styles.loginBtnText, { fontSize: fs(16) }]}>Entrar</Text>
                    <ArrowRight size={fs(20)} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={[styles.divider, { marginVertical: sp(16) }]}>
              <View style={styles.dividerLine} />
              <Text style={[styles.dividerText, { fontSize: fs(12) }]}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialRow}>
              {/* Google Button */}
              <TouchableOpacity
                style={[styles.socialBtn, googleLoading && { opacity: 0.7 }]}
                onPress={handleGoogleLogin}
                disabled={loading || googleLoading || appleLoading}
                activeOpacity={0.8}
              >
                {googleLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Image 
                      source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} 
                      style={styles.socialIcon} 
                    />
                    <Text style={[styles.socialBtnText, { fontSize: fs(14) }]}>Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Apple Button */}
              <TouchableOpacity
                style={[styles.socialBtn, appleLoading && { opacity: 0.7 }]}
                onPress={handleAppleLogin}
                disabled={loading || googleLoading || appleLoading}
                activeOpacity={0.8}
              >
                {appleLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Image 
                      source={{ uri: 'https://cdn-icons-png.flaticon.com/512/0/747.png' }} 
                      style={[styles.socialIcon, { tintColor: '#fff' }]} 
                    />
                    <Text style={[styles.socialBtnText, { fontSize: fs(14) }]}>Apple</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Register link */}
            <View style={styles.registerRow}>
              <Text style={[styles.registerText, { fontSize: fs(14) }]}>Não tem conta? </Text>
              <Pressable onPress={handleNavigateToRegister}>
                <AnimatedView style={registerBtnStyle}>
                  <LinearGradient
                    colors={['#00d9ff', '#7b2fff', '#ff1493']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.registerBtnGradient}
                  >
                    <Text style={[styles.registerLink, { fontSize: fs(14) }]}>Cadastre-se grátis ✨</Text>
                  </LinearGradient>
                </AnimatedView>
              </Pressable>
            </View>
          </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Reset Password Modal */}
      <Modal visible={showResetModal} transparent animationType="slide" onRequestClose={() => setShowResetModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: fs(20) }]}>Recuperar Senha</Text>
              <TouchableOpacity onPress={() => setShowResetModal(false)} style={styles.closeBtn}>
                <X size={fs(20)} color="#aaa" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalDesc, { fontSize: fs(14) }]}>
              Informe seu email e enviaremos um link de recuperação.
            </Text>
            <View style={[styles.inputRow, { marginBottom: sp(16) }]}>
              <Mail size={fs(18)} color="#00d9ff" />
              <TextInput
                style={[styles.input, { fontSize: fs(15) }]}
                placeholder="seu@email.com"
                placeholderTextColor="#444"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!resetLoading}
              />
            </View>
            {resetMessage ? (
              <View style={styles.successBox}>
                <Text style={[styles.successText, { fontSize: fs(13) }]}>{resetMessage}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.loginBtn, resetLoading && styles.loginBtnDisabled]}
              onPress={handleResetPassword}
              disabled={resetLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#00d9ff', '#7b2fff', '#ff1493']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.loginGradient, { paddingVertical: sp(14) }]}
              >
                {resetLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[styles.loginBtnText, { fontSize: fs(15) }]}>Enviar Link</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a12' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingBottom: 32 },

  orb: { position: 'absolute', borderRadius: 9999 },
  orbBlue: { backgroundColor: 'rgba(0, 217, 255, 0.07)' },
  orbPink: { backgroundColor: 'rgba(255, 20, 147, 0.07)' },

  // Logo
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoGlow: {
    backgroundColor: 'rgba(0, 217, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  logoGradient: { justifyContent: 'center', alignItems: 'center' },
  appName: { fontWeight: '900', color: '#fff', letterSpacing: 4 },
  appNamePink: { color: '#ff1493' },
  appNameCyan: { color: '#00d9ff' },
  tagline: { color: '#666', letterSpacing: 0.3 },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
  },
  cardTitle: { fontWeight: '700', color: '#fff', marginBottom: 20 },

  // Error/Success
  errorBox: {
    backgroundColor: 'rgba(255,60,60,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,60,60,0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#ff6b6b', textAlign: 'center', fontWeight: '600' },
  successBox: {
    backgroundColor: 'rgba(0,217,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,217,255,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  successText: { color: '#00d9ff', textAlign: 'center', fontWeight: '600' },

  // Inputs
  inputGroup: {},
  label: { color: '#666', fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 2,
    minHeight: 52,
  },
  inputRowFocused: {
    borderColor: 'rgba(0,217,255,0.5)',
    backgroundColor: 'rgba(0,217,255,0.04)',
  },
  input: {
    flex: 1,
    color: '#fff',
    marginLeft: 10,
    paddingVertical: 10,
    fontWeight: '500',
  },
  eyeBtn: { padding: 6 },

  // Forgot
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { color: '#00d9ff', fontWeight: '600' },

  // Button
  loginBtn: { borderRadius: 16, overflow: 'hidden' },
  loginBtnDisabled: { opacity: 0.6 },
  loginGradient: { alignItems: 'center', justifyContent: 'center' },
  loginBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loginBtnText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: '#555', fontWeight: '600' },

  // Social Row
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 56,
    gap: 10,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  socialBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  registerText: { color: '#666' },
  registerBtnGradient: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  registerLink: { color: '#fff', fontWeight: '800' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: {
    backgroundColor: '#13131f',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: '#fff', fontWeight: '700' },
  closeBtn: { padding: 6 },
  modalDesc: { color: '#666', marginBottom: 20, lineHeight: 20 },
});
