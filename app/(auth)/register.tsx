import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
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
    <LinearGradient
      colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image
                source={require('@/assets/images/icone.jpg')}
                style={styles.logoImage}
              />
            </View>
            <Text style={styles.welcomeText}>Criar Conta</Text>
            <Text style={styles.subtitle}>Junte-se a nós e descubra eventos incríveis</Text>
          </View>

          <View style={styles.formContainer}>
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputWrapper}>
              <View style={styles.inputIconContainer}>
                <User size={20} color="#00d9ff" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nome Completo"
                placeholderTextColor="#888"
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
              />
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputIconContainer}>
                <AtSign size={20} color="#ff1493" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nome de Usuário"
                placeholderTextColor="#888"
                value={username}
                onChangeText={(txt) => setUsername(sanitize(txt))}
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            {/* Username status and suggestions */}
            <View style={styles.usernameStatusRow}>
              {checkingUsername ? (
                <Text style={styles.usernameChecking}>Verificando disponibilidade...</Text>
              ) : usernameAvailable === true ? (
                <Text style={styles.usernameAvailable}>@{username} disponível</Text>
              ) : usernameAvailable === false ? (
                <Text style={styles.usernameTaken}>@{username} já está em uso</Text>
              ) : null}
            </View>

            {suggestions.length > 0 && (
              <View style={styles.suggestionsRow}>
                <Text style={styles.suggestionsLabel}>Sugestões:</Text>
                <View style={styles.suggestionsList}>
                  {suggestions.map((s) => (
                    <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => setUsername(s)}>
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.inputWrapper}>
              <View style={styles.inputIconContainer}>
                <Mail size={20} color="#00d9ff" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#888"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIconContainer}>
                  <Lock size={20} color="#ff1493" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Senha (mínimo 6 caracteres)"
                  placeholderTextColor="#888"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>
              {passwordStrength && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.strengthBars}>
                    <View style={[
                      styles.strengthBar,
                      passwordStrength === 'weak' && styles.strengthBarWeak,
                      passwordStrength === 'medium' && styles.strengthBarMedium,
                      passwordStrength === 'strong' && styles.strengthBarStrong,
                    ]} />
                    <View style={[
                      styles.strengthBar,
                      (passwordStrength === 'medium' || passwordStrength === 'strong') && styles.strengthBarMedium,
                      passwordStrength === 'strong' && styles.strengthBarStrong,
                    ]} />
                    <View style={[
                      styles.strengthBar,
                      passwordStrength === 'strong' && styles.strengthBarStrong,
                    ]} />
                  </View>
                  <View style={styles.strengthTextContainer}>
                    <AlertCircle size={14} color={
                      passwordStrength === 'weak' ? '#ff4444' :
                      passwordStrength === 'medium' ? '#ffaa00' :
                      '#34C759'
                    } />
                    <Text style={[
                      styles.strengthText,
                      passwordStrength === 'weak' && styles.strengthTextWeak,
                      passwordStrength === 'medium' && styles.strengthTextMedium,
                      passwordStrength === 'strong' && styles.strengthTextStrong,
                    ]}>
                      Senha {passwordStrength === 'weak' ? 'Fraca' : passwordStrength === 'medium' ? 'Média' : 'Forte'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#00d9ff', '#ff1493']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Já tem uma conta? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.link}>Entre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00d9ff',
    overflow: 'hidden',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 20, 147, 0.1)',
    borderWidth: 1,
    borderColor: '#ff1493',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#ff1493',
    fontSize: 14,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIconContainer: {
    padding: 16,
  },
  input: {
    flex: 1,
    padding: 16,
    paddingLeft: 0,
    fontSize: 16,
    color: '#fff',
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
    color: '#aaa',
  },
  link: {
    fontSize: 15,
    color: '#00d9ff',
    fontWeight: 'bold',
  },
  passwordStrengthContainer: {
    marginTop: -8,
    marginBottom: 16,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
  },
  strengthBarWeak: {
    backgroundColor: '#ff4444',
  },
  strengthBarMedium: {
    backgroundColor: '#ffaa00',
  },
  strengthBarStrong: {
    backgroundColor: '#34C759',
  },
  strengthTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strengthText: {
    fontSize: 13,
    fontWeight: '600',
  },
  strengthTextWeak: {
    color: '#ff4444',
  },
  strengthTextMedium: {
    color: '#ffaa00',
  },
  strengthTextStrong: {
    color: '#34C759',
  },
  usernameStatusRow: {
    marginBottom: 8,
  },
  usernameChecking: {
    color: '#aaa',
    fontSize: 13,
  },
  usernameAvailable: {
    color: '#34C759',
    fontSize: 13,
    fontWeight: '600',
  },
  usernameTaken: {
    color: '#ff4444',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionsRow: {
    marginBottom: 12,
  },
  suggestionsLabel: {
    color: '#aaa',
    marginBottom: 6,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 13,
  },
});
