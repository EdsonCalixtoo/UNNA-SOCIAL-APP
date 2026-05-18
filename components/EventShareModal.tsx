import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  MessageCircle,
  Mail,
  Copy,
  Share2,
  MapPin,
  Calendar,
  Clock,
  Users,
  Check,
} from 'lucide-react-native';
import { Image } from 'expo-image';

interface EventShareModalProps {
  visible: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    description: string;
    image_url?: string;
    event_date: string;
    event_time: string;
    location_name: string;
    max_participants?: number;
    profiles?: {
      full_name: string;
    };
  };
}

export function EventShareModal({
  visible,
  onClose,
  event,
}: EventShareModalProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [groupContacts, setGroupContacts] = useState<any[]>([]);
  const [userContacts, setUserContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sharedIds, setSharedIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (visible && user) {
      loadContacts();
    }
  }, [visible, user]);

  const loadContacts = async () => {
    setLoadingContacts(true);
    try {
      // 1. Buscar pessoas que o usuário segue
      const { data: following, error: followingError } = await supabase
        .from('follows')
        .select(`
          following_id,
          profiles:following_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('follower_id', user?.id);

      if (followingError) throw followingError;

      // 2. Buscar grupos que o usuário participa
      const { data: groupParticipants, error: groupError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner (
            id,
            name,
            is_group,
            avatar_url
          )
        `)
        .eq('user_id', user?.id)
        .eq('conversations.is_group', true);

      if (groupError) throw groupError;

      // Formatar seguidores como contatos
      const followingContacts = (following || []).map((f: any) => ({
        id: f.profiles?.id,
        name: f.profiles?.full_name || f.profiles?.username || 'Usuário',
        avatar_url: f.profiles?.avatar_url,
        type: 'user'
      })).filter(c => c.id);

      // Formatar grupos
      const groupContacts = (groupParticipants || []).map((g: any) => ({
        id: g.conversations?.id,
        name: g.conversations?.name || 'Grupo',
        avatar_url: g.conversations?.avatar_url,
        type: 'group'
      }));

      setGroupContacts(groupContacts);
      setUserContacts(followingContacts);
    } catch (err) {
      console.error('Error loading contacts for sharing:', err);
    } finally {
      setLoadingContacts(false);
    }
  };

  const shareToContact = async (contact: any) => {
    if (sharedIds.includes(contact.id)) return;

    try {
      let conversationId = contact.id;

      // Se for um usuário, precisamos garantir que existe uma conversa
      if (contact.type === 'user') {
        // Tentar encontrar conversa 1:1 existente de forma ultra robusta
        const { data: myConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user?.id);
        
        const myConvIds = myConvs?.map(c => c.conversation_id) || [];
        let existingChatId = null;

        if (myConvIds.length > 0) {
          const { data: targetConvs } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', contact.id)
            .in('conversation_id', myConvIds);
          
          const commonConvIds = targetConvs?.map(c => c.conversation_id) || [];

          if (commonConvIds.length > 0) {
            // Buscar conversa 1:1 real que NÃO é grupo
            const { data: realConvs } = await supabase
              .from('conversations')
              .select('id')
              .eq('is_group', false)
              .in('id', commonConvIds)
              .order('updated_at', { ascending: false });

            if (realConvs && realConvs.length > 0) {
              existingChatId = realConvs[0].id;
            }
          }
        }

        if (existingChatId) {
          conversationId = existingChatId;
        } else {
          // Criar nova conversa 1:1
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({ is_group: false })
            .select()
            .single();

          if (convError) throw convError;
          conversationId = newConv.id;

          // Adicionar participantes
          await supabase.from('conversation_participants').insert([
            { conversation_id: conversationId, user_id: user?.id },
            { conversation_id: conversationId, user_id: contact.id }
          ]);
        }
      }

      const eventAny = event as any;
      const eventCard = JSON.stringify({
        type: 'event_card',
        event_id: event.id,
        title: event.title,
        date: event.event_date || eventAny.date,
        image: event.image_url || (eventAny.image_urls && eventAny.image_urls[0]) || eventAny.image
      });

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user?.id,
        content: eventCard,
      });

      if (error) throw error;
      setSharedIds(prev => [...prev, contact.id]);
    } catch (err) {
      console.error('Error sharing to contact:', err);
      Alert.alert('Erro', 'Não foi possível compartilhar');
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    try {
      if (!dateString) return 'Data não especificada';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      return date.toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      return 'Data não especificada';
    }
  };

  const formatTime = (timeString: string | null | undefined) => {
    try {
      if (!timeString) return 'Horário não especificado';
      return String(timeString).slice(0, 5) || 'Horário não especificado';
    } catch (error) {
      return 'Horário não especificado';
    }
  };

  const handleShare = async () => {
    try {
      const shareMessage = `🎉 *${event.title}*\n📅 ${formatDate(event.event_date)} em ${event.location_name}\n\nConfira no UNИA: https://unna.app/event/${event.id}`;
      await Share.share({
        message: shareMessage,
        title: event.title,
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar');
    }
  };

  const handleCopyLink = async () => {
    const link = `https://unna.app/event/${event.id}`;
    Alert.alert('Copiado!', 'Link do evento copiado');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    { id: 'whatsapp', title: 'WhatsApp', icon: MessageCircle, color: '#25D366', onPress: handleShare },
    { id: 'copy', title: 'Copiar Link', icon: Copy, color: '#00d9ff', onPress: handleCopyLink },
    { id: 'more', title: 'Mais', icon: Share2, color: '#FF9500', onPress: handleShare },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Compartilhar Evento</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.eventCard}>
              {event.image_url ? (
                <Image source={{ uri: event.image_url }} style={styles.eventImage} resizeMode="cover" />
              ) : (
                <LinearGradient colors={['#00d9ff', '#ff1493']} style={styles.eventImagePlaceholder}>
                  <Text style={styles.placeholderText}>UNИA</Text>
                </LinearGradient>
              )}
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                <View style={styles.detailsContainer}>
                  <View style={styles.detailItem}>
                    <Calendar size={14} color="#00d9ff" />
                    <Text style={styles.detailText}>{formatDate(event.event_date)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock size={14} color="#FF9500" />
                    <Text style={styles.detailText}>{formatTime(event.event_time)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MapPin size={14} color="#34C759" />
                    <Text style={styles.detailText} numberOfLines={1}>{event.location_name}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.internalShareContainer}>
              <Text style={styles.optionsTitle}>Compartilhar nos Grupos ({groupContacts.length})</Text>
              {loadingContacts ? (
                <ActivityIndicator color="#00d9ff" style={{ marginVertical: 20 }} />
              ) : (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={groupContacts}
                  keyExtractor={item => `group-${item.id}`}
                  contentContainerStyle={styles.internalList}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.contactItem} onPress={() => shareToContact(item)}>
                      <View style={styles.avatarContainer}>
                        {item.avatar_url ? (
                          <Image source={{ uri: item.avatar_url }} style={styles.contactAvatar} />
                        ) : (
                          <View style={[styles.avatarPlaceholder, { backgroundColor: '#ff1493' }]}>
                            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        {sharedIds.includes(item.id) && (
                          <View style={styles.sharedBadge}>
                            <Check size={10} color="#fff" strokeWidth={4} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.contactName} numberOfLines={1}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyText}>Você não participa de nenhum grupo</Text>}
                />
              )}
            </View>

            <View style={styles.internalShareContainer}>
              <Text style={styles.optionsTitle}>Compartilhar com Contatos ({userContacts.length})</Text>
              {loadingContacts ? (
                <ActivityIndicator color="#00d9ff" style={{ marginVertical: 20 }} />
              ) : (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={userContacts}
                  keyExtractor={item => `user-${item.id}`}
                  contentContainerStyle={styles.internalList}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.contactItem} onPress={() => shareToContact(item)}>
                      <View style={styles.avatarContainer}>
                        {item.avatar_url ? (
                          <Image source={{ uri: item.avatar_url }} style={styles.contactAvatar} />
                        ) : (
                          <View style={[styles.avatarPlaceholder, { backgroundColor: '#00d9ff' }]}>
                            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        {sharedIds.includes(item.id) && (
                          <View style={styles.sharedBadge}>
                            <Check size={10} color="#fff" strokeWidth={4} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.contactName} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyText}>Siga pessoas para compartilhar eventos!</Text>}
                />
              )}
            </View>

            <View style={styles.optionsContainer}>
              <Text style={styles.optionsTitle}>Outras opções</Text>
              <View style={styles.optionsGrid}>
                {shareOptions.map((option) => (
                  <TouchableOpacity key={option.id} style={styles.optionButton} onPress={option.onPress}>
                    <View style={[styles.optionIconContainer, { borderColor: option.color }]}>
                      {React.createElement(option.icon, { size: 24, color: option.color })}
                    </View>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Concluído</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)' },
  modalContent: { backgroundColor: '#0a0a0a', borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  scrollContent: { padding: 20 },
  eventCard: { backgroundColor: '#161616', borderRadius: 20, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: '#222' },
  eventImage: { width: '100%', height: 160 },
  eventImagePlaceholder: { width: '100%', height: 160, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  eventInfo: { padding: 15 },
  eventTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 10 },
  detailsContainer: { gap: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  internalShareContainer: { marginBottom: 25 },
  optionsTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 15 },
  internalList: { gap: 15 },
  contactItem: { alignItems: 'center', width: 70 },
  avatarContainer: { position: 'relative', marginBottom: 6 },
  contactAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#222' },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sharedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#34C759', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0a0a0a' },
  groupBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#00d9ff', width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0a0a0a' },
  contactName: { color: '#888', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  emptyText: { color: '#555', fontSize: 14, fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },
  optionsContainer: { marginBottom: 20 },
  optionsGrid: { flexDirection: 'row', gap: 15 },
  optionButton: { alignItems: 'center', gap: 8 },
  optionIconContainer: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: '#161616', borderWidth: 1 },
  optionTitle: { fontSize: 11, fontWeight: '600', color: '#888' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#222' },
  closeButton: { backgroundColor: '#00d9ff', borderRadius: 15, paddingVertical: 15, alignItems: 'center' },
  closeButtonText: { fontSize: 16, fontWeight: '800', color: '#000' },
});
