import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, FlatList, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MessageCircle, Search, Plus, ArrowLeft, Users, MessageSquare } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ConversationWithDetails {
  id: string;
  updated_at: string;
  name?: string;
  is_group?: boolean;
  avatar_url?: string;
  other_user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
}

export default function ConversationsList() {
  const { user } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: convs, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            user_id,
            profiles:user_id(id, username, full_name, avatar_url)
          ),
          last_messages:messages(content, created_at, sender_id)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Filter only conversations where the user is a participant
      const userConvs = (convs || []).filter(c => 
        c.participants.some((p: any) => p.user_id === user.id)
      );

      const conversationDetails = userConvs.map((conv: any) => {
        const otherParticipant = conv.participants.find((p: any) => p.user_id !== user.id);
        const otherProfile = otherParticipant?.profiles;
        const lastMsg = conv.last_messages?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        // Fetch unread count separately or filter from messages if possible
        // For now, let's keep it simple as the messages might be limited
        const unreadCount = 0; // Will handle unread count better in a separate step if needed

        return {
          id: conv.id,
          updated_at: conv.updated_at,
          name: conv.is_group ? conv.name : (otherProfile?.full_name || 'Conversa'),
          is_group: conv.is_group,
          avatar_url: conv.is_group ? conv.avatar_url : otherProfile?.avatar_url,
          other_user: otherProfile || {},
          last_message: lastMsg,
          unread_count: unreadCount,
        };
      });

      setConversations(conversationDetails);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const filteredConversations = conversations.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && conversations.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: backgroundPrimary }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <View style={[styles.header, { backgroundColor: backgroundSecondary, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderBottomWidth: 1 }]}>
        <View style={{ paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
              <ArrowLeft size={24} color={textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Mensagens</Text>
            <TouchableOpacity 
              onPress={() => router.push('/messages/new-group')}
              style={[styles.newGroupButton, { backgroundColor: accent }]}
            >
              <Users size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}>
            <Search size={20} color={textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: textPrimary }]}
              placeholder="Buscar conversas..."
              placeholderTextColor={textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.conversationItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => router.push(`/messages/${item.id}?userId=${item.other_user.id}`)}
          >
            <View style={styles.avatarContainer}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#1a1a1a' : '#e1e1e1' }]}>
                  <Text style={[styles.avatarText, { color: textSecondary }]}>
                    {(item.name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              {item.is_group && (
                <View style={[styles.groupBadge, { borderColor: backgroundPrimary, backgroundColor: accent }]}>
                  <Users size={10} color="#fff" />
                </View>
              )}
            </View>

            <View style={styles.conversationInfo}>
              <View style={styles.conversationHeader}>
                <Text style={[styles.conversationName, { color: textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.last_message && (
                  <Text style={[styles.lastMessageTime, { color: textSecondary }]}>
                    {new Date(item.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>

              <View style={styles.lastMessageContainer}>
                <Text style={[styles.lastMessage, { color: textSecondary }]} numberOfLines={1}>
                  {item.last_message ? (
                    (() => {
                      const prefix = item.last_message.sender_id === user?.id ? 'Você: ' : '';
                      try {
                        const parsed = JSON.parse(item.last_message.content);
                        if (parsed.type === 'audio') return `${prefix}🎙️ Áudio`;
                        if (parsed.type === 'image') return `${prefix}📷 Imagem`;
                        if (parsed.type === 'event_card') return `${prefix}📅 Convite de Evento`;
                      } catch (e) {}
                      return `${prefix}${item.last_message.content}`;
                    })()
                  ) : (
                    'Inicie uma conversa'
                  )}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accent} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MessageSquare size={48} color={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>Nenhuma conversa encontrada</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
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
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  newGroupButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  groupBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  lastMessageTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 15,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
