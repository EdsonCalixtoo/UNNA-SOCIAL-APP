import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Text, Image, ActivityIndicator } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Story } from '@/types/database';
import StoryCreator from './StoryCreator';
import StoryViewer from './StoryViewer';

export default function StoriesBar() {
  const { user, profile } = useAuth();
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [userStories, setUserStories] = useState<Story[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadStories();
    }
  }, [user]);

  const loadStories = async () => {
    try {
      setLoading(true);
      
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

      // Carregar histórias de outros usuários (que o usuário segue ou públicas)
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
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Modal para criar nova história
  if (showCreator) {
    return (
      <StoryCreator 
        visible={true}
        onClose={() => setShowCreator(false)}
        onSuccess={() => {
          setShowCreator(false);
          loadStories();
        }}
      />
    );
  }

  // Modal para visualizar histórias
  if (showViewer && (userStories.length > 0 || allStories.length > 0)) {
    const combinedStories = [...userStories, ...allStories];
    return (
      <StoryViewer 
        visible={true}
        stories={combinedStories}
        onClose={() => setShowViewer(false)}
      />
    );
  }

  // Render the stories bar
  return (
    <View style={styles.container}>
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
            onPress={() => userStories.length > 0 ? setShowViewer(true) : setShowCreator(true)}
          >
            {userStories.length > 0 && userStories[0].media_url ? (
              <Image
                source={{ uri: userStories[0].media_url }}
                style={styles.storyThumb}
              />
            ) : profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={[styles.storyThumb, styles.avatarThumb]}
              />
            ) : (
              <View style={[styles.storyThumb, styles.storyPlaceholder]}>
                <Text style={styles.placeholderText}>Sem story</Text>
              </View>
            )}
            {/* Botão flutuante de criar story */}
            <Pressable
              style={styles.addButtonOverlay}
              onPress={() => setShowCreator(true)}
            >
              <Plus size={16} color="#fff" strokeWidth={3} />
            </Pressable>
          </Pressable>
          <Text style={styles.storyLabel}>Seu Story</Text>
        </View>

        {/* Histórias de outros usuários */}
        {allStories.map((story) => {
          const profile = Array.isArray(story.profiles) ? story.profiles[0] : story.profiles;
          return (
            <Pressable
              key={story.id}
              style={styles.storyItem}
              onPress={() => setShowViewer(true)}
            >
              {story.media_url ? (
                <Image
                  source={{ uri: story.media_url }}
                  style={styles.storyThumb}
                />
              ) : (
                <View style={[styles.storyThumb, styles.storyPlaceholder]} />
              )}
              <Text style={styles.storyLabel} numberOfLines={1}>
                {profile?.username || 'Usuário'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
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
