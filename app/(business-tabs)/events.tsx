import { useLanguage } from '@/lib/i18n';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CalendarPlus, Calendar } from 'lucide-react-native';
import { vs, s, ms } from '@/utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export default function BusinessEvents() {
  const { t } = useLanguage();
  const router = useRouter();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadEvents();
  }, [user]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', user?.id)
        .order('created_at', { ascending: false });

      if (events) {
        setRecentEvents(events);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventPress = (event: any) => {
    Alert.alert(
      'Opções do Evento',
      'O que você deseja fazer com este evento?',
      [
        { text: 'Visualizar / Editar', onPress: () => router.push(`/event/${event.id}`) },
        { 
          text: 'Gerar Link VIP / Cupom', 
          onPress: async () => {
             const message = `✨ Lista VIP / Cupom para o evento *${event.title}*!\n\nGaranta sua entrada clicando no link abaixo:\nhttps://unna.app/vip/${event.id}`;
             await Clipboard.setStringAsync(message);
             Alert.alert('Sucesso!', 'Mensagem promocional com link VIP copiada. Cole no Instagram ou WhatsApp para a galera!');
          }
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: backgroundPrimary, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + vs(10), backgroundColor: backgroundSecondary, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('auto.s3a02fe23', 'Meus Eventos')}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/business/create')} style={styles.headerBtn}>
          <CalendarPlus size={24} color={accent} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* RECENT EVENTS */}
        <Animated.View entering={FadeInDown.delay(100)}>
          {recentEvents.length > 0 ? (
            recentEvents.map((event) => (
              <TouchableOpacity 
                key={event.id}
                style={[styles.eventRow, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
                onPress={() => handleEventPress(event)}
              >
                <View style={styles.eventInfo}>
                  <Text style={[styles.eventTitle, { color: textPrimary }]} numberOfLines={1}>{event.title}</Text>
                  <Text style={[styles.eventDate, { color: textSecondary }]}>
                    {event.event_date ? new Date(event.event_date).toLocaleDateString('pt-BR') : 'Sem data'}
                  </Text>
                </View>
                <View style={[styles.eventStatus, { backgroundColor: event.status === 'ao_vivo' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 255, 255, 0.05)' }]}>
                  <Text style={[styles.eventStatusText, { color: event.status === 'ao_vivo' ? '#34C759' : textSecondary }]}>
                    {event.status === 'ao_vivo' ? 'Ativo' : 'Finalizado'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Calendar size={48} color={textSecondary} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyText, { color: textPrimary }]}>{t('auto.s544c5d0c', 'Nenhum evento criado.')}</Text>
              <Text style={[styles.emptySubText, { color: textSecondary }]}>{t('auto.sa3db4ef8', 'Clique no botão de + acima para criar o seu primeiro evento e começar a vender!')}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    paddingBottom: vs(12),
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: ms(20),
    fontWeight: '800',
  },
  headerBtn: {
    padding: 8,
  },
  scrollContent: {
    padding: s(16),
    paddingBottom: vs(100),
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(16),
    borderRadius: ms(12),
    borderWidth: 1,
    marginBottom: vs(8),
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: ms(15),
    fontWeight: '600',
    marginBottom: vs(4),
  },
  eventDate: {
    fontSize: ms(13),
  },
  eventStatus: {
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    borderRadius: ms(12),
  },
  eventStatusText: {
    fontSize: ms(12),
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: vs(60),
    padding: s(20),
  },
  emptyText: {
    fontSize: ms(18),
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: ms(14),
    textAlign: 'center',
    lineHeight: 20,
  }
});
