import { useLanguage } from '@/lib/i18n';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  Share,
  Alert
} from 'react-native';
import { X, Users, ChevronRight, Sparkles, UserPlus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import { s, vs, ms } from '@/utils/responsive';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Participant {
  user_id: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
}

interface EventParticipantsModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
}

export function EventParticipantsModal({
  visible,
  onClose,
  eventId,
}: EventParticipantsModalProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadParticipants();

      const channel = supabase
        .channel(`participants:${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'event_participants',
            filter: `event_id=eq.${eventId}`,
          },
          () => {
            loadParticipants();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [visible, eventId]);

  const loadParticipants = async () => {
    if (!eventId || eventId === 'undefined') return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          user_id,
          profiles!inner (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('event_id', eventId);

      if (error) {
        console.error('Error loading participants:', error);
        return;
      }

      setParticipants((data as any) || []);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/profile/${userId}`);
    onClose();
  };

  const handleInvite = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onClose(); // Fecha o modal de participantes primeiro
      setTimeout(async () => {
        try {
          await Share.share({
            message: `Bora para este role no UNNA? Confirme sua presença aqui: https://unna.app/event/${eventId}`,
            title: 'Convite UNNA Social',
          });
        } catch (error: any) {
          Alert.alert('Erro ao compartilhar', error.message);
        }
      }, 700);
    } catch (error: any) {
      console.error(error);
    }
  };

  const bgColor = isDark ? '#080808' : '#ffffff';

  return (
    <Modal
      visible={visible}
      animationType="none" // Usando Reanimated para animação personalizada suave
      transparent={true}
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {visible && (
          <Animated.View 
            entering={FadeIn.duration(300)}
            style={StyleSheet.absoluteFill}
          >
            <Pressable style={styles.backdrop} onPress={onClose}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />
            </Pressable>
          </Animated.View>
        )}

        {visible && (
          <Animated.View 
            entering={FadeIn.duration(250)}
            style={[
              styles.modalContent, 
              { 
                backgroundColor: bgColor,
                paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
              }
            ]}
          >
            {/* Handle bar */}
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />

            {/* Premium Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <LinearGradient
                  colors={[accent, '#8000ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerIconBg}
                >
                  <Users size={22} color="#fff" />
                </LinearGradient>
                <View>
                  <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('auto.sf0681b00', 'CONFIRMADAS')}</Text>
                  <Text style={[styles.headerSubtitle, { color: textSecondary }]}>
                    {participants.length} {participants.length === 1 ? 'membro confirmado' : 'membros confirmados'}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity 
                onPress={onClose}
                style={[styles.closeCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
              >
                <X size={20} color={textPrimary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={accent} />
                <Text style={[styles.infoText, { color: textSecondary }]}>{t('auto.s742504f0', 'Sincronizando participantes...')}</Text>
              </View>
            ) : participants.length === 0 ? (
              <View style={styles.centerContainer}>
                <View style={styles.emptyIllustration}>
                  <View style={[styles.circleBlur, { backgroundColor: accent + '20' }]} />
                  <View style={[styles.iconWrapper, { backgroundColor: isDark ? '#111' : '#f8f8f8', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <Users size={40} color={accent} />
                    <View style={styles.sparkleIcon}>
                      <Sparkles size={20} color="#ff1493" />
                    </View>
                  </View>
                </View>
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>{t('auto.sd0668152', 'O círculo está aberto!')}</Text>
                <Text style={[styles.emptyDesc, { color: textSecondary }]}>
                  Ainda não há ninguém na lista. Que tal convidar alguns amigos para este role?
                </Text>
                
                <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
                  <LinearGradient
                    colors={[accent, '#0055ff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.inviteGradient}
                  >
                    <UserPlus size={18} color="#fff" />
                    <Text style={styles.inviteText}>{t('auto.sacc2209f', 'Convidar Amigos')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <View style={styles.listGrid}>
                  {participants.map((participant) => (
                    <TouchableOpacity
                      key={participant.user_id}
                      style={[
                        styles.card, 
                        { 
                          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
                        }
                      ]}
                      onPress={() => participant.profiles?.id && handleProfilePress(participant.profiles.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.cardContent}>
                        <View style={styles.avatarWrap}>
                          {participant.profiles?.avatar_url ? (
                            <Image
                              source={{ uri: participant.profiles.avatar_url }}
                              style={styles.avatar}
                            />
                          ) : (
                            <LinearGradient
                              colors={[accent, '#8000ff']}
                              style={styles.avatarPlaceholder}
                            >
                              <Text style={styles.avatarInitial}>
                                {String(participant.profiles?.full_name || 'U').charAt(0)}
                              </Text>
                            </LinearGradient>
                          )}
                          <View style={[styles.onlineIndicator, { borderColor: isDark ? '#080808' : '#fff' }]} />
                        </View>

                        <View style={styles.infoWrap}>
                          <Text style={[styles.name, { color: textPrimary }]} numberOfLines={1}>
                            {participant.profiles?.full_name || 'Usuário'}
                          </Text>
                          <Text style={[styles.username, { color: textSecondary }]}>
                            @{participant.profiles?.username || 'user'}
                          </Text>
                        </View>
                        
                        <View style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                          <ChevronRight size={16} color={textSecondary} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: vs(350),
    width: '100%',
    elevation: 25,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: ms(22),
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: ms(13),
    fontWeight: '600',
    opacity: 0.6,
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    paddingHorizontal: 40,
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    marginTop: 16,
    fontSize: ms(14),
    fontWeight: '600',
  },
  emptyIllustration: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  circleBlur: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  sparkleIcon: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  emptyTitle: {
    fontSize: ms(20),
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: ms(14),
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
    marginBottom: 28,
  },
  inviteButton: {
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    width: '100%',
  },
  inviteGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  inviteText: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '800',
  },
  list: {
    paddingHorizontal: 24,
  },
  listGrid: {
    gap: 12,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: ms(18),
    fontWeight: '800',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2.5,
  },
  infoWrap: {
    flex: 1,
  },
  name: {
    fontSize: ms(16),
    fontWeight: '800',
    marginBottom: 2,
  },
  username: {
    fontSize: ms(13),
    fontWeight: '600',
    opacity: 0.6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
