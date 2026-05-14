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
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
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
        if (error) throw error;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
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

  const signUp = async (email: string, password: string, username: string, fullName: string) => {
    try {
      if (!supabase) return { error: { message: 'Supabase não está configurado.' } };
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, full_name: fullName } }
      });
      if (authError) return { error: authError };
      return { error: null };
    } catch (error: any) {
      return { error: { message: error?.message || 'Erro ao criar conta' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (!supabase) return { error: { message: 'Supabase não está configurado.' } };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
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
          
          // Extrair tokens da URL (formato fragmento # ou query ?)
          const url = result.url.replace('#', '?');
          const params = Linking.parse(url);
          
          const accessToken = params.queryParams?.access_token as string;
          const refreshToken = params.queryParams?.refresh_token as string;

          if (accessToken && refreshToken) {
            console.log('Tokens encontrados! Definindo sessão...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
            console.log('Sessão definida com sucesso!');
          } else {
            console.warn('Nenhum token encontrado na URL de retorno.');
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
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signOut,
        refreshProfile,
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
