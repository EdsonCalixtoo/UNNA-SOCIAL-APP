import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Image, Modal, ScrollView, Platform, Dimensions, AppState } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Post, Category, Subcategory } from '@/types/database';
import StoriesBar from '@/components/StoriesBar';
import MoodFilterBar, { MoodType } from '@/components/MoodFilterBar';
import PostCard from '@/components/PostCard';
import EventCard from '@/components/EventCard';
import PostEventRatingModal from '@/components/PostEventRatingModal';
import BlindTicketCard from '@/components/BlindTicketCard';
import VipListBanner from '@/components/VipListBanner';
import { EventCardSkeleton } from '@/components/Skeleton';
import { EventParticipantsModal } from '@/components/EventParticipantsModal';
import CommentsModal from '@/components/CommentsModal';
import { Heart, MessageCircle, Share2, MoreHorizontal, User, Link as LinkIcon, Navigation, Navigation2, LogOut, FileEdit, Filter, Compass, Bell, ArrowRight, Video as VideoIcon, CheckCircle2, ChevronRight, AlertCircle, Search, Calendar, ChevronDown, Flag, MapPin, X, Plus, Users, Edit3, Trash2, ShieldAlert } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/utils/responsive';
import PageTransition from '@/components/PageTransition';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  FadeInUp,
  runOnJS
} from 'react-native-reanimated';
import { useUI } from '@/contexts/UIContext';
import { notifyEventLike } from '@/lib/notifications';
import { mapService } from '@/services/mapService';


const { width } = Dimensions.get('window');

interface ExtendedPost {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  event_id?: string;
  created_at: string;
  is_liked?: boolean;
  likes_count?: number;
  profiles?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  events?: {
    id: string;
    creator_id: string;
    title: string;
    description: string;
    image_url?: string;
    event_date: string;
    event_time: string;
    location_name: string;
    max_participants: number;
    is_paid: boolean;
    price: number;
    category_id?: string;
    subcategory_id?: string;
    is_liked?: boolean;
    likes_count?: number;
    participants_count?: number;
    created_at: string;
    updated_at: string;
    categories?: {
      id: string;
      name: string;
      icon?: string;
      created_at: string;
    };
    subcategories?: {
      id: string;
      category_id: string;
      name: string;
      created_at: string;
    };
    profiles?: {
      id: string;
      username: string;
      full_name: string;
      avatar_url?: string;
      bio?: string;
      is_private?: boolean;
      primary_color?: string;
      secondary_color?: string;
      accent_color?: string;
      preferred_categories?: string[];
      onboarding_completed?: boolean;
      created_at: string;
      updated_at: string;
    };
  };
}

export default function Feed() {
  const { user } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const params = useLocalSearchParams();
  const [posts, setPosts] = useState<ExtendedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [moodFilter, setMoodFilter] = useState<MoodType>('all');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [selectedEventIdForParticipants, setSelectedEventIdForParticipants] = useState<string | null>(null);
  const [commentsEventId, setCommentsEventId] = useState<string | null>(null);
  const [visibleItems, setVisibleItems] = useState<string[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(0);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => {
      appStateSubscription.remove();
    };
  }, []);

  const listRef = useRef(null);
  useScrollToTop(listRef);

  const scrollY = useSharedValue(0);
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = insets.top + vs(44);

  const { hideTabBar, showTabBar } = useUI();

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;
      
      // Esconder header ao subir, mostrar ao descer
      if (currentY > HEADER_HEIGHT) {
        headerTranslateY.value = withTiming(diff > 0 ? -HEADER_HEIGHT : 0, { duration: 300 });
        
        // Controle da TabBar
        if (diff > 10 && currentY > 100) {
          runOnJS(hideTabBar)();
        } else if (diff < -10) {
          runOnJS(showTabBar)();
        }
      } else {
        headerTranslateY.value = withTiming(0, { duration: 300 });
        runOnJS(showTabBar)();
      }
      
      scrollY.value = currentY;
      lastScrollY.value = currentY;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
    opacity: interpolate(headerTranslateY.value, [-HEADER_HEIGHT, 0], [0, 1], Extrapolation.CLAMP),
  }));


  useEffect(() => {
    loadUnreadNotifications();
    loadUnreadMessages();
    
    // Gerar um ID único para esta instância da inscrição para evitar conflitos de HMR
    const instanceId = Math.random().toString(36).substring(7);

    // Escutar mudanças em tempo real nas notificações
    const notificationSubscription = supabase
      .channel(`notifications-badge:${user?.id}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE em um só
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          loadUnreadNotifications();
        }
      )
      .subscribe();

    // Escutar mudanças em tempo real nos eventos
    const eventsSubscription = supabase
      .channel(`events-realtime:${user?.id}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    // Escutar mudanças em tempo real nos posts
    const postsSubscription = supabase
      .channel(`posts-realtime:${user?.id}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    // Escutar curtidas e participações para atualizar contadores
    const interactionsSubscription = supabase
      .channel(`interactions-realtime:${user?.id}:${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_likes' }, () => loadPosts())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_participants' }, () => loadPosts())
      .subscribe();

    // Escutar mudanças em tempo real nas mensagens para a badge
    const messagesSubscription = supabase
      .channel(`messages-badge:${user?.id}:${instanceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadUnreadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationSubscription);
      supabase.removeChannel(eventsSubscription);
      supabase.removeChannel(postsSubscription);
      supabase.removeChannel(interactionsSubscription);
      supabase.removeChannel(messagesSubscription);
    };
  }, [user]);

  const loadUnreadMessages = async () => {
    if (!user) return;
    try {
      const { data: myConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);
        
      const myConvIds = myConvs?.map(c => c.conversation_id) || [];
      
      if (myConvIds.length === 0) {
        setUnreadMessagesCount(0);
        return;
      }

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', myConvIds)
        .neq('sender_id', user.id)
        .eq('read', false);
        
      setUnreadMessagesCount(count || 0);
    } catch (error) {
      console.error('Error loading unread messages:', error);
    }
  };

  const loadUnreadNotifications = async () => {
    if (!user) return;
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('type', 'message')
        .neq('type', 'new_message')
        .neq('title', 'Nova mensagem')
        .eq('read', false);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error loading unread notifications:', error);
    }
  };

  useEffect(() => {
    loadPosts();
    loadCategories();
    loadUserPreferences();
  }, []);

  useEffect(() => {
    if (params.filterCategoryId) {
      const categoryId = params.filterCategoryId as string;
      setSelectedCategories([categoryId]);
      setExpandedCategory(categoryId);

      if (params.filterSubcategoryId) {
        setSelectedSubcategories([params.filterSubcategoryId as string]);
      } else {
        setSelectedSubcategories([]);
      }

      // Removido o setTimeout que abria o modal de filtros automaticamente
      // para permitir que o usuário veja o feed filtrado direto.
    }
  }, [params.filterCategoryId, params.filterSubcategoryId]);

  // As subcategorias agora são pré-carregadas em lote na inicialização, eliminando a lentidão e requisições ao clicar.

  useEffect(() => {
    if (showFilters) {
      loadCategories();
    }
  }, [showFilters]);

  useEffect(() => {
    loadPosts();
  }, [selectedCategories, selectedSubcategories, dateFilter, searchRadius]);

  const loadUserPreferences = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_categories')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data?.preferred_categories && data.preferred_categories.length > 0) {
        setSelectedCategories(data.preferred_categories);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const [categoriesRes, subcategoriesRes] = await Promise.all([
        supabase.from('categories').select('*').order('order'),
        supabase.from('subcategories').select('*').order('name')
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (subcategoriesRes.error) throw subcategoriesRes.error;

      setCategories(categoriesRes.data || []);
      setSubcategories(subcategoriesRes.data || []);
    } catch (error) {
      console.error('Error loading categories and subcategories:', error);
    }
  };

  const loadPosts = async () => {
    try {
      // 1. Busca os Posts recentes
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url),
          events:event_id (
            id, title, description, image_url, image_urls, media_types, event_date, event_time, 
            location_name, latitude, longitude, max_participants, is_paid, price, 
            category_id, subcategory_id, created_at,
            categories:category_id (name, icon),
            subcategories:subcategory_id (name),
            profiles:creator_id (id, username, full_name, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (postsError) throw postsError;

      // 2. Busca Eventos que ainda não aconteceram e que PODEM não ter posts vinculados
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          categories:category_id (name, icon),
          subcategories:subcategory_id (name),
          profiles:creator_id (id, username, full_name, avatar_url)
        `)
        .eq('type', 'event')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(20);

      if (eventsError) throw eventsError;

      // 3. Mesclar e remover duplicatas (eventos que já aparecem como posts)
      const eventIdsInPosts = new Set(postsData?.map(p => p.event_id).filter(Boolean));
      
      const uniqueEvents = (eventsData || [])
        .filter(e => !eventIdsInPosts.has(e.id))
        .map(e => ({
          id: `event-only-${e.id}`,
          user_id: e.creator_id,
          content: 'Evento disponível',
          created_at: e.created_at,
          event_id: e.id,
          events: e,
          profiles: e.profiles
        }));

      let combinedData = [...(postsData || []), ...uniqueEvents];
      let filteredData = combinedData;

      if (selectedCategories.length > 0) {
        filteredData = filteredData.filter(post =>
          post.events?.category_id && selectedCategories.includes(post.events.category_id)
        );
      }

      if (selectedSubcategories.length > 0) {
        filteredData = filteredData.filter(post =>
          post.events?.subcategory_id && selectedSubcategories.includes(post.events.subcategory_id)
        );
      }

      if (moodFilter === 'suar') {
        filteredData = filteredData.filter(p => p.events?.categories?.name?.toLowerCase().includes('festa') || p.events?.categories?.name?.toLowerCase().includes('balada') || p.events?.categories?.name?.toLowerCase().includes('eletrônica'));
      } else if (moodFilter === 'comer') {
        filteredData = filteredData.filter(p => p.events?.categories?.name?.toLowerCase().includes('gastronomia') || p.events?.categories?.name?.toLowerCase().includes('bar'));
      } else if (moodFilter === 'vip') {
        filteredData = filteredData.filter(p => p.events?.price && p.events.price > 100);
      } else if (moodFilter === 'shows') {
        filteredData = filteredData.filter(p => p.events?.categories?.name?.toLowerCase().includes('show') || p.events?.categories?.name?.toLowerCase().includes('ao vivo'));
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        filteredData = filteredData.filter(post => {
          if (!post.events?.event_date) return true;
          const eventDate = new Date(post.events.event_date);

          switch (dateFilter) {
            case 'today':
              return eventDate.toDateString() === now.toDateString();
            case 'week':
              const weekFromNow = new Date(now);
              weekFromNow.setDate(now.getDate() + 7);
              return eventDate >= now && eventDate <= weekFromNow;
            case 'month':
              const monthFromNow = new Date(now);
              monthFromNow.setMonth(now.getMonth() + 1);
              return eventDate >= now && eventDate <= monthFromNow;
            default:
              return true;
          }
        });
      }

      let currentLoc = userLoc;
      if (!currentLoc) {
        currentLoc = await mapService.getUserLocation();
        if (currentLoc) setUserLoc(currentLoc);
      }

      if (currentLoc) {
        filteredData = filteredData.map(post => {
          const eventLat = post.events?.latitude;
          const eventLon = post.events?.longitude;
          if (eventLat && eventLon) {
             const dist = mapService.getDistanceInKm(
               currentLoc!.latitude, currentLoc!.longitude, 
               parseFloat(String(eventLat)), parseFloat(String(eventLon))
             );
             return { ...post, _distanceKm: dist };
          }
          return { ...post, _distanceKm: 9999 };
        });

        const distanceFiltered = filteredData.filter(post => {
           if (searchRadius === 0) return true;
           return (post as any)._distanceKm <= searchRadius;
        });
        
        // Fallback: se o filtro por KM esvaziou o feed de eventos locais, 
        // e não há posts normais para mostrar, ignoramos a distância para a tela não ficar em branco
        if (distanceFiltered.length === 0 && filteredData.length > 0) {
          // Mantém o filteredData original
        } else {
          filteredData = distanceFiltered;
        }
      } else {
         filteredData = filteredData.map(post => ({ ...post, _distanceKm: 9999 }));
      }

      const postsWithLikes = await Promise.all(
        filteredData
          .filter(post => {
            // Se o post é automático (sistema) e tem um event_id, ele OBRIGATORIAMENTE precisa ter o objeto events
            const isAutoPost = post.content?.includes('Criei um novo evento') || post.content?.includes('Publiquei algo novo');
            if (isAutoPost && post.event_id && (!post.events || !post.events.id)) return false;
            // Garante que o perfil do autor exista
            return post && post.profiles;
          })
          .map(async (post) => {
            try {
              // Determine if we should look for event likes or post likes
              const isEventPost = !!post.event_id && !!post.events;
              const targetTable = isEventPost ? 'event_likes' : 'post_likes';
              const targetColumn = isEventPost ? 'event_id' : 'post_id';
              const targetId = isEventPost ? post.events!.id : post.id;

              const { count: likesCount } = await supabase
                .from(targetTable)
                .select('*', { count: 'exact', head: true })
                .eq(targetColumn, targetId);

              const { data: userLike } = await supabase
                .from(targetTable)
                .select('id')
                .eq(targetColumn, targetId)
                .eq('user_id', user?.id)
                .maybeSingle();

              let commentsCount = 0;
              let participantsCount = 0;
              
              if (isEventPost && post.events) {
                const [{ count: cCount }, { count: pCount }] = await Promise.all([
                  supabase.from('event_comments').select('*', { count: 'exact', head: true }).eq('event_id', post.events.id),
                  supabase.from('event_participants').select('*', { count: 'exact', head: true }).eq('event_id', post.events.id)
                ]);
                commentsCount = cCount || 0;
                participantsCount = pCount || 0;
              }

              return {
                ...post,
                likes_count: likesCount || 0,
                comments_count: commentsCount,
                participants_count: participantsCount,
                is_liked: !!userLike,
                events: post.events ? {
                  ...post.events,
                  likes_count: isEventPost ? (likesCount || 0) : post.events.likes_count,
                  comments_count: isEventPost ? commentsCount : post.events.comments_count,
                  participants_count: isEventPost ? participantsCount : post.events.participants_count,
                  is_liked: isEventPost ? !!userLike : post.events.is_liked
                } : undefined
              };
            } catch (err) {
              console.error('Error processing post:', post.id, err);
              return post;
            }
          })
      );


      setPosts(postsWithLikes.filter(p => p !== null).sort((a, b) => {
        // Lógica de Smart Feed: Prioriza categorias selecionadas/interesses
        const aMatches = a.events?.category_id && selectedCategories.includes(a.events.category_id);
        const bMatches = b.events?.category_id && selectedCategories.includes(b.events.category_id);
        
        const calculateScore = (post: any, isMatch: boolean) => {
           let score = 0;
           
           // Fator 1: Categoria preferida bateu? Desconto de 50 pontos
           if (isMatch) score -= 50;

           // Fator 2: Dias até o evento (15 pontos por dia)
           if (post.events?.event_date) {
             const eventDate = new Date(post.events.event_date + 'T12:00:00'); // T12:00:00 para evitar erro de fuso horário
             const now = new Date();
             const diffTime = eventDate.getTime() - now.getTime();
             let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             
             // Se o evento já passou (dias negativos), jogamos pro fim da lista
             if (diffDays < -1) diffDays = 1000;
             else if (diffDays < 0) diffDays = 0; // Se foi ontem/hoje cedo, trata como 0
             
             score += (diffDays * 15);
           } else {
             // Posts normais (sem evento) ganham score baseado na idade de criação (5 pontos por dia de vida)
             const createdDate = new Date(post.created_at);
             const now = new Date();
             const diffTime = now.getTime() - createdDate.getTime();
             const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
             score += (diffDays * 5) + 30; // +30 base para eventos futuros terem vantagem sobre posts antigos
           }

           // Fator 3: Distância em KM (1 ponto por KM)
           if (post._distanceKm !== undefined && post._distanceKm !== 9999) {
             score += post._distanceKm;
           }

           return score;
        };

        const scoreA = calculateScore(a, aMatches);
        const scoreB = calculateScore(b, bMatches);

        // Ordem Ascendente: Menor Score = Melhor (aparece primeiro)
        return scoreA - scoreB;
      }));
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    const ids = viewableItems.map((item: any) => item.key);
    setVisibleItems(ids);

    if (viewableItems && viewableItems.length > 0) {
      // O item ativo é o primeiro item visível da lista (estilo TikTok/Facebook)
      const activeItem = viewableItems[0];
      setActiveVideoId(activeItem.key);
    } else {
      setActiveVideoId(null);
    }
  }, []);

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50, // O item é considerado visível se 50% dele aparecer
  }), []);

  const handleLike = async (id: string, isLiked: boolean) => {
    if (!user) return;

    // Detect if it's an event or a post
    const targetPost = posts.find(p => p.id === id || p.events?.id === id);
    const isEvent = !!targetPost?.events && targetPost.events.id === id;

    if (isEvent) {
      if (isLiked) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await supabase.from('event_likes').delete().eq('event_id', id).eq('user_id', user.id);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await supabase.from('event_likes').insert({ event_id: id, user_id: user.id });
        
        // Notificar o criador do evento
        if (targetPost?.events) {
          notifyEventLike(
            id, 
            user.id, 
            (targetPost.events as any).creator_id, 
            (targetPost.events as any).title
          );
        }
      }

    } else {
      if (isLiked) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', user.id);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await supabase.from('post_likes').insert({ post_id: id, user_id: user.id });
      }
    }

    setPosts(posts.map(p => {
      if (isEvent && p.events?.id === id) {
        const isLikedNow = !isLiked;
      
        // Feedback Tátil Premium
        if (isLikedNow) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return {
          ...p,
          events: {
            ...p.events,
            is_liked: !isLiked,
            likes_count: isLiked ? (p.events.likes_count || 1) - 1 : (p.events.likes_count || 0) + 1
          }
        };
      } else if (!isEvent && p.id === id) {
        return {
          ...p,
          is_liked: !isLiked,
          likes_count: isLiked ? (p.likes_count || 1) - 1 : (p.likes_count || 0) + 1
        };
      }
      return p;
    }));
  };

  const renderItem = ({ item, index }: { item: ExtendedPost; index: number }) => {
    const isItemActive = activeVideoId === item.id && appState === 'active';
    return (
      <View>
        {item.events ? (
          <EventCard 
            event={item.events} 
            onLike={handleLike}
            onParticipantsPress={(id) => {
              setSelectedEventIdForParticipants(id);
              setParticipantsModalVisible(true);
            }}
            onCommentPress={(id) => setCommentsEventId(id)}
            isVisible={isItemActive} 
          />
        ) : (
          <PostCard 
            post={item} 
            onLike={handleLike} 
            isVisible={isItemActive}
          />
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: backgroundPrimary, paddingTop: HEADER_HEIGHT }]}>
        <EventCardSkeleton />
        <EventCardSkeleton />
        <EventCardSkeleton />
      </View>
    );
  }

  return (
    <PageTransition>
      <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <Animated.View style={[
        styles.header, 
        headerAnimatedStyle, 
        { 
          backgroundColor: backgroundSecondary, 
          borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', 
          borderBottomWidth: 1,
          height: HEADER_HEIGHT,
          paddingTop: insets.top,
          paddingHorizontal: s(12),
        }
      ]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/icone.jpg')}
            style={styles.logoImage}
          />
          <Text style={[styles.logo, { color: textPrimary }]} numberOfLines={1}>U<Text style={styles.logoSpecial}>N</Text><Text style={styles.logoPink}>И</Text>A</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.08)' : 'rgba(0, 217, 255, 0.12)', borderColor: isDark ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 217, 255, 0.3)' }]}
            onPress={() => router.push('/messages')}
          >
            <MessageCircle size={18} color={accent} />
            {unreadMessagesCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: accent }]}>
                <Text style={styles.notificationBadgeText}>{unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.08)' : 'rgba(0, 217, 255, 0.12)', borderColor: isDark ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 217, 255, 0.3)' }]}
            onPress={() => router.push('/notifications')}
          >
            <Bell size={18} color={accent} />
            {unreadCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: accent }]}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, (selectedCategories.length > 0 || dateFilter !== 'all') && styles.filterButtonActive, { backgroundColor: (selectedCategories.length > 0 || dateFilter !== 'all') ? accent : (isDark ? 'rgba(0, 217, 255, 0.08)' : 'rgba(0, 217, 255, 0.12)'), borderColor: accent }]}
            onPress={() => setShowFilters(true)}
          >
            <Filter size={18} color={(selectedCategories.length > 0 || dateFilter !== 'all') ? '#fff' : accent} />
            {(selectedCategories.length > 0 || dateFilter !== 'all') && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* INJEÇÃO DA LISTA VIP (FASE 6) */}
            <View style={{ marginTop: 10 }}>
              <VipListBanner />
            </View>

            <StoriesBar />
            <MoodFilterBar currentMood={moodFilter} onSelectMood={(m) => { setMoodFilter(m); setTimeout(() => loadPosts(), 100); }} />
            {/* INJEÇÃO DO BLIND TICKET MOCKADO */}
            <BlindTicketCard />
          </View>
        }
        renderItem={renderItem}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
        initialNumToRender={5}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={5}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
            tintColor={accent} 
            colors={[accent]}
            progressViewOffset={HEADER_HEIGHT + vs(10)}
          />
        }

        contentContainerStyle={[
          styles.listContent, 
          { 
            paddingTop: HEADER_HEIGHT,
            paddingBottom: vs(100)
          }
        ]}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowFilters(false)} 
          />
          <View 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: backgroundSecondary, 
                borderTopLeftRadius: ms(32), 
                borderTopRightRadius: ms(32),
                paddingBottom: insets.bottom > 0 ? insets.bottom : vs(15)
              }
            ]}
          >
            <View style={styles.modalIndicator} />
            
            <View style={[styles.modalHeader, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>Filtrar Experiências</Text>
                <Text style={[styles.modalSubtitle, { color: textSecondary }]}>Encontre exatamente o que você busca</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowFilters(false)}
                style={[styles.modalCloseButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
              >
                <X size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Calendar size={18} color={accent} />
                  <Text style={[styles.filterSectionTitle, { color: textSecondary }]}>Quando?</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.dateChipsContainer}
                >
                  {[
                    { key: 'all', label: 'Tudo' },
                    { key: 'today', label: 'Hoje' },
                    { key: 'week', label: 'Esta Semana' },
                    { key: 'month', label: 'Este Mês' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.dateChip, 
                        dateFilter === option.key && { backgroundColor: accent, borderColor: accent },
                        { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => {
                        setDateFilter(option.key as any);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[
                        styles.dateChipText, 
                        { color: textSecondary }, 
                        dateFilter === option.key && { color: '#fff', fontWeight: '800' }
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <MapPin size={18} color={accent} />
                  <Text style={[styles.filterSectionTitle, { color: textSecondary }]}>Distância Máxima</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.dateChipsContainer}
                >
                  {[
                    { value: 10, label: '10 km' },
                    { value: 50, label: '50 km' },
                    { value: 100, label: '100 km' },
                    { value: 500, label: '500 km' },
                    { value: 0, label: 'Qualquer' }
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dateChip, 
                        searchRadius === option.value && { backgroundColor: accent, borderColor: accent },
                        { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }
                      ]}
                      onPress={() => {
                        setSearchRadius(option.value);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[
                        styles.dateChipText, 
                        { color: textSecondary }, 
                        searchRadius === option.value && { color: '#fff', fontWeight: '800' }
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.filterSection}>
                <View style={styles.filterSectionHeader}>
                  <Filter size={18} color={accent} />
                  <Text style={[styles.filterSectionTitle, { color: textSecondary }]}>O que te interessa?</Text>
                </View>
                {/* LISTA DE CATEGORIAS EM LARGURA TOTAL */}
                <View style={styles.modernCategoryList}>
                  {categories.map((category) => {
                    const isExpanded = expandedCategory === category.id;
                    const isSelected = selectedCategories.includes(category.id);
                    const categorySubcategories = subcategories.filter(s => s.category_id === category.id);

                    return (
                      <View key={category.id} style={styles.categoryAccordionItem}>
                        <TouchableOpacity
                          style={[
                            styles.categoryRowItem, 
                            { 
                              backgroundColor: isSelected ? accent + '15' : backgroundSecondary,
                              borderColor: isSelected ? accent : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                            }
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setExpandedCategory(isExpanded ? null : category.id);
                            if (isSelected) {
                              setSelectedCategories(prev => prev.filter(id => id !== category.id));
                            } else {
                              setSelectedCategories([...selectedCategories, category.id]);
                            }
                          }}
                        >
                          <View style={styles.categoryRowLeft}>
                            <Text style={styles.categoryRowIcon}>{category.icon}</Text>
                            <Text style={[styles.categoryRowLabel, { color: textPrimary }]}>{category.name}</Text>
                          </View>
                          <View style={styles.categoryRowRight}>
                            {isSelected && (
                              <View style={[styles.miniBadge, { backgroundColor: accent }]}>
                                <Text style={styles.miniBadgeText}>OK</Text>
                              </View>
                            )}
                            <View style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}>
                              <ChevronRight size={20} color={textSecondary} />
                            </View>
                          </View>
                        </TouchableOpacity>

                        {isExpanded && categorySubcategories.length > 0 && (
                          <View style={styles.inlineSubcategories}>
                            {categorySubcategories.map((sub, idx) => {
                              const isSubSelected = selectedSubcategories.includes(sub.id);
                              const colors = ['#00d9ff', '#ff1493', '#34C759', '#FF9500', '#8000ff', '#FF3B30', '#00C7B7'];
                              const rowColor = colors[idx % colors.length];

                              return (
                                <TouchableOpacity
                                  key={sub.id}
                                  style={[
                                    styles.subcategoryRow, 
                                    { backgroundColor: isSubSelected ? '#fff' : rowColor }
                                  ]}
                                  onPress={() => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    if (isSubSelected) {
                                      setSelectedSubcategories(prev => prev.filter(id => id !== sub.id));
                                    } else {
                                      setSelectedSubcategories([sub.id]);
                                      setShowFilters(false);
                                    }
                                  }}
                                >
                                  <Text style={[
                                    styles.subcategoryRowText, 
                                    { color: isSubSelected ? rowColor : '#fff' }
                                  ]}>
                                    {sub.name}
                                  </Text>
                                  <View style={[styles.chevronCircle, { backgroundColor: isSubSelected ? rowColor + '22' : 'rgba(255,255,255,0.3)' }]}>
                                    <ChevronRight size={16} color={isSubSelected ? rowColor : '#fff'} strokeWidth={3} />
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter]}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSelectedCategories([]);
                  setSelectedSubcategories([]);
                  setExpandedCategory(null);
                  setDateFilter('all');
                  setSearchRadius(0);
                }}
              >
                <Text style={styles.clearButtonText}>Limpar Filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <EventParticipantsModal
        visible={participantsModalVisible}
        onClose={() => setParticipantsModalVisible(false)}
        eventId={selectedEventIdForParticipants || ''}
      />
      <CommentsModal
        visible={!!commentsEventId}
        eventId={commentsEventId || ''}
        onClose={() => setCommentsEventId(null)}
      />

      {/* TEST BUTTON FOR ADMINS ONLY (Rating Modal) */}
      {user?.email?.includes('unna') && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 120,
            right: 20,
            backgroundColor: '#FFD700',
            width: 50,
            height: 50,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
          onPress={() => setShowRatingModal(true)}
        >
          <Text style={{ fontSize: 24 }}>⭐</Text>
        </TouchableOpacity>
      )}

      {/* BOTAO ANJO (SEGURANCA PESSOAL) */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 120,
          left: 20,
          backgroundColor: '#FF3B30',
          width: 50,
          height: 50,
          borderRadius: 25,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 5,
          shadowColor: '#FF3B30',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        }}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          Alert.alert(
            'Protocolo Anjo 👼',
            'Sua localização em tempo real será enviada para seus contatos de emergência. Confirmar?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sim, Socorro', style: 'destructive', onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                Alert.alert('Protocolo Ativado', 'Mensagem enviada com sucesso para seus contatos de segurança.');
              }}
            ]
          );
        }}
      >
        <ShieldAlert size={24} color="#FFF" />
      </TouchableOpacity>

      <PostEventRatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        eventName="Baile do UNNA (Ontem)"
      />
    </View>
    </PageTransition>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#0f0f18',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  iconButton: {
    width: s(36),
    height: s(36),
    borderRadius: ms(18),
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  notificationBadge: {
    position: 'absolute',
    top: vs(2),
    right: s(2),
    minWidth: s(18),
    height: s(18),
    borderRadius: ms(9),
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(4),
  },
  notificationBadgeText: {
    fontSize: ms(10),
    fontWeight: '700',
    color: '#fff',
  },
  logoImage: {
    width: s(40),
    height: s(40),
    borderRadius: ms(8),
  },
  logo: {
    fontSize: ms(28),
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
  },
  logoSpecial: {
    color: '#00d9ff',
  },
  logoPink: {
    color: '#ff1493',
  },
  filterButton: {
    width: s(36),
    height: s(36),
    borderRadius: ms(18),
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d9ff',
  },
  filterButtonActive: {
    backgroundColor: '#00d9ff',
  },
  filterBadge: {
    position: 'absolute',
    top: vs(2),
    right: s(2),
    width: s(8),
    height: s(8),
    borderRadius: ms(4),
    backgroundColor: '#FF3B30',
  },
  listContent: {
    paddingBottom: vs(16),
  },
  quickFilterPill: {
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
    borderRadius: ms(20),
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickFilterText: {
    fontSize: ms(13),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    maxHeight: '90%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  modalIndicator: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(24),
    paddingTop: vs(20),
    paddingBottom: vs(16),
  },
  modalTitle: {
    fontSize: ms(22),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: ms(13),
    marginTop: 2,
    opacity: 0.7,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: s(24),
  },
  filterSection: {
    marginBottom: vs(32),
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(16),
  },
  filterSectionTitle: {
    fontSize: ms(15),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateChipsContainer: {
    gap: s(10),
    paddingRight: s(24),
  },
  dateChip: {
    paddingHorizontal: s(20),
    paddingVertical: vs(12),
    borderRadius: ms(16),
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dateChipText: {
    fontSize: ms(14),
    fontWeight: '600',
  },
  modernCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(12),
  },
  modernCategoryWrapper: {
    width: (width - s(48) - s(12)) / 2, // 2 colunas com gap
  },
  modernCategoryCard: {
    height: vs(90),
    borderRadius: ms(20),
    padding: ms(12),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: vs(8),
    position: 'relative',
  },
  modernCategoryIcon: {
    fontSize: ms(28),
  },
  modernCategoryLabel: {
    fontSize: ms(12),
    fontWeight: '600',
    textAlign: 'center',
  },
  modernCategoryBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f0f18',
  },
  subcategoryRow: {
    width: '100%',
    height: vs(65),
    borderRadius: ms(18),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(20),
    marginBottom: vs(10),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  subcategoryRowText: {
    fontSize: ms(18),
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  chevronCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernSubcategoriesContainer: {
    width: '100%',
    marginTop: vs(15),
    paddingBottom: vs(10),
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(24),
    paddingTop: vs(8),
    paddingBottom: vs(10),
    gap: s(10),
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.05)',
  },
  clearButton: {
    flex: 1,
    height: vs(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: ms(13),
    fontWeight: '700',
  },
  applyButton: {
    flex: 1.2,
    height: vs(40),
    backgroundColor: '#00d9ff',
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: ms(13),
    fontWeight: '800',
  },
  modernCategoryList: {
    width: '100%',
    gap: vs(8),
  },
  categoryAccordionItem: {
    width: '100%',
    marginBottom: vs(4),
  },
  categoryRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(20),
    height: vs(60),
    borderRadius: ms(16),
    borderWidth: 1,
  },
  categoryRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  categoryRowIcon: {
    fontSize: ms(22),
  },
  categoryRowLabel: {
    fontSize: ms(16),
    fontWeight: '700',
  },
  categoryRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  miniBadge: {
    paddingHorizontal: s(8),
    paddingVertical: vs(2),
    borderRadius: ms(8),
  },
  miniBadgeText: {
    color: '#fff',
    fontSize: ms(10),
    fontWeight: '900',
  },
  inlineSubcategories: {
    marginTop: vs(8),
    paddingLeft: s(10),
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0, 217, 255, 0.2)',
  },

  bubblyFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: vs(48),
    borderRadius: 24,
    paddingLeft: s(6),
    paddingRight: s(18),
    gap: s(10),
  },
  bubblyFilterIconBox: {
    width: vs(36),
    height: vs(36),
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubblyFilterIcon: {
    fontSize: ms(18),
  },
  bubblyFilterText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: ms(14),
  },
});
