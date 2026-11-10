import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Calendar,
  CheckCircle2,
  MessageCircle,
  X,
  Sparkles,
  Share2,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

interface RSVPConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  event: any;
  onAddToCalendar: () => Promise<boolean | void>;
  onOpenChat: () => void;
  onShare?: () => void;
}

export default function RSVPConfirmationModal({
  visible,
  onClose,
  event,
  onAddToCalendar,
  onOpenChat,
  onShare,
}: RSVPConfirmationModalProps) {
  const { isDark, accent } = useTheme();
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

  if (!event) return null;

  const handleCalendarPress = async () => {
    try {
      setAddingToCalendar(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onAddToCalendar();
      setCalendarAdded(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Calendar add error:', error);
    } finally {
      setAddingToCalendar(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCalendarAdded(false);
    onClose();
  };

  const formattedDate = event.event_date
    ? new Date(event.event_date + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      })
    : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 70 : 100}
          tint={isDark ? 'dark' : 'prominent'}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.backdropPressable}>
          <View
            style={[
              styles.cardContainer,
              {
                backgroundColor: isDark
                  ? 'rgba(24, 24, 28, 0.95)'
                  : 'rgba(255, 255, 255, 0.96)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(0, 0, 0, 0.08)',
              },
            ]}
          >
            {/* Botão Fechar no Topo */}
            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>

            {/* Ícone Animado com Gradiente */}
            <View style={styles.badgeWrapper}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.badgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <CheckCircle2 size={38} color="#fff" strokeWidth={2.4} />
              </LinearGradient>
              <View style={styles.sparkleFloating}>
                <Sparkles size={20} color="#F59E0B" fill="#F59E0B" />
              </View>
            </View>

            {/* Título & Mensagem */}
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : '#111827' },
              ]}
            >
              Você está dentro! 🎉
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#4B5563' },
              ]}
            >
              Sua presença em{' '}
              <Text style={{ fontWeight: '700', color: accent }}>
                {event.title}
              </Text>{' '}
              foi confirmada com sucesso!
            </Text>

            {/* Card com Detalhes Rápidos */}
            <View
              style={[
                styles.eventDetailsBox,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(0, 0, 0, 0.03)',
                  borderColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <View style={styles.detailRow}>
                <Calendar size={16} color={accent} />
                <Text
                  style={[
                    styles.detailText,
                    { color: isDark ? '#E5E7EB' : '#1F2937' },
                  ]}
                >
                  {formattedDate} {event.event_time ? `às ${event.event_time.substring(0, 5)}` : ''}
                </Text>
              </View>
              {event.location_name ? (
                <Text
                  style={[
                    styles.locationText,
                    { color: isDark ? '#9CA3AF' : '#6B7280' },
                  ]}
                  numberOfLines={1}
                >
                  📍 {event.location_name}
                </Text>
              ) : null}
            </View>

            {/* Ações Rápidas */}
            <View style={styles.actionsContainer}>
              {/* Botão de Adicionar à Agenda */}
              <TouchableOpacity
                onPress={handleCalendarPress}
                disabled={addingToCalendar || calendarAdded}
                activeOpacity={0.85}
                style={[
                  styles.calendarButton,
                  calendarAdded
                    ? styles.calendarButtonAdded
                    : { backgroundColor: accent },
                ]}
              >
                {addingToCalendar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : calendarAdded ? (
                  <>
                    <CheckCircle2 size={18} color="#fff" />
                    <Text style={styles.calendarButtonText}>
                      Salvo na sua Agenda!
                    </Text>
                  </>
                ) : (
                  <>
                    <Calendar size={18} color="#fff" />
                    <Text style={styles.calendarButtonText}>
                      Adicionar à Agenda do Celular
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Botão de Abrir Chat do Evento */}
              <TouchableOpacity
                onPress={() => {
                  handleClose();
                  onOpenChat();
                }}
                activeOpacity={0.8}
                style={[
                  styles.chatButton,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.08)'
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
              >
                <MessageCircle size={18} color={accent} />
                <Text
                  style={[
                    styles.chatButtonText,
                    { color: isDark ? '#fff' : '#111827' },
                  ]}
                >
                  Entrar no Chat do Evento
                </Text>
              </TouchableOpacity>

              {/* Concluir */}
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.7}
                style={styles.doneButton}
              >
                <Text
                  style={[
                    styles.doneButtonText,
                    { color: isDark ? '#9CA3AF' : '#6B7280' },
                  ]}
                >
                  Ver evento
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: Math.min(width - 40, 380),
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  badgeWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  badgeGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  sparkleFloating: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  eventDetailsBox: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  locationText: {
    fontSize: 12,
    paddingLeft: 2,
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarButtonAdded: {
    backgroundColor: '#10B981',
  },
  calendarButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginTop: 2,
  },
  doneButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
