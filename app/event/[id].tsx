import React, { useState, useEffect, memo, useMemo } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  ActivityIndicator, Alert, Dimensions, Platform, StatusBar, Linking,
  Modal, Pressable
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Calendar, Clock, MapPin, ArrowLeft,
  MessageCircle, Edit3, Share2, Navigation2,
  ChevronRight, Users, Trash2, Ticket, Sparkles,
  Car, Heart, Lock, Music, X
} from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { notifyEventPresence } from '@/lib/notifications';
import { useLanguage } from '@/lib/i18n';
import { EventShareModal } from '@/components/EventShareModal';
import { EventParticipantsModal } from '@/components/EventParticipantsModal';
import { EventPresenceList } from '@/components/EventPresenceList';
import { EventStoriesBar } from '@/components/EventStoriesBar';
import { ActionFeedback } from '@/components/ActionFeedback';
import { offlineService } from '@/services/offlineService';
import { MusicRequestModal } from '@/components/MusicRequestModal';
import FullscreenMediaViewer from '@/components/FullscreenMediaViewer';
import Animated, { 
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler,
  interpolate, Extrapolation, FadeIn, FadeOut, withTiming, runOnJS
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { soundService } from '@/utils/soundService';
import * as ExpoCalendar from 'expo-calendar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = SCREEN_HEIGHT * 0.55;

export default function EventDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { backgroundPrimary, textPrimary, textSecondary, accent: defaultAccent, isDark } = useTheme();
  const { t } = useLanguage();

  const [event, setEvent] = useState<any>(null);
  
  const eventAccent = useMemo(() => {
    if (!event?.categories?.name) return defaultAccent;
    const cat = event.categories.name.toLowerCase();
    if (cat.includes('festa') || cat.includes('show') || cat.includes('balada')) return '#ff1493'; 
    if (cat.includes('esporte') || cat.includes('treino')) return '#34C759'; 
    if (cat.includes('tech') || cat.includes('geek')) return '#7b2fff'; 
    if (cat.includes('food') || cat.includes('gastronomia')) return '#FF9500'; 
    if (cat.includes('arte') || cat.includes('cultura')) return '#FF3B30'; 
    return defaultAccent;
  }, [event, defaultAccent]);

  const accent = eventAccent; 
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<'going' | null>(null);
  const [feedback, setFeedback] = useState({ visible: false, type: 'success' as any, title: '', message: '' });
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [musicModalVisible, setMusicModalVisible] = useState(false);
  const [fullMediaVisible, setFullMediaVisible] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const scrollY = useSharedValue(0);

  useEffect(() => { 
    loadEvent(); 
    loadRSVPStatus(); 
  }, [id]);

  useEffect(() => {
    if (Platform.OS === 'web' && id && id !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isAndroid = /android/i.test(userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
      if (isAndroid || isIOS) {
        window.location.href = `unna-social-app://event/${id}`;
        setTimeout(() => {
          if (isAndroid) {
            window.location.href = 'https://play.google.com/store/apps/details?id=com.bolt.starter';
          } else if (isIOS) {
            window.location.href = 'https://apps.apple.com/br/app/apple-store/id000000000';
          }
        }, 2500);
      }
    }
  }, [id]);

  const loadEvent = async () => {
    if (!id || id === 'undefined') return;
    try {
      const { data, error } = await supabase.from('events').select(`
        *, categories:category_id (name, icon),
        profiles:creator_id (id, username, full_name, avatar_url, is_verified)
      `).eq('id', id).maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setEvent(data);
        offlineService.cacheEvent(data);
      } else {
        const cached = await offlineService.getCachedEvent(id as string);
        if (cached) setEvent(cached);
        else {
          Alert.alert('Evento não encontrado', 'Este evento não existe mais.');
          router.back();
        }
      }
    } catch (e) { 
      const cached = await offlineService.getCachedEvent(id as string);
      if (cached) setEvent(cached);
      else {
        Alert.alert('Erro de Conexão', 'Não foi possível carregar os detalhes.'); 
        router.back();
      }
    } finally { 
      setLoading(false); 
    }
  };

  const loadRSVPStatus = async () => {
    if (!user || !id || id === 'undefined') return;
    const { data } = await supabase.from('event_participants').select('*').eq('event_id', id).eq('user_id', user.id).maybeSingle();
    if (data) setRsvpStatus('going');
  };

  const addEventToCalendar = async () => {
    try {
      const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso ao calendário para adicionar o evento.');
        return;
      }
      const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
      const defaultCal = calendars.find(c =>
        Platform.OS === 'ios' ? c.allowsModifications && c.source.name === 'iCloud' : c.allowsModifications && c.isPrimary
      ) || calendars.find(c => c.allowsModifications);

      if (!defaultCal) return Alert.alert('Erro', 'Nenhum calendário editável encontrado.');

      const [year, month, day] = (event.event_date as string).split('-').map(Number);
      const [startHour, startMin] = (event.event_time as string).split(':').map(Number);
      const startDate = new Date(year, month - 1, day, startHour, startMin);
      let endDate: Date;
      if (event.end_time) {
        const [endHour, endMin] = (event.end_time as string).split(':').map(Number);
        endDate = new Date(year, month - 1, day, endHour, endMin);
      } else {
        endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); 
      }

      await ExpoCalendar.createEventAsync(defaultCal.id, {
        title: event.title,
        startDate,
        endDate,
        location: event.location_name || '',
        notes: event.description || '',
        alarms: [{ relativeOffset: -60 }, { relativeOffset: -15 }], 
      });
      Alert.alert('✅ Adicionado!', 'O evento foi salvo na sua agenda com lembretes 1h e 15min antes.');
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível adicionar o evento à agenda.');
    }
  };

  const handleRSVP = async () => {
    if (!user) { Alert.alert('Login necessário'); return; }
    try {
      if (rsvpStatus === 'going') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await supabase.from('event_participants').delete().eq('event_id', id).eq('user_id', user.id);
        setRsvpStatus(null); 
        setFeedback({ visible: true, type: 'success', title: 'Presença Removida', message: 'Sua presença foi cancelada com sucesso.' });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await supabase.from('event_participants').insert({ event_id: id as string, user_id: user.id });
        notifyEventPresence(id as string, event.title, user.id, event.creator_id);
        setRsvpStatus('going'); 
        soundService.play('success');
        setFeedback({ visible: true, type: 'success', title: event.type === 'event' ? 'Presença Confirmada! 🎉' : 'Interesse Registrado!', message: event.type === 'event' ? 'Você confirmou sua presença neste evento. Prepare o look e nos vemos lá!' : 'O autor foi notificado do seu interesse.' });

        if (event.type === 'event') {
          setTimeout(() => {
            Alert.alert('📅 Adicionar à Agenda?', `Quer salvar "${event.title}" na agenda do seu celular?`, [
              { text: 'Agora não', style: 'cancel' },
              { text: 'Sim, adicionar!', onPress: addEventToCalendar }
            ]);
          }, 800);
        }
      }
    } catch (error) {
      setFeedback({ visible: true, type: 'error', title: 'Ops!', message: 'Não foi possível completar esta ação.' });
    }
  };

  const openMap = () => {
    if (!event?.latitude || !event?.longitude) return;
    const lat = event.latitude;
    const lng = event.longitude;
    const label = event.location_name;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(label)}&ll=${lat},${lng}`;

    Alert.alert('Abrir no GPS', 'Como deseja chegar ao local?', [
      { text: 'Waze', onPress: () => Linking.openURL(wazeUrl).catch(() => {}) },
      { text: 'Google Maps', onPress: () => Linking.openURL(googleMapsUrl).catch(() => {}) },
      { text: 'Mapas Apple', onPress: () => {
          const url = Platform.OS === 'ios' ? `maps://?q=${encodeURIComponent(label)}&ll=${lat},${lng}` : appleMapsUrl;
          Linking.openURL(url).catch(() => {});
        } 
      },
      { text: 'Cancelar', style: 'cancel' }
    ]);
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
    onEndDrag: (e) => {
      if (e.contentOffset.y < -80) {
        runOnJS(setFullMediaVisible)(true);
      }
    }
  });

  const pullIndicatorStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [-20, -80], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [-20, -80], [0, 20], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ translateY }]
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [-100, 0, HEADER_HEIGHT], [-50, 0, HEADER_HEIGHT * 0.5], Extrapolation.CLAMP);
    const scale = interpolate(scrollY.value, [-100, 0], [1.3, 1], Extrapolation.CLAMP);
    return {
      transform: [{ translateY }, { scale }],
    } as any;
  });

  const headerBackgroundStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [HEADER_HEIGHT - 120, HEADER_HEIGHT - 40], [0, 1], Extrapolation.CLAMP);
    return { opacity };
  });

  const formatDate = (d: string) => {
    const date = new Date(d + 'T12:00:00');
    const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const days = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={accent} /></View>;
  if (!event) return null;

  const isPublication = event.type === 'publication' || !event.event_date || !event.event_time;
  const mediaUrls = event.image_urls?.length ? event.image_urls : event.image_url ? [event.image_url] : [];
  const mediaTypes = event.image_urls?.length ? event.media_types : event.media_type ? [event.media_type] : [];

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <EventShareModal visible={shareModalVisible} onClose={() => setShareModalVisible(false)} event={event} />
      <EventParticipantsModal visible={participantsModalVisible} onClose={() => setParticipantsModalVisible(false)} eventId={id as string} />
      <MusicRequestModal visible={musicModalVisible} onClose={() => setMusicModalVisible(false)} eventId={id as string} />
      <ActionFeedback {...feedback} onClose={() => setFeedback({ ...feedback, visible: false })} />
      <FullscreenMediaViewer 
        visible={fullMediaVisible} 
        onClose={() => setFullMediaVisible(false)} 
        mediaUrls={mediaUrls} 
        mediaTypes={mediaTypes as any} 
        initialIndex={activeMediaIndex} 
      />

      <Modal transparent visible={deleteModalVisible} animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDeleteModalVisible(false)}>
          <Pressable style={styles.modalContent}>
            <View style={styles.trashIcon}><Trash2 size={28} color="#FF3B30" /></View>
            <Text style={styles.modalTitle}>Excluir Evento</Text>
            <Text style={styles.modalDesc}>Tem certeza que deseja excluir este evento? Esta ação é irreversível.</Text>
            <View style={{ width: '100%', gap: 10 }}>
              <TouchableOpacity style={styles.btnDanger} onPress={async () => {
                setDeleteModalVisible(false);
                await supabase.from('events').delete().eq('id', id);
                router.back();
              }}>
                <Text style={styles.btnTextWhite}>Excluir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setDeleteModalVisible(false)}>
                <Text style={styles.btnTextWhite}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FIXED STICKY HEADER */}
      <View style={[styles.floatingHeader, { paddingTop: Platform.OS === 'ios' ? 60 : 40, zIndex: 100 }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: backgroundPrimary, borderBottomWidth: 1, borderBottomColor: isDark ? '#222' : '#eee' }, headerBackgroundStyle]} />
        <TouchableOpacity onPress={() => router.back()} style={styles.glassBtn}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Animated.Text style={[styles.stickyTitle, { color: textPrimary }, headerBackgroundStyle]} numberOfLines={1}>
          {event.title}
        </Animated.Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShareModalVisible(true)} style={styles.glassBtn}>
            <Share2 size={22} color="#fff" />
          </TouchableOpacity>
          {user?.id === event.creator_id && (
            <>
              <TouchableOpacity style={[styles.glassBtn, { backgroundColor: '#FF3B30', marginLeft: 8 }]} onPress={() => setDeleteModalVisible(true)}>
                <Trash2 size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.glassBtn, { backgroundColor: accent, marginLeft: 8 }]} onPress={() => router.push(`/event/edit/${id}`)}>
                <Edit3 size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* BACKGROUND PARALLAX IMAGE (NO BLUR, JUST COVER) */}
      <Animated.View style={[styles.parallaxImageContainer, imageAnimatedStyle]}>
        <Animated.ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setActiveMediaIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}>
          {mediaUrls.map((url: string, i: number) => (
            <TouchableOpacity key={i} activeOpacity={0.9} style={{ width: SCREEN_WIDTH, height: HEADER_HEIGHT }} onPress={() => setFullMediaVisible(true)}>
              {mediaTypes?.[i] === 'video' ? (
                <Video source={{ uri: url }} style={styles.media} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted />
              ) : (
                <Image source={{ uri: url }} style={styles.media} resizeMode="cover" />
              )}
              <LinearGradient colors={['rgba(0,0,0,0.2)', 'transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>
        {mediaUrls.length > 1 && (
          <View style={styles.pagination}>
            {mediaUrls.map((_: any, i: number) => (
              <View key={i} style={[styles.dot, i === activeMediaIndex && { backgroundColor: accent, width: 20 }]} />
            ))}
          </View>
        )}
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT - 60, paddingBottom: 150 }}
      >
        <Animated.View style={[styles.pullIndicator, pullIndicatorStyle]}>
          <Text style={styles.pullText}>Solte para ver a imagem toda</Text>
        </Animated.View>

        <View style={[styles.contentContainer, { backgroundColor: backgroundPrimary }]}>
          
          <View style={styles.headerInfo}>
            {event.categories && (
              <View style={[styles.catTag, { backgroundColor: accent + '15' }]}>
                <Text style={[styles.catText, { color: accent }]}>{event.categories.icon} {event.categories.name}</Text>
              </View>
            )}
            <Text style={[styles.heroTitle, { color: textPrimary }]}>{event.title}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.organizerRow, { borderBottomColor: isDark ? '#222' : '#eee' }]} 
            onPress={() => router.push(`/profile/${event.profiles?.id}`)}
          >
            {event.profiles?.avatar_url ? (
              <Image source={{ uri: event.profiles.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: accent }]}>
                <Text style={styles.avatarText}>
                  {event.profiles?.username?.charAt(0).toUpperCase() || event.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.name, { color: textPrimary }]}>{event.profiles?.full_name || event.profiles?.username}</Text>
                {event.profiles?.is_verified && <Sparkles size={13} color="#FF1493" fill="#FF1493" />}
              </View>
              <Text style={[styles.sub, { color: textSecondary }]}>{isPublication ? 'Autor' : 'Organizador do evento'}</Text>
            </View>
            <ChevronRight size={20} color={textSecondary} />
          </TouchableOpacity>

          {!isPublication && (
            <View style={[styles.infoSection, { borderBottomColor: isDark ? '#222' : '#eee' }]}>
              <View style={styles.infoRow}>
                <Calendar size={24} color={accent} />
                <View>
                  <Text style={[styles.infoVal, { color: textPrimary }]}>{formatDate(event.event_date)}</Text>
                  <Text style={[styles.infoLabel, { color: textSecondary }]}>DATA DO EVENTO</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Clock size={24} color="#ff1493" />
                <View>
                  <Text style={[styles.infoVal, { color: textPrimary }]}>
                    {event.event_time?.slice(0, 5)} {event.end_time ? `às ${event.end_time.slice(0, 5)}` : ''}
                  </Text>
                  <Text style={[styles.infoLabel, { color: textSecondary }]}>HORÁRIO</Text>
                </View>
              </View>
              {event.is_paid && (
                <View style={styles.infoRow}>
                  <Ticket size={24} color="#34C759" />
                  <View>
                    <Text style={[styles.infoVal, { color: textPrimary }]}>
                      {event.max_price && event.max_price > event.price
                        ? `R$ ${Number(event.price).toFixed(2).replace('.', ',')} - R$ ${Number(event.max_price).toFixed(2).replace('.', ',')}`
                        : `R$ ${Number(event.price || 0).toFixed(2).replace('.', ',')}`}
                    </Text>
                    <Text style={[styles.infoLabel, { color: textSecondary }]}>VALOR DO INGRESSO</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={[styles.section, { borderBottomColor: isDark ? '#222' : '#eee' }]}>
            <Text style={[styles.secTitle, { color: textPrimary }]}>Sobre o Evento</Text>
            <Text style={[styles.desc, { color: textSecondary }]} selectable>{event.description}</Text>
          </View>

          {!isPublication && event.ticket_url && (
            <View style={[styles.section, { borderBottomColor: isDark ? '#222' : '#eee' }]}>
              <Text style={[styles.secTitle, { color: textPrimary }]}>Ingressos</Text>
              <TouchableOpacity 
                style={[styles.uberBtn, { backgroundColor: accent }]}
                onPress={() => Linking.openURL(event.ticket_url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o link.'))}
              >
                <Ticket size={20} color="#fff" />
                <Text style={styles.btnTextWhite}>Comprar Ingresso</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isPublication && event.location_name && (
            <View style={[styles.section, { borderBottomColor: isDark ? '#222' : '#eee' }]}>
              <Text style={[styles.secTitle, { color: textPrimary }]}>Como Chegar</Text>
              <TouchableOpacity style={styles.infoRowMap} onPress={openMap}>
                <View style={styles.iconCircleMap}><MapPin size={24} color="#34C759" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoVal, { color: textPrimary }]}>{event.location_name}</Text>
                  <Text style={[styles.infoLabel, { color: textSecondary }]}>Tocar para abrir o mapa</Text>
                </View>
                <Navigation2 size={20} color={textSecondary} />
              </TouchableOpacity>

              {event.latitude && event.longitude && (
                <View style={styles.mapContainer} pointerEvents="none">
                  <MapView
                    style={{ flex: 1 }}
                    initialRegion={{ latitude: event.latitude, longitude: event.longitude, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
                    scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}
                    userInterfaceStyle={isDark ? "dark" : "light"}
                  >
                    <Marker coordinate={{ latitude: event.latitude, longitude: event.longitude }} pinColor={accent} />
                  </MapView>
                </View>
              )}

              <TouchableOpacity 
                style={styles.uberBtn}
                onPress={async () => {
                  try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    const label = encodeURIComponent(event.location_name || 'Evento');
                    const uberUrl = `uber://?action=setPickup&pickup=my_location&dropoff[latitude]=${event.latitude}&dropoff[longitude]=${event.longitude}&dropoff[nickname]=${label}`;
                    const webUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${event.latitude}&dropoff[longitude]=${event.longitude}&dropoff[nickname]=${label}`;
                    
                    try {
                      const supported = await Linking.canOpenURL(uberUrl);
                      if (supported) {
                        await Linking.openURL(uberUrl);
                      } else {
                        await Linking.openURL(webUrl);
                      }
                    } catch (err) {
                      await Linking.openURL(webUrl);
                    }
                  } catch (e) { 
                    Alert.alert('Erro', 'Uber indisponível.'); 
                  }
                }}
              >
                <Car size={20} color="#fff" />
                <Text style={styles.btnTextWhite}>Chegar com Uber</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isPublication && (
            <View style={[styles.section, { borderBottomColor: isDark ? '#222' : '#eee' }]}>
              <Text style={[styles.secTitle, { color: textPrimary }]}>Mural do DJ</Text>
              <TouchableOpacity style={styles.musicBanner} onPress={() => setMusicModalVisible(true)}>
                <View style={styles.musicIconCircle}><Music size={24} color="#fff" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.musicBannerTitle}>Qual a vibe de hoje?</Text>
                  <Text style={styles.musicBannerSub}>Peça sua música favorita para tocar no rolê.</Text>
                </View>
                <ChevronRight size={20} color="#ff1493" />
              </TouchableOpacity>
            </View>
          )}

          {!isPublication && (
            <View style={[styles.section, { borderBottomWidth: 0 }]}>
              <Text style={[styles.secTitle, { color: textPrimary }]}>Comunidade</Text>
              <EventStoriesBar eventId={id as string} isParticipant={rsvpStatus === 'going' || user?.id === event.creator_id} />
              <EventPresenceList eventId={id as string} />
            </View>
          )}

        </View>
      </Animated.ScrollView>

      {/* FIXED BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, { backgroundColor: backgroundPrimary, borderTopColor: isDark ? '#222' : '#eee' }]}>
        {(() => {
          const isFinished = (() => {
            if (!event?.event_date || !event?.event_time) return false;
            const [year, month, day] = (event.event_date as string).split('-').map(Number);
            const timeString = event.end_time || event.event_time;
            const [hour, min] = (timeString as string).split(':').map(Number);
            const eventDateTime = new Date(year, month - 1, day, hour, min);
            if (!event.end_time) eventDateTime.setHours(eventDateTime.getHours() + 2);
            return new Date() > eventDateTime;
          })();

          if (user?.id === event.creator_id) {
            return (
              <TouchableOpacity onPress={() => router.push(`/event/${id}/chat`)} style={[styles.mainBtn, { backgroundColor: accent }]}>
                <MessageCircle size={20} color="#fff" />
                <Text style={styles.btnTextWhite}>Chat do Evento</Text>
              </TouchableOpacity>
            );
          }

          return (
            <>
              <TouchableOpacity 
                onPress={isFinished ? undefined : handleRSVP} 
                style={[styles.mainBtn, { backgroundColor: isFinished ? (isDark ? '#333' : '#e0e0e0') : (rsvpStatus === 'going' ? '#34C759' : accent) }]}
                activeOpacity={isFinished ? 1 : 0.7}
              >
                {isFinished ? <X size={20} color={isDark ? '#888' : '#666'} /> : (event.type === 'event' ? <Users size={20} color="#fff" /> : <MessageCircle size={20} color="#fff" />)}
                <Text style={[styles.btnTextWhite, isFinished && { color: isDark ? '#888' : '#666' }]}>
                  {isFinished ? 'Evento Encerrado' : (rsvpStatus === 'going' ? 'Confirmado' : 'Confirmar Presença')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.chatBtn, { borderColor: isDark ? '#333' : '#eee' }]} onPress={() => router.push(`/event/${id}/chat`)}>
                <MessageCircle size={24} color={accent} />
              </TouchableOpacity>
            </>
          );
        })()}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  stickyTitle: { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center', marginHorizontal: 16 },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  parallaxImageContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 0 },
  media: { width: '100%', height: '100%' },
  pagination: { position: 'absolute', bottom: 70, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
  pullIndicator: { position: 'absolute', top: HEADER_HEIGHT - 100, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  pullText: { color: '#fff', fontSize: 14, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  contentContainer: { minHeight: SCREEN_HEIGHT, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' },
  headerInfo: { padding: 24, paddingTop: 32 },
  catTag: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100, alignSelf: 'flex-start', marginBottom: 16 },
  catText: { fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroTitle: { fontSize: 36, fontWeight: '900', letterSpacing: -1, lineHeight: 42 },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  name: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  infoSection: { padding: 24, gap: 24, borderBottomWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  infoRowMap: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  infoVal: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  infoLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, opacity: 0.6 },
  section: { padding: 24, borderBottomWidth: 1 },
  secTitle: { fontSize: 24, fontWeight: '900', marginBottom: 20, letterSpacing: -0.5 },
  desc: { fontSize: 17, lineHeight: 28, opacity: 0.8 },
  liveBadge: { backgroundColor: 'rgba(52, 199, 89, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  liveText: { color: '#34C759', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  matchBannerActive: { backgroundColor: '#111', borderRadius: 28, padding: 20, shadowColor: '#ff1493', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  heartCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255, 20, 147, 0.15)', justifyContent: 'center', alignItems: 'center' },
  matchBannerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  matchBannerSub: { color: '#aaa', fontSize: 14, fontWeight: '500' },
  matchBannerLocked: { alignItems: 'center', padding: 32, borderRadius: 28 },
  iconCircleMap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(52, 199, 89, 0.1)', justifyContent: 'center', alignItems: 'center' },
  mapContainer: { width: '100%', height: 180, borderRadius: 24, overflow: 'hidden', marginBottom: 20 },
  uberBtn: { backgroundColor: '#276EF1', flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, borderRadius: 24 },
  musicBanner: { backgroundColor: 'rgba(255, 20, 147, 0.08)', borderRadius: 28, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  musicBannerTitle: { fontSize: 18, fontWeight: '900', marginBottom: 4, color: '#ff1493' },
  musicBannerSub: { fontSize: 14, fontWeight: '500', color: '#ff1493' },
  musicIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ff1493', justifyContent: 'center', alignItems: 'center' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, flexDirection: 'row', gap: 12, borderTopWidth: 1 },
  mainBtn: { flex: 1, height: 64, borderRadius: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnTextWhite: { color: '#fff', fontSize: 17, fontWeight: '900' },
  chatBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1C1C1E', borderRadius: 28, padding: 32, width: '100%', maxWidth: 360, alignItems: 'center' },
  trashIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255, 59, 48, 0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 12, letterSpacing: -0.5 },
  modalDesc: { color: '#8E8E93', fontSize: 15, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  btnDanger: { backgroundColor: '#FF3B30', borderRadius: 16, paddingVertical: 18, width: '100%', alignItems: 'center' },
  btnCancel: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 16, paddingVertical: 18, width: '100%', alignItems: 'center' }
});
