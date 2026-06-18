import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, FlatList, RefreshControl, Alert, Animated as RNAnimated } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { MessageCircle, Search, Plus, ArrowLeft, Users, MessageSquare, X, Archive, Trash2, ArchiveRestore } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/lib/i18n';

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
  is_online?: boolean;
}

export default function ConversationsList() {
  const { user } = useAuth();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [archivedIds, setArchivedIds] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    loadConversations();

    // Subscribe to new messages realtime to update counts and move conversations to the top
    const messagesChannel = supabase
      .channel('messages-list-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('[Realtime] Messages change detected:', payload);
          // Recarregar a lista silenciosamente (sem o spinner de loading global)
          reloadConversationsSilently();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [user?.id]);
  useEffect(() => {
    const loadArchived = async () => {
      try {
        const saved = await AsyncStorage.getItem(`@archived_conversations_${user?.id}`);
        if (saved) setArchivedIds(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading archived', e);
      }
    };
    if (user?.id) loadArchived();
  }, [user?.id]);

  const reloadConversationsSilently = async () => {
    if (!user) return;
    try {
      await fetchAndSetConversations();
    } catch (error) {
      console.error('Error silently refreshing conversations:', error);
    }
  };

  const loadConversations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await fetchAndSetConversations();
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAndSetConversations = async () => {
    if (!user) return;
    try {
      // 1. Simular confirmação de "Entregue" (2 traços cinzas) estilo WhatsApp:
      // Ao abrir o app e carregar a lista, significa que as mensagens chegaram no celular do usuário.
      await supabase
        .from('messages')
        .update({
          delivered: true,
          delivered_at: new Date().toISOString()
        })
        .neq('sender_id', user.id)
        .eq('delivered', false);
    
    // Fetch conversations
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

    // Fetch unread count maps
    const { data: unreadData, error: unreadError } = await supabase
      .from('messages')
      .select('conversation_id')
      .neq('sender_id', user.id)
      .eq('read', false);

    const unreadCountMap = new Map<string, number>();
    if (unreadData) {
      unreadData.forEach((msg: any) => {
        const cid = msg.conversation_id;
        unreadCountMap.set(cid, (unreadCountMap.get(cid) || 0) + 1);
      });
    }

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

      const unreadCount = unreadCountMap.get(conv.id) || 0;

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

      // Agrupar conversas 1:1 pelo ID do outro participante para evitar duplicadas!
      const groupedDetailsMap = new Map<string, any>();
      const groupConversationsList: any[] = [];

      conversationDetails.forEach((conv) => {
        if (conv.is_group) {
          groupConversationsList.push(conv);
        } else {
          const otherUserId = conv.other_user?.id;
          if (otherUserId) {
            if (!groupedDetailsMap.has(otherUserId)) {
              groupedDetailsMap.set(otherUserId, conv);
            } else {
              // Se já temos uma conversa para esse usuário, pegamos a que tiver a mensagem ou updated_at mais recente!
              const existing = groupedDetailsMap.get(otherUserId);
              
              const existingTime = existing.last_message 
                ? new Date(existing.last_message.created_at).getTime() 
                : new Date(existing.updated_at).getTime();

              const newTime = conv.last_message 
                ? new Date(conv.last_message.created_at).getTime() 
                : new Date(conv.updated_at).getTime();

              if (newTime > existingTime) {
                // Manter a mais recente
                groupedDetailsMap.set(otherUserId, conv);
              }
            }
          } else {
            // Sem outro usuário válido (por consistência), manter na lista
            groupConversationsList.push(conv);
          }
        }
      });

      // Juntar tudo e ordenar
      const unifiedConversations = [
        ...groupConversationsList,
        ...Array.from(groupedDetailsMap.values())
      ];

      // Ordenar a lista unificada final por data da última mensagem ou update
      unifiedConversations.sort((a, b) => {
        const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : new Date(a.updated_at).getTime();
        const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : new Date(b.updated_at).getTime();
        return timeB - timeA;
      });

      // Fetch presence for all other users
      const otherUserIds = unifiedConversations.map(c => c.other_user?.id).filter(Boolean);
      const { data: presenceData } = await supabase
        .from('user_presence')
        .select('user_id, is_online')
        .in('user_id', otherUserIds);

      const conversationsWithPresence = unifiedConversations.map(conv => ({
        ...conv,
        is_online: presenceData?.find(p => p.user_id === conv.other_user?.id)?.is_online || false
      }));

      setConversations(conversationsWithPresence);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleArchive = async (id: string) => {
    try {
      const isArchived = archivedIds.includes(id);
      const updated = isArchived ? archivedIds.filter(a => a !== id) : [...archivedIds, id];
      setArchivedIds(updated);
      await AsyncStorage.setItem(`@archived_conversations_${user?.id}`, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving archive', e);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t('messages.deleteTitle', 'Excluir Conversa'),
      t('messages.deleteMessage', 'Tem certeza que deseja apagar esta conversa permanentemente?'),
      [
        { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          text: t('common.delete', 'Excluir'),
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              await supabase.from('conversation_participants').delete().eq('conversation_id', id).eq('user_id', user.id);
              setConversations(prev => prev.filter(c => c.id !== id));
              if (archivedIds.includes(id)) {
                const newArchived = archivedIds.filter(a => a !== id);
                setArchivedIds(newArchived);
                await AsyncStorage.setItem(`@archived_conversations_${user?.id}`, JSON.stringify(newArchived));
              }
            } catch (e) {
              console.error('Error deleting chat', e);
              Alert.alert('Erro', 'Não foi possível excluir a conversa.');
            }
          }
        }
      ]
    );
  };

  const renderRightActions = (item: ConversationWithDetails, progress: any, dragX: any) => {
    const isArchived = archivedIds.includes(item.id);
    
    // Animação para que os botões acompanhem o gesto de forma fluida
    const trans = dragX.interpolate({
      inputRange: [-160, 0],
      outputRange: [0, 160],
      extrapolate: 'clamp',
    });

    return (
      <View style={{ flexDirection: 'row', width: 160 }}>
        <RNAnimated.View style={{ flex: 1, transform: [{ translateX: trans }] }}>
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: isDark ? '#2c2c2e' : '#54656f', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => handleArchive(item.id)}
            activeOpacity={0.8}
          >
            {isArchived ? <ArchiveRestore size={22} color="#fff" /> : <Archive size={22} color="#fff" />}
            <Text style={{ color: '#fff', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
              {isArchived ? 'Desarquivar' : 'Arquivar'}
            </Text>
          </TouchableOpacity>
        </RNAnimated.View>
        <RNAnimated.View style={{ flex: 1, transform: [{ translateX: trans }] }}>
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: '#ff3b30', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => handleDelete(item.id)}
            activeOpacity={0.8}
          >
            <Trash2 size={22} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 11, marginTop: 4, fontWeight: '600' }}>
              {t('common.delete', 'Excluir')}
            </Text>
          </TouchableOpacity>
        </RNAnimated.View>
      </View>
    );
  };

  const mainConversations = conversations.filter(c => !archivedIds.includes(c.id));
  const archivedConversations = conversations.filter(c => archivedIds.includes(c.id));
  const currentConversations = showArchived ? archivedConversations : mainConversations;

  const filteredConversations = currentConversations.filter(c => 
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
      <View style={[styles.header, { backgroundColor: isDark ? '#0b141a' : accent, borderBottomWidth: 0, paddingBottom: 10 }]}>
        <View style={{ paddingTop: 60, paddingHorizontal: 16 }}>
          <View style={styles.headerTop}>
            {isSearching ? (
              <View style={[styles.searchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }]}>
                <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }}>
                  <ArrowLeft size={22} color="#fff" />
                </TouchableOpacity>
                <TextInput
                  style={[styles.searchInput, { color: '#fff' }]}
                  placeholder={t('common.search', 'Pesquisar...')}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={() => {
                    if (showArchived) {
                      setShowArchived(false);
                    } else {
                      router.back();
                    }
                  }} style={{ padding: 4, marginLeft: -4 }}>
                    <ArrowLeft size={24} color="#fff" />
                  </TouchableOpacity>
                  <Text style={[styles.headerTitle, { color: '#fff' }]}>
                    {showArchived ? 'Arquivadas' : t('messages.messages', 'WhatsApp')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                  <TouchableOpacity onPress={() => setIsSearching(true)}>
                    <Search size={22} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {}}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>⋮</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      <Animated.FlatList
        data={filteredConversations}
        itemLayoutAnimation={LinearTransition}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => {
          if (!showArchived && archivedConversations.length > 0 && !isSearching) {
            return (
              <TouchableOpacity
                style={[styles.archivedHeaderButton, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}
                onPress={() => setShowArchived(true)}
              >
                <View style={[styles.archivedIconContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f0f2f5' }]}>
                  <Archive size={22} color={textSecondary} />
                </View>
                <View style={[styles.archivedHeaderInfo, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                  <Text style={[styles.archivedHeaderText, { color: textPrimary }]}>Arquivadas</Text>
                  <Text style={[styles.archivedCountText, { color: accent }]}>{archivedConversations.length}</Text>
                </View>
              </TouchableOpacity>
            );
          }
          return null;
        }}
        renderItem={({ item }) => (
          <Swipeable 
            renderRightActions={(progress, dragX) => renderRightActions(item, progress, dragX)}
            overshootRight={false}
            friction={1.2}
          >
            <TouchableOpacity
              style={[styles.conversationItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', backgroundColor: backgroundPrimary }]}
              onPress={() => router.push(`/messages/${item.id}?userId=${item.other_user.id}`)}
              activeOpacity={1}
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
                {!item.is_group && item.is_online && (
                  <View style={[styles.onlineDot, { backgroundColor: '#34C759', borderColor: backgroundPrimary }]} />
                )}
              </View>

              <View style={[styles.conversationInfo, { borderBottomColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.1)' }]}>
                <View style={styles.conversationHeader}>
                  <Text style={[styles.conversationName, { color: textPrimary, fontWeight: item.unread_count > 0 ? '800' : '600' }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.last_message && (
                    <Text style={[styles.lastMessageTime, { color: item.unread_count > 0 ? accent : textSecondary, fontWeight: item.unread_count > 0 ? '700' : '400' }]}>
                      {new Date(item.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>

                <View style={styles.lastMessageContainer}>
                  <Text style={[styles.lastMessage, { color: item.unread_count > 0 ? textPrimary : textSecondary, fontWeight: item.unread_count > 0 ? '600' : '400' }]} numberOfLines={1}>
                    {item.last_message ? (
                      (() => {
                        const prefix = item.last_message.sender_id === user?.id ? 'Você: ' : '';
                        try {
                          const parsed = JSON.parse(item.last_message.content);
                          if (parsed.type === 'audio') return `${prefix}🎙️ Áudio`;
                          if (parsed.type === 'image') return `${prefix}📷 Imagem`;
                          if (parsed.type === 'event_card') return `${prefix}📅 Convite de Evento`;
                          if (parsed.type === 'reply') return `${prefix}${parsed.text || ''}`;
                        } catch (e) {}
                        return `${prefix}${item.last_message.content}`;
                      })()
                    ) : (
                      t('messages.newMessage', 'Inicie uma conversa')
                    )}
                  </Text>
                  {item.unread_count > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: accent }]}>
                      <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </Swipeable>
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accent} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MessageSquare size={48} color={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>{t('messages.noMessages', 'Nenhuma conversa encontrada')}</Text>
          </View>
        )}
      />

      <TouchableOpacity 
        onPress={() => router.push('/messages/new-group')}
        style={styles.fab}
        activeOpacity={0.8}
      >
        <MessageSquare size={24} color="#fff" />
      </TouchableOpacity>
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
    paddingHorizontal: 0,
    paddingTop: 10,
  },
  conversationItem: {
    flexDirection: 'row',
    paddingLeft: 16,
    height: 76,
    alignItems: 'center',
    width: '100%',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
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
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  conversationInfo: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    paddingRight: 16,
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
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 10,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  archivedHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    height: 60,
    marginBottom: 8,
  },
  archivedIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  archivedHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    borderBottomWidth: 0.5,
    paddingRight: 24,
  },
  archivedHeaderText: {
    fontSize: 17,
    fontWeight: '600',
  },
  archivedCountText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
