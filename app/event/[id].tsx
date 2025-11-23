import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, MapPin, Users, DollarSign, ArrowLeft, MessageCircle, Check, X, Circle as HelpCircle, Edit3 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Event {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  event_date: string;
  event_time: string;
  location_name: string;
  latitude?: number;
  longitude?: number;
  max_participants: number;
  is_paid: boolean;
  price: number;
  creator_id: string;
  categories?: {
    name: string;
    icon: string;
  };
  subcategories?: {
    name: string;
  };
  profiles?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
}

export default function EventDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<'going' | 'not_going' | 'maybe' | null>(null);
  const [participantsCount, setParticipantsCount] = useState(0);

  useEffect(() => {
    loadEvent();
    loadRSVPStatus();
    loadParticipantsCount();
  }, [id]);

  const loadEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          categories:category_id (name, icon),
          subcategories:subcategory_id (name),
          profiles:creator_id (id, username, full_name, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Erro', 'Não foi possível carregar o evento');
    } finally {
      setLoading(false);
    }
  };

  const loadRSVPStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setRsvpStatus('going');
      }
    } catch (error) {
      console.error('Error loading RSVP status:', error);
    }
  };

  const loadParticipantsCount = async () => {
    try {
      const { count, error } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', id);

      if (error) throw error;
      setParticipantsCount(count || 0);
    } catch (error) {
      console.error('Error loading participants count:', error);
    }
  };

  const handleRSVP = async (status: 'going' | 'not_going' | 'maybe') => {
    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado');
      return;
    }

    try {
      if (status === 'going') {
        if (rsvpStatus === 'going') {
          await supabase
            .from('event_participants')
            .delete()
            .eq('event_id', id)
            .eq('user_id', user.id);
          setRsvpStatus(null);
          setParticipantsCount(prev => Math.max(0, prev - 1));
        } else {
          await supabase
            .from('event_participants')
            .insert({ event_id: id as string, user_id: user.id });
          setRsvpStatus('going');
          setParticipantsCount(prev => prev + 1);
        }
      } else {
        if (rsvpStatus === 'going') {
          await supabase
            .from('event_participants')
            .delete()
            .eq('event_id', id)
            .eq('user_id', user.id);
          setParticipantsCount(prev => Math.max(0, prev - 1));
        }
        setRsvpStatus(status);
      }
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar presença');
    }
  };

  const handleChat = () => {
    router.push(`/event/${id}/chat`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Evento não encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.imageContainer}>
          {event.image_url ? (
            <Image
              source={{ uri: event.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#00d9ff', '#ff1493']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imagePlaceholder}
            >
              <Text style={styles.imagePlaceholderText}>UNИA</Text>
            </LinearGradient>
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={styles.imageGradient}
          />

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>

          {user?.id === event.creator_id && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => Alert.alert('Em breve', 'Funcionalidade de edição em desenvolvimento')}
            >
              <Edit3 size={20} color="#fff" />
            </TouchableOpacity>
          )}

          {event.categories && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryIcon}>{event.categories.icon}</Text>
              <Text style={styles.categoryBadgeText}>{event.categories.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{event.title}</Text>

            {event.profiles && (
              <TouchableOpacity
                style={styles.creator}
                onPress={() => router.push(`/profile/${event.profiles?.id}`)}
              >
                {event.profiles.avatar_url ? (
                  <Image
                    source={{ uri: event.profiles.avatar_url }}
                    style={styles.creatorAvatar}
                  />
                ) : (
                  <View style={styles.creatorAvatarPlaceholder}>
                    <Text style={styles.creatorAvatarText}>
                      {event.profiles.username?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.creatorInfo}>
                  <Text style={styles.creatorLabel}>Criado por</Text>
                  <Text style={styles.creatorName}>{event.profiles.full_name}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Calendar size={24} color="#00d9ff" strokeWidth={2.5} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Data</Text>
                <Text style={styles.infoValue}>{formatDate(event.event_date)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Clock size={24} color="#ff1493" strokeWidth={2.5} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Horário</Text>
                <Text style={styles.infoValue}>{formatTime(event.event_time)}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <MapPin size={24} color="#34C759" strokeWidth={2.5} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Local</Text>
                <Text style={styles.infoValue}>{event.location_name}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Users size={24} color="#FF9500" strokeWidth={2.5} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Participantes</Text>
                <Text style={styles.infoValue}>
                  {participantsCount} {event.max_participants > 0 ? `/ ${event.max_participants}` : ''} confirmados
                </Text>
              </View>
            </View>

            {event.is_paid && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.iconContainer}>
                    <DollarSign size={24} color="#34C759" strokeWidth={2.5} />
                  </View>
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Preço</Text>
                    <Text style={[styles.infoValue, styles.priceText]}>R$ {event.price.toFixed(2)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre o evento</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {event.subcategories && (
            <View style={styles.tagContainer}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{event.subcategories.name}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.rsvpContainer}>
          <TouchableOpacity
            style={[styles.rsvpButton, rsvpStatus === 'going' && styles.rsvpButtonActive]}
            onPress={() => handleRSVP('going')}
          >
            <Check size={20} color={rsvpStatus === 'going' ? '#fff' : '#34C759'} strokeWidth={3} />
            <Text style={[styles.rsvpButtonText, rsvpStatus === 'going' && styles.rsvpButtonTextActive]}>
              Vou
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rsvpButton, rsvpStatus === 'maybe' && styles.rsvpButtonMaybe]}
            onPress={() => handleRSVP('maybe')}
          >
            <HelpCircle size={20} color={rsvpStatus === 'maybe' ? '#fff' : '#FF9500'} strokeWidth={3} />
            <Text style={[styles.rsvpButtonText, rsvpStatus === 'maybe' && styles.rsvpButtonTextActive]}>
              Talvez
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rsvpButton, rsvpStatus === 'not_going' && styles.rsvpButtonNotGoing]}
            onPress={() => handleRSVP('not_going')}
          >
            <X size={20} color={rsvpStatus === 'not_going' ? '#fff' : '#FF3B30'} strokeWidth={3} />
            <Text style={[styles.rsvpButtonText, rsvpStatus === 'not_going' && styles.rsvpButtonTextActive]}>
              Não vou
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <MessageCircle size={24} color="#fff" strokeWidth={2.5} />
          <Text style={styles.chatButtonText}>Chat do Evento</Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  imageContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 6,
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editButton: {
    position: 'absolute',
    top: 60,
    left: 70,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 217, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryBadge: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  creator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  creatorAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  creatorAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  creatorInfo: {
    flex: 1,
  },
  creatorLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 2,
  },
  creatorName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  priceText: {
    color: '#34C759',
  },
  divider: {
    height: 1,
    backgroundColor: '#2d2d2d',
    marginVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 24,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 100,
  },
  tag: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  tagText: {
    fontSize: 14,
    color: '#00d9ff',
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2d2d2d',
  },
  rsvpContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 2,
    borderColor: '#3d3d3d',
  },
  rsvpButtonActive: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  rsvpButtonMaybe: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  rsvpButtonNotGoing: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  rsvpButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  rsvpButtonTextActive: {
    color: '#fff',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00d9ff',
    borderRadius: 16,
    padding: 18,
    gap: 10,
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chatButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  scrollViewContent: {
    paddingBottom: 150,
  },
});
