import { useLanguage } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, User, MessageCircle, X, Compass } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Skeleton from '@/components/Skeleton';
import { ms, vs, s } from '@/utils/responsive';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SearchUsers() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    // Load initial users
    handleSearch('');
  }, []);

  const handleSearch = async (query = searchQuery) => {
    try {
      setLoading(true);
      setHasSearched(true);

      const searchTerm = query.trim().replace('@', '');

      let supabaseQuery = supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .neq('id', user?.id);

      if (searchTerm) {
        supabaseQuery = supabaseQuery.or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await supabaseQuery.limit(50);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSearchTextChange = (text: string) => {
    setSearchQuery(text);
    handleSearch(text); // Real-time search
  };

  const clearSearch = () => {
    setSearchQuery('');
    handleSearch('');
  };

  const handleSendMessage = async (otherUserId: string) => {
    if (!user) return;

    try {
      const { data: conversationData, error: rpcError } = await supabase
        .rpc('find_or_create_conversation', {
          other_user_id: otherUserId
        });

      if (rpcError) throw rpcError;

      if (!conversationData) {
        throw new Error('Falha ao criar conversa');
      }

      router.push(`/messages/${conversationData}?userId=${otherUserId}`);
    } catch (error) {
      console.error('Error creating/finding conversation:', error);
      if (error instanceof Error) {
        alert(`Erro: ${error.message}`);
      }
    }
  };

  const renderUserItem = ({ item, index }: { item: Profile, index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <View style={[styles.userCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => router.push(`/profile/${item.id}`)}
          activeOpacity={0.7}
        >
          {item.avatar_url ? (
            <View style={[styles.avatarBorder, { borderColor: accent }]}>
              <Image 
                source={{ uri: item.avatar_url }} 
                style={styles.avatar} 
              />
            </View>
          ) : (
            <View style={[styles.avatarBorder, { borderColor: accent }]}>
              <LinearGradient
                colors={[accent, accent + '80']}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarText}>
                  {item.username.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.fullName, { color: textPrimary }]} numberOfLines={1}>{item.full_name}</Text>
            <Text style={[styles.username, { color: accent }]} numberOfLines={1}>@{item.username}</Text>
            {item.bio ? (
              <Text style={[styles.bio, { color: textSecondary }]} numberOfLines={1}>
                {item.bio}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.messageButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => handleSendMessage(item.id)}
        >
          <MessageCircle size={20} color={textPrimary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <View style={[styles.header, { backgroundColor: backgroundSecondary }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          >
            <ArrowLeft size={24} color={textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('auto.s998abc61', 'Buscar Usuários')}</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={[styles.searchPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
          <Search size={20} color={textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder={t('auto.s9f5df017', 'Digite @ ou nome do usuário...')}
            placeholderTextColor={textSecondary}
            value={searchQuery}
            onChangeText={onSearchTextChange}
            onSubmitEditing={() => handleSearch()}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={18} color={textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.listContainer}>
            {[1, 2, 3, 4, 5].map((_, idx) => (
               <View key={idx} style={[styles.userCard, { backgroundColor: backgroundSecondary, borderColor: 'transparent' }]}>
                 <Skeleton width={56} height={56} borderRadius={28} />
                 <View style={{ flex: 1, gap: 8, marginLeft: 16 }}>
                   <Skeleton width="60%" height={16} borderRadius={8} />
                   <Skeleton width="40%" height={14} borderRadius={7} />
                 </View>
               </View>
            ))}
          </View>
        ) : hasSearched && searchResults.length === 0 ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <User size={48} color={textSecondary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: textPrimary }]}>{t('auto.s6d277ec2', 'Nenhum usuário encontrado')}</Text>
            <Text style={[styles.emptyStateText, { color: textSecondary }]}>
              Tente buscar por outro nome ou @username
            </Text>
          </Animated.View>
        ) : !hasSearched ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <Compass size={48} color={accent} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: textPrimary }]}>{t('auto.s6df02665', 'Encontre outros usuários')}</Text>
            <Text style={[styles.emptyStateText, { color: textSecondary }]}>
              Digite o nome ou @username de quem você procura
            </Text>
          </Animated.View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: ms(20),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: ms(15),
    fontWeight: '600',
    marginLeft: 12,
  },
  clearButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 20,
    paddingTop: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  avatarBorder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: ms(20),
    fontWeight: '900',
  },
  userDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  fullName: {
    fontSize: ms(16),
    fontWeight: '700',
  },
  username: {
    fontSize: ms(13),
    fontWeight: '600',
  },
  bio: {
    fontSize: ms(12),
    marginTop: 2,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: ms(20),
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: ms(15),
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '80%',
  },
});
