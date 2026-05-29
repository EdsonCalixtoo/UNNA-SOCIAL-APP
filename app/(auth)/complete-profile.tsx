import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, AtSign, Check, Sparkles, ArrowRight, AlertCircle, Camera } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function CompleteProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  
  // Puxa dados do Google User Metadata
  const googlePhoto = user?.user_metadata?.avatar_url;
  const googleName = user?.user_metadata?.full_name;

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState(googleName || '');
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Se o perfil já estiver completo, pula esta página
    // Let AuthGuard handle the redirect based on profile type

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [profile]);

  // Sugere username baseado no email ou nome
  useEffect(() => {
    if (user?.email && !username) {
      const baseSuggestion = googleName 
        ? googleName.toLowerCase().replace(/\s+/g, '_') 
        : user.email.split('@')[0];
      
      const suggestion = baseSuggestion.replace(/[^a-z0-9_]/g, '').slice(0, 15);
      setUsername(suggestion);
    }
  }, [user]);

  useEffect(() => {
    if (username.length >= 3) {
      const timer = setTimeout(() => {
        checkUsernameAvailability();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setUsernameStatus('idle');
    }
  }, [username]);

  const checkUsernameAvailability = async () => {
    if (username.length < 3) return;
    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setUsernameStatus('invalid');
      } else {
        setUsernameStatus('valid');
        Animated.sequence([
          Animated.timing(statusAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
          Animated.timing(statusAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
      }
    } catch (err) {
      console.error('Error checking username:', err);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleComplete = async () => {
    if (usernameStatus !== 'valid') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Por favor, escolha um nome de usuário disponível');
      return;
    }

    if (!fullName.trim()) {
      setError('O nome completo é obrigatório');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          username: username.toLowerCase(),
          full_name: fullName,
          avatar_url: googlePhoto || null,
          updated_at: new Date().toISOString(),
          onboarding_completed: false, // Mantém como falso para ele passar pelas categorias agora
        });

      if (updateError) throw updateError;

      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(auth)/onboarding');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar perfil');
      setLoading(false);
    }
  };

  const sp = (size: number) => Math.max(size * 0.8, Math.min(size, height * (size / 844)));
  const fs = (size: number) => Math.max(size * 0.85, Math.min(size, width * (size / 390)));

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050505', '#0f0f18']} style={StyleSheet.absoluteFill} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[styles.scroll, { paddingTop: sp(60) }]}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            
            {/* Avatar Preview (Premium) */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                {googlePhoto ? (
                  <Image source={{ uri: googlePhoto }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User size={40} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
                <LinearGradient
                  colors={['#00d9ff', '#0055ff']}
                  style={styles.avatarBadge}
                >
                  <Check size={14} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.avatarHint}>Foto puxada do Google ✨</Text>
            </View>
            
            <Text style={[styles.title, { fontSize: fs(28) }]}>Boas-vindas, {fullName.split(' ')[0]}!</Text>
            <Text style={[styles.subtitle, { fontSize: fs(15) }]}>
              Escolha um nome de usuário único para começar sua jornada na UNNA.
            </Text>

            <View style={styles.form}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>NOME COMPLETO</Text>
                <View style={styles.inputWrapper}>
                  <User size={20} color="rgba(255,255,255,0.3)" />
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>
              </View>

              {/* Username */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>NOME DE USUÁRIO (@)</Text>
                <View style={[
                  styles.inputWrapper, 
                  usernameStatus === 'valid' && styles.inputWrapperValid,
                  usernameStatus === 'invalid' && styles.inputWrapperInvalid
                ]}>
                  <AtSign size={20} color={usernameStatus === 'valid' ? '#00d9ff' : 'rgba(255,255,255,0.3)'} />
                  <TextInput
                    style={styles.input}
                    placeholder="ex: pedro_unna"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={username}
                    onChangeText={(val) => setUsername(val.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    autoCapitalize="none"
                    maxLength={20}
                  />
                  {checkingUsername && <ActivityIndicator size="small" color="#00d9ff" style={styles.statusIcon} />}
                  {usernameStatus === 'valid' && (
                    <Animated.View style={{ transform: [{ scale: statusAnim }] }}>
                      <Check size={20} color="#00d9ff" style={styles.statusIcon} />
                    </Animated.View>
                  )}
                  {usernameStatus === 'invalid' && <AlertCircle size={20} color="#ff3b30" style={styles.statusIcon} />}
                </View>
                {usernameStatus === 'invalid' && (
                  <Text style={styles.errorHint}>Este nome de usuário já está em uso.</Text>
                )}
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity 
                style={[styles.button, (loading || usernameStatus !== 'valid') && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={loading || usernameStatus !== 'valid'}
              >
                <LinearGradient
                  colors={usernameStatus === 'valid' ? ['#00d9ff', '#0055ff'] : ['#222', '#111']}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>CRIAR MEU PERFIL</Text>
                      <ArrowRight size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  scroll: {
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#00d9ff',
    padding: 3,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#050505',
  },
  avatarHint: {
    marginTop: 12,
    fontSize: 12,
    color: 'rgba(0, 217, 255, 0.6)',
    fontWeight: '700',
  },
  title: {
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    maxWidth: '90%',
  },
  form: {
    width: '100%',
    marginTop: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: '#00d9ff',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 64,
  },
  inputWrapperValid: {
    borderColor: 'rgba(0, 217, 255, 0.5)',
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
  },
  inputWrapperInvalid: {
    borderColor: 'rgba(255, 59, 48, 0.5)',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  statusIcon: {
    marginLeft: 8,
  },
  errorHint: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 12,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  errorText: {
    color: '#ff3b30',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
