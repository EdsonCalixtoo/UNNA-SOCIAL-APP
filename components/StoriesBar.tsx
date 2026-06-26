import { useLanguage } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, Image, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, interpolate } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types/database';
import StoryCreator from './StoryCreator';
import StoryViewer from './StoryViewer';
import { getCachedVideoUri } from '@/lib/videoCache';

export default function StoriesBar() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const router = useRouter();
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [activeLives, setActiveLives] = useState<any[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const officialPulse = useSharedValue(1);

  useEffect(() => {
    officialPulse.value = withRepeat(
      withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      true
    );
  }, []);

  const officialAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: officialPulse.value }],
      shadowColor: accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: interpolate(officialPulse.value, [1, 1.05], [0.3, 0.8]),
      shadowRadius: 10,
      elevation: interpolate(officialPulse.value, [1, 1.05], [2, 6]),
    };
  });

  useEffect(() => {
    if (user) {
      loadStories();
      loadLives();
    }
  }, [user]);

  const loadLives = async () => {
    try {
      // Temporarily hiding active lives until the feature is implemented
      setActiveLives([]);
    } catch (err) {
      console.warn('Erro ao carregar lives:', err);
    }
  };

  const loadStories = async () => {
    try {
      setLoading(true);
      
      // Tenta carregar via Edge Function otimizada
      const { data, error } = await supabase.functions.invoke('get-stories-feed');
      
      if (error || !data) {
        console.warn('Edge Function falhou ou não implantada, usando query direta...');
        return await loadStoriesDirect();
      }

      // Separa stories do usuário dos demais
      const myStories = data.filter((s: any) => s.user_id === user?.id);
      const otherStories = data.filter((s: any) => s.user_id !== user?.id);

      setUserStories(myStories);
      setAllStories(otherStories);

      // PRÉ-CARREGAMENTO AGRESSIVO (Instagram Style)
      // Carrega as metadatas e já inicia o download das mídias em background
      if (data && data.length > 0) {
        data.forEach((s: any, i: number) => {
          // 1. Sempre baixa a thumbnail (leve) de todos os stories
          if (s.thumbnail_url) Image.prefetch(s.thumbnail_url);
          
          // 2. Baixa a mídia full-res dos 5 primeiros para abertura instantânea
          if (i < 5 && s.media_url) {
             if (s.media_type === 'video') {
                getCachedVideoUri(s.media_url); // Baixa pro cache de disco
             } else {
                Image.prefetch(s.media_url);
             }
          }
        });
        console.log(`⚡ [Preload] ${data.length} histórias pré-carregadas.`);
      }
    } catch (error) {
      console.error('Erro ao carregar stories:', error);
      await loadStoriesDirect();
    } finally {
      setLoading(false);
    }
  };

  const loadStoriesDirect = async () => {
    try {
      // Carregar histórias do usuário
      const { data: myStories, error: myError } = await supabase
        .from('stories')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (myError) throw myError;
      setUserStories(myStories || []);

      // Carregar histórias de outros usuários
      const { data: otherStories, error: otherError } = await supabase
        .from('stories')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .neq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (otherError) throw otherError;
      setAllStories(otherStories || []);

      // Preload para query direta
      const combined = [...(myStories || []), ...(otherStories || [])];
      combined.slice(0, 5).forEach(s => {
        if (s.media_type === 'video') getCachedVideoUri(s.media_url);
        else Image.prefetch(s.media_url);
      });
    } catch (err) {
      console.error('Fallback load failed:', err);
    }
  };

  // Render the stories bar
  const combinedStories = [...userStories, ...allStories];

  // Agrupar stories por usuário para que cada usuário apareça apenas uma vez na barra
  const uniqueUsers = new Set();
  const groupedAllStories: { story: Story, originalIndex: number }[] = [];
  
  for (let i = 0; i < allStories.length; i++) {
    const story = allStories[i];
    if (!uniqueUsers.has(story.user_id)) {
      uniqueUsers.add(story.user_id);
      groupedAllStories.push({ story, originalIndex: i });
    }
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: backgroundPrimary, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        scrollEventThrottle={16}
      >
        {/* Your Story */}
        <Pressable
          style={[styles.yourStoryCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff' }]}
          onPress={() => {
            if (userStories.length > 0) {
              setSelectedStoryIndex(0);
              setShowViewer(true);
            } else {
              setShowCreator(true);
            }
          }}
        >
          <View style={styles.yourStoryAvatarContainer}>
            <Image
              source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }}
              style={styles.yourStoryAvatar}
            />
            <Pressable 
              style={[styles.yourStoryAddBtn, { backgroundColor: accent, borderColor: isDark ? '#1a1a1a' : '#fff' }]}
              onPress={(e) => {
                e.stopPropagation();
                setShowCreator(true);
              }}
              hitSlop={20}
            >
              <Plus size={16} color="#fff" strokeWidth={3} />
            </Pressable>
          </View>
          <Text style={[styles.yourStoryLabel, { color: textPrimary }]}>{t('auto.sb454a697', 'Your Story')}</Text>
        </Pressable>

        {/* Lives Ativas */}
        {activeLives.map((live) => {
          const profile = Array.isArray(live?.profiles) ? live.profiles[0] : live?.profiles;
          return (
            <Pressable
              key={`live_${live.id}`}
              style={[styles.otherStoryCard, { borderColor: '#FF3B30', borderWidth: 2 }]}
              onPress={() => {
                router.push(`/live/audience?liveID=${live.live_id}&broadcasterId=${live.user_id}`);
              }}
            >
              <Image
                source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }}
                style={styles.otherStoryThumb}
              />
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>AO VIVO</Text>
              </View>
              <View style={[styles.otherStoryAvatarContainer, { borderColor: '#FF3B30', backgroundColor: backgroundSecondary }]}>
                <Image
                  source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }}
                  style={styles.otherStoryAvatar}
                />
              </View>
            </Pressable>
          );
        })}

        {/* Other Stories */}
        {groupedAllStories.map(({ story, originalIndex }) => {
          const profile = Array.isArray(story?.profiles) ? story.profiles[0] : story?.profiles;
          const isOfficial = profile?.username === 'unnasocialappoficial';
          
          return (
            <Animated.View key={story.id} style={isOfficial ? officialAnimStyle : undefined}>
              <Pressable
                style={[
                  styles.otherStoryCard, 
                  isOfficial && { borderColor: accent, borderWidth: 2 }
                ]}
                onPress={() => {
                  setSelectedStoryIndex(userStories.length + originalIndex);
                  setShowViewer(true);
                }}
              >
                <Image
                  source={{ uri: story.thumbnail_url || story.media_url }}
                  style={styles.otherStoryThumb}
                />
                <View style={[styles.otherStoryAvatarContainer, { borderColor: isOfficial ? accent : '#fff', backgroundColor: backgroundSecondary }]}>
                  <Image
                    source={{ uri: profile?.avatar_url || 'https://via.placeholder.com/150' }}
                    style={styles.otherStoryAvatar}
                  />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>

    {/* Modals */}
    <StoryCreator 
      visible={showCreator}
      onClose={() => setShowCreator(false)}
      onSuccess={() => {
        setShowCreator(false);
        loadStories();
      }}
    />

    <StoryViewer 
      visible={showViewer && (userStories.length > 0 || allStories.length > 0)}
      stories={combinedStories}
      initialIndex={selectedStoryIndex}
      onClose={() => setShowViewer(false)}
      onRefresh={loadStories}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  yourStoryCard: {
    width: 100,
    height: 150,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yourStoryAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  yourStoryAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  yourStoryAddBtn: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  yourStoryLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  otherStoryCard: {
    width: 100,
    height: 150,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#333',
  },
  otherStoryThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  otherStoryAvatarContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otherStoryAvatar: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  }
});
