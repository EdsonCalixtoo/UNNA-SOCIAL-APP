import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Profile, Event } from '@/types/database';
import { ArrowLeft, UserPlus, UserMinus, UserCheck, Calendar, MapPin, Users, Lock } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

type TabType = 'created' | 'joined';

export default function UserProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('created');
  const [events, setEvents] = useState<Event[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasRequestPending, setHasRequestPending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadUserProfile();
    }
  }, [id]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        Alert.alert('Erro', 'Perfil não encontrado');
        router.back();
        return;
      }

      setProfile(profileData);

      const [followersData, followingData, followData, requestData] = await Promise.all([
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', id),

        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', id),

        supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user?.id)
          .eq('following_id', id)
          .maybeSingle(),

        supabase
          .from('follow_requests')
          .select('id, status')
          .eq('requester_id', user?.id)
          .eq('requested_id', id)
          .eq('status', 'pending')
          .maybeSingle(),
      ]);

      setFollowersCount(followersData.count || 0);
      setFollowingCount(followingData.count || 0);
      setIsFollowing(!!followData.data);
      setHasRequestPending(!!requestData.data);

      await loadEvents();
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Erro', 'Não foi possível carregar o perfil');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      if (activeTab === 'created') {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            categories:category_id (name, icon),
            subcategories:subcategory_id (name)
          `)
          .eq('creator_id', id)
          .gte('event_date', today)
          .order('event_date', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      } else {
        const { data: participantData, error: participantError } = await supabase
          .from('event_participants')
          .select('event_id')
          .eq('user_id', id);

        if (participantError) throw participantError;

        if (!participantData || participantData.length === 0) {
          setEvents([]);
          return;
        }

        const eventIds = participantData.map(p => p.event_id);

        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            categories:category_id (name, icon),
            subcategories:subcategory_id (name)
          `)
          .in('id', eventIds)
          .gte('event_date', today)
          .order('event_date', { ascending: true });

        if (error) throw error;
        setEvents(data || []);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  useEffect(() => {
    if (profile) {
      loadEvents();
    }
  }, [activeTab, profile]);

  const handleFollowAction = async () => {
    if (!profile) return;

    try {
      setActionLoading(true);

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user?.id)
          .eq('following_id', id);

        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else if (hasRequestPending) {
        const { error } = await supabase
          .from('follow_requests')
          .delete()
          .eq('requester_id', user?.id)
          .eq('requested_id', id);

        if (error) throw error;

        setHasRequestPending(false);
      } else {
        if (profile.is_private) {
          const { error } = await supabase
            .from('follow_requests')
            .insert({
              requester_id: user?.id,
              requested_id: id,
              status: 'pending'
            });

          if (error) throw error;

          setHasRequestPending(true);

          await supabase.from('notifications').insert({
            user_id: id,
            type: 'follow_request',
            title: 'Nova solicitação de seguidor',
            message: `@${user?.user_metadata?.username} quer te seguir`,
            data: { user_id: user?.id }
          });
        } else {
          const { error } = await supabase
            .from('follows')
            .insert({
              follower_id: user?.id,
              following_id: id
            });

          if (error) throw error;

          setIsFollowing(true);
          setFollowersCount(prev => prev + 1);

          await supabase.from('notifications').insert({
            user_id: id,
            type: 'follow_accepted',
            title: 'Novo seguidor',
            message: `@${user?.user_metadata?.username} começou a te seguir`,
            data: { user_id: user?.id }
          });
        }
      }
    } catch (error) {
      console.error('Error handling follow:', error);
      Alert.alert('Erro', 'Não foi possível processar a ação');
    } finally {
      setActionLoading(false);
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

  const gradientColors: [string, string, ...string[]] = [
    profile.primary_color || '#00d9ff',
    profile.secondary_color || '#1a1a1a'
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...gradientColors, 'transparent']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={gradientColors}
          style={styles.profileHeader}
        >
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {profile.username?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <Text style={styles.fullName}>{profile.full_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>

          {profile.is_private && (
            <View style={styles.privateBadge}>
              <Lock size={14} color="#fff" />
              <Text style={styles.privateBadgeText}>Privado</Text>
            </View>
          )}

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{events.length}</Text>
              <Text style={styles.statLabel}>Eventos</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/profile/${id}/followers`)}
            >
              <Text style={styles.statValue}>{followersCount}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/profile/${id}/following`)}
            >
              <Text style={styles.statValue}>{followingCount}</Text>
              <Text style={styles.statLabel}>Seguindo</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing && styles.followingButton,
              { backgroundColor: profile.accent_color || '#ff1493' }
            ]}
            onPress={handleFollowAction}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                {isFollowing ? (
                  <>
                    <UserCheck size={18} color="#fff" />
                    <Text style={styles.followButtonText}>Seguindo</Text>
                  </>
                ) : hasRequestPending ? (
                  <>
                    <UserMinus size={18} color="#fff" />
                    <Text style={styles.followButtonText}>Cancelar</Text>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} color="#fff" />
                    <Text style={styles.followButtonText}>
                      {profile.is_private ? 'Solicitar' : 'Seguir'}
                    </Text>
                  </>
                )}
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'created' && styles.activeTab]}
            onPress={() => setActiveTab('created')}
          >
            <Text style={[styles.tabText, activeTab === 'created' && styles.activeTabText]}>
              Eventos criados
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'joined' && styles.activeTab]}
            onPress={() => setActiveTab('joined')}
          >
            <Text style={[styles.tabText, activeTab === 'joined' && styles.activeTabText]}>
              Participando
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.eventsSection}>
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar size={48} color="#666" />
              <Text style={styles.emptyStateText}>
                {activeTab === 'created' ? 'Nenhum evento criado' : 'Não está participando de eventos'}
              </Text>
            </View>
          ) : (
            events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/event/${event.id}`)}
              >
                {event.image_url && (
                  <Image source={{ uri: event.image_url }} style={styles.eventImage} />
                )}

                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {event.title}
                    </Text>
                    {event.categories && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>
                          {event.categories.icon} {event.categories.name}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.eventDetails}>
                    <View style={styles.eventDetailRow}>
                      <Calendar size={16} color="#666" />
                      <Text style={styles.eventDetailText}>
                        {new Date(event.event_date).toLocaleDateString('pt-BR')} às {event.event_time}
                      </Text>
                    </View>

                    <View style={styles.eventDetailRow}>
                      <MapPin size={16} color="#666" />
                      <Text style={styles.eventDetailText} numberOfLines={1}>
                        {event.location_name}
                      </Text>
                    </View>

                    {event.max_participants > 0 && (
                      <View style={styles.eventDetailRow}>
                        <Users size={16} color="#666" />
                        <Text style={styles.eventDetailText}>
                          Máx. {event.max_participants} participantes
                        </Text>
                      </View>
                    )}
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
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    paddingTop: 120,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
  },
  fullName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  username: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  privateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  privateBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bio: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  followingButton: {
    opacity: 0.8,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00d9ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  activeTabText: {
    color: '#00d9ff',
  },
  eventsSection: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  eventImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#2d2d2d',
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  categoryText: {
    fontSize: 12,
    color: '#00d9ff',
    fontWeight: '600',
  },
  eventDetails: {
    gap: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#ccc',
    flex: 1,
  },
});
