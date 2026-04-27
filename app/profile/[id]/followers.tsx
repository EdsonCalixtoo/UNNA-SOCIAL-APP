import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { ArrowLeft, UserCheck } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface FollowerData {
  follower_id: string;
  profiles: Profile;
}

export default function Followers() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState<FollowerData[]>([]);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    loadFollowers();
  }, [id]);

  const loadFollowers = async () => {
    try {
      setLoading(true);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', id)
        .maybeSingle();

      if (profileData) {
        setProfileName(profileData.username);
      }

      const { data, error } = await supabase
        .from('follows')
        .select(`
          follower_id,
          profiles:follower_id (
            id,
            username,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq('following_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFollowers((data as any) || []);
    } catch (error) {
      console.error('Error loading followers:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderFollower = ({ item }: { item: FollowerData }) => {
    const profile = item.profiles;

    return (
      <TouchableOpacity
        style={styles.followerCard}
        onPress={() => router.push(`/profile/${profile.id}`)}
      >
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {profile.username?.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.followerInfo}>
          <Text style={styles.fullName}>{profile.full_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
          {profile.bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {profile.bio}
            </Text>
          )}
        </View>

        <UserCheck size={20} color="#00d9ff" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d9ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2d2d2d', '#1a1a1a']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Seguidores</Text>
          <Text style={styles.headerSubtitle}>@{profileName}</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={followers}
        keyExtractor={(item) => item.follower_id}
        renderItem={renderFollower}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <UserCheck size={64} color="#666" />
            <Text style={styles.emptyStateText}>Nenhum seguidor ainda</Text>
          </View>
        }
      />
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
  },
  followerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3d3d3d',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  followerInfo: {
    flex: 1,
  },
  fullName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  bio: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});
