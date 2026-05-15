import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Home, Radio, PlusCircle, LayoutGrid, UserCircle2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedTabBar } from '@/components/AnimatedTabBar';
import { reputationService } from '@/services/reputationService';

function ProfileIcon({ focused, avatarUrl }: { focused: boolean; avatarUrl?: string | null }) {
  const [error, setError] = useState(false);
  const { accent } = useTheme();
  
  if (avatarUrl && !error) {
    return (
      <View style={[tabStyles.avatarWrap, focused && { borderColor: accent }]}>
        <Image 
          source={{ uri: avatarUrl }} 
          style={tabStyles.avatarImg} 
          onError={() => setError(true)}
        />
      </View>
    );
  }
  return (
    <View style={[tabStyles.avatarWrap, focused && { borderColor: accent }]}>
      <LinearGradient
        colors={focused ? ['#00d9ff', '#ff1493'] : ['#2a2a3a', '#3a3a4a']}
        style={tabStyles.avatarFallback}
      >
        <UserCircle2 size={16} color="#fff" />
      </LinearGradient>
    </View>
  );
}

export default function TabLayout() {
  const { accent, isDark } = useTheme();
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.id) {
      // Tenta realizar o check-in automático ao carregar as abas
      reputationService.checkAutomaticPresence(profile.id);
    }
  }, [profile?.id]);

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Home size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Ao Vivo',
          tabBarIcon: ({ color }) => <Radio size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Criar',
          tabBarStyle: { display: 'none' },
          tabBarIcon: () => <PlusCircle size={28} color="#fff" strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categorias',
          tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} strokeWidth={2.5} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <ProfileIcon focused={focused} avatarUrl={profile?.avatar_url} />
          ),
        }}
      />
    </Tabs>

  );
}

const tabStyles = StyleSheet.create({
  avatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
