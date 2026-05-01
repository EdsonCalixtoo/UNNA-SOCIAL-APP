import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  TextInput,
  Animated,
  Dimensions
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';
import { ArrowLeft, UserCheck, Search, X, UserPlus, Users } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '@/utils/responsive';

const { width } = Dimensions.get('window');

interface FollowingData {
  following_id: string;
  profiles: Profile;
}

export default function Following() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<FollowingData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileName, setProfileName] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadFollowing();
  }, [id]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const loadFollowing = async () => {
    try {
      setLoading(true);
      const { data: profileData } = await supabase.from('profiles').select('username').eq('id', id).maybeSingle();
      if (profileData) setProfileName(profileData.username);

      const { data, error } = await supabase
        .from('follows')
        .select('following_id, profiles:following_id (*)')
        .eq('follower_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowing((data as any) || []);
    } catch (error) {
      console.error('Error loading following:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFollowing = following.filter(f => 
    f.profiles.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.profiles.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFollowingUser = ({ item }: { item: FollowingData }) => {
    const profile = item.profiles;
    const initials = profile.full_name?.charAt(0).toUpperCase() || profile.username?.charAt(0).toUpperCase() || '?';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.userCard, { backgroundColor: backgroundSecondary }]}
        onPress={() => router.push(`/profile/${profile.id}`)}
      >
        <LinearGradient colors={[accent, '#ff1493']} style={styles.avatarRing}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>{initials}</Text></View>
          )}
        </LinearGradient>

        <View style={styles.userInfo}>
          <Text style={[styles.fullName, { color: textPrimary }]}>{profile.full_name}</Text>
          <Text style={[styles.username, { color: textSecondary }]}>@{profile.username}</Text>
        </View>

        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
          <UserCheck size={18} color={accent} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: backgroundPrimary }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={22} color={textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>Seguindo</Text>
          <Text style={[styles.headerSubtitle, { color: textSecondary }]}>@{profileName}</Text>
        </View>
      </View>

      {/* SEARCH */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: backgroundSecondary }]}>
          <Search size={18} color={textSecondary} />
          <TextInput
            placeholder="Buscar quem você segue..."
            placeholderTextColor={isDark ? '#444' : '#bbb'}
            style={[styles.searchInput, { color: textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Animated.FlatList
        data={filteredFollowing}
        keyExtractor={(item) => item.following_id}
        renderItem={renderFollowingUser}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        style={{ opacity: fadeAnim }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBg, { backgroundColor: backgroundSecondary }]}>
              <Users size={48} color={textSecondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: textPrimary }]}>Não segue ninguém ainda</Text>
            <Text style={[styles.emptyStateSub, { color: textSecondary }]}>
              {searchQuery.length > 0 ? 'Nenhum resultado para sua busca.' : 'Explore o UNNA e encontre pessoas incríveis para seguir!'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: ms(20), fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: ms(13), fontWeight: '600', marginTop: -2 },

  searchSection: { padding: 20, paddingBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 20,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: ms(15), fontWeight: '600' },

  listContent: { padding: 20 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 24,
    marginBottom: 12,
    elevation: 2,
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  avatarRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  userInfo: { flex: 1 },
  fullName: { fontSize: ms(15), fontWeight: '800', marginBottom: 2 },
  username: { fontSize: ms(13), fontWeight: '600' },
  actionBtn: { width: 44, height: 44, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  emptyState: { alignItems: 'center', paddingTop: 100, paddingHorizontal: 40 },
  emptyIconBg: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyStateTitle: { fontSize: ms(18), fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  emptyStateSub: { fontSize: ms(14), textAlign: 'center', lineHeight: 20 },
});
