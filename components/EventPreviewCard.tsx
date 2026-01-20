import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Calendar, Users, Share2, X } from 'lucide-react-native';

interface EventMarker {
  id: string;
  title: string;
  category: string;
  categoryColor: string;
  isLive: boolean;
  time: string;
  location: string;
  image?: string;
  goingCount: number;
  position: { x: number; y: number };
}

interface EventPreviewCardProps {
  event: EventMarker | null;
  visible: boolean;
  onClose: () => void;
  router?: any;
}

const { width } = Dimensions.get('window');

export function EventPreviewCard({ event, visible, onClose, router }: EventPreviewCardProps) {
  if (!event) return null;

  return (
    <Modal
      visible={visible && !!event}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <X size={24} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>

          {/* Image */}
          {event.image && (
            <Image
              source={{ uri: event.image }}
              style={styles.image}
              resizeMode="cover"
            />
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradientOverlay}
          />

          {/* Live Badge */}
          {event.isLive && (
            <View style={[styles.liveBadge, { backgroundColor: event.categoryColor }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>AO VIVO</Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            <View>
              <Text style={styles.category}>{event.category}</Text>
              <Text style={styles.title}>{event.title}</Text>
            </View>

            {/* Info Items */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Calendar size={16} color="#fff" strokeWidth={2.5} />
                <Text style={styles.infoText}>{event.time}</Text>
              </View>

              <View style={styles.infoItem}>
                <MapPin size={16} color="#fff" strokeWidth={2.5} />
                <Text style={styles.infoText} numberOfLines={1}>{event.location}</Text>
              </View>

              <View style={styles.infoItem}>
                <Users size={16} color="#fff" strokeWidth={2.5} />
                <Text style={styles.infoText}>{event.goingCount} pessoas</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <LinearGradient
                colors={['#667EEA', '#764BA2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonGradient}
              >
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    onClose();
                    if (router) {
                      router.push(`/event/${event.id}`);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Ver Detalhes</Text>
                </TouchableOpacity>
              </LinearGradient>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  // Share event
                }}
                activeOpacity={0.8}
              >
                <Share2 size={18} color="#fff" strokeWidth={2.5} />
                <Text style={styles.secondaryButtonText}>Compartilhar</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  image: {
    width: '100%',
    height: 280,
    backgroundColor: '#2d2d2d',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  liveBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  content: {
    padding: 24,
    gap: 20,
  },
  category: {
    fontSize: 13,
    fontWeight: '700',
    color: '#667EEA',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  infoSection: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButtonGradient: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#667EEA',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#667EEA',
  },
});
