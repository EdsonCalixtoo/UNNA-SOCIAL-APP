import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MessageCircle, Heart, UserPlus, Calendar, Bell, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function NotificationSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    new_messages: true,
    likes: true,
    comments: true,
    new_followers: true,
    event_reminders: true,
    event_invites: true,
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings({
          new_messages: data.new_messages,
          likes: data.likes,
          comments: data.comments,
          new_followers: data.new_followers,
          event_reminders: data.event_reminders,
          event_invites: data.event_invites,
        });
      } else {
        // Se não existir, cria o registro inicial
        await supabase.from('notification_settings').insert({ user_id: user.id });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: keyof typeof settings) => {
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));
    
    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({ [key]: newValue })
        .eq('user_id', user?.id);
      
      if (error) throw error;
    } catch (error) {
      // Reverter em caso de erro
      setSettings(prev => ({ ...prev, [key]: !newValue }));
      Alert.alert('Erro', 'Não foi possível salvar sua preferência.');
    }
  };

  const SettingItem = ({ icon: Icon, title, description, value, onToggle, color }: any) => (
    <View style={[styles.settingItem, { backgroundColor: backgroundSecondary }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Icon size={22} color={color} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, { color: textPrimary }]}>{title}</Text>
        <Text style={[styles.settingDescription, { color: textSecondary }]}>{description}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onToggle}
        trackColor={{ true: accent }}
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: backgroundPrimary }]}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: backgroundSecondary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Notificações</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>MENSAGENS E INTERAÇÕES</Text>
          
          <SettingItem 
            icon={MessageCircle}
            title="Novas Mensagens"
            description="Receba avisos de mensagens privadas"
            value={settings.new_messages}
            onToggle={() => toggleSetting('new_messages')}
            color="#00d9ff"
          />
          
          <SettingItem 
            icon={Heart}
            title="Curtidas"
            description="Quando alguém curte seus posts ou stories"
            value={settings.likes}
            onToggle={() => toggleSetting('likes')}
            color="#ff1493"
          />
          
          <SettingItem 
            icon={Bell}
            title="Comentários"
            description="Avisar sobre novos comentários"
            value={settings.comments}
            onToggle={() => toggleSetting('comments')}
            color="#34C759"
          />

          <SettingItem 
            icon={UserPlus}
            title="Novos Seguidores"
            description="Quando alguém começa a te seguir"
            value={settings.new_followers}
            onToggle={() => toggleSetting('new_followers')}
            color="#AF52DE"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textSecondary }]}>EVENTOS</Text>
          
          <SettingItem 
            icon={Calendar}
            title="Lembretes de Eventos"
            description="Avisos sobre eventos que você vai participar"
            value={settings.event_reminders}
            onToggle={() => toggleSetting('event_reminders')}
            color="#FF9500"
          />
          
          <SettingItem 
            icon={Bell}
            title="Convites"
            description="Quando alguém te convida para um evento"
            value={settings.event_invites}
            onToggle={() => toggleSetting('event_invites')}
            color="#5856D6"
          />
        </View>

        <TouchableOpacity 
          style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.02)', borderColor: 'rgba(0, 217, 255, 0.1)' }]}
          onPress={() => Alert.alert('Dica', 'Você também pode gerenciar permissões detalhadas nas configurações do seu aparelho.')}
        >
          <Bell size={20} color={accent} />
          <Text style={[styles.infoText, { color: textSecondary }]}>
            As notificações push ajudam você a ficar por dentro de tudo o que acontece no UNNA.
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  scrollContent: { padding: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginBottom: 15, marginLeft: 5 },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: { flex: 1, marginRight: 10 },
  settingTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  settingDescription: { fontSize: 13, opacity: 0.7 },
  infoCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 15,
    marginTop: 10,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
