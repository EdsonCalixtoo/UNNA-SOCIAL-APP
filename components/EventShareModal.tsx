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
  Image,
} from 'react-native';
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
} from 'lucide-react-native';

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
  const [copied, setCopied] = useState(false);

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
      console.error('Error formatting date:', error);
      return 'Data não especificada';
    }
  };

  const formatTime = (timeString: string | null | undefined) => {
    try {
      if (!timeString) return 'Horário não especificado';
      return String(timeString).slice(0, 5) || 'Horário não especificado';
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'Horário não especificado';
    }
  };

  const createShareMessage = () => {
    try {
      return `🎉 *${event.title || 'Evento'}*\n\n📝 ${event.description || 'Sem descrição'}\n\n📅 ${formatDate(
        event.event_date
      )}\n⏰ ${formatTime(event.event_time)}\n📍 ${event.location_name || 'Local não especificado'}\n\n👤 Criador: ${
        event.profiles?.full_name || 'Usuário'
      }\n\nVenha participar! 🎊`;
    } catch (error) {
      console.error('Error creating share message:', error);
      return 'Confira este evento!';
    }
  };

  const createEventLink = () => {
    return `https://unna.app/event/${event.id}`;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: createShareMessage(),
        title: event.title,
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível compartilhar');
    }
  };

  const handleCopyLink = async () => {
    try {
      // Simular cópia (em um app real, usaria react-native-clipboard)
      const link = createEventLink();
      Alert.alert('Copiado!', 'Link do evento copiado para a área de transferência');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível copiar o link');
    }
  };

  const shareOptions = [
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      icon: MessageCircle,
      color: '#25D366',
      onPress: handleShare,
    },
    {
      id: 'email',
      title: 'Email',
      icon: Mail,
      color: '#EA4335',
      onPress: () => {
        try {
          const title = event.title ? String(event.title) : 'Evento';
          const date = formatDate(event.event_date);
          const time = formatTime(event.event_time);
          const loc = event.location_name ? String(event.location_name) : 'Local não especificado';
          const desc = event.description ? String(event.description) : 'Sem descrição';
          
          Alert.alert(
            'Email',
            `Evento: ${title} | Data: ${date} | Horário: ${time} | Local: ${loc} | Descrição: ${desc}`
          );
        } catch (error) {
          console.error('Email error:', error);
          Alert.alert('Erro', 'Não foi possível preparar a mensagem');
        }
      },
    },
    {
      id: 'copy',
      title: 'Copiar Link',
      icon: Copy,
      color: '#00d9ff',
      onPress: handleCopyLink,
    },
    {
      id: 'more',
      title: 'Mais Opções',
      icon: Share2,
      color: '#FF9500',
      onPress: handleShare,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Background escuro */}
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />

        {/* Conteúdo Modal */}
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Compartilhar Evento</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={28} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Card do Evento */}
            <View style={styles.eventCard}>
              {event.image_url ? (
                <Image
                  source={{ uri: event.image_url }}
                  style={styles.eventImage}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={['#00d9ff', '#ff1493']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.eventImagePlaceholder}
                >
                  <Text style={styles.placeholderText}>UNИA</Text>
                </LinearGradient>
              )}

              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {String(event.title || 'Evento')}
                </Text>

                <Text
                  style={styles.eventDescription}
                  numberOfLines={2}
                >
                  {String(event.description || 'Sem descrição')}
                </Text>

                {/* Detalhes */}
                <View style={styles.detailsContainer}>
                  <View style={styles.detailItem}>
                    <Calendar size={16} color="#00d9ff" strokeWidth={2.5} />
                    <Text style={styles.detailText}>
                      {String(formatDate(event.event_date) || '')}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Clock size={16} color="#FF9500" strokeWidth={2.5} />
                    <Text style={styles.detailText}>
                      {String(formatTime(event.event_time) || '')}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <MapPin size={16} color="#34C759" strokeWidth={2.5} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {String(event.location_name || 'Local não especificado')}
                    </Text>
                  </View>

                  {event.max_participants ? (
                    <View style={styles.detailItem}>
                      <Users size={16} color="#FF3B30" strokeWidth={2.5} />
                      <Text style={styles.detailText}>
                        {String(event.max_participants) + ' vagas'}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Opções de Compartilhamento */}
            <View style={styles.optionsContainer}>
              <Text style={styles.optionsTitle}>Compartilhar via</Text>

              <View style={styles.optionsGrid}>
                {shareOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.optionButton}
                    onPress={option.onPress}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={[
                        option.color + '20',
                        option.color + '10',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.optionGradient}
                    >
                      <View
                        style={[
                          styles.optionIconContainer,
                          { borderColor: option.color },
                        ]}
                      >
                        {React.createElement(option.icon, {
                          size: 28,
                          color: option.color,
                          strokeWidth: 2,
                        })}
                      </View>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Mensagem de Pré-visualização */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewTitle}>Pré-visualização</Text>
              <View style={styles.previewBox}>
                <View>
                  <Text style={styles.previewText}>{String(event.title || 'Evento')}</Text>
                  <Text style={[styles.previewText, { marginTop: 8 }]}>{String(event.description || 'Sem descrição')}</Text>
                  <Text style={[styles.previewText, { marginTop: 8 }]}>Data: {formatDate(event.event_date)}</Text>
                  <Text style={styles.previewText}>Horário: {formatTime(event.event_time)}</Text>
                  <Text style={styles.previewText}>Local: {String(event.location_name || 'Local não especificado')}</Text>
                  <Text style={[styles.previewText, { marginTop: 8 }]}>Criador: {String(event.profiles?.full_name || 'Usuário')}</Text>
                  <Text style={[styles.previewText, { marginTop: 8 }]}>Venha participar!</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Botão de Fechar */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d2d',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  eventCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2d2d2d',
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 24,
  },
  eventDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsContainer: {
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionButton: {
    width: '48%',
    aspectRatio: 1.2,
  },
  optionGradient: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderWidth: 2,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  previewContainer: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  previewBox: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2d2d2d',
    minHeight: 120,
  },
  previewText: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 20,
    fontFamily: 'Courier New',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2d2d2d',
  },
  closeButton: {
    backgroundColor: '#00d9ff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
