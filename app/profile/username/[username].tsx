import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Event } from '@/types/database';
import { ArrowLeft, Calendar, MapPin, Users, DollarSign, Sparkles, TrendingUp } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

type TabType = 'created' | 'participating';

export default function UserProfileByUsername() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('created');
  const [events, setEvents] = useState<Event[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (username) {
      loadUserProfile();
    }
  }, [username, activeTab]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        Alert.alert('Erro', 'Usuário não encontrado');
        router.back();
        return;
      }

      setProfile(profileData);

      const [followersData, followingData, eventsData, followingStatus] = await Promise.all([
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', profileData.id),

        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', profileData.id),

        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('creator_id', profileData.id),

        currentUser
          ? supabase
              .from('follows')
              .select('id')
              .eq('follower_id', currentUser.id)
              .eq('following_id', profileData.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      setFollowersCount(followersData.count || 0);
      setFollowingCount(followingData.count || 0);
      setEventsCount(eventsData.count || 0);
      setIsFollowing(!!followingStatus.data);

      await loadEvents(profileData.id);
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Erro', 'Não foi possível carregar o perfil');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (userId: string) => {
    try {
      if (activeTab === 'created') {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            categories:category_id (name, icon),
            subcategories:subcategory_id (name)
          `)
          .eq('creator_id', userId)
          .order('event_date', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } else {
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
          .eq('user_id', userId);

        if (error) throw error;
        const participatingEvents = data?.map((item: any) => item.events).filter(Boolean) || [];
        setEvents(participatingEvents);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !profile) return;

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id);

        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: profile.id,
          });

        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Erro', 'Não foi possível realizar a ação');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#00d9ff', '#0097a7', '#1a1a1a']}
          style={styles.headerGradient}
        >
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={['#00d9ff', '#0097a7']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarText}>
                  {profile.username?.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.verifiedBadge}>
              <Sparkles size={16} color="#fff" fill="#FFD60A" />
            </View>
          </View>

          <Text style={styles.fullName}>{profile.full_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>

          {profile.bio && (
            <View style={styles.bioContainer}>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          )}

          {!isOwnProfile && currentUser && (
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
            >
              <LinearGradient
                colors={isFollowing ? ['#2d2d2d', '#1a1a1a'] : ['#00d9ff', '#0097a7']}
                style={styles.followButtonGradient}
              >
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {isFollowing ? 'Seguindo' : 'Seguir'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <LinearGradient
                colors={['rgba(0, 217, 255, 0.15)', 'rgba(0, 217, 255, 0.05)']}
                style={styles.statCardGradient}
              >
                <Calendar size={24} color="#00d9ff" />
                <Text style={styles.statValue}>{eventsCount}</Text>
                <Text style={styles.statLabel}>Eventos</Text>
              </LinearGradient>
            </View>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push(`/profile/${profile.id}/followers`)}
            >
              <LinearGradient
                colors={['rgba(255, 20, 147, 0.15)', 'rgba(255, 20, 147, 0.05)']}
                style={styles.statCardGradient}
              >
                <Users size={24} color="#ff1493" />
                <Text style={styles.statValue}>{followersCount}</Text>
                <Text style={styles.statLabel}>Seguidores</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push(`/profile/${profile.id}/following`)}
            >
              <LinearGradient
                colors={['rgba(52, 199, 89, 0.15)', 'rgba(52, 199, 89, 0.05)']}
                style={styles.statCardGradient}
              >
                <TrendingUp size={24} color="#34C759" />
                <Text style={styles.statValue}>{followingCount}</Text>
                <Text style={styles.statLabel}>Seguindo</Text>
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
              Eventos
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
        </View>

        <View style={styles.eventsSection}>
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['rgba(0, 217, 255, 0.1)', 'rgba(0, 217, 255, 0.02)']}
                style={styles.emptyStateCard}
              >
                <Calendar size={56} color="#00d9ff" strokeWidth={1.5} />
                <Text style={styles.emptyStateTitle}>
                  {activeTab === 'created' ? 'Nenhum evento criado' : 'Nenhuma participação'}
                </Text>
                <Text style={styles.emptyStateText}>
                  {activeTab === 'created'
                    ? 'Este usuário ainda não criou eventos'
                    : 'Este usuário ainda não está participando de eventos'}
                </Text>
              </LinearGradient>
            </View>
          ) : (
            events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/event/${event.id}`)}
                activeOpacity={0.9}
              >
                {event.image_url && (
                  <Image source={{ uri: event.image_url }} style={styles.eventImage} />
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={styles.eventImageGradient}
                />

                {event.categories && (
                  <View style={styles.categoryBadgeFloating}>
                    <LinearGradient
                      colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.6)']}
                      style={styles.categoryBadgeGradient}
                    >
                      <Text style={styles.categoryIcon}>{event.categories.icon}</Text>
                      <Text style={styles.categoryTextFloating}>{event.categories.name}</Text>
                    </LinearGradient>
                  </View>
                )}

                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle} numberOfLines={2}>
                    {event.title}
                  </Text>

                  <View style={styles.eventDetails}>
                    <View style={styles.eventDetailRow}>
                      <Calendar size={18} color="#00d9ff" />
                      <Text style={styles.eventDetailText}>
                        {new Date(event.event_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} • {event.event_time.slice(0,5)}
                      </Text>
                    </View>

                    <View style={styles.eventDetailRow}>
                      <MapPin size={18} color="#ff1493" />
                      <Text style={styles.eventDetailText} numberOfLines={1}>
                        {event.location_name}
                      </Text>
                    </View>

                    <View style={styles.eventDetailRow}>
                      {event.is_paid ? (
                        <>
                          <DollarSign size={18} color="#34C759" />
                          <Text style={styles.priceText}>R$ {event.price?.toFixed(2)}</Text>
                        </>
                      ) : (
                        <>
                          <DollarSign size={18} color="#8E8E93" />
                          <Text style={styles.freeText}>Gratuito</Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
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
    justifyContent: 'space-between',
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  bio: {
    fontSize: 15,
    color: '#E5E5EA',
    textAlign: 'center',
    lineHeight: 22,
  },
  followButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  followingButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  followButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  followingButtonText: {
    color: '#fff',
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
    fontSize: 12,
    color: '#9E9E93',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
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
  eventCard: {
    backgroundColor: '#2d2d2d',
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  eventImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#1a1a1a',
  },
  eventImageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  categoryBadgeFloating: {
    position: 'absolute',
    top: 16,
    left: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryTextFloating: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  eventContent: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  eventDetails: {
    gap: 12,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#E5E5EA',
    flex: 1,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '700',
  },
  freeText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
});
