import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (method: 'email' | 'phone', identifier: string, password: string, username: string, fullName: string, accountType?: string, language?: string) => Promise<{ error: any; sessionCreated?: boolean }>;
  verifyOtp: (identifier: string, token: string, method?: 'email' | 'phone') => Promise<{ error: any }>;
  resendOtp: (identifier: string, method?: 'email' | 'phone') => Promise<{ error: any }>;
  verifyResetOtp: (email: string, token: string) => Promise<{ error: any }>;
  getUserEmailByUsername: (usernameOrEmail: string) => Promise<string | null>;
  signIn: (identifier: string, password: string, method?: 'email' | 'phone') => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      setLoading(false);
      return;
    }

    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const initAuth = async () => {
      try {
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('Session check timeout');
            setLoading(false);
          }
        }, 5000);

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (timeoutId) clearTimeout(timeoutId);

        if (!isMounted) return;
        
        if (error) {
          if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid Refresh Token') || error.message?.includes('refresh_token')) {
            console.log('Sessão antiga ou inválida detectada, limpando armazenamento local...');
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
          throw error;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error: any) {
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid Refresh Token') || error?.message?.includes('refresh_token')) {
          console.warn('Session refresh token expired/invalid, starting clean logged-out state.');
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          if (isMounted) {
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
        } else {
          console.error('Error getting session:', error);
          if (isMounted) setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      (async () => {
        if (session?.user) {
          setLoading(true);
          setSession(session);
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const signUp = async (method: 'email' | 'phone', identifier: string, password: string, username: string, fullName: string, accountType: string = 'user', language?: string) => {
    try {
      if (!supabase) return { error: { message: 'Supabase não está configurado.' } };
      
      const options = { 
        data: { username, full_name: fullName, account_type: accountType },
        emailRedirectTo: 'https://unnasocialapp.com/sucesso'
      };

      if (method === 'phone') {
        (options.data as any).phone_number = identifier;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp(
        method === 'email'
          ? { email: identifier, password, options }
          : { phone: identifier, password, options }
      );
      if (authError) return { error: authError };
      if (authData.user && language) {
        await supabase.from('profiles').update({
          preferred_language: language,
        }).eq('id', authData.user.id);
      }
      return { error: null, sessionCreated: !!authData.session };
    } catch (error: any) {
      return { error: { message: error?.message || 'Erro ao criar conta' } };
    }
  };

  const getUserEmailByUsername = async (usernameOrEmail: string): Promise<string | null> => {
    // If it looks like an email, return as-is
    if (usernameOrEmail.includes('@')) return usernameOrEmail;
    try {
      if (!supabase) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', usernameOrEmail.toLowerCase().trim())
        .maybeSingle();
      if (error || !data) return null;
      return data.email;
    } catch {
      return null;
    }
  };

  const verifyOtp = async (identifier: string, token: string, method: 'email' | 'phone' = 'email') => {
    try {
      if (!supabase) return { error: { message: 'Supabase não está configurado.' } };
      const { error } = await supabase.auth.verifyOtp(
        method === 'email'
          ? { email: identifier, token, type: 'signup' }
          : { phone: identifier, token, type: 'sms' }
      );
      return { error };
    } catch (error: any) {
      return { error: { message: error?.message || 'Erro ao verificar código' } };
    }
  };

  const resendOtp = async (identifier: string, method: 'email' | 'phone' = 'email') => {
    try {
      if (!supabase) return { error: { message: 'Supabase não está configurado.' } };
      const payload = method === 'email' 
        ? { type: 'signup' as const, email: identifier } 
        : { type: 'sms' as const, phone: identifier };
      const { error } = await supabase.auth.resend(payload);
      return { error };
    } catch (error: any) {
      return { error: { message: error?.message || 'Erro ao reenviar código' } };
    }
  };

  const verifyResetOtp = async (email: string, token: string) => {
    try {
      if (!supabase) return { error: { message: 'Supabase não está configurado.' } };
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'recovery' });
      return { error };
    } catch (error: any) {
      return { error: { message: error?.message || 'Erro ao verificar código' } };
    }
  };

  const signIn = async (identifier: string, password: string, method: 'email' | 'phone' = 'email') => {
    try {
      if (!supabase) return { error: { message: 'Supabase não está configurado.' } };
      const { error } = await supabase.auth.signInWithPassword(
        method === 'email' 
          ? { email: identifier, password }
          : { phone: identifier, password }
      );
      return { error };
    } catch (error: any) {
      return { error: { message: error?.message || 'Erro ao fazer login' } };
    }
  };

  const signInWithGoogle = async () => {
    try {
      if (!supabase) return { error: { message: 'Supabase não está configurado.' } };

      const redirectUrl = Linking.createURL('(auth)/login', { scheme: 'unna-social-app' });
      console.log('--- LOGIN GOOGLE INICIADO ---');
      console.log('URL de Redirecionamento esperada:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        }
      });

      if (error) throw error;

      if (data?.url) {
        console.log('Abrindo navegador para:', data.url);
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        console.log('Resultado do WebBrowser:', result.type);

        if (result.type === 'success' && result.url) {
          console.log('URL de retorno recebida:', result.url);
          
          const urlStr = result.url;
          
          let code = null;
          let accessToken = null;
          let refreshToken = null;

          const codeMatch = urlStr.match(/[?&#]code=([^&#]+)/);
          if (codeMatch) code = codeMatch[1];
          
          const accessMatch = urlStr.match(/[?&#]access_token=([^&#]+)/);
          if (accessMatch) accessToken = accessMatch[1];
          
          const refreshMatch = urlStr.match(/[?&#]refresh_token=([^&#]+)/);
          if (refreshMatch) refreshToken = refreshMatch[1];
          
          const errorMatch = urlStr.match(/[?&#]error=([^&#]+)/);
          const errorDescMatch = urlStr.match(/[?&#]error_description=([^&#]+)/);

          if (errorMatch) {
             const errorDesc = errorDescMatch ? decodeURIComponent(errorDescMatch[1].replace(/\+/g, ' ')) : 'Erro desconhecido';
             throw new Error(`Erro do provedor: ${errorDesc}`);
          }

          if (code) {
            console.log('Código PKCE encontrado! Trocando por sessão...');
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            if (sessionError) throw sessionError;
            console.log('Sessão definida com sucesso via PKCE!');
          } else if (accessToken && refreshToken) {
            console.log('Tokens encontrados! Definindo sessão...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
            console.log('Sessão definida com sucesso!');
          } else {
            throw new Error(`Sem tokens na URL: ${urlStr.substring(0, 100)}...`);
          }
        } else if (result.type === 'cancel') {
          console.log('Usuário cancelou o login.');
        }
      }

      return { error: null };
    } catch (error: any) {
      console.error('ERRO CRÍTICO NO LOGIN GOOGLE:', error);
      return { error: { message: error?.message || 'Erro ao fazer login com Google' } };
    }
  };

  const signInWithApple = async () => {
    try {
      if (!supabase) return { error: { message: 'Supabase não está configurado.' } };
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) throw error;
        return { error: null };
      } else {
        throw new Error('No identity token found');
      }
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        return { error: null };
      }
      return { error: { message: error?.message || 'Erro ao fazer login com Apple' } };
    }
  };

  const signOut = async () => {
    try {
      if (user?.id) {
        // Remove o push_token do banco antes de deslogar
        // Isso evita que o aparelho continue recebendo notificações desta conta
        const { error } = await supabase
          .from('profiles')
          .update({ push_token: null })
          .eq('id', user.id);
          
        if (error) {
          console.warn('Erro ao remover push_token no logout:', error);
        }
      }
      await supabase.auth.signOut();
    } catch (e: any) {
      console.warn('Error during global signOut, signing out locally:', e);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        verifyOtp,
        verifyResetOtp,
        getUserEmailByUsername,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signOut,
        refreshProfile,
        resendOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
