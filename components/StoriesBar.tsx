import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, Image, ActivityIndicator } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types/database';
import StoryCreator from './StoryCreator';
import StoryViewer from './StoryViewer';
import { getCachedVideoUri } from '@/lib/videoCache';

export default function StoriesBar() {
  const { user, profile } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadStories();
    }
  }, [user]);

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

  return (
    <>
      <View style={[styles.container, { backgroundColor: backgroundPrimary, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.scroll}
        scrollEventThrottle={16}
      >
        {/* Seu story com botão de criar no canto */}
        <View style={styles.storyItem}>
          <Pressable
            style={styles.storyThumbContainer}
            onPress={() => {
              if (userStories.length > 0) {
                setSelectedStoryIndex(0);
                setShowViewer(true);
              } else {
                setShowCreator(true);
              }
            }}
          >
            {userStories.length > 0 && userStories[0].media_url ? (
              <Image
                source={{ uri: userStories[0].media_url }}
                style={[styles.storyThumb, { borderColor: accent }]}
              />
            ) : profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={[styles.storyThumb, styles.avatarThumb, { borderColor: accent, backgroundColor: backgroundSecondary }]}
              />
            ) : (
              <View style={[styles.storyThumb, styles.storyPlaceholder, { borderColor: accent, backgroundColor: backgroundSecondary }]}>
                <Text style={[styles.placeholderText, { color: textSecondary }]}>Sem story</Text>
              </View>
            )}
            {/* Botão flutuante de criar story */}
            <Pressable
              style={[styles.addButtonOverlay, { backgroundColor: accent, borderColor: backgroundPrimary }]}
              onPress={() => setShowCreator(true)}
            >
              <Plus size={16} color="#fff" strokeWidth={3} />
            </Pressable>
          </Pressable>
          <Text style={[styles.storyLabel, { color: textPrimary }]}>Seu Story</Text>
        </View>

        {/* Histórias de outros usuários */}
        {allStories.map((story, index) => {
          const profile = Array.isArray(story.profiles) ? story.profiles[0] : story.profiles;
          return (
            <Pressable
              key={story.id}
              style={styles.storyItem}
              onPress={() => {
                setSelectedStoryIndex(userStories.length + index);
                setShowViewer(true);
              }}
            >
              {story.media_url ? (
                <Image
                  source={{ uri: story.media_url }}
                  style={[styles.storyThumb, { borderColor: accent }]}
                />
              ) : (
                <View style={[styles.storyThumb, styles.storyPlaceholder, { backgroundColor: backgroundSecondary, borderColor: accent }]} />
              )}
              <Text style={[styles.storyLabel, { color: textPrimary }]} numberOfLines={1}>
                {profile?.username || 'Usuário'}
              </Text>
            </Pressable>
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
  scroll: {
    paddingHorizontal: 8,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 4,
  },
  storyThumbContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  storyThumb: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  avatarThumb: {
    backgroundColor: '#333',
  },
  storyPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
  },
  addButtonOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00d9ff',
    borderWidth: 2,
    borderColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyLabel: {
    fontSize: 12,
    color: '#fff',
    maxWidth: 70,
    textAlign: 'center',
  },
});
