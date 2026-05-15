import React, { useState, useEffect, memo } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity, 
  ActivityIndicator, Alert, Dimensions, Platform, StatusBar, Linking
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Calendar, Clock, MapPin, ArrowLeft,
  MessageCircle, Edit3, Share2, Navigation2,
  ChevronRight, Users, Trash2, Flag
} from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { EventShareModal } from '@/components/EventShareModal';
import { EventParticipantsModal } from '@/components/EventParticipantsModal';
import Animated, { 
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler,
  interpolate, Extrapolation, withSpring, runOnJS
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

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

const MemoizedInfoGrid = memo(({ date, time, endTime, accent, textPrimary, backgroundSecondary, formatDate }: any) => (
  <View style={styles.grid}>
    <View style={[styles.infoCard, { backgroundColor: backgroundSecondary }]}>
      <Calendar size={20} color={accent} />
      <Text style={[styles.label, { color: textPrimary, opacity: 0.5 }]}>DATA</Text>
      <Text style={[styles.val, { color: textPrimary }]}>{formatDate(date)}</Text>
    </View>
    <View style={[styles.infoCard, { backgroundColor: backgroundSecondary }]}>
      <Clock size={20} color="#ff1493" />
      <Text style={[styles.label, { color: textPrimary, opacity: 0.5 }]}>HORÁRIO</Text>
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
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpStatus, setRsvpStatus] = useState<'going' | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [scrollEnabledJS, setScrollEnabledJS] = useState(false);

  const translateY = useSharedValue(SNAP_MIDDLE); // Começa no meio, com o botão visível
  const scrollY = useSharedValue(0);

  useEffect(() => { 
    loadEvent(); 
    loadRSVPStatus(); 
  }, [id]);

  const loadEvent = async () => {
    if (!id || id === 'undefined') return;
    try {
      const { data, error } = await supabase.from('events').select(`
        *, categories:category_id (name, icon),
        profiles:creator_id (id, username, full_name, avatar_url)
      `).eq('id', id).maybeSingle(); // Usar maybeSingle para evitar erro se não existir
      
      if (error) throw error;
      
      if (!data) {
        Alert.alert('Evento não encontrado', 'Este evento pode ter sido removido ou não existe mais.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }
      
      setEvent(data);
    } catch (e) { 
      console.error('Error loading event:', e);
      Alert.alert('Erro', 'Não foi possível carregar os detalhes do evento.'); 
      router.back();
    } finally { 
      setLoading(false); 
    }
  };

  const loadRSVPStatus = async () => {
    if (!user || !id || id === 'undefined') return;
    const { data } = await supabase.from('event_participants').select('*').eq('event_id', id).eq('user_id', user.id).maybeSingle();
    if (data) setRsvpStatus('going');
  };

  const handleRSVP = async () => {
    if (!user) { Alert.alert('Login necessário'); return; }
    if (rsvpStatus === 'going') {
      await supabase.from('event_participants').delete().eq('event_id', id).eq('user_id', user.id);
      setRsvpStatus(null); 
    } else {
      await supabase.from('event_participants').insert({ event_id: id as string, user_id: user.id });
      setRsvpStatus('going'); 
      Alert.alert(
        event.type === 'event' ? 'Presença Confirmada!' : 'Interesse Registrado!',
        event.type === 'event' ? 'Você confirmou sua presença neste evento.' : 'O autor foi notificado do seu interesse.'
      );
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
    Alert.alert(
      'Excluir Evento',
      'Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const { error } = await supabase.from('events').delete().eq('id', id);
              if (error) throw error;
              router.replace('/(tabs)');
              Alert.alert('Sucesso', 'O evento foi removido.');
            } catch (e) {
              Alert.alert('Erro', 'Não foi possível excluir o evento.');
            }
          } 
        }
      ]
    );
  };

  // O handler monitora a posição interna do ScrollView
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const panGesture = Gesture.Pan()
    .onChange((e) => {
      // Se estamos no topo e fazendo scroll no conteúdo (swipe para cima), não move o painel
      if (translateY.value <= SNAP_TOP && scrollY.value > 0 && e.changeY < 0) {
        return;
      }
      
      translateY.value = Math.min(SNAP_BOTTOM, Math.max(SNAP_TOP, translateY.value + e.changeY));

      // Se o painel começar a descer do topo, desativa o scroll interno imediatamente
      if (e.changeY > 0 && scrollEnabledJS && translateY.value > SNAP_TOP + 5) {
        runOnJS(setScrollEnabledJS)(false);
      }
    })
    .onEnd((e) => {
      const isSwipingUp = e.velocityY < -500;
      const isSwipingDown = e.velocityY > 500;
      
      let closest;
      if (isSwipingUp) {
        // Se jogou pra cima, vai pro próximo snap acima
        closest = translateY.value > SNAP_MIDDLE ? SNAP_MIDDLE : SNAP_TOP;
      } else if (isSwipingDown) {
        // Se jogou pra baixo, vai pro próximo snap abaixo
        closest = translateY.value < SNAP_MIDDLE ? SNAP_MIDDLE : SNAP_BOTTOM;
      } else {
        // Se soltou devagar, vai pro mais próximo
        const target = translateY.value + e.velocityY * 0.15;
        const snaps = [SNAP_TOP, SNAP_MIDDLE, SNAP_BOTTOM];
        closest = snaps.reduce((prev, curr) => 
          Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
        );
      }

      translateY.value = withSpring(closest, { 
        damping: 24, 
        stiffness: 200, 
        mass: 0.8 
      });

      if (closest === SNAP_TOP) {
        runOnJS(setScrollEnabledJS)(true);
      } else {
        runOnJS(setScrollEnabledJS)(false);
      }
    });

  // Torna os gestos de drag e scroll simultâneos para que não haja bloqueio nem lag
  const nativeScroll = Gesture.Native();
  const composedGesture = Gesture.Simultaneous(panGesture, nativeScroll);

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
    const date = new Date(d);
    const months = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    const days = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]}`;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={accent} /></View>;
  if (!event) return null;

  const mediaUrls = event.image_urls?.length ? event.image_urls : event.image_url ? [event.image_url] : [];
  const mediaTypes = event.image_urls?.length ? event.media_types : event.media_type ? [event.media_type] : [];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <EventShareModal visible={shareModalVisible} onClose={() => setShareModalVisible(false)} event={event} />
        <EventParticipantsModal visible={participantsModalVisible} onClose={() => setParticipantsModalVisible(false)} eventId={id as string} />

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
                    <Image source={{ uri: url }} style={styles.media} resizeMode="cover" />
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

          {/* DRAGGABLE SHEET */}
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={panelStyle}>
              
              <View style={styles.dragHandleArea}>
                <View style={styles.dragIndicator} />
              </View>
              
              <Animated.ScrollView 
                scrollEnabled={scrollEnabledJS}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                bounces={false}
                contentContainerStyle={{ paddingBottom: 140 }} // Permite scroll até o fundo sem cortar
              >
                <View style={styles.mainContent}>
                  <MemoizedCard style={{ backgroundColor: backgroundSecondary }} onPress={() => router.push(`/profile/${event.profiles?.id}`)}>
                    <View style={styles.row}>
                      <Image source={{ uri: event.profiles?.avatar_url }} style={styles.avatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.name, { color: textPrimary }]}>{event.profiles?.full_name}</Text>
                        <Text style={[styles.sub, { color: textSecondary }]}>Organizador</Text>
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
                    />
                  )}

                  {event.location_name && (
                    <MemoizedCard style={{ backgroundColor: backgroundSecondary, flexDirection: 'row', gap: 16 }} onPress={openMap}>
                      <MapPin size={24} color="#34C759" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: textPrimary, opacity: 0.5 }]}>LOCALIZAÇÃO</Text>
                        <Text style={{ color: textPrimary, fontSize: 14, fontWeight: '500', lineHeight: 20, marginTop: 4 }}>{event.location_name}</Text>
                      </View>
                      <Navigation2 size={18} color={accent} />
                    </MemoizedCard>
                  )}

                  <View style={styles.section}>
                    <Text style={[styles.secTitle, { color: textPrimary }]}>Sobre o Evento</Text>
                    <Text style={[styles.desc, { color: textSecondary }]}>{event.description}</Text>
                  </View>
                </View>
              </Animated.ScrollView>
            </Animated.View>
          </GestureDetector>

          {/* FOOTER TOTALMENTE INTEGRADO E ANIMADO */}
          {/* Fica fora do panelStyle para ancorar na base da tela, mas usa bottomBarStyle para afundar junto com o painel */}
          <Animated.View style={[styles.bottomBar, bottomBarStyle, { backgroundColor: backgroundPrimary, borderTopColor: 'rgba(150,150,150,0.1)' }]}>
            {user?.id === event.creator_id ? (
              <>
                <TouchableOpacity onPress={() => router.push(`/event/edit/${id}`)} style={[styles.mainBtn, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
                  <Edit3 size={20} color={textPrimary} />
                  <Text style={[styles.btnText, { color: textPrimary }]}>Gerenciar Evento</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/event/${id}/chat`)}>
                  <MessageCircle size={24} color={accent} />
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
  dragHandleArea: { width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  dragIndicator: { width: 40, height: 5, backgroundColor: 'rgba(150,150,150,0.3)', borderRadius: 3 },
  mainContent: { padding: 24, paddingTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { padding: 20, borderRadius: 28, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  name: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  infoCard: { flex: 1, padding: 20, borderRadius: 28, gap: 8 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1, opacity: 0.5 },
  val: { fontSize: 15, fontWeight: '800' },
  section: { marginTop: 10 },
  secTitle: { fontSize: 19, fontWeight: '900', marginBottom: 12 },
  desc: { fontSize: 16, lineHeight: 26 },
  bottomBar: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, flexDirection: 'row', gap: 12, borderTopWidth: 1 },
  mainBtn: { flex: 1, height: 60, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  chatBtn: { width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  pagination: { position: 'absolute', top: 120, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6, zIndex: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' }
});
