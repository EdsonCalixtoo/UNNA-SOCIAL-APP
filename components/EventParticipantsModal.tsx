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
} from 'react-native';
import { X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

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
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadParticipants();
    }
  }, [visible, eventId]);

  const loadParticipants = async () => {
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
            <Text style={styles.headerTitle}>
              Participantes ({participants.length})
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={28} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00d9ff" />
            </View>
          ) : participants.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhum participante ainda</Text>
              <Text style={styles.emptySubtext}>Seja o primeiro a confirmar presença!</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.participantsList}
              showsVerticalScrollIndicator={false}
            >
              {participants.map((participant, index) => (
                <TouchableOpacity
                  key={participant.user_id}
                  style={[
                    styles.participantItem,
                    index !== participants.length - 1 && styles.participantItemBorder,
                  ]}
                  onPress={() => {
                    if (participant.profiles?.id) {
                      router.push(`/profile/${participant.profiles.id}`);
                      onClose();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  {participant.profiles?.avatar_url ? (
                    <Image
                      source={{ uri: participant.profiles.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>
                        {String(participant.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>
                      {String(participant.profiles?.full_name || 'Usuário')}
                    </Text>
                    <Text style={styles.participantUsername}>
                      @{String(participant.profiles?.username || 'user')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
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
    maxHeight: '85%',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  participantsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 6,
  },
  participantItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d2d',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    backgroundColor: '#1a1a1a',
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#00d9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  participantUsername: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
});
