import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, User, MessageCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
}

export default function SearchUsers() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      setHasSearched(true);

      const query = searchQuery.trim().replace('@', '');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (otherUserId: string) => {
    if (!user) return;

    try {
      // Usar a função RPC para encontrar ou criar conversa
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
      // Mostrar erro para o usuário
      if (error instanceof Error) {
        alert(`Erro: ${error.message}`);
      }
    }
  };

  const renderUserItem = ({ item }: { item: Profile }) => (
    <View style={styles.userCard}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => router.push(`/profile/username/${item.username}`)}
        activeOpacity={0.7}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={['#00d9ff', '#0097a7']}
            style={styles.avatarPlaceholder}
          >
            <Text style={styles.avatarText}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.fullName}>{item.full_name}</Text>
          <Text style={styles.username}>@{item.username}</Text>
          {item.bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {item.bio}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.messageButton}
        onPress={() => handleSendMessage(item.id)}
      >
        <MessageCircle size={20} color="#00d9ff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#00d9ff', '#0097a7', '#1a1a1a']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buscar Usuários</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Digite @ ou nome do usuário..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={loading || !searchQuery.trim()}
          >
            <LinearGradient
              colors={loading || !searchQuery.trim() ? ['#666', '#666'] : ['#00d9ff', '#0097a7']}
              style={styles.searchButtonGradient}
            >
              <Text style={styles.searchButtonText}>Buscar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00d9ff" />
            <Text style={styles.loadingText}>Buscando usuários...</Text>
          </View>
        ) : hasSearched && searchResults.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['rgba(0, 217, 255, 0.1)', 'rgba(0, 217, 255, 0.02)']}
              style={styles.emptyStateCard}
            >
              <Search size={56} color="#00d9ff" strokeWidth={1.5} />
              <Text style={styles.emptyStateTitle}>Nenhum usuário encontrado</Text>
              <Text style={styles.emptyStateText}>
                Tente buscar por outro nome ou @username
              </Text>
            </LinearGradient>
          </View>
        ) : !hasSearched ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['rgba(0, 217, 255, 0.1)', 'rgba(0, 217, 255, 0.02)']}
              style={styles.emptyStateCard}
            >
              <Search size={56} color="#00d9ff" strokeWidth={1.5} />
              <Text style={styles.emptyStateTitle}>Encontre outros usuários</Text>
              <Text style={styles.emptyStateText}>
                Digite o nome ou @username de quem você procura
              </Text>
            </LinearGradient>
          </View>
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
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  searchInput: {
    flex: 1,
    height: 52,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  searchButtonGradient: {
    paddingHorizontal: 24,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateCard: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
    maxWidth: 400,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  listContainer: {
    padding: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00d9ff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  userDetails: {
    flex: 1,
    gap: 4,
  },
  fullName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  username: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  bio: {
    fontSize: 13,
    color: '#9E9E93',
    marginTop: 4,
    lineHeight: 18,
  },
});
