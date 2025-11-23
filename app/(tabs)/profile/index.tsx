import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl, Animated } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Event } from '@/types/database';
import { LogOut, Settings, Calendar, MapPin, Users, DollarSign, Sparkles, TrendingUp, Search } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback } from 'react';
import EventCard from '@/components/EventCard';

type TabType = 'created' | 'participating' | 'past';

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('created');
  const [events, setEvents] = useState<Event[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [eventsCount, setEventsCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user, activeTab]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadProfileData();
      }
    }, [user, activeTab])
  );

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [followersData, followingData, eventsData] = await Promise.all([
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', user?.id),

        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', user?.id),

        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', user?.id),
      ]);

      setFollowersCount(followersData.count || 0);
      setFollowingCount(followingData.count || 0);
      setEventsCount(eventsData.count || 0);

      await loadEvents();
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const loadEvents = async () => {
    try {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 0,
          useNativeDriver: true,
        }),
      ]).start();

      const today = new Date().toISOString().split('T')[0];

      if (activeTab === 'created') {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            categories:category_id (name, icon),
            subcategories:subcategory_id (name)
          `)
          .eq('creator_id', user?.id)
          .order('event_date', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } else if (activeTab === 'participating') {
        const { data, error } = await supabase
          .from('event_participants')
          .select(`
            event_id,
            events:event_id (
              *,
              categories:category_id (name, icon),
              subcategories:subcategory_id (name)
            )
          `)
          .eq('user_id', user?.id);

        if (error) throw error;
        const participatingEvents = data?.map((item: any) => item.events).filter(Boolean) || [];
        setEvents(participatingEvents);
      } else {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            categories:category_id (name, icon),
            subcategories:subcategory_id (name)
          `)
          .eq('creator_id', user?.id)
          .lt('event_date', today)
          .order('event_date', { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      }

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('Error loading events:', error);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00d9ff" />
        }
      >
        <LinearGradient
          colors={['#00d9ff', '#0097a7', '#1a1a1a']}
          style={styles.headerGradient}
        >
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push('/search-users')} style={styles.headerButton}>
              <Search size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile/edit')} style={styles.headerButton}>
              <Settings size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSignOut} style={styles.headerButton}>
              <LogOut size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={['#00d9ff', '#0097a7']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarText}>
                  {profile?.username?.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.verifiedBadge}>
              <Sparkles size={16} color="#fff" fill="#FFD60A" />
            </View>
          </View>

          <Text style={styles.fullName}>{profile?.full_name}</Text>
          <Text style={styles.username}>@{profile?.username}</Text>

          {profile?.bio && (
            <View style={styles.bioContainer}>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(0, 217, 255, 0.15)', 'rgba(0, 217, 255, 0.05)']}
                style={styles.statCardGradient}
              >
                <Calendar size={24} color="#00d9ff" />
                <Text style={styles.statValue}>{eventsCount}</Text>
                <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Eventos</Text>
              </LinearGradient>
            </View>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push(`/profile/${user?.id}/followers`)}
            >
              <LinearGradient
                colors={['rgba(255, 20, 147, 0.15)', 'rgba(255, 20, 147, 0.05)']}
                style={styles.statCardGradient}
              >
                <Users size={24} color="#ff1493" />
                <Text style={styles.statValue}>{followersCount}</Text>
                <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Seguidores</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push(`/profile/${user?.id}/following`)}
            >
              <LinearGradient
                colors={['rgba(52, 199, 89, 0.15)', 'rgba(52, 199, 89, 0.05)']}
                style={styles.statCardGradient}
              >
                <TrendingUp size={24} color="#34C759" />
                <Text style={styles.statValue}>{followingCount}</Text>
                <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Seguindo</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'created' && styles.activeTab]}
            onPress={() => setActiveTab('created')}
          >
            <Text style={[styles.tabText, activeTab === 'created' && styles.activeTabText]}>
              Meus Eventos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'participating' && styles.activeTab]}
            onPress={() => setActiveTab('participating')}
          >
            <Text style={[styles.tabText, activeTab === 'participating' && styles.activeTabText]}>
              Participando
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'past' && styles.activeTab]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
              Passados
            </Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.eventsSection, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }]}>
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['rgba(0, 217, 255, 0.1)', 'rgba(0, 217, 255, 0.02)']}
                style={styles.emptyStateCard}
              >
                <Calendar size={56} color="#00d9ff" strokeWidth={1.5} />
                <Text style={styles.emptyStateTitle}>
                  {activeTab === 'created' && 'Nenhum evento criado'}
                  {activeTab === 'participating' && 'Nenhuma participação'}
                  {activeTab === 'past' && 'Nenhum evento passado'}
                </Text>
                <Text style={styles.emptyStateText}>
                  {activeTab === 'created' && 'Crie seu primeiro evento e compartilhe com a comunidade'}
                  {activeTab === 'participating' && 'Participe de eventos para aparecerem aqui'}
                  {activeTab === 'past' && 'Eventos finalizados aparecerão aqui'}
                </Text>
              </LinearGradient>
            </View>
          ) : (
            events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 20,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#1a1a1a',
    marginTop: -60,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#00d9ff',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#00d9ff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD60A',
  },
  fullName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  username: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
    fontWeight: '600',
  },
  bioContainer: {
    backgroundColor: 'rgba(0, 217, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  bio: {
    fontSize: 15,
    color: '#E5E5EA',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: '#9E9E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    width: '100%',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#00d9ff',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#000',
  },
  eventsSection: {
    paddingHorizontal: 0,
    paddingBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateCard: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});
