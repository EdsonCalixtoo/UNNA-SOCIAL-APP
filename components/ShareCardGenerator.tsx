import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import ViewShot from 'react-native-view-shot';
import { Calendar, MapPin, Clock } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface ShareCardGeneratorProps {
  event: {
    title: string;
    image_url?: string;
    event_date: string;
    event_time: string;
    location_name: string;
  };
}

export interface ShareCardGeneratorRef {
  capture: () => Promise<string | null>;
}

export const ShareCardGenerator = forwardRef<ShareCardGeneratorRef, ShareCardGeneratorProps>(
  ({ event }, ref) => {
    const viewShotRef = useRef<ViewShot>(null);

    useImperativeHandle(ref, () => ({
      capture: async () => {
        try {
          if (viewShotRef.current?.capture) {
            const uri = await viewShotRef.current.capture();
            return uri;
          }
          return null;
        } catch (error) {
          console.error("Erro ao capturar o card:", error);
          return null;
        }
      }
    }));

    const displayDate = (() => {
      try {
        const d = new Date(event.event_date);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
          }).toUpperCase();
        }
      } catch (e) {}
      return event.event_date;
    })();

    return (
      <View style={styles.hiddenContainer}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={styles.cardContainer}>
          {event.image_url && event.image_url !== 'null' ? (
            <Image source={{ uri: event.image_url }} style={styles.backgroundImage} contentFit="cover" />
          ) : (
            <View style={[styles.backgroundImage, { backgroundColor: '#1A1A24' }]} />
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']}
            style={styles.gradientOverlay}
          />

          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>UNИA</Text>
              <Text style={styles.logoSubText}>APP</Text>
            </View>

            <View style={styles.detailsContainer}>
              <View style={styles.tagContainer}>
                <Text style={styles.tagText}>CONVITE OFICIAL</Text>
              </View>
              
              <Text style={styles.title} numberOfLines={3}>{event.title}</Text>

              <View style={styles.infoRow}>
                <Calendar size={18} color="#00d9ff" />
                <Text style={styles.infoText}>{displayDate}</Text>
              </View>

              <View style={styles.infoRow}>
                <Clock size={18} color="#00d9ff" />
                <Text style={styles.infoText}>{event.event_time}</Text>
              </View>

              <View style={styles.infoRow}>
                <MapPin size={18} color="#00d9ff" />
                <Text style={styles.infoText} numberOfLines={2}>{event.location_name}</Text>
              </View>
            </View>

            <View style={styles.footerRow}>
              <LinearGradient
                colors={['#00d9ff', '#ff1493']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.footerButton}
              >
                <Text style={styles.footerButtonText}>Baixe o App para confirmar</Text>
              </LinearGradient>
              <Text style={styles.footerUrl}>unna.app</Text>
            </View>
          </View>
        </ViewShot>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    top: -10000,
    left: -10000,
  },
  cardContainer: {
    width: 1080 / 2,
    height: 1920 / 2, // 9:16 aspect ratio roughly
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 48,
    color: '#fff',
    letterSpacing: 2,
  },
  logoSubText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 16,
    color: '#00d9ff',
    letterSpacing: 8,
    marginTop: -5,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  tagContainer: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.5)',
  },
  tagText: {
    color: '#00d9ff',
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 42,
    color: '#fff',
    marginBottom: 24,
    lineHeight: 48,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 20,
    color: '#fff',
    marginLeft: 12,
    flex: 1,
  },
  footerRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 100,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  footerButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#fff',
  },
  footerUrl: {
    fontFamily: 'Outfit-Medium',
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
  },
});
