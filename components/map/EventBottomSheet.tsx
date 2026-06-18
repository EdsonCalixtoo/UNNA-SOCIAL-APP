import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { MapPin, Calendar, Clock, Users, Navigation2, ChevronRight, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { ms, vs, s } from '@/utils/responsive';
import { eventService } from '@/services/eventService';
import { useLanguage } from '@/lib/i18n';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.52; // Aumentei um pouco a altura total para o card subir mais

interface EventBottomSheetProps {
  event: any;
  isVisible: boolean;
  onClose: () => void;
  onViewEvent: (id: string) => void;
  onNavigate: (event: any) => void;
  onJoin?: (id: string) => void;
  distance?: string;
}

const EventBottomSheet = ({ event, isVisible, onClose, onViewEvent, onNavigate, onJoin, distance }: EventBottomSheetProps) => {
  const { backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const { t } = useLanguage();
  const translateY = useSharedValue(SHEET_HEIGHT);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 90 });
    } else {
      translateY.value = withSpring(SHEET_HEIGHT);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    onClose();
  };

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        translateY.value = withSpring(SHEET_HEIGHT, {}, (finished) => {
          if (finished) {
            runOnJS(handleDismiss)();
          }
        });
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!event) return null;
  
  // Calcula o status em tempo real usando a service
  const realStatus = eventService.getEventStatus(event);
  const isLive = realStatus === 'happening';
  const statusColor = isLive ? '#34C759' : '#FF9500';

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.container, { height: SHEET_HEIGHT }, animatedStyle]}>
        <BlurView intensity={isDark ? 40 : 80} style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} />
        
        <View style={[
          styles.content, 
          { 
            backgroundColor: isDark ? 'rgba(28, 28, 30, 0.7)' : 'rgba(255, 255, 255, 0.8)',
            paddingBottom: 90, // Espaço extra para ficar acima da TabBar
          }
        ]}>
          {/* Drag Indicator */}
          <View style={styles.dragIndicator} />
          
          <View style={styles.body}>
            <View style={styles.headerRow}>
              <View style={styles.imageContainer}>
                <Image source={{ uri: event.image_url }} style={styles.image} />
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.imageGradient} />
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={styles.statusText}>{isLive ? t('map.liveOnly', 'AO VIVO') : t('home.upcoming', 'EM BREVE').toUpperCase()}</Text>
                </View>
              </View>
              
              <View style={styles.infoColumn}>
                <Text style={[styles.title, { color: textPrimary }]} numberOfLines={1}>{event.title}</Text>
                <View style={styles.metaRow}>
                  <Text style={[styles.category, { color: accent }]}>{event.categories?.name}</Text>
                  <Text style={[styles.dot, { color: textSecondary }]}> • </Text>
                  <Text style={[styles.distance, { color: textSecondary }]}>{distance || '...'}</Text>
                </View>
                
                <View style={styles.detailsList}>
                  <View style={styles.detailItem}>
                    <Calendar size={14} color={textSecondary} />
                    <Text style={[styles.detailText, { color: textSecondary }]}>
                      {new Date(event.event_date).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MapPin size={14} color={textSecondary} />
                    <Text style={[styles.detailText, { color: textSecondary }]} numberOfLines={1}>
                      {event.location_name}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity 
                style={[styles.mainButton, { backgroundColor: accent }]}
                onPress={() => onViewEvent(event.id)}
              >
                <Text style={styles.mainButtonText}>{t('events.viewEvent', 'Ver Evento Completo')}</Text>
                <ChevronRight size={18} color="#fff" />
              </TouchableOpacity>
              
              <View style={styles.secondaryActions}>
                <TouchableOpacity 
                  style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={() => onNavigate(event)}
                >
                  <Navigation2 size={20} color={textPrimary} />
                  <Text style={[styles.iconButtonText, { color: textPrimary }]}>{t('map.navigate', 'Navegar')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                  onPress={onClose}
                >
                  <X size={20} color={textPrimary} />
                  <Text style={[styles.iconButtonText, { color: textPrimary }]}>{t('common.close', 'Fechar')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  body: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  infoColumn: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 13,
    fontWeight: '600',
  },
  dot: {
    fontSize: 14,
  },
  distance: {
    fontSize: 13,
  },
  detailsList: {
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  actions: {
    gap: 12,
  },
  mainButton: {
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EventBottomSheet;
