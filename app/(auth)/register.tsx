import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, SafeAreaView, Dimensions, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { User, AtSign, Mail, Lock, CircleAlert as AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';

type PasswordStrength = 'weak' | 'medium' | 'strong';

const getPasswordStrength = (pwd: string): PasswordStrength => {
  if (pwd.length < 6) return 'weak';
  if (pwd.length >= 6 && pwd.length < 10) return 'medium';
  if (pwd.length >= 10 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return 'strong';
  if (pwd.length >= 10) return 'medium';
  return 'weak';
};

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const usernameTimer = useRef<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const isSmallScreen = height < 650;
  const isTinyScreen = width < 375;

  const passwordStrength = password ? getPasswordStrength(password) : null;

  const handleRegister = async () => {
    if (!email || !password || !fullName || !username) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Validate username availability before submitting
    if (usernameAvailable === false) {
      setError('Nome de usuário já está em uso. Escolha outro ou use uma sugestão.');
      return;
    }

    if (usernameAvailable === null) {
      setError('Por favor, aguarde a verificação do nome de usuário');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: signUpError } = await signUp(email, password, username, fullName);

      if (signUpError) {
        console.error('Register error:', signUpError);
        const errorMessage = signUpError.message || 'Erro ao criar conta';
        
        // Provide more helpful error messages
        if (errorMessage.includes('already registered')) {
          setError('Este email já está registrado. Faça login ou use outro email.');
        } else if (errorMessage.includes('Database error')) {
          setError('Erro ao salvar seu perfil. Tente novamente ou contate suporte.');
        } else {
          setError(errorMessage);
        }
        setLoading(false);
      } else {
        router.replace('/(auth)/onboarding');
      }
    } catch (err: any) {
      console.error('Register catch error:', err);
      setError(err?.message || 'Erro de conexão. Verifique sua internet.');
      setLoading(false);
    }
  };

  const sanitize = (text: string) => text.toLowerCase().replace(/\s/g, '');

  const generateCandidates = (fullNameStr: string) => {
    const parts = (fullNameStr || '').trim().split(/\s+/).filter(Boolean);
    const first = parts[0] ? parts[0].toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const last = parts.length > 1 ? parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const candidates: string[] = [];
    if (first) candidates.push(first);
    if (first && last) candidates.push(`${first}${last}`);
    if (first && last) candidates.push(`${first}_${last}`);
    if (first && last) candidates.push(`${first}${last.charAt(0)}`);
    if (first) candidates.push(`${first}12`);
    if (first) candidates.push(`${first}.${last ? last.charAt(0) : ''}`.replace(/\.$/, first));
    // ensure uniqueness and remove empty
    return Array.from(new Set(candidates)).filter(Boolean).slice(0, 6);
  };

  const checkUsernameAvailability = async (name: string) => {
    const sanitized = sanitize(name);
    if (!sanitized) {
      setUsernameAvailable(null);
      setSuggestions([]);
      return;
    }

    setCheckingUsername(true);
    try {
      // generate some candidates to present
      const candidates = generateCandidates(fullName || sanitized).map(sanitize);
      // include the typed username first
      const toCheck = Array.from(new Set([sanitized, ...candidates]));

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .in('username', toCheck);

      if (error) throw error;

      const taken = Array.isArray(data) ? data.map((r: any) => r.username) : [];

      setUsernameAvailable(!taken.includes(sanitized));

      // build available suggestions
      const available = toCheck.filter((s) => !taken.includes(s) && s !== sanitized);
      setSuggestions(available.slice(0, 4));
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameAvailable(null);
      setSuggestions([]);
    } finally {
      setCheckingUsername(false);
    }
  };

  useEffect(() => {
    // debounce checking
    if (usernameTimer.current) {
      clearTimeout(usernameTimer.current);
    }
    usernameTimer.current = window.setTimeout(() => {
      checkUsernameAvailability(username);
    }, 600) as unknown as number;

    return () => {
      if (usernameTimer.current) clearTimeout(usernameTimer.current);
    };
  }, [username, fullName]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#0a0a0a']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* Header com Gradient e Animação */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#00d9ff', '#ff1493']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerGradient}
            >
              <Image
                source={require('@/assets/images/icone.jpg')}
                style={styles.headerImage}
              />
            </LinearGradient>
            
            <Text style={styles.headerTitle}>Bem-vindo!</Text>
            <Text style={styles.headerSubtitle}>Crie sua conta e descubra eventos incríveis</Text>
          </View>

          {/* Form Container com Glassmorphism */}
          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={18} color="#ff4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome Completo</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#00d9ff" />
                <TextInput
                  style={styles.input}
                  placeholder="João Silva"
                  placeholderTextColor="#666"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Username Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Nome de Usuário</Text>
                {checkingUsername && (
                  <Text style={styles.checkingText}>Verificando...</Text>
                )}
                {!checkingUsername && usernameAvailable === true && username && (
                  <Text style={styles.availableText}>✓ Disponível</Text>
                )}
                {!checkingUsername && usernameAvailable === false && username && (
                  <Text style={styles.takenText}>✗ Em uso</Text>
                )}
              </View>
              <View style={[
                styles.inputContainer,
                usernameAvailable === true && styles.inputSuccess,
                usernameAvailable === false && styles.inputError,
              ]}>
                <AtSign size={20} color={
                  usernameAvailable === true ? '#34C759' :
                  usernameAvailable === false ? '#ff4444' :
                  '#ff1493'
                } />
                <TextInput
                  style={styles.input}
                  placeholder="joaosilva"
                  placeholderTextColor="#666"
                  value={username}
                  onChangeText={(txt) => setUsername(sanitize(txt))}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>Sugestões disponíveis:</Text>
                  <View style={styles.suggestionsList}>
                    {suggestions.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={styles.suggestionChip}
                        onPress={() => setUsername(s)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestionText}>@{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#00d9ff" />
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Senha</Text>
                {password && (
                  <Text style={[
                    styles.strengthLabel,
                    passwordStrength === 'weak' && styles.strengthLabelWeak,
                    passwordStrength === 'medium' && styles.strengthLabelMedium,
                    passwordStrength === 'strong' && styles.strengthLabelStrong,
                  ]}>
                    {passwordStrength === 'weak' ? '🔴 Fraca' :
                     passwordStrength === 'medium' ? '🟡 Média' :
                     '🟢 Forte'}
                  </Text>
                )}
              </View>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#ff1493" />
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
              {password && (
                <View style={styles.strengthBarsContainer}>
                  <View style={styles.strengthBars}>
                    <View style={[
                      styles.strengthBar,
                      passwordStrength === 'weak' && styles.strengthBarWeak,
                      (passwordStrength === 'medium' || passwordStrength === 'strong') && styles.strengthBarActive,
                      passwordStrength === 'strong' && styles.strengthBarStrong,
                    ]} />
                    <View style={[
                      styles.strengthBar,
                      (passwordStrength === 'medium' || passwordStrength === 'strong') && styles.strengthBarActive,
                      passwordStrength === 'strong' && styles.strengthBarStrong,
                    ]} />
                    <View style={[
                      styles.strengthBar,
                      passwordStrength === 'strong' && styles.strengthBarStrong,
                    ]} />
                  </View>
                </View>
              )}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#666', '#555'] : ['#00d9ff', '#ff1493']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Já tem uma conta? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.footerLink}>Entre</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.spacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Math.max(16, Dimensions.get('window').width * 0.05),
    paddingTop: Math.max(20, Dimensions.get('window').height * 0.04),
    paddingBottom: Math.max(20, Dimensions.get('window').height * 0.03),
  },
  
  // Header Styles
  header: {
    alignItems: 'center',
    marginBottom: Math.max(20, Dimensions.get('window').height * 0.05),
  },
  headerGradient: {
    width: Math.max(100, Dimensions.get('window').width * 0.25),
    height: Math.max(100, Dimensions.get('window').width * 0.25),
    borderRadius: Math.max(25, Dimensions.get('window').width * 0.07),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Math.max(16, Dimensions.get('window').height * 0.03),
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  headerImage: {
    width: Math.max(80, Dimensions.get('window').width * 0.2),
    height: Math.max(80, Dimensions.get('window').width * 0.2),
    borderRadius: Math.max(20, Dimensions.get('window').width * 0.05),
  },
  headerTitle: {
    fontSize: Math.max(28, Dimensions.get('window').width * 0.09),
    fontWeight: '900',
    color: '#fff',
    marginBottom: Math.max(4, Dimensions.get('window').height * 0.01),
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: Math.max(13, Dimensions.get('window').width * 0.035),
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Form Container
  formContainer: {
    width: '100%',
  },

  // Error Banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: Math.max(12, Dimensions.get('window').width * 0.03),
    padding: Math.max(12, Dimensions.get('window').width * 0.03),
    marginBottom: Math.max(16, Dimensions.get('window').height * 0.03),
    gap: 12,
  },
  errorText: {
    color: '#ff4444',
    fontSize: Math.max(12, Dimensions.get('window').width * 0.035),
    fontWeight: '600',
    flex: 1,
  },

  // Input Group
  inputGroup: {
    marginBottom: Math.max(16, Dimensions.get('window').height * 0.03),
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Math.max(6, Dimensions.get('window').height * 0.01),
  },
  inputLabel: {
    fontSize: Math.max(13, Dimensions.get('window').width * 0.035),
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  checkingText: {
    fontSize: Math.max(11, Dimensions.get('window').width * 0.03),
    color: '#FF9500',
    fontWeight: '600',
  },
  availableText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  takenText: {
    fontSize: 12,
    color: '#ff4444',
    fontWeight: '600',
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  strengthLabelWeak: {
    color: '#ff4444',
  },
  strengthLabelMedium: {
    color: '#FF9500',
  },
  strengthLabelStrong: {
    color: '#34C759',
  },

  // Input Container
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: Math.max(12, Dimensions.get('window').width * 0.03),
    paddingLeft: Math.max(12, Dimensions.get('window').width * 0.03),
    paddingRight: 4,
    height: Math.max(48, Dimensions.get('window').height * 0.07),
    transition: 'all 0.3s ease',
  },
  inputSuccess: {
    borderColor: '#34C759',
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
  },
  inputError: {
    borderColor: '#ff4444',
    backgroundColor: 'rgba(255, 68, 68, 0.08)',
  },
  input: {
    flex: 1,
    marginLeft: Math.max(8, Dimensions.get('window').width * 0.02),
    fontSize: Math.max(14, Dimensions.get('window').width * 0.04),
    color: '#fff',
    fontWeight: '500',
    padding: 0,
  },

  // Suggestions
  suggestionsContainer: {
    marginTop: Math.max(8, Dimensions.get('window').height * 0.01),
    paddingHorizontal: Math.max(10, Dimensions.get('window').width * 0.03),
    paddingVertical: Math.max(8, Dimensions.get('window').height * 0.01),
    backgroundColor: 'rgba(0, 217, 255, 0.08)',
    borderRadius: Math.max(10, Dimensions.get('window').width * 0.03),
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  suggestionsTitle: {
    fontSize: Math.max(11, Dimensions.get('window').width * 0.03),
    fontWeight: '700',
    color: '#00d9ff',
    marginBottom: Math.max(6, Dimensions.get('window').height * 0.01),
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Math.max(6, Dimensions.get('window').width * 0.02),
  },
  suggestionChip: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    paddingHorizontal: Math.max(10, Dimensions.get('window').width * 0.03),
    paddingVertical: Math.max(6, Dimensions.get('window').height * 0.01),
    borderRadius: Math.max(10, Dimensions.get('window').width * 0.02),
  },
  suggestionText: {
    color: '#00d9ff',
    fontSize: Math.max(11, Dimensions.get('window').width * 0.03),
    fontWeight: '700',
  },

  // Password Strength
  strengthBarsContainer: {
    marginTop: Math.max(6, Dimensions.get('window').height * 0.01),
  },
  strengthBars: {
    flexDirection: 'row',
    gap: Math.max(4, Dimensions.get('window').width * 0.01),
  },
  strengthBar: {
    flex: 1,
    height: Math.max(4, Dimensions.get('window').height * 0.005),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  strengthBarWeak: {
    backgroundColor: '#ff4444',
  },
  strengthBarActive: {
    backgroundColor: '#FF9500',
  },
  strengthBarStrong: {
    backgroundColor: '#34C759',
  },

  // Button
  button: {
    borderRadius: Math.max(14, Dimensions.get('window').width * 0.04),
    overflow: 'hidden',
    marginTop: Math.max(8, Dimensions.get('window').height * 0.02),
    marginBottom: Math.max(16, Dimensions.get('window').height * 0.03),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: Math.max(14, Dimensions.get('window').height * 0.02),
    paddingHorizontal: Math.max(16, Dimensions.get('window').width * 0.04),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: Math.max(15, Dimensions.get('window').width * 0.04),
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Footer
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Math.max(12, Dimensions.get('window').height * 0.02),
    paddingVertical: Math.max(8, Dimensions.get('window').height * 0.01),
  },
  footerText: {
    fontSize: Math.max(13, Dimensions.get('window').width * 0.035),
    color: '#8E8E93',
    fontWeight: '500',
  },
  footerLink: {
    fontSize: Math.max(13, Dimensions.get('window').width * 0.035),
    color: '#00d9ff',
    fontWeight: '800',
  },

  spacer: {
    height: Math.max(12, Dimensions.get('window').height * 0.02),
  },
});
