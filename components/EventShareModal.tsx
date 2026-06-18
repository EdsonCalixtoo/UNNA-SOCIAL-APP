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
  Linking,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
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
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const [copied, setCopied] = useState(false);
  const [groupContacts, setGroupContacts] = useState<any[]>([]);
  const [userContacts, setUserContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sharedIds, setSharedIds] = useState<string[]>([]);
  const viewShotRef = React.useRef<ViewShot>(null);

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
      const shareMessage = `🚀 *${event.title}*\n\n📅 Data: ${formatDate(event.event_date)}\n⏰ Horário: ${formatTime(event.event_time)}\n📍 Local: ${event.location_name}\n\nGaranta sua vaga e confira no app UNИA!\n👉 https://unnasocialapp.com/event/${event.id}`;
      
      await Share.share({
        message: shareMessage,
        title: event.title,
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar');
    }
  };
  
  const handleShareImage = async () => {
    try {
      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture();
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            dialogTitle: 'Compartilhar Ticket do Evento',
            mimeType: 'image/png',
            UTI: 'public.png',
          });
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar a imagem');
    }
  };

  const handleCopyLink = async () => {
    const link = `https://unnasocialapp.com/event/${event.id}`;
    await Clipboard.setStringAsync(link);
    Alert.alert('Copiado!', 'Link do evento copiado');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = async () => {
      const shareMessage = `🚀 *${event.title}*\n\n📅 Data: ${formatDate(event.event_date)}\n⏰ Horário: ${formatTime(event.event_time)}\n📍 Local: ${event.location_name}\n\nGaranta sua vaga e confira os detalhes no app UNИA!\n👉 https://unnasocialapp.com/event/${event.id}`;
    const url = `whatsapp://send?text=${encodeURIComponent(shareMessage)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // Fallback to normal share if WhatsApp is not installed
        handleShare();
      }
    } catch (err) {
      handleShare();
    }
  };

  const shareOptions = [
    { id: 'whatsapp', title: 'WhatsApp', icon: MessageCircle, color: '#25D366', onPress: handleWhatsAppShare },
    { id: 'image', title: 'Salvar/Enviar Ticket', icon: Calendar, color: '#ff1493', onPress: handleShareImage },
    { id: 'copy', title: 'Copiar Link', icon: Copy, color: '#00d9ff', onPress: handleCopyLink },
    { id: 'more', title: 'Mais', icon: Share2, color: '#FF9500', onPress: handleShare },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modalContent, { backgroundColor: backgroundPrimary }]}>
          
          {/* Drag Indicator */}
          <View style={styles.dragIndicator} />

          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>Compartilhar Evento</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
              <X size={24} color={textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Sleek Preview Header */}
            <View style={[styles.previewContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0' }]}>
              {event.image_url ? (
                <Image source={{ uri: event.image_url }} style={styles.previewImage} />
              ) : (
                <View style={[styles.previewImage, { backgroundColor: accent, justifyContent: 'center', alignItems: 'center' }]}>
                  <Calendar size={24} color="#fff" />
                </View>
              )}
              <View style={styles.previewTextContainer}>
                <Text style={[styles.previewTitle, { color: textPrimary }]} numberOfLines={2}>{event.title}</Text>
                <Text style={[styles.previewSubtitle, { color: textSecondary }]} numberOfLines={1}>
                  {formatDate(event.event_date)} • {formatTime(event.event_time)}
                </Text>
              </View>
            </View>

            {/* Quick Actions Row */}
            <View style={styles.quickActionsContainer}>
              {shareOptions.map((option) => (
                <TouchableOpacity key={option.id} style={styles.quickActionBtn} onPress={option.onPress}>
                  <View style={[styles.quickActionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e0e0e0' }]}>
                    {React.createElement(option.icon, { size: 24, color: option.color })}
                  </View>
                  <Text style={[styles.quickActionText, { color: textPrimary }]}>{option.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Internal Share: Groups */}
            <View style={styles.internalShareContainer}>
              <Text style={[styles.optionsTitle, { color: textPrimary }]}>Grupos ({groupContacts.length})</Text>
              {loadingContacts ? (
                <ActivityIndicator color={accent} style={{ marginVertical: 20 }} />
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
                          <Image source={{ uri: item.avatar_url }} style={[styles.contactAvatar, { borderColor: isDark ? '#333' : '#ddd' }]} />
                        ) : (
                          <View style={[styles.avatarPlaceholder, { backgroundColor: accent }]}>
                            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        {sharedIds.includes(item.id) && (
                          <View style={[styles.sharedBadge, { borderColor: backgroundPrimary }]}>
                            <Check size={12} color="#fff" strokeWidth={3} />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.contactName, { color: textSecondary }]} numberOfLines={1}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={[styles.emptyText, { color: textSecondary }]}>Você não participa de nenhum grupo</Text>}
                />
              )}
            </View>

            {/* Internal Share: Contacts */}
            <View style={styles.internalShareContainer}>
              <Text style={[styles.optionsTitle, { color: textPrimary }]}>Contatos ({userContacts.length})</Text>
              {loadingContacts ? (
                <ActivityIndicator color={accent} style={{ marginVertical: 20 }} />
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
                          <Image source={{ uri: item.avatar_url }} style={[styles.contactAvatar, { borderColor: isDark ? '#333' : '#ddd' }]} />
                        ) : (
                          <View style={[styles.avatarPlaceholder, { backgroundColor: '#00d9ff' }]}>
                            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                        {sharedIds.includes(item.id) && (
                          <View style={[styles.sharedBadge, { borderColor: backgroundPrimary }]}>
                            <Check size={12} color="#fff" strokeWidth={3} />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.contactName, { color: textSecondary }]} numberOfLines={1}>{item.name.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={[styles.emptyText, { color: textSecondary }]}>Siga pessoas para compartilhar!</Text>}
                />
              )}
            </View>

          </ScrollView>

          {/* HIDDEN TICKET FOR VIEWSHOT */}
          <View style={{ position: 'absolute', left: -5000, top: 0 }}>
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
              <View style={styles.premiumTicketCard}>
                {event.image_url ? (
                  <Image source={{ uri: event.image_url }} style={styles.ticketBgImage} resizeMode="cover" blurRadius={3} />
                ) : (
                  <LinearGradient colors={['#111', '#222']} style={styles.ticketBgImage} />
                )}
                <View style={styles.ticketOverlay} />

                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketLogoText}>UNИA</Text>
                  <View style={styles.ticketBadge}>
                    <Text style={styles.ticketBadgeText}>PREMIUM EVENT</Text>
                  </View>
                </View>

                <View style={styles.ticketContent}>
                  {event.image_url ? (
                    <Image source={{ uri: event.image_url }} style={styles.ticketMainImage} resizeMode="cover" />
                  ) : (
                    <LinearGradient colors={['#00d9ff', '#ff1493']} style={styles.ticketMainImage}>
                      <Text style={{color: '#fff', fontWeight: '900', fontSize: 24}}>UNИA</Text>
                    </LinearGradient>
                  )}
                  
                  <View style={styles.ticketInfoBox}>
                    <Text style={styles.ticketTitle} numberOfLines={2}>{event.title}</Text>
                    
                    <View style={styles.ticketRow}>
                      <View style={styles.ticketIconBg}><Calendar size={16} color="#00d9ff" /></View>
                      <View>
                        <Text style={styles.ticketLabel}>DATA</Text>
                        <Text style={styles.ticketValue}>{formatDate(event.event_date)}</Text>
                      </View>
                    </View>

                    <View style={styles.ticketRow}>
                      <View style={styles.ticketIconBg}><Clock size={16} color="#FF9500" /></View>
                      <View>
                        <Text style={styles.ticketLabel}>HORÁRIO</Text>
                        <Text style={styles.ticketValue}>{formatTime(event.event_time)}</Text>
                      </View>
                    </View>

                    <View style={styles.ticketRow}>
                      <View style={styles.ticketIconBg}><MapPin size={16} color="#34C759" /></View>
                      <View>
                        <Text style={styles.ticketLabel}>LOCAL</Text>
                        <Text style={styles.ticketValue} numberOfLines={1}>{event.location_name}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.ticketFooter}>
                  <Text style={styles.ticketFooterText}>https://unnasocialapp.com/event/{event.id.split('-')[0]}</Text>
                </View>
              </View>
            </ViewShot>
          </View>
          
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  dragIndicator: { width: 40, height: 5, backgroundColor: 'rgba(150,150,150,0.3)', borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  closeIconBtn: { padding: 4, backgroundColor: 'rgba(150,150,150,0.1)', borderRadius: 20 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  previewContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 24 },
  previewImage: { width: 60, height: 60, borderRadius: 12, marginRight: 14 },
  previewTextContainer: { flex: 1, justifyContent: 'center' },
  previewTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  previewSubtitle: { fontSize: 13 },

  quickActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, paddingHorizontal: 10 },
  quickActionBtn: { alignItems: 'center', width: 70 },
  quickActionIcon: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  
  // Premium Ticket Styles
  premiumTicketCard: {
    backgroundColor: '#0a0a0a',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    width: 320, // fixed width for a consistent ticket shape
    alignSelf: 'center', // center in the viewshot
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  ticketBgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  ticketOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    zIndex: 10,
  },
  ticketLogoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  ticketBadge: {
    backgroundColor: 'rgba(255, 20, 147, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 20, 147, 0.5)',
  },
  ticketBadgeText: {
    color: '#ff1493',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ticketContent: {
    paddingHorizontal: 20,
    zIndex: 10,
  },
  ticketMainImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ticketInfoBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ticketTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  ticketIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  ticketValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  ticketFooter: {
    padding: 15,
    backgroundColor: 'rgba(0,217,255,0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,217,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    marginTop: 20, // ensure space from the content above
  },
  ticketFooterText: {
    color: '#00d9ff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  
  internalShareContainer: { marginBottom: 25 },
  optionsTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  internalList: { gap: 16, paddingRight: 20 },
  contactItem: { alignItems: 'center', width: 64 },
  avatarContainer: { position: 'relative', marginBottom: 8 },
  contactAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sharedBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#34C759', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  contactName: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  emptyText: { fontSize: 14, fontStyle: 'italic', opacity: 0.6 },
});
