import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Dimensions, Share } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Profile, Event } from '@/types/database';
import { ArrowLeft, UserPlus, UserMinus, UserCheck, Calendar, MapPin, Users, Lock, Star, Award, Eye, MessageCircle, Share2 } from 'lucide-react-native';
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
  const [createdEventsCount, setCreatedEventsCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);

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

      // Contar eventos criados
      const { count: createdCount } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', id);

      setCreatedEventsCount(createdCount || 0);

      // Contar posts do usuário
      const { count: postsCountResult } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', id);

      setPostsCount(postsCountResult || 0);

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

  const handleShareProfile = async () => {
    try {
      const bioText = profile?.bio ? `\n💬 "${profile.bio}"` : '';
      const followerText = `\n👥 ${followersCount} seguidores`;
      // Usar um link que funcione com deep linking
      const profileLink = `https://unna.app/profile/${id}`;
      
      const shareMessage = `🌟 Conheça o perfil de @${profile?.username}!\n\n👤 ${profile?.full_name}${bioText}${followerText}\n\n👉 ${profileLink}\n\nVem conferir no UNNA! 🎉`;
      
      await Share.share({
        message: shareMessage,
        title: `Perfil de ${profile?.full_name}`,
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o perfil');
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          profile.primary_color || '#00d9ff',
          profile.secondary_color || '#1a1a1a'
        ]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShareProfile} style={styles.shareButton}>
          <Share2 size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner e Avatar */}
        <LinearGradient
          colors={[
            profile.primary_color || '#00d9ff',
            'rgba(26, 26, 26, 0.5)'
          ]}
          style={styles.profileHeader}
        >
          <View style={styles.avatarContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile.username?.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {profile.is_private && (
              <View style={styles.privateBadge}>
                <Lock size={12} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.fullName}>{profile.full_name}</Text>
            <Text style={styles.username}>@{profile.username}</Text>
          </View>

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          <View style={styles.actionButtons}>
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

            <TouchableOpacity style={styles.messageButton}>
              <MessageCircle size={18} color="#00d9ff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Avançado */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push(`/profile/${id}/followers`)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(52, 199, 89, 0.1)', 'rgba(52, 199, 89, 0.05)']}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconContainer}>
                <UserPlus size={28} color="#34C759" />
              </View>
              <Text style={styles.statCount}>{followersCount}</Text>
              <Text style={styles.statName}>Seguidores</Text>
              <View style={styles.statArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push(`/profile/${id}/following`)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(175, 82, 222, 0.1)', 'rgba(175, 82, 222, 0.05)']}
              style={styles.statCardGradient}
            >
              <View style={styles.statIconContainer}>
                <UserCheck size={28} color="#AF52DE" />
              </View>
              <Text style={styles.statCount}>{followingCount}</Text>
              <Text style={styles.statName}>Seguindo</Text>
              <View style={styles.statArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Abas Modernas */}
        <View style={styles.tabsSection}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'created' && styles.activeTab]}
              onPress={() => setActiveTab('created')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={activeTab === 'created' 
                  ? ['rgba(0, 217, 255, 0.2)', 'rgba(0, 217, 255, 0.1)']
                  : ['transparent', 'transparent']}
                style={styles.tabGradient}
              >
                <Calendar size={20} color={activeTab === 'created' ? '#00d9ff' : '#666'} />
                <Text style={[styles.tabText, activeTab === 'created' && styles.activeTabText]}>
                  Criados
                </Text>
                {createdEventsCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{createdEventsCount}</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'joined' && styles.activeTab]}
              onPress={() => setActiveTab('joined')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={activeTab === 'joined' 
                  ? ['rgba(0, 217, 255, 0.2)', 'rgba(0, 217, 255, 0.1)']
                  : ['transparent', 'transparent']}
                style={styles.tabGradient}
              >
                <Users size={20} color={activeTab === 'joined' ? '#00d9ff' : '#666'} />
                <Text style={[styles.tabText, activeTab === 'joined' && styles.activeTabText]}>
                  Participando
                </Text>
                {events.length > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{events.length}</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de Eventos */}
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
                activeOpacity={0.75}
              >
                {event.image_url ? (
                  <>
                    <Image source={{ uri: event.image_url }} style={styles.eventImage} />
                    <LinearGradient
                      colors={['transparent', 'rgba(10, 10, 10, 0.95)']}
                      style={styles.eventImageOverlay}
                    />
                  </>
                ) : (
                  <View style={styles.eventImagePlaceholder}>
                    <Calendar size={48} color="#00d9ff" />
                  </View>
                )}

                <View style={styles.eventCardContent}>
                  <View style={styles.eventCardTop}>
                    <View style={styles.eventTitleContainer}>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {event.title}
                      </Text>
                    </View>
                    {event.categories && (
                      <View style={styles.eventCategoryBadge}>
                        <Text style={styles.eventCategoryText}>
                          {event.categories.icon}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.eventMeta}>
                    <View style={styles.eventMetaRow}>
                      <View style={styles.eventMetaLeft}>
                        <Calendar size={16} color="#00d9ff" />
                        <View style={styles.eventMetaInfo}>
                          <Text style={styles.eventMetaDate}>
                            {new Date(event.event_date).toLocaleDateString('pt-BR')}
                          </Text>
                          <Text style={styles.eventMetaTime}>{event.event_time}</Text>
                        </View>
                      </View>
                      {event.price > 0 && (
                        <View style={styles.priceTag}>
                          <Text style={styles.priceText}>R$ {event.price.toFixed(2)}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.eventMetaRow}>
                      <MapPin size={16} color="#FF9500" />
                      <Text style={styles.eventLocation} numberOfLines={1}>
                        {event.location_name}
                      </Text>
                    </View>

                    {event.max_participants > 0 && (
                      <View style={styles.eventMetaRow}>
                        <Users size={16} color="#34C759" />
                        <Text style={styles.eventParticipants}>
                          Até {event.max_participants} participantes
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  shareButton: {
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
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '900',
  },
  privateBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#0a0a0a',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  fullName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  username: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    width: '100%',
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
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
    opacity: 0.85,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  messageButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  
  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  statCardGradient: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  statName: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
    marginBottom: 8,
  },
  statArrow: {
    marginTop: 8,
  },
  arrowText: {
    fontSize: 18,
    color: '#00d9ff',
    fontWeight: '900',
  },

  // Tabs Section
  tabsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  tab: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 56,
  },
  tabGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  activeTab: {
    borderRadius: 20,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#666',
  },
  activeTabText: {
    color: '#00d9ff',
  },
  tabBadge: {
    backgroundColor: '#00d9ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
  },

  // Categories Section
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryItem: {
    width: '23%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  categoryEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 11,
    color: '#ccc',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Events Section
  eventsSection: {
    padding: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  eventCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2d2d2d',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  eventImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#2d2d2d',
  },
  eventImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCardContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  eventCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  eventTitleContainer: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  eventCategoryBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  eventCategoryText: {
    fontSize: 24,
  },
  eventMeta: {
    gap: 10,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.1)',
  },
  eventMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  eventMetaInfo: {
    flex: 1,
  },
  eventMetaDate: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00d9ff',
  },
  eventMetaTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  eventLocation: {
    fontSize: 13,
    color: '#ddd',
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },
  eventParticipants: {
    fontSize: 13,
    color: '#ddd',
    fontWeight: '600',
    marginLeft: 10,
  },
  priceTag: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34C759',
  },
  
  // Old unused styles (keeping for compatibility but will remove later)
  eventGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  eventContent: {
    paddingTop: 0,
  },
  eventHeader: {
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  categoryText: {
    fontSize: 12,
    color: '#00d9ff',
    fontWeight: '700',
  },
  eventDetails: {
    gap: 8,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventDetailText: {
    fontSize: 13,
    color: '#ddd',
    flex: 1,
    fontWeight: '500',
  },
});
