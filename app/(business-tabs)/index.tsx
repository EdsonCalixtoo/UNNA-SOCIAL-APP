import { useLanguage } from '@/lib/i18n';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CalendarPlus, TrendingUp, Users, Heart, Calendar, Briefcase, Gift, Bell, ChevronRight, BarChart2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { vs, s, ms } from '@/utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

export default function BusinessDashboard() {
  const { t } = useLanguage();
  const router = useRouter();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ events: 0, likes: 0, views: 0 });

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('creator_id', user?.id);

      if (events) {
        let totalLikes = 0;
        
        for (const event of events) {
          const { count } = await supabase
            .from('event_likes')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id);
          totalLikes += count || 0;
        }

        setStats({
          events: events.length,
          likes: totalLikes,
          views: 0
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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
          <Briefcase size={24} color={accent} />
          <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('auto.s75133848', 'UNNA Business')}</Text>
        </View>
        <TouchableOpacity style={styles.headerAvatar} onPress={() => router.push('/(business-tabs)/profile')}>
           {user?.user_metadata?.avatar_url ? (
             <Animated.Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatarImage} />
           ) : (
             <View style={[styles.avatarFallback, { backgroundColor: accent }]}>
               <Text style={styles.avatarText}>{user?.user_metadata?.username?.charAt(0).toUpperCase() || 'B'}</Text>
             </View>
           )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* OVERVIEW SECTION */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t('auto.scd28583c', 'Visão Geral')}</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={styles.statHeaderRow}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(0, 217, 255, 0.1)' }]}>
                  <Calendar size={18} color="#00d9ff" />
                </View>
                <TrendingUp size={16} color="#34C759" />
              </View>
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.events}</Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>{t('auto.s650952fb', 'Eventos Ativos')}</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={styles.statHeaderRow}>
                <View style={[styles.statIconWrap, { backgroundColor: 'rgba(255, 20, 147, 0.1)' }]}>
                  <Heart size={18} color="#ff1493" />
                </View>
                <TrendingUp size={16} color="#34C759" />
              </View>
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.likes}</Text>
              <Text style={[styles.statLabel, { color: textSecondary }]}>{t('auto.s7b631940', 'Engajamento')}</Text>
            </View>
          </View>
        </Animated.View>

        {/* QUICK ACTIONS */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>{t('auto.s67e999fa', 'Ações Rápidas')}</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/business/create')} activeOpacity={0.8}>
              <LinearGradient colors={['#00d9ff', '#ff1493']} style={styles.quickActionGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
                <CalendarPlus size={24} color="#fff" />
              </LinearGradient>
              <Text style={[styles.quickActionText, { color: textPrimary }]}>{t('auto.s10f70799', 'Novo Evento')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/(business-tabs)/promotions')} activeOpacity={0.8}>
              <LinearGradient colors={['#FF9500', '#FF3B30']} style={styles.quickActionGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
                <Gift size={24} color="#fff" />
              </LinearGradient>
              <Text style={[styles.quickActionText, { color: textPrimary }]}>{t('auto.sbb5be1f6', 'Promoções')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionBtn} onPress={() => router.push('/(business-tabs)/marketing')} activeOpacity={0.8}>
              <LinearGradient colors={['#7b2fff', '#ff1493']} style={styles.quickActionGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
                <Bell size={24} color="#fff" />
              </LinearGradient>
              <Text style={[styles.quickActionText, { color: textPrimary }]}>{t('auto.s13ab7961', 'Avisos Push')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>

        {/* PERFORMANCE CHART MOCK */}
        <Animated.View entering={FadeInDown.delay(300)} style={[styles.performanceCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
           <View style={styles.perfHeader}>
             <View>
               <Text style={[styles.perfTitle, { color: textPrimary }]}>{t('auto.s2dd32c8d', 'Performance Semanal')}</Text>
               <Text style={[styles.perfSubtitle, { color: textSecondary }]}>{t('auto.s8e37c800', 'Visualizações do seu perfil e eventos')}</Text>
             </View>
             <BarChart2 size={24} color={accent} />
           </View>
           
           <View style={styles.chartMock}>
             {[40, 70, 45, 90, 60, 100, 85].map((height, i) => (
               <View key={i} style={styles.chartBarWrapper}>
                 <Animated.View entering={FadeInDown.delay(300 + (i*50))} style={[styles.chartBar, { height: `${height}%` as any, backgroundColor: accent }]} />
               </View>
             ))}
           </View>
           <View style={styles.chartLabels}>
             {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => (
               <Text key={i} style={[styles.chartLabelText, { color: textSecondary }]}>{day}</Text>
             ))}
           </View>
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
    gap: 8,
  },
  headerTitle: {
    fontSize: ms(20),
    fontWeight: '800',
  },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  scrollContent: { padding: s(16), paddingBottom: vs(100) },
  sectionTitle: { fontSize: ms(18), fontWeight: '800', marginBottom: vs(12) },
  sectionContainer: { marginBottom: vs(24) },
  statsGrid: { flexDirection: 'row', gap: s(12), marginBottom: vs(24) },
  statCard: { flex: 1, padding: ms(16), borderRadius: ms(20), borderWidth: 1, alignItems: 'flex-start' },
  statHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: vs(12) },
  statIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: ms(28), fontWeight: '900', marginBottom: vs(2) },
  statLabel: { fontSize: ms(13), fontWeight: '600' },
  
  quickActionsScroll: { gap: s(16), paddingRight: s(16) },
  quickActionBtn: { alignItems: 'center', width: 72 },
  quickActionGradient: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: vs(8) },
  quickActionText: { fontSize: ms(12), fontWeight: '600', textAlign: 'center' },

  performanceCard: { padding: ms(20), borderRadius: ms(24), borderWidth: 1 },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vs(24) },
  perfTitle: { fontSize: ms(16), fontWeight: '800', marginBottom: 4 },
  perfSubtitle: { fontSize: ms(12), fontWeight: '500' },
  chartMock: { height: 120, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 4 },
  chartBarWrapper: { width: 12, height: '100%', justifyContent: 'flex-end', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 6 },
  chartBar: { width: '100%', borderRadius: 6 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 4 },
  chartLabelText: { fontSize: ms(12), fontWeight: '600' }
});
