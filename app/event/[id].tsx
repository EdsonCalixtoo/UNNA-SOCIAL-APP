import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  ArrowLeft, 
  MessageCircle, 
  Check, 
  X, 
  Circle as HelpCircle, 
  Edit3, 
  Share2,
  Navigation2,
  Info,
  ChevronRight,
  Volume2,
  VolumeX
} from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { EventShareModal } from '@/components/EventShareModal';
import { EventParticipantsModal } from '@/components/EventParticipantsModal';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withSpring,
  FadeInUp
} from 'react-native-reanimated';
import { s, vs, ms } from '@/utils/responsive';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const IMG_HEIGHT = vs(420);
const CONTENT_MARGIN_TOP = -vs(40);
const BORDER_RADIUS = ms(40);
const CONTENT_PADDING_BOTTOM = vs(120);

interface Participant {
  user_id: string;
  profiles: {
    avatar_url: string;
    username: string;
  };
}

interface Event {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  media_type?: 'image' | 'video';
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
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<'going' | 'not_going' | 'maybe' | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const scrollY = useSharedValue(0);

  useEffect(() => {
    loadEvent();
    loadRSVPStatus();
    loadParticipants();
  }, [id]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerImageStyle = useAnimatedStyle(() => {
    return {
      height: IMG_HEIGHT,
      width: '100%',
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [-IMG_HEIGHT, 0, IMG_HEIGHT],
            [-IMG_HEIGHT / 2, 0, IMG_HEIGHT * 0.75],
            Extrapolation.CLAMP
          ),
        },
        {
          scale: interpolate(
            scrollY.value,
            [-IMG_HEIGHT, 0],
            [2, 1],
            Extrapolation.CLAMP
          ),
        },
      ] as any,
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    return {
      marginTop: CONTENT_MARGIN_TOP,
      borderTopLeftRadius: BORDER_RADIUS,
      borderTopRightRadius: BORDER_RADIUS,
      backgroundColor: backgroundPrimary,
      paddingBottom: CONTENT_PADDING_BOTTOM,
    };
  });

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
      const { data } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setRsvpStatus('going');
    } catch (error) {
      console.error('Error loading RSVP status:', error);
    }
  };

  const loadParticipants = async () => {
    try {
      const { data, count, error } = await supabase
        .from('event_participants')
        .select('user_id, profiles(avatar_url, username)', { count: 'exact' })
        .eq('event_id', id)
        .limit(5);

      if (error) throw error;
      setParticipants(data as any || []);
      setParticipantsCount(count || 0);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const handleRSVP = async (status: 'going' | 'not_going' | 'maybe') => {
    if (!user) {
      Alert.alert('Autenticação', 'Você precisa fazer login para participar.');
      return;
    }

    try {
      if (status === 'going') {
        if (rsvpStatus === 'going') {
          await supabase.from('event_participants').delete().eq('event_id', id).eq('user_id', user.id);
          setRsvpStatus(null);
          setParticipantsCount(prev => Math.max(0, prev - 1));
        } else {
          await supabase.from('event_participants').insert({ event_id: id as string, user_id: user.id });
          setRsvpStatus('going');
          setParticipantsCount(prev => prev + 1);
        }
      } else {
        if (rsvpStatus === 'going') {
          await supabase.from('event_participants').delete().eq('event_id', id).eq('user_id', user.id);
          setParticipantsCount(prev => Math.max(0, prev - 1));
        }
        setRsvpStatus(status);
      }
      loadParticipants();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao atualizar presença');
    }
  };

  const handleChat = () => {
    router.push(`/event/${id}/chat`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const weekdays = [
      'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
      'quinta-feira', 'sexta-feira', 'sábado'
    ];
    
    return `${weekdays[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: backgroundPrimary }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  if (!event) return null;

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <EventShareModal visible={shareModalVisible} onClose={() => setShareModalVisible(false)} event={event} />
      <EventParticipantsModal visible={participantsModalVisible} onClose={() => setParticipantsModalVisible(false)} eventId={id as string} />

      {/* FLOATING HEADER */}
      <View style={[styles.floatingHeader, { paddingTop: 60 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.glassButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={() => setShareModalVisible(true)} style={styles.glassButton}>
            <Share2 size={22} color="#fff" />
          </TouchableOpacity>
          {user?.id === event.creator_id && (
            <TouchableOpacity style={[styles.glassButton, { backgroundColor: accent }]} onPress={() => Alert.alert('Editar', 'Funcionalidade em breve')}>
              <Edit3 size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* PARALLAX IMAGE / VIDEO */}
        <Animated.View style={headerImageStyle as any}>
          {event.image_url ? (
            (event.media_type === 'video' || event.image_url.toLowerCase().includes('.mp4')) && !videoError ? (
              <Video
                source={{ uri: event.image_url }}
                style={styles.image}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isLooping
                isMuted={isMuted}
                onError={() => setVideoError(true)}
              />
            ) : (
              <Image source={{ uri: event.image_url }} style={styles.image} resizeMode="cover" />
            )
          ) : (
            <LinearGradient colors={['#00d9ff', '#ff1493']} style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>UNИA</Text>
            </LinearGradient>
          )}

          {event.media_type === 'video' && !videoError && (
            <TouchableOpacity 
              style={styles.muteButtonOverlay} 
              onPress={() => setIsMuted(!isMuted)}
            >
              <BlurView intensity={30} tint="dark" style={styles.muteBlur}>
                {isMuted ? <VolumeX size={20} color="#fff" /> : <Volume2 size={20} color="#fff" />}
              </BlurView>
            </TouchableOpacity>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />
          
          <View style={styles.imageInfo}>
            {event.categories && (
              <View style={styles.categoryTag}>
                <Text style={styles.categoryIconText}>{event.categories.icon}</Text>
                <Text style={styles.categoryTagText}>{event.categories.name}</Text>
              </View>
            )}
            <Text style={styles.heroTitle}>{event.title}</Text>
          </View>
        </Animated.View>

        {/* CONTENT */}
        <Animated.View style={contentStyle}>
          <View style={styles.mainContent}>
            
            {/* CREATOR SECTION */}
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => router.push(`/profile/${event.profiles?.id}`)}
              style={[styles.creatorCard, { backgroundColor: backgroundSecondary }]}
            >
              <View style={styles.creatorInfoRow}>
                {event.profiles?.avatar_url ? (
                  <Image source={{ uri: event.profiles.avatar_url }} style={styles.creatorAvatar} />
                ) : (
                  <View style={[styles.creatorAvatar, { backgroundColor: accent, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{event.profiles?.username?.[0].toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.creatorName, { color: textPrimary }]}>{event.profiles?.full_name}</Text>
                  <Text style={[styles.creatorSub, { color: textSecondary }]}>Organizador</Text>
                </View>
                <ChevronRight size={20} color={textSecondary} />
              </View>
            </TouchableOpacity>

            {/* INFO GRID */}
            <View style={styles.infoGrid}>
              <View style={[styles.infoItem, { backgroundColor: backgroundSecondary }]}>
                <View style={[styles.infoIconBg, { backgroundColor: 'rgba(0, 217, 255, 0.1)' }]}>
                  <Calendar size={20} color={accent} />
                </View>
                <View>
                  <Text style={[styles.infoLabel, { color: textSecondary }]}>DATA</Text>
                  <Text style={[styles.infoVal, { color: textPrimary }]}>{formatDate(event.event_date)}</Text>
                </View>
              </View>

              <View style={[styles.infoItem, { backgroundColor: backgroundSecondary }]}>
                <View style={[styles.infoIconBg, { backgroundColor: 'rgba(255, 20, 147, 0.1)' }]}>
                  <Clock size={20} color="#ff1493" />
                </View>
                <View>
                  <Text style={[styles.infoLabel, { color: textSecondary }]}>HORÁRIO</Text>
                  <Text style={[styles.infoVal, { color: textPrimary }]}>{event.event_time.slice(0, 5)}</Text>
                </View>
              </View>
            </View>

            {/* LOCATION CARD */}
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[styles.locationCard, { backgroundColor: backgroundSecondary }]}
            >
              <View style={[styles.infoIconBg, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                <MapPin size={22} color="#34C759" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoLabel, { color: textSecondary }]}>LOCALIZAÇÃO</Text>
                <Text style={[styles.infoVal, { color: textPrimary }]} numberOfLines={2}>{event.location_name}</Text>
              </View>
              <View style={styles.mapAction}>
                <Navigation2 size={18} color={accent} />
              </View>
            </TouchableOpacity>

            {/* PARTICIPANTS PREVIEW */}
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => setParticipantsModalVisible(true)}
              style={[styles.participantsCard, { backgroundColor: backgroundSecondary }]}
            >
              <View style={styles.facePile}>
                {participants.map((p, i) => (
                  <Image 
                    key={p.user_id} 
                    source={{ uri: p.profiles.avatar_url }} 
                    style={[styles.faceAvatar, { marginLeft: i === 0 ? 0 : -ms(15), zIndex: 10 - i }]} 
                  />
                ))}
                {participantsCount > 5 && (
                  <View style={[styles.faceAvatarMore, { marginLeft: -ms(15), zIndex: 0, backgroundColor: accent }]}>
                    <Text style={styles.moreText}>+{participantsCount - 5}</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.infoVal, { color: textPrimary }]}>{participantsCount} confirmados</Text>
                <Text style={[styles.infoSub, { color: textSecondary }]}>
                  {event.max_participants > 0 ? `Vagas restantes: ${event.max_participants - participantsCount}` : 'Evento aberto'}
                </Text>
              </View>
              <ChevronRight size={20} color={textSecondary} />
            </TouchableOpacity>

            {/* ABOUT */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Info size={20} color={accent} />
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Sobre o Evento</Text>
              </View>
              <Text style={[styles.description, { color: textSecondary }]}>{event.description}</Text>
            </View>

            {/* PRICING IF PAID */}
            {event.is_paid && (
              <View style={[styles.priceTag, { backgroundColor: isDark ? 'rgba(52, 199, 89, 0.1)' : 'rgba(52, 199, 89, 0.05)' }]}>
                <DollarSign size={24} color="#34C759" />
                <View>
                  <Text style={[styles.priceLabel, { color: '#34C759' }]}>VALOR DE ENTRADA</Text>
                  <Text style={styles.priceValue}>R$ {event.price.toFixed(2)}</Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.ScrollView>

      {/* STICKY BOTTOM ACTIONS */}
      <View style={[styles.bottomActions, { paddingBottom: 34, backgroundColor: backgroundPrimary }]}>
        <View style={styles.rsvpActions}>
          <TouchableOpacity 
            onPress={() => handleRSVP('going')}
            style={[
              styles.mainActionButton, 
              { backgroundColor: rsvpStatus === 'going' ? '#34C759' : accent }
            ]}
          >
            {rsvpStatus === 'going' ? <Check size={22} color="#fff" strokeWidth={3} /> : <Users size={22} color="#fff" />}
            <Text style={styles.mainActionText}>
              {rsvpStatus === 'going' ? 'Presença Confirmada' : 'Confirmar Presença'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryAction, { backgroundColor: backgroundSecondary }]}
            onPress={handleChat}
          >
            <MessageCircle size={24} color={accent} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  glassButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  headerRightActions: { flexDirection: 'row', gap: 12 },
  muteButtonOverlay: {
    position: 'absolute',
    bottom: vs(120),
    right: 24,
    zIndex: 10,
  },
  muteBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontSize: 80, fontWeight: '900', color: '#fff', letterSpacing: 10, opacity: 0.2 },
  imageInfo: {
    position: 'absolute',
    bottom: vs(60),
    left: 24,
    right: 24,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  categoryIconText: { fontSize: 16, marginRight: 6 },
  categoryTagText: { color: '#fff', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  heroTitle: {
    fontSize: ms(36),
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  mainContent: { padding: 24 },
  creatorCard: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 20,
    elevation: 2,
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  creatorInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  creatorAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#fff' },
  creatorName: { fontSize: ms(17), fontWeight: '800' },
  creatorSub: { fontSize: ms(13), fontWeight: '600', marginTop: 2 },

  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  infoItem: { flex: 1, padding: 16, borderRadius: 24, gap: 12 },
  infoIconBg: { width: 44, height: 44, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: ms(10), fontWeight: '800', letterSpacing: 1 },
  infoVal: { fontSize: ms(15), fontWeight: '700', marginTop: 2 },
  infoSub: { fontSize: ms(12), fontWeight: '600' },

  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    gap: 16,
    marginBottom: 16,
  },
  mapAction: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0, 217, 255, 0.05)', justifyContent: 'center', alignItems: 'center' },

  participantsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 24,
  },
  facePile: { flexDirection: 'row', alignItems: 'center' },
  faceAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#fff' },
  faceAvatarMore: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  moreText: { color: '#fff', fontSize: 12, fontWeight: '900' },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionTitle: { fontSize: ms(19), fontWeight: '900' },
  description: { fontSize: ms(16), lineHeight: 26, fontWeight: '500' },

  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    gap: 16,
  },
  priceLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  priceValue: { fontSize: 24, fontWeight: '900', color: '#34C759' },

  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  rsvpActions: { flexDirection: 'row', gap: 12 },
  mainActionButton: {
    flex: 1,
    height: 64,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 8,
    shadowColor: '#00d9ff',
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  mainActionText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  secondaryAction: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  }
});
