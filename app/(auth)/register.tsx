import { useState, useEffect, useRef } from 'react';
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
  SafeAreaView,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { User, AtSign, Mail, Lock, Eye, EyeOff, CircleAlert as AlertCircle, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
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

type PasswordStrength = 'weak' | 'medium' | 'strong';

const getPasswordStrength = (pwd: string): PasswordStrength => {
  if (pwd.length < 6) return 'weak';
  if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return 'strong';
  if (pwd.length >= 6) return 'medium';
  return 'weak';
};

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const usernameTimer = useRef<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);

  // Focus states
  const [nameFocused, setNameFocused] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { signUp } = useAuth();
  const router = useRouter();
  const { width, height } = useWindowDimensions();

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

  const handleGoBack = () => {
    router.replace('/(auth)/login');
  };

  const handleRegister = async () => {
    if (!email || !password || !fullName || !username) {
      setError('Por favor, preencha todos os campos');
      shakeError();
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      shakeError();
      return;
    }
    if (usernameAvailable === false) {
      setError('Nome de usuário já está em uso. Escolha outro.');
      shakeError();
      return;
    }
    if (usernameAvailable === null) {
      setError('Aguarde a verificação do nome de usuário');
      shakeError();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: signUpError, sessionCreated } = await signUp(email, password, username, fullName);
      if (signUpError) {
        const msg = signUpError.message || 'Erro ao criar conta';
        if (msg.includes('already registered')) {
          setError('Este email já está registrado. Faça login ou use outro email.');
        } else {
          setError(msg);
        }
        shakeError();
        setLoading(false);
      } else {
        if (sessionCreated) {
          router.replace('/(auth)/onboarding');
        } else {
          setLoading(false);
          setShowVerificationAlert(true);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão. Verifique sua internet.');
      shakeError();
      setLoading(false);
    }
  };

  const sanitize = (text: string) => text.toLowerCase().replace(/\s/g, '');

  const checkUsernameAvailability = async (name: string) => {
    const sanitized = sanitize(name);
    if (!sanitized) { setUsernameAvailable(null); setSuggestions([]); return; }
    setCheckingUsername(true);
    try {
      const { data, error } = await supabase.from('profiles').select('username').eq('username', sanitized);
      if (error) throw error;
      setUsernameAvailable(data.length === 0);
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(() => { checkUsernameAvailability(username); }, 600) as unknown as number;
    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current); };
  }, [username]);

  const logoSize = Math.min(width * 0.22, isSmall ? 75 : 90);
  const strengthColor = passwordStrength === 'strong' ? '#00e676' : passwordStrength === 'medium' ? '#FF9500' : '#ff4444';
  const strengthLabel = passwordStrength === 'strong' ? '🟢 Forte' : passwordStrength === 'medium' ? '🟡 Média' : '🔴 Fraca';

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient colors={['#0a0a12', '#0f0f1e', '#0a0a12']} style={StyleSheet.absoluteFill} />
      <AnimatedView style={[styles.orb, styles.orbBlue, orb1Style, { width: width * 0.7, height: width * 0.7, top: -width * 0.15, right: -width * 0.2 }]} />
      <AnimatedView style={[styles.orb, styles.orbPink, orb2Style, { width: width * 0.5, height: width * 0.5, bottom: -width * 0.05, left: -width * 0.15 }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: Math.max(20, width * 0.06), paddingTop: sp(isSmall ? 20 : 30) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AnimatedView entering={FadeInDown.delay(100).springify()}>
            <TouchableOpacity onPress={handleGoBack} style={styles.backBtn} activeOpacity={0.7}>
              <ArrowLeft size={fs(20)} color="#00d9ff" />
              <Text style={[styles.backText, { fontSize: fs(14) }]}>Voltar</Text>
            </TouchableOpacity>

            <View style={styles.header}>
              <LinearGradient
                colors={['#00d9ff', '#7b2fff', '#ff1493']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.logoGradient, { width: logoSize, height: logoSize, borderRadius: logoSize * 0.28 }]}
              >
                <Image
                  source={require('@/assets/images/icone.jpg')}
                  style={{ width: logoSize * 0.82, height: logoSize * 0.82, borderRadius: logoSize * 0.22 }}
                />
              </LinearGradient>
              <Text style={[styles.title, { fontSize: fs(28), marginTop: sp(12) }]}>Crie sua conta</Text>
              <Text style={[styles.subtitle, { fontSize: fs(14) }]}>Junte-se à comunidade UNNA</Text>
            </View>

            {error ? (
              <AnimatedView style={[styles.errorBox, shakeStyle]}>
                <AlertCircle size={fs(16)} color="#ff6b6b" />
                <Text style={[styles.errorText, { fontSize: fs(13) }]}>{error}</Text>
              </AnimatedView>
            ) : null}

            <AnimatedView entering={FadeInUp.delay(300).springify()} style={styles.card}>
              <View style={[styles.inputGroup, { marginBottom: sp(14) }]}>
                <Text style={[styles.label, { fontSize: fs(11) }]}>NOME COMPLETO</Text>
                <View style={[styles.inputRow, nameFocused && styles.inputRowFocused]}>
                  <User size={fs(17)} color={nameFocused ? '#00d9ff' : '#555'} />
                  <TextInput
                    style={[styles.input, { fontSize: fs(15) }]}
                    placeholder="João Silva"
                    placeholderTextColor="#444"
                    value={fullName}
                    onChangeText={setFullName}
                    editable={!loading}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { marginBottom: sp(14) }]}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { fontSize: fs(11) }]}>NOME DE USUÁRIO</Text>
                  {checkingUsername && <ActivityIndicator size="small" color="#FF9500" />}
                  {!checkingUsername && usernameAvailable === true && username ? <Text style={[styles.availableText, { fontSize: fs(11) }]}>✓ Disponível</Text> : null}
                  {!checkingUsername && usernameAvailable === false && username ? <Text style={[styles.takenText, { fontSize: fs(11) }]}>✗ Em uso</Text> : null}
                </View>
                <View style={[styles.inputRow, usernameFocused && styles.inputRowFocused, usernameAvailable === true && username ? styles.inputRowSuccess : null, usernameAvailable === false && username ? styles.inputRowError : null]}>
                  <AtSign size={fs(17)} color={usernameAvailable === true ? '#00e676' : usernameAvailable === false ? '#ff4444' : usernameFocused ? '#ff1493' : '#555'} />
                  <TextInput
                    style={[styles.input, { fontSize: fs(15) }]}
                    placeholder="joaosilva"
                    placeholderTextColor="#444"
                    value={username}
                    onChangeText={(txt) => setUsername(sanitize(txt))}
                    autoCapitalize="none"
                    editable={!loading}
                    onFocus={() => setUsernameFocused(true)}
                    onBlur={() => setUsernameFocused(false)}
                  />
                  {usernameAvailable === true && username ? <CheckCircle size={fs(16)} color="#00e676" /> : null}
                </View>
              </View>

              <View style={[styles.inputGroup, { marginBottom: sp(14) }]}>
                <Text style={[styles.label, { fontSize: fs(11) }]}>EMAIL</Text>
                <View style={[styles.inputRow, emailFocused && styles.inputRowFocused]}>
                  <Mail size={fs(17)} color={emailFocused ? '#00d9ff' : '#555'} />
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

              <View style={[styles.inputGroup, { marginBottom: sp(20) }]}>
                <View style={styles.labelRow}>
                  <Text style={[styles.label, { fontSize: fs(11) }]}>SENHA</Text>
                  {password ? <Text style={[styles.strengthText, { fontSize: fs(11), color: strengthColor }]}>{strengthLabel}</Text> : null}
                </View>
                <View style={[styles.inputRow, passwordFocused && styles.inputRowFocused]}>
                  <Lock size={fs(17)} color={passwordFocused ? '#ff1493' : '#555'} />
                  <TextInput
                    style={[styles.input, { fontSize: fs(15) }]}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#444"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? <EyeOff size={fs(17)} color="#555" /> : <Eye size={fs(17)} color="#555" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={['#00d9ff', '#7b2fff', '#ff1493']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.btnGradient, { paddingVertical: sp(16) }]}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <View style={styles.btnContent}>
                      <Text style={[styles.btnText, { fontSize: fs(16) }]}>Criar Conta</Text>
                      <ArrowRight size={fs(20)} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </AnimatedView>

            <View style={[styles.footer, { marginTop: sp(20) }]}>
              <Text style={[styles.footerText, { fontSize: fs(14) }]}>Já tem uma conta? </Text>
              <TouchableOpacity onPress={handleGoBack} activeOpacity={0.7}>
                <Text style={[styles.footerLink, { fontSize: fs(14) }]}>Faça login</Text>
              </TouchableOpacity>
            </View>
          </AnimatedView>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* VERIFICATION EMAIL SENT ALERT MODAL */}
      <Modal visible={showVerificationAlert} transparent animationType="fade">
        <BlurView intensity={90} tint="dark" style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBg}>
              <Mail size={32} color="#00d9ff" />
            </View>
            <Text style={styles.modalTitle}>Verifique seu E-mail!</Text>
            <Text style={styles.modalDescription}>
              Enviamos um link de confirmação para o endereço:{"\n"}
              <Text style={{ color: '#00d9ff', fontWeight: '700' }}>{email}</Text>{"\n\n"}
              Acesse sua caixa de entrada (ou lixeira/spam) e clique no link para ativar sua conta do UNNA Social.
            </Text>
            
            <TouchableOpacity 
              style={styles.modalBtn}
              onPress={() => {
                setShowVerificationAlert(false);
                router.replace('/(auth)/login');
              }}
            >
              <LinearGradient 
                colors={['#00d9ff', '#7b2fff', '#ff1493']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }} 
                style={styles.modalBtnGradient}
              >
                <Text style={styles.modalBtnText}>Ir para o Login</Text>
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText: { color: '#00d9ff', fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: 24 },
  logoGradient: { justifyContent: 'center', alignItems: 'center', shadowColor: '#00d9ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  title: { fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  subtitle: { color: '#666', marginTop: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,60,60,0.12)', borderWidth: 1, borderColor: 'rgba(255,60,60,0.4)', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { color: '#ff6b6b', fontWeight: '600', flex: 1 },
  card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 20 },
  inputGroup: {},
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { color: '#666', fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  availableText: { color: '#00e676', fontWeight: '700' },
  takenText: { color: '#ff4444', fontWeight: '700' },
  strengthText: { fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 2, minHeight: 52 },
  inputRowFocused: { borderColor: 'rgba(0,217,255,0.5)', backgroundColor: 'rgba(0,217,255,0.04)' },
  inputRowSuccess: { borderColor: 'rgba(0,230,118,0.5)', backgroundColor: 'rgba(0,230,118,0.04)' },
  inputRowError: { borderColor: 'rgba(255,68,68,0.5)', backgroundColor: 'rgba(255,68,68,0.04)' },
  input: { flex: 1, color: '#fff', marginLeft: 10, paddingVertical: 10, fontWeight: '500' },
  eyeBtn: { padding: 6 },
  btn: { borderRadius: 16, overflow: 'hidden' },
  btnDisabled: { opacity: 0.6 },
  btnGradient: { alignItems: 'center', justifyContent: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: '#666' },
  footerLink: { color: '#00d9ff', fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: 'rgba(20, 20, 35, 0.95)', borderWidth: 1.5, borderColor: 'rgba(0, 217, 255, 0.2)', borderRadius: 28, padding: 24, width: '100%', alignItems: 'center', gap: 16, shadowColor: '#00d8ff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
  modalIconBg: { width: 68, height: 68, borderRadius: 24, backgroundColor: 'rgba(0, 217, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: -0.5 },
  modalDescription: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  modalBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  modalBtnGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
