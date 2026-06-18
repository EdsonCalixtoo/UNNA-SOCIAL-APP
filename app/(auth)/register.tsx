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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, ArrowLeft, Check, Plus, Camera, Image as ImageIcon, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/lib/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import Animated, {
  FadeInRight, FadeOutLeft, FadeInLeft, FadeOutRight, FadeIn,
  useAnimatedStyle, useSharedValue,
  withRepeat, withTiming, withSequence, Easing,
} from 'react-native-reanimated';

const AnimatedView = Animated.View;

const LANGUAGES = [
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

const TOTAL_STEPS = 5;

const formatPhone = (text: string): string => {
  const d = text.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const sanitizeUsername = (text: string) => text.toLowerCase().replace(/[^a-z0-9_.]/g, '');

const generateSuggestions = (username: string, fullName: string): string[] => {
  const base = sanitizeUsername(username);
  const nameParts = fullName.trim().toLowerCase().split(' ');
  const lastName = nameParts[nameParts.length - 1] || '';
  const suggestions = [
    `${base}${lastName}`.slice(0, 20),
    `${base}.official`,
    `${base}unna`,
    `${base}.x`,
    `${base}${Math.floor(Math.random() * 90 + 10)}`,
  ];
  return [...new Set(suggestions)].filter(s => s !== base && s.length >= 3).slice(0, 4);
};

export default function Register() {
  // Step management: 0 = basic form, 1-5 = numbered steps
  const [step, setStep] = useState(0);

  // Step 0: basic info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 1: username
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const usernameTimer = useRef<number | null>(null);

  // Step 2: language
  const [language, setLanguage] = useState('pt');

  // Step 3: Date of Birth
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 4: Photos
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [coverPhoto, setCoverPhoto] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);

  const { signUp, signInWithGoogle, signInWithApple, user, refreshProfile } = useAuth();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isSmall = height < 700;

  // Check username availability
  const checkUsername = async (name: string) => {
    const sanitized = sanitizeUsername(name);
    if (sanitized.length < 3) { setUsernameAvailable(null); setSuggestions([]); return; }
    setCheckingUsername(true);
    try {
      const { data } = await supabase.from('profiles').select('username').eq('username', sanitized);
      const available = (data || []).length === 0;
      setUsernameAvailable(available);
      if (!available) {
        setLoadingSuggestions(true);
        const suggested = generateSuggestions(sanitized, fullName);
        const checked = await Promise.all(
          suggested.map(async (s) => {
            const { data: d } = await supabase.from('profiles').select('username').eq('username', s);
            return { name: s, available: (d || []).length === 0 };
          })
        );
        setSuggestions(checked.filter(c => c.available).map(c => c.name));
        setLoadingSuggestions(false);
      } else {
        setSuggestions([]);
      }
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  useEffect(() => {
    if (step !== 1) return;
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(() => { checkUsername(username); }, 700) as unknown as number;
    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current); };
  }, [username, step]);

  // Pre-generate suggestions when entering username step
  useEffect(() => {
    if (step === 1 && suggestions.length === 0 && fullName) {
      const base = sanitizeUsername(fullName.split(' ')[0]);
      setSuggestions(generateSuggestions(base, fullName));
    }
  }, [step]);

  // If user is already authenticated (OAuth), skip to step 1
  useEffect(() => {
    if (user && step === 0) {
      setStep(1);
      const oauthName = user.user_metadata?.full_name || '';
      if (oauthName && !fullName) setFullName(oauthName);
      
      if (!username && user.email) {
        const base = oauthName 
          ? oauthName.toLowerCase().replace(/\s+/g, '_') 
          : user.email.split('@')[0];
        const suggestion = base.replace(/[^a-z0-9_]/g, '').slice(0, 15);
        setUsername(suggestion);
      }
    }
  }, [user, step]);

  const validateStep0 = (): string | null => {
    if (!fullName.trim()) return 'Digite seu nome completo';
    if (!email.trim() || !email.includes('@')) return 'Digite um email válido';
    if (phone.replace(/\D/g, '').length < 10) return 'Digite um celular válido com DDD';
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres';
    if (password !== confirmPassword) return 'As senhas não coincidem';
    return null;
  };

  const validateStep1 = () => {
    if (user && !fullName.trim()) return 'Seu nome completo é obrigatório';
    if (username.length < 3) return 'O @usuário deve ter no mínimo 3 caracteres';
    if (usernameAvailable === false) return 'Este @usuário já está em uso';
    if (usernameAvailable === null) return 'Aguarde a verificação do usuário';
    return null;
  };

  const handleNextStep = () => {
    setError('');
    if (step === 0) {
      const err = validateStep0();
      if (err) { setError(err); return; }
      setShowMethodModal(true);
    } else if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setStep(2);
    } else {
      setStep(s => s + 1);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const cleanUsername = sanitizeUsername(username);
      
      let avatar_url = user.user_metadata?.avatar_url || null;
      let cover_url = null;
      
      // Realiza upload das fotos caso existam
      if (profilePhoto) {
        const uploaded = await uploadImage(profilePhoto, 'media', 'avatars', user.id);
        if (uploaded) avatar_url = uploaded;
      }
      if (coverPhoto) {
        const uploaded = await uploadImage(coverPhoto, 'media', 'covers', user.id);
        if (uploaded) cover_url = uploaded;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: cleanUsername,
          full_name: fullName.trim() || user.user_metadata?.full_name,
          avatar_url,
          cover_url,
          birth_date: birthDate ? birthDate.toISOString().split('T')[0] : null,
          preferred_language: language,
          updated_at: new Date().toISOString(),
        });

      if (updateError) throw updateError;
      await refreshProfile();
      // AuthGuard will route them to feed since onboarding_completed is true
    } catch (err: any) {
      setError(err?.message || 'Erro ao finalizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const executeSignUp = async (method: 'email' | 'phone') => {
    setShowMethodModal(false);
    setLoading(true);
    setError('');
    try {
      const phoneDigits = phone.replace(/\D/g, '');
      const identifier = method === 'email' ? email.trim() : '+55' + phoneDigits;
      
      const { error: signUpError, sessionCreated } = await signUp(
        method, identifier, password, '', fullName.trim(), 'user'
      );
      
      if (signUpError) {
        const msg = signUpError.message || 'Erro ao criar conta';
        setError(msg.includes('already registered') ? 'Esta conta já está cadastrada.' : msg);
        setLoading(false);
      } else if (!sessionCreated) {
        setLoading(false);
        // Pass all data needed for fallback to verify-otp
        router.replace({ 
          pathname: '/(auth)/verify-otp', 
          params: { 
            identifier, 
            method,
            fullName: fullName.trim(),
            email: email.trim(),
            phone: '+55' + phoneDigits,
            password
          } 
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Erro de conexão.');
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 0 || (user && step === 1)) router.replace('/(auth)/login');
    else setStep(s => s - 1);
    setError('');
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    try {
      const { error: e } = await signInWithGoogle();
      if (e) setError(e.message);
    } catch { setError('Erro ao entrar com Google'); }
    finally { setGoogleLoading(false); }
  };

  const handleAppleRegister = async () => {
    setAppleLoading(true);
    try {
      const { error: e } = await signInWithApple();
      if (e) setError(e.message);
    } catch { setError('Erro ao entrar com Apple'); }
    finally { setAppleLoading(false); }
  };

  const pickImage = async (type: 'profile' | 'cover') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (type === 'profile') setProfilePhoto(result.assets[0].uri);
      else setCoverPhoto(result.assets[0].uri);
    }
  };

  const progressFill = step > 0 ? (step / TOTAL_STEPS) : 0;

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient colors={['#0a0916', '#0d0b1e', '#0a0916']} style={StyleSheet.absoluteFill} />

      {/* Purple glow top */}
      <View style={[styles.glowTop, { width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, left: width * 0.1 }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: 24, paddingTop: isSmall ? 16 : 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header row */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <ArrowLeft size={22} color="#ffffff" />
            </TouchableOpacity>
            {step > 0 && (
              <Text style={styles.stepText}>{step}/{TOTAL_STEPS}</Text>
            )}
          </View>

          {/* Progress bar (only in steps 1+) */}
          {step > 0 && (
            <AnimatedView entering={FadeIn.duration(300)} style={styles.progressBar}>
              <LinearGradient
                colors={['#6c3bff', '#e91e8c']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progressFill * 100}%` }]}
              />
            </AnimatedView>
          )}

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* STEP 0: Basic form */}
          {step === 0 && (
            <AnimatedView entering={FadeInRight.springify()} key="step0">
              <Text style={styles.pageTitle}>Criar sua conta</Text>
              <Text style={styles.pageSubtitle}>É rápido e fácil.</Text>

              <View style={styles.formGroup}>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome Completo"
                    placeholderTextColor="#8a8aab"
                    value={fullName}
                    onChangeText={setFullName}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#8a8aab"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <Text style={styles.countryCode}>+55</Text>
                  <View style={styles.separator} />
                  <TextInput
                    style={[styles.input, { marginLeft: 4 }]}
                    placeholder="(11) 99999-9999"
                    placeholderTextColor="#8a8aab"
                    value={phone}
                    onChangeText={t => setPhone(formatPhone(t))}
                    keyboardType="phone-pad"
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
                    textContentType="oneTimeCode"
                    autoComplete="off"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    {showPassword ? <EyeOff size={18} color="#8a8aab" /> : <Eye size={18} color="#8a8aab" />}
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar Senha"
                    placeholderTextColor="#8a8aab"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    editable={!loading}
                    textContentType="oneTimeCode"
                    autoComplete="off"
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                    {showConfirm ? <EyeOff size={18} color="#3d3d5a" /> : <Eye size={18} color="#3d3d5a" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleNextStep} activeOpacity={0.85}>
                <LinearGradient colors={['#6c3bff', '#c026b3', '#e91e8c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                  <Text style={styles.primaryBtnText}>Criar Conta</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider + Social */}
              <View style={[styles.divider, { marginVertical: 18 }]}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={{ gap: 12 }}>
                <TouchableOpacity style={[styles.socialBtn, googleLoading && { opacity: 0.7 }]} onPress={handleGoogleRegister} disabled={googleLoading} activeOpacity={0.8}>
                  {googleLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }} style={styles.socialIcon} />
                      <Text style={styles.socialBtnText}>Continuar com Google</Text>
                    </>
                  )}
                </TouchableOpacity>
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={[styles.socialBtn, appleLoading && { opacity: 0.7 }]} onPress={handleAppleRegister} disabled={appleLoading} activeOpacity={0.8}>
                    {appleLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/0/747.png' }} style={[styles.socialIcon, { tintColor: '#fff' }]} />
                        <Text style={styles.socialBtnText}>Continuar com Apple</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.termsText}>
                Ao criar uma conta você concorda com os{' '}
                <Text style={styles.termsLink}>Termos de Uso</Text> e{' '}
                <Text style={styles.termsLink}>Política de Privacidade</Text>
              </Text>
            </AnimatedView>
          )}

          {/* STEP 1: Username & Profile (OAuth) */}
          {step === 1 && (
            <AnimatedView entering={FadeInRight.springify()} key="step1">
              {user?.user_metadata?.avatar_url && (
                <View style={{ alignItems: 'center', marginBottom: 24 }}>
                  <Image 
                    source={{ uri: user.user_metadata.avatar_url }} 
                    style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#a855f7' }} 
                  />
                  <View style={{ position: 'absolute', bottom: 0, right: '35%', backgroundColor: '#a855f7', borderRadius: 12, padding: 2 }}>
                    <Check size={14} color="#fff" />
                  </View>
                </View>
              )}

              <Text style={styles.pageTitle}>{user ? 'Complete seu Perfil' : 'Escolha seu @usuário'}</Text>
              <Text style={styles.pageSubtitle}>Esse será seu identificador único no UNNA.</Text>

              {user && (
                <View style={[styles.inputWrap, { marginBottom: 16 }]}>
                  <Text style={[styles.inputIcon, { fontSize: 16 }]}>👤</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome Completo"
                    placeholderTextColor="#8a8aab"
                    value={fullName}
                    onChangeText={setFullName}
                    editable={!loading}
                  />
                </View>
              )}

              <View style={[styles.inputWrap, { marginBottom: 8 }]}>
                <Text style={[styles.inputIcon, { color: '#a855f7', fontWeight: '700', fontSize: 18 }]}>@</Text>
                <TextInput
                  style={styles.input}
                  placeholder="seuusuario"
                  placeholderTextColor="#8a8aab"
                  value={username}
                  onChangeText={t => { setUsername(sanitizeUsername(t)); setUsernameAvailable(null); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                {checkingUsername && <ActivityIndicator size="small" color="#a855f7" />}
                {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                  <View style={styles.checkBadge}>
                    <Check size={14} color="#fff" />
                  </View>
                )}
              </View>

              {usernameAvailable === false && (
                <Text style={styles.takenText}>✗ @{sanitizeUsername(username)} já está em uso</Text>
              )}
              {usernameAvailable === true && username.length >= 3 && (
                <Text style={styles.availText}>✓ @{sanitizeUsername(username)} está disponível!</Text>
              )}

              {/* Suggestions */}
              {(suggestions.length > 0 || loadingSuggestions) && (
                <View style={styles.suggestionsWrap}>
                  <Text style={styles.suggestionsTitle}>Sugestões disponíveis</Text>
                  {loadingSuggestions ? (
                    <ActivityIndicator color="#a855f7" style={{ marginVertical: 16 }} />
                  ) : (
                    suggestions.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={styles.suggestionRow}
                        onPress={() => { setUsername(s); setUsernameAvailable(true); setSuggestions([]); }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestionText}>@{s}</Text>
                        <View style={styles.plusBtn}>
                          <Plus size={14} color="#a855f7" />
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 24 }, (checkingUsername || usernameAvailable === false) && { opacity: 0.5 }]}
                onPress={handleNextStep}
                disabled={checkingUsername || usernameAvailable === false || loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#6c3bff', '#c026b3', '#e91e8c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                  <Text style={styles.primaryBtnText}>Continuar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </AnimatedView>
          )}

          {/* STEP 2: Language */}
          {step === 2 && (
            <AnimatedView entering={FadeInRight.springify()} key="step2">
              <Text style={styles.pageTitle}>Escolha seu idioma</Text>
              <Text style={styles.pageSubtitle}>Você poderá alterar depois nas configurações.</Text>

              <View style={styles.languageList}>
                {LANGUAGES.map(lang => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOption, language === lang.code && styles.langOptionSelected]}
                    onPress={() => setLanguage(lang.code)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langLabel, language === lang.code && { color: '#fff' }]}>{lang.label}</Text>
                    {language === lang.code && (
                      <View style={styles.checkBadge}>
                        <Check size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 28 }, loading && { opacity: 0.6 }]}
                onPress={handleNextStep}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#6c3bff', '#c026b3', '#e91e8c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Continuar</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </AnimatedView>
          )}

          {/* STEP 3: Date of Birth */}
          {step === 3 && (
            <AnimatedView entering={FadeInRight.springify()} key="step3">
              <Text style={styles.pageTitle}>Qual sua data de nascimento?</Text>
              <Text style={styles.pageSubtitle}>Isso não será exibido publicamente no seu perfil.</Text>

              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <Calendar size={24} color="#a855f7" />
                <Text style={[styles.datePickerText, !birthDate && { color: '#666' }]}>
                  {birthDate ? birthDate.toLocaleDateString('pt-BR') : 'DD / MM / AAAA'}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={birthDate || new Date(2000, 0, 1)}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) setBirthDate(selectedDate);
                  }}
                  textColor="#fff"
                />
              )}
              {Platform.OS === 'ios' && showDatePicker && (
                <TouchableOpacity style={{ alignSelf: 'center', marginTop: 10 }} onPress={() => setShowDatePicker(false)}>
                  <Text style={{ color: '#00d9ff', fontWeight: 'bold' }}>Confirmar Data</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 32 }, (!birthDate || loading) && { opacity: 0.6 }]}
                onPress={handleNextStep}
                disabled={!birthDate || loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#6c3bff', '#c026b3', '#e91e8c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                  <Text style={styles.primaryBtnText}>Continuar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </AnimatedView>
          )}

          {/* STEP 4: Photos */}
          {step === 4 && (
            <AnimatedView entering={FadeInRight.springify()} key="step4">
              <Text style={styles.pageTitle}>Adicione suas fotos</Text>
              <Text style={styles.pageSubtitle}>Deixe seu perfil com a sua cara! (Opcional)</Text>

              <View style={styles.photosContainer}>
                {/* Cover Photo */}
                <TouchableOpacity 
                  style={styles.coverPhotoBtn} 
                  onPress={() => pickImage('cover')}
                  activeOpacity={0.8}
                >
                  {coverPhoto ? (
                    <Image source={{ uri: coverPhoto }} style={styles.coverImage} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <ImageIcon size={32} color="#a855f7" />
                      <Text style={styles.photoText}>Adicionar Capa</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Profile Photo */}
                <TouchableOpacity 
                  style={styles.profilePhotoBtn} 
                  onPress={() => pickImage('profile')}
                  activeOpacity={0.9}
                >
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
                  ) : user?.user_metadata?.avatar_url ? (
                    <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.profileImage} />
                  ) : (
                    <View style={[styles.photoPlaceholder, { borderRadius: 60 }]}>
                      <Camera size={28} color="#00d9ff" />
                    </View>
                  )}
                  <View style={styles.profilePlusBadge}>
                    <Plus size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 40 }, loading && { opacity: 0.6 }]}
                onPress={handleNextStep}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#6c3bff', '#c026b3', '#e91e8c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                  <Text style={styles.primaryBtnText}>Continuar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </AnimatedView>
          )}

          {/* STEP 5: Tudo pronto */}
          {step === 5 && (
            <AnimatedView entering={FadeInRight.springify()} key="step5">
              <Text style={styles.pageTitle}>Tudo pronto!</Text>
              <Text style={styles.pageSubtitle}>Seu perfil está incrível. Vamos começar?</Text>

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 32 }, loading && { opacity: 0.6 }]}
                onPress={handleCompleteRegistration}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#6c3bff', '#c026b3', '#e91e8c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryGradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={styles.primaryBtnText}>Entrar no UNNA!</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </AnimatedView>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal para escolher onde receber o código */}
      {showMethodModal && (
        <View style={styles.modalOverlay}>
          <AnimatedView entering={FadeIn.duration(200)} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Como deseja validar sua conta?</Text>
            <Text style={styles.modalSubtitle}>Enviaremos um código de 6 dígitos para você.</Text>
            
            <TouchableOpacity 
              style={styles.modalOptionBtn}
              onPress={() => executeSignUp('email')}
              activeOpacity={0.8}
            >
              <Text style={styles.modalOptionIcon}>✉️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Por E-mail</Text>
                <Text style={styles.modalOptionDesc}>{email}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalOptionBtn}
              onPress={() => executeSignUp('phone')}
              activeOpacity={0.8}
            >
              <Text style={styles.modalOptionIcon}>📱</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalOptionTitle}>Por SMS</Text>
                <Text style={styles.modalOptionDesc}>{phone}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowMethodModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </AnimatedView>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0916' },
  scroll: { flexGrow: 1 },

  glowTop: {
    position: 'absolute',
    top: -100,
    backgroundColor: '#4a1f99',
    opacity: 0.35,
    shadowColor: '#7b2fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
  },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 4 },
  stepText: { color: '#888', fontSize: 14, fontWeight: '600' },

  progressBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 28, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },

  errorBox: { backgroundColor: 'rgba(255,50,50,0.1)', borderWidth: 1, borderColor: 'rgba(255,50,50,0.25)', borderRadius: 12, padding: 12, marginBottom: 14 },
  errorText: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', fontWeight: '600' },

  pageTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6, letterSpacing: -0.3 },
  pageSubtitle: { fontSize: 14, color: '#6b6b8a', marginBottom: 28 },

  formGroup: { gap: 14, marginBottom: 20 },

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
  countryCode: { color: '#a855f7', fontWeight: '700', fontSize: 15 },
  separator: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 10 },
  input: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },
  eyeBtn: { padding: 6 },

  checkBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#a855f7', justifyContent: 'center', alignItems: 'center' },
  takenText: { color: '#ff4444', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  availText: { color: '#00e676', fontSize: 13, fontWeight: '600', marginBottom: 8 },

  suggestionsWrap: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  suggestionsTitle: { color: '#6b6b8a', fontSize: 12, fontWeight: '700', letterSpacing: 0.8, padding: 16, paddingBottom: 8 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  suggestionText: { flex: 1, color: '#ccccdd', fontSize: 15, fontWeight: '500' },
  plusBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#a855f7', justifyContent: 'center', alignItems: 'center' },

  primaryBtn: { borderRadius: 14, overflow: 'hidden' },
  primaryGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: '#44445a', fontSize: 13, fontWeight: '600' },

  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 15, gap: 10 },
  socialIcon: { width: 20, height: 20 },
  socialBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  termsText: { color: '#444466', fontSize: 11, textAlign: 'center', marginTop: 18, lineHeight: 18 },
  termsLink: { color: '#a855f7', fontWeight: '600' },

  languageList: { gap: 12 },
  langOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  langOptionSelected: { borderColor: '#a855f7', backgroundColor: 'rgba(168,85,247,0.1)' },
  langFlag: { fontSize: 26 },
  langLabel: { flex: 1, color: '#aaa', fontSize: 16, fontWeight: '600' },

  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#131127', width: '85%', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { color: '#888', fontSize: 14, marginBottom: 24, textAlign: 'center' },
  modalOptionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', width: '100%', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  modalOptionIcon: { fontSize: 24, marginRight: 16 },
  modalOptionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  modalOptionDesc: { color: '#a855f7', fontSize: 13, fontWeight: '600' },
  modalCancelBtn: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 24 },
  modalCancelText: { color: '#888', fontSize: 15, fontWeight: '600' },
  modalCloseBtnText: { color: '#aaa', fontSize: 16, fontWeight: 'bold' },
  
  // Date Picker
  datePickerBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  datePickerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // Photos
  photosContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  coverPhotoBtn: {
    width: '100%',
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  photoText: {
    color: '#a855f7',
    fontWeight: '600',
    fontSize: 14,
  },
  profilePhotoBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#111',
    borderWidth: 4,
    borderColor: '#0a0a12',
    marginTop: -60, // overlap cover
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    resizeMode: 'cover',
  },
  profilePlusBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#00d9ff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0a0a12',
  },
});
