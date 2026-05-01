import { useState } from 'react';
import { Tabs } from 'expo-router';
import { Home, MapPin, PlusCircle, Compass, UserCircle2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedTabBar } from '@/components/AnimatedTabBar';

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
  const { accent, isDark, backgroundSecondary, textPrimary } = useTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: isDark ? '#8E8E93' : '#666666',
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(26, 26, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderTopWidth: 0,
          height: 65,
          paddingBottom: 8,
          paddingTop: 10,
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          borderRadius: 30,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.4 : 0.1,
          shadowRadius: 15,
          borderWidth: isDark ? 1 : 0,
          borderColor: 'rgba(255,255,255,0.08)',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, size }) => <MapPin size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Criar',
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ color }) => (
            <View style={{
              backgroundColor: accent,
              width: 48,
              height: 48,
              borderRadius: 24,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 5,
              shadowColor: accent,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 10,
              borderWidth: 3,
              borderColor: isDark ? '#1a1a1a' : '#fff',
            }}>
              <PlusCircle size={28} color="#fff" />
            </View>
          ),
          tabBarLabel: () => null, // Ocultar label do botão central
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categorias',
          tabBarIcon: ({ color, size }) => <Compass size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <ProfileIcon focused={focused} avatarUrl={profile?.avatar_url} />
          ),
        }}
      />
      {/* Rotas ocultas — acessíveis mas sem aba na navbar */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
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
  },
  avatarWrapActive: {
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
