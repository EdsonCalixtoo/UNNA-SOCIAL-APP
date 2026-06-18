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
  ChevronRight, Users, Trash2, Flag, Ticket, Scan
} from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { notifyEventPresence } from '@/lib/notifications';
import { useLanguage } from '@/lib/i18n';
import { EventShareModal } from '@/components/EventShareModal';
import { EventParticipantsModal } from '@/components/EventParticipantsModal';
import { EventTicketModal } from '@/components/EventTicketModal';
import { EventPresenceList } from '@/components/EventPresenceList';
import { EventStoriesBar } from '@/components/EventStoriesBar';
import { QRScannerModal } from '@/components/QRScannerModal';
import { ActionFeedback } from '@/components/ActionFeedback';
import { offlineService } from '@/services/offlineService';
import Animated, { 
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler,
  interpolate, Extrapolation, withSpring
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { soundService } from '@/utils/soundService';
import { hapticFeedback } from '@/utils/haptics';
import * as ExpoCalendar from 'expo-calendar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Snap points absolutos da tela
const SNAP_TOP = SCREEN_HEIGHT * 0.15;   
const SNAP_MIDDLE = SCREEN_HEIGHT * 0.55; 
const SNAP_BOTTOM = SCREEN_HEIGHT * 0.90; // 90% (Painel bem recolhido, mostrando máxima imagem) 

// A altura do painel é exatamente o espaço que resta na tela quando ele está aberto no topo
const PANEL_HEIGHT = SCREEN_HEIGHT - SNAP_TOP;

const MemoizedCard = memo(({ children, style, onPress }: any) => (
  <TouchableOpacity 
    activeOpacity={0.9} 
    style={[styles.card, style]} 
    onPress={onPress}
    disabled={!onPress}
  >
    {children}
  </TouchableOpacity>
));

const MemoizedInfoGrid = memo(({ date, time, endTime, accent, textPrimary, backgroundSecondary, formatDate, t }: any) => (
  <View style={styles.grid}>
    <View style={[styles.infoCard, { backgroundColor: backgroundSecondary }]}>
      <Calendar size={20} color={accent} />
      <Text style={[styles.label, { color: textPrimary, opacity: 0.5 }]}>{t('auto.se44f9e34', 'DATA')}</Text>
      <Text style={[styles.val, { color: textPrimary }]}>{formatDate(date)}</Text>
    </View>
    <View style={[styles.infoCard, { backgroundColor: backgroundSecondary }]}>
      <Clock size={20} color="#ff1493" />
      <Text style={[styles.label, { color: textPrimary, opacity: 0.5 }]}>{t('auto.s599ed4c2', 'HORÁRIO')}</Text>
      <Text style={[styles.val, { color: textPrimary }]}>
        {time?.slice(0, 5)} {endTime ? `às ${endTime.slice(0, 5)}` : ''}
      </Text>
    </View>
  </View>
));

export default function EventDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent: defaultAccent, isDark } = useTheme();
  const { t } = useLanguage();

  const [event, setEvent] = useState<any>(null);
  
  // Dynamic Theme calculation
  const eventAccent = useMemo(() => {
    if (!event?.categories?.name) return defaultAccent;
    const cat = event.categories.name.toLowerCase();
    if (cat.includes('festa') || cat.includes('show') || cat.includes('balada')) return '#ff1493'; // Deep Pink
    if (cat.includes('esporte') || cat.includes('treino')) return '#34C759'; // Apple Green
    if (cat.includes('tech') || cat.includes('geek')) return '#7b2fff'; // Purple
    if (cat.includes('food') || cat.includes('gastronomia')) return '#FF9500'; // Orange
    if (cat.includes('arte') || cat.includes('cultura')) return '#FF3B30'; // Red
    return defaultAccent;
  }, [event, defaultAccent]);

  const accent = eventAccent; // Override local accent with dynamic one
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<'going' | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [feedback, setFeedback] = useState({ visible: false, type: 'success' as any, title: '', message: '' });
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const translateY = useSharedValue(SNAP_MIDDLE); // Começa no meio, com o botão visível
  const scrollY = useSharedValue(0);

  useEffect(() => { 
    loadEvent(); 
    loadRSVPStatus(); 
  }, [id]);

  // Lógica para Web: Tenta abrir o App, se falhar, redireciona para a loja
  useEffect(() => {
    if (Platform.OS === 'web' && id && id !== 'undefined') {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isAndroid = /android/i.test(userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

      if (isAndroid || isIOS) {
        // 1. Tenta abrir o app através do Custom Scheme
        window.location.href = `unna-social-app://event/${id}`;

        // 2. Se não abrir em 2.5s (porque não tem o app instalado), vai pra loja
        setTimeout(() => {
          if (isAndroid) {
            // URL da Play Store
            window.location.href = 'https://play.google.com/store/apps/details?id=com.bolt.starter';
          } else if (isIOS) {
            // URL da App Store (Substitua o ID pelo ID real do seu app depois que publicar)
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
        profiles:creator_id (id, username, full_name, avatar_url)
      `).eq('id', id).maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setEvent(data);
        // Salva no cache para uso offline posterior
        offlineService.cacheEvent(data);
      } else {
        // Se não achou online, tenta o offline antes de dar erro
        const cached = await offlineService.getCachedEvent(id as string);
        if (cached) {
          setEvent(cached);
        } else {
          Alert.alert('Evento não encontrado', 'Este evento pode ter sido removido ou você está sem conexão e não tem ele salvo offline.');
          router.back();
        }
      }
    } catch (e) { 
      console.error('Error loading event:', e);
      
      // TENTA CARREGAR DO CACHE EM CASO DE ERRO (Ex: Sem Internet)
      const cached = await offlineService.getCachedEvent(id as string);
      if (cached) {
        setEvent(cached);
        // Opcional: Avisar o usuário que está em modo offline
      } else {
        Alert.alert('Erro de Conexão', 'Não foi possível carregar os detalhes e você não tem este evento salvo offline.'); 
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
        Platform.OS === 'ios'
          ? c.allowsModifications && c.source.name === 'iCloud'
          : c.allowsModifications && c.isPrimary
      ) || calendars.find(c => c.allowsModifications);

      if (!defaultCal) {
        Alert.alert('Erro', 'Nenhum calendário editável encontrado no seu dispositivo.');
        return;
      }

      // Build start/end Date from event fields
      const [year, month, day] = (event.event_date as string).split('-').map(Number);
      const [startHour, startMin] = (event.event_time as string).split(':').map(Number);
      const startDate = new Date(year, month - 1, day, startHour, startMin);

      let endDate: Date;
      if (event.end_time) {
        const [endHour, endMin] = (event.end_time as string).split(':').map(Number);
        endDate = new Date(year, month - 1, day, endHour, endMin);
      } else {
        endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2h default
      }

      await ExpoCalendar.createEventAsync(defaultCal.id, {
        title: event.title,
        startDate,
        endDate,
        location: event.location_name || '',
        notes: event.description || '',
        alarms: [{ relativeOffset: -60 }, { relativeOffset: -15 }], // 1h e 15min antes
      });

      Alert.alert('✅ Adicionado!', 'O evento foi salvo na sua agenda com lembretes 1h e 15min antes.');
    } catch (err) {
      console.error('Calendar error:', err);
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
        setFeedback({
          visible: true,
          type: 'success',
          title: 'Presença Removida',
          message: 'Sua presença foi cancelada com sucesso.'
        });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await supabase.from('event_participants').insert({ event_id: id as string, user_id: user.id });
        
        // Notificar dono do evento e os seguidores (FOMO)
        notifyEventPresence(id as string, event.title, user.id, event.creator_id);

        setRsvpStatus('going'); 
        soundService.play('success');
        setFeedback({
          visible: true,
          type: 'success',
          title: event.type === 'event' ? 'Presença Confirmada! 🎉' : 'Interesse Registrado!',
          message: event.type === 'event' ? 'Você confirmou sua presença neste evento. Prepare o look e nos vemos lá!' : 'O autor foi notificado do seu interesse.'
        });

        // Offer to add to native calendar
        if (event.type === 'event') {
          setTimeout(() => {
            Alert.alert(
              '📅 Adicionar à Agenda?',
              `Quer salvar "${event.title}" na agenda do seu celular com lembretes automáticos?`,
              [
                { text: 'Agora não', style: 'cancel' },
                { text: 'Sim, adicionar!', onPress: addEventToCalendar }
              ]
            );
          }, 800);
        }
      }
    } catch (error) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Ops!',
        message: 'Não foi possível completar esta ação. Tente novamente.'
      });
    }
  };

  const openMap = () => {
    if (!event?.latitude || !event?.longitude) {
      Alert.alert('Aviso', 'Coordenadas do local não encontradas.');
      return;
    }
    
    const lat = event.latitude;
    const lng = event.longitude;
    const label = event.location_name;
    
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const wazeUrl = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    const appleMapsUrl = `https://maps.apple.com/?q=${encodeURIComponent(label)}&ll=${lat},${lng}`;

    Alert.alert(
      'Abrir no GPS',
      'Como deseja chegar ao local?',
      [
        { 
          text: 'Waze', 
          onPress: () => {
            Linking.openURL(wazeUrl).catch(() => Alert.alert('Erro', 'Não foi possível abrir o Waze'));
          } 
        },
        { 
          text: 'Google Maps', 
          onPress: () => {
            Linking.openURL(googleMapsUrl).catch(() => Alert.alert('Erro', 'Não foi possível abrir o Google Maps'));
          } 
        },
        { 
          text: 'Mapas Apple', 
          onPress: () => {
            const url = Platform.OS === 'ios' 
              ? `maps://?q=${encodeURIComponent(label)}&ll=${lat},${lng}`
              : appleMapsUrl;
            Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o Mapas'));
          } 
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };


  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  // O handler monitora a posição interna do ScrollView
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Pan apenas no handle — sem conflito com scroll
  const panGesture = Gesture.Pan()
    .onChange((e) => {
      translateY.value = Math.min(SNAP_BOTTOM, Math.max(SNAP_TOP, translateY.value + e.changeY));
    })
    .onEnd((e) => {
      const isSwipingUp = e.velocityY < -300;
      const isSwipingDown = e.velocityY > 300;

      let closest;
      if (isSwipingUp) {
        closest = translateY.value > SNAP_MIDDLE ? SNAP_MIDDLE : SNAP_TOP;
      } else if (isSwipingDown) {
        closest = translateY.value < SNAP_MIDDLE ? SNAP_MIDDLE : SNAP_BOTTOM;
      } else {
        const target = translateY.value + e.velocityY * 0.1;
        const snaps = [SNAP_TOP, SNAP_MIDDLE, SNAP_BOTTOM];
        closest = snaps.reduce((prev, curr) =>
          Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
        );
      }

      translateY.value = withSpring(closest, {
        damping: 22,
        stiffness: 180,
        mass: 0.8
      });
    });

  const backgroundStyle = useAnimatedStyle(() => {
    // Parallax real sem invadir a tela
    const translateYBg = interpolate(translateY.value, [SNAP_TOP, SNAP_BOTTOM], [-SCREEN_HEIGHT * 0.1, 0], Extrapolation.CLAMP);
    const scale = interpolate(translateY.value, [SNAP_TOP, SNAP_BOTTOM], [1.1, 1], Extrapolation.CLAMP);
    return {
      position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT,
      transform: [{ translateY: translateYBg }, { scale }] as any,
      zIndex: 1,
    };
  });

  const headerInfoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [SNAP_TOP, SNAP_MIDDLE], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(translateY.value, [SNAP_TOP, SNAP_MIDDLE], [-20, 0], Extrapolation.CLAMP) }] as any
  }));

  const panelStyle = useAnimatedStyle(() => ({
    position: 'absolute', top: SNAP_TOP, left: 0, right: 0, height: PANEL_HEIGHT,
    // Como a origem do painel é SNAP_TOP, a translação é ajustada subtraindo o SNAP_TOP
    transform: [{ translateY: translateY.value - SNAP_TOP }] as any,
    zIndex: 10,
    backgroundColor: backgroundPrimary,
    borderTopLeftRadius: 40, borderTopRightRadius: 40, 
    shadowColor: "#000", shadowOffset: { width: 0, height: -10 }, 
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 20, 
    overflow: 'hidden'
  }));

  const bottomBarStyle = useAnimatedStyle(() => {
    // A barra fica perfeitamente fixada na base da tela nos estados TOP e MIDDLE.
    // Quando o painel desce para o BOTTOM, a barra "acompanha" e some da tela.
    const translate = interpolate(
      translateY.value,
      [SNAP_MIDDLE, SNAP_BOTTOM],
      [0, 150], // Desce 150px para sumir completamente
      Extrapolation.CLAMP
    );
    return {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      transform: [{ translateY: translate }] as any,
      zIndex: 1000,
    };
  });

  const formatDate = (d: string) => {
    // Force midday to avoid timezone shift backwards
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <EventShareModal visible={shareModalVisible} onClose={() => setShareModalVisible(false)} event={event} />
        <EventParticipantsModal visible={participantsModalVisible} onClose={() => setParticipantsModalVisible(false)} eventId={id as string} />
        <ActionFeedback 
          {...feedback} 
          onClose={() => setFeedback({ ...feedback, visible: false })} 
        />

        {/* CUSTOM PREMIUM DELETE CONFIRMATION DIALOG MODAL */}
        <Modal
          transparent
          visible={deleteModalVisible}
          animationType="fade"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <Pressable 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }]}
            onPress={() => setDeleteModalVisible(false)}
          >
            <Pressable style={{
              backgroundColor: '#1C1C1E',
              borderRadius: 24,
              padding: 24,
              width: '100%',
              maxWidth: 340,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 8,
            }}>
              {/* Ícone de alerta de lixeira vermelha com círculo de fundo */}
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: 'rgba(255, 59, 48, 0.12)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <Trash2 size={28} color="#FF3B30" />
              </View>

              <Text style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: '800',
                textAlign: 'center',
                marginBottom: 10,
              }}>
                {t('events.deleteEvent', 'Excluir Evento')}
              </Text>

              <Text style={{
                color: '#8E8E93',
                fontSize: 14,
                lineHeight: 20,
                textAlign: 'center',
                marginBottom: 24,
              }}>
                {t('events.deleteConfirm', 'Tem certeza que deseja excluir este evento? Esta ação é irreversível e removerá todos os participantes.')}
              </Text>

              <View style={{ width: '100%', gap: 10 }}>
                {/* Botão de Excluir */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#FF3B30',
                    borderRadius: 14,
                    paddingVertical: 14,
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={async () => {
                    setDeleteModalVisible(false);
                    try {
                      const { error } = await supabase.from('events').delete().eq('id', id);
                      if (error) throw error;
                      router.back();
                    } catch (e) {
                      setFeedback({
                        visible: true,
                        title: 'Erro',
                        message: 'Não foi possível excluir o evento.',
                        type: 'error'
                      });
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{t('common.delete', 'Excluir')}</Text>
                </TouchableOpacity>

                {/* Botão de Cancelar */}
                <TouchableOpacity
                  style={{
                    borderRadius: 14,
                    paddingVertical: 14,
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{t('common.cancel', 'Cancelar')}</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <View style={{ flex: 1 }}>
          {/* BACKGROUND FULLSCREEN CAROUSEL */}
          <Animated.View style={backgroundStyle}>
            <Animated.ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setActiveMediaIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
              }}
            >
              {mediaUrls.map((url: string, i: number) => (
                <View key={i} style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
                  {mediaTypes?.[i] === 'video' ? (
                    <Video source={{ uri: url }} style={styles.media} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted />
                  ) : (
                    <Animated.Image 
                      source={{ uri: url }} 
                      style={styles.media} 
                      resizeMode="cover" 
                    />
                  )}
                  <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFill} />
                </View>
              ))}
            </Animated.ScrollView>

            {mediaUrls.length > 1 && (
              <View style={styles.pagination}>
                {mediaUrls.map((_: any, i: number) => (
                  <View key={i} style={[styles.dot, i === activeMediaIndex && { backgroundColor: accent, width: 20 }]} />
                ))}
              </View>
            )}

            <Animated.View style={[styles.imageInfo, headerInfoStyle]}>
              {event.categories && (
                <View style={styles.catTag}>
                  <Text style={styles.catText}>{event.categories.icon} {event.categories.name}</Text>
                </View>
              )}
              <Text style={styles.heroTitle}>{event.title}</Text>
            </Animated.View>
          </Animated.View>

          {/* HEADER FLOATING FIXO (Botão Voltar) */}
          <View style={[styles.floatingHeader, { paddingTop: Platform.OS === 'ios' ? 60 : 40, zIndex: 100 }]} pointerEvents="box-none">
            <TouchableOpacity onPress={() => router.back()} style={styles.glassBtn}><ArrowLeft size={24} color="#fff" /></TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => setShareModalVisible(true)} style={styles.glassBtn}><Share2 size={22} color="#fff" /></TouchableOpacity>
              {user?.id === event.creator_id && (
                <>
                  <TouchableOpacity style={[styles.glassBtn, { backgroundColor: accent, marginLeft: 8 }]} onPress={() => router.push(`/event/edit/${id}`)}>
                    <Edit3 size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.glassBtn, { backgroundColor: '#ff3b30', marginLeft: 8 }]} onPress={handleDelete}>
                    <Trash2 size={20} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* PAINEL DESLIZANTE — sem GestureDetector no painel todo */}
          <Animated.View style={panelStyle}>

            {/* HANDLE: Único área que responde ao gesto de arrastar o painel */}
            <GestureDetector gesture={panGesture}>
              <View style={styles.dragHandleArea}>
                <View style={styles.dragIndicator} />
              </View>
            </GestureDetector>

            {/* SCROLL: completamente independente, sempre ativo */}
            <Animated.ScrollView
              scrollEnabled={true}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              bounces={true}
              contentContainerStyle={{ paddingBottom: 220 }}
            >
                <View style={styles.mainContent}>
                  <MemoizedCard style={{ backgroundColor: backgroundSecondary }} onPress={() => router.push(`/profile/${event.profiles?.id}`)}>
                    <View style={styles.row}>
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
                        <Text style={[styles.name, { color: textPrimary }]}>{event.profiles?.full_name || event.profiles?.username}</Text>
                        <Text style={[styles.sub, { color: textSecondary }]}>{isPublication ? 'Autor' : 'Organizador'}</Text>
                      </View>
                      <ChevronRight size={20} color={textSecondary} />
                    </View>
                  </MemoizedCard>

                  {event.type === 'event' && (
                    <MemoizedInfoGrid 
                      date={event.event_date} 
                      time={event.event_time}
                      endTime={event.end_time}
                      accent={accent} 
                      textPrimary={textPrimary} 
                      backgroundSecondary={backgroundSecondary} 
                      formatDate={formatDate}
                      t={t}
                    />
                  )}

                  {event.location_name && (
                    <MemoizedCard style={{ backgroundColor: backgroundSecondary, padding: 0, overflow: 'hidden' }} onPress={openMap}>
                      <View style={{ padding: 16, flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                        <MapPin size={24} color="#34C759" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.label, { color: textPrimary, opacity: 0.5 }]}>{t('auto.s43f1d53c', 'LOCALIZAÇÃO')}</Text>
                          <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '500', lineHeight: 20, marginTop: 4 }}>{event.location_name}</Text>
                        </View>
                        <Navigation2 size={18} color={accent} />
                      </View>
                      {event.latitude && event.longitude && (
                        <View style={{ width: '100%', height: 120, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} pointerEvents="none">
                          <MapView
                            style={{ flex: 1 }}
                            initialRegion={{
                              latitude: event.latitude,
                              longitude: event.longitude,
                              latitudeDelta: 0.005,
                              longitudeDelta: 0.005,
                            }}
                            scrollEnabled={false}
                            zoomEnabled={false}
                            pitchEnabled={false}
                            rotateEnabled={false}
                            userInterfaceStyle={isDark ? "dark" : "light"}
                          >
                            <Marker 
                              coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                              pinColor={accent}
                            />
                          </MapView>
                          <LinearGradient 
                            colors={isDark ? ['transparent', 'rgba(0,0,0,0.8)'] : ['transparent', 'rgba(255,255,255,0.8)']} 
                            style={StyleSheet.absoluteFillObject}
                            pointerEvents="none"
                          />
                        </View>
                      )}
                    </MemoizedCard>
                  )}

                  {event.ticket_url && (
                    <MemoizedCard 
                      style={{ 
                        backgroundColor: backgroundSecondary, 
                        borderColor: '#ff1493' + '40',
                        borderWidth: 1.5,
                        flexDirection: 'row', 
                        gap: 16, 
                        alignItems: 'center' 
                      }} 
                      onPress={async () => {
                        try {
                          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          let targetUrl = event.ticket_url.trim();
                          if (!/^https?:\/\//i.test(targetUrl)) {
                            targetUrl = 'https://' + targetUrl;
                          }
                          
                          const encodedUrl = encodeURI(targetUrl);
                          const supported = await Linking.canOpenURL(encodedUrl);
                          
                          if (supported) {
                            await Linking.openURL(encodedUrl);
                          } else {
                            Alert.alert('Navegador não encontrado', 'Este dispositivo não possui um aplicativo de navegador de internet instalado para abrir este link.');
                          }
                        } catch (error) {
                          Alert.alert('Erro', 'Não foi possível abrir o link de ingressos. Certifique-se de que o link inserido é válido.');
                        }
                      }}
                    >
                      <Ticket size={24} color="#ff1493" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: '#ff1493', opacity: 0.9, fontWeight: '900' }]}>{t('events.buyTickets', 'COMPRAR INGRESSOS')}</Text>
                        <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '700', marginTop: 4 }}>{t('events.acquireTickets', 'Adquirir ingressos para este evento')}</Text>
                      </View>
                      <ChevronRight size={18} color="#ff1493" />
                    </MemoizedCard>
                  )}

                  {event.profiles?.whatsapp_number && (
                    <MemoizedCard 
                      style={{ 
                        backgroundColor: '#25D366' + '20', 
                        borderColor: '#25D366' + '40',
                        borderWidth: 1.5,
                        flexDirection: 'row', 
                        gap: 16, 
                        alignItems: 'center' 
                      }} 
                      onPress={async () => {
                        try {
                          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          const msg = encodeURIComponent(`Olá! Vi o evento "${event.title}" no UNNA e gostaria de mais informações / reservar.`);
                          const phone = event.profiles.whatsapp_number.replace(/\D/g, '');
                          const url = `whatsapp://send?phone=55${phone}&text=${msg}`;
                          
                          const supported = await Linking.canOpenURL(url);
                          if (supported) {
                            await Linking.openURL(url);
                          } else {
                            Alert.alert('Erro', 'Você não tem o WhatsApp instalado.');
                          }
                        } catch (error) {
                          Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
                        }
                      }}
                    >
                      <MessageCircle size={24} color="#25D366" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: '#25D366', opacity: 0.9, fontWeight: '900' }]}>{t('events.reserveTickets', 'RESERVAR / DÚVIDAS')}</Text>
                        <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '700', marginTop: 4 }}>{t('events.contactProducer', 'Chamar produtor no WhatsApp')}</Text>
                      </View>
                      <ChevronRight size={18} color="#25D366" />
                    </MemoizedCard>
                  )}

                  {!isPublication && (
                    <EventPresenceList eventId={id as string} />
                  )}
                  
                  {!isPublication && (
                    <EventStoriesBar 
                      eventId={id as string} 
                      isParticipant={rsvpStatus === 'going'} 
                    />
                  )}

                  <View style={styles.section}>
                    <Text style={[styles.secTitle, { color: textPrimary }]}>
                      {isPublication ? t('events.description', 'Descrição') : t('events.aboutEvent', 'Sobre o Evento')}
                    </Text>
                    <Text style={[styles.desc, { color: textSecondary }]} selectable>
                      {event.description}
                    </Text>
                  </View>
                </View>
              </Animated.ScrollView>
          </Animated.View>

          {/* FOOTER TOTALMENTE INTEGRADO E ANIMADO */}
          {/* Fica fora do panelStyle para ancorar na base da tela, mas usa bottomBarStyle para afundar junto com o painel */}
          <Animated.View style={[styles.bottomBar, bottomBarStyle, { backgroundColor: backgroundPrimary, borderTopColor: 'rgba(150,150,150,0.1)' }]}>
            {user?.id === event.creator_id ? (
              <>
                <TouchableOpacity onPress={() => router.push(`/event/${id}/chat`)} style={[styles.mainBtn, { backgroundColor: accent }]}>
                  <MessageCircle size={20} color="#fff" />
                  <Text style={[styles.btnText, { color: '#fff' }]}>{t('events.eventChat', 'Chat do Evento')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={handleRSVP} style={[styles.mainBtn, { backgroundColor: rsvpStatus === 'going' ? '#34C759' : accent }]}>
                  {event.type === 'event' ? <Users size={20} color="#fff" /> : <MessageCircle size={20} color="#fff" />}
                  <Text style={styles.btnText}>
                    {rsvpStatus === 'going' 
                      ? (event.type === 'event' ? 'Confirmado' : 'Tenho Interesse') 
                      : (event.type === 'event' ? 'Confirmar Presença' : 'Tenho Interesse')}
                  </Text>
                </TouchableOpacity>
                
                {/* Ticket modal button removed per user request */}

                <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/event/${id}/chat`)}><MessageCircle size={24} color={accent} /></TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>

      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  media: { width: '100%', height: '100%' },
  imageInfo: { position: 'absolute', bottom: 120, left: 24, right: 24 },
  catTag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8 },
  catText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  heroTitle: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  dragHandleArea: { width: '100%', height: 52, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  dragIndicator: { width: 40, height: 5, backgroundColor: 'rgba(150,150,150,0.3)', borderRadius: 3 },
  mainContent: { padding: 24, paddingTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { padding: 20, borderRadius: 28, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.15)' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  name: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  infoCard: { flex: 1, padding: 20, borderRadius: 28, gap: 8 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1, opacity: 0.5 },
  val: { fontSize: 15, fontWeight: '800' },
  section: { marginTop: 10 },
  secTitle: { fontSize: 19, fontWeight: '900', marginBottom: 12 },
  desc: { fontSize: 16, lineHeight: 28, flexWrap: 'wrap' },
  bottomBar: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, flexDirection: 'row', gap: 12, borderTopWidth: 1 },
  mainBtn: { flex: 1, height: 60, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  chatBtn: { width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  pagination: { position: 'absolute', top: 120, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6, zIndex: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' }
});
