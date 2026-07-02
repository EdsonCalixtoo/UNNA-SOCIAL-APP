import { useLanguage } from '@/lib/i18n';
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions, Platform, Share } from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Download, Share2, Calendar, MapPin, Ticket } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { ms, s, vs } from '@/utils/responsive';
import { Trophy, CheckCircle2 } from 'lucide-react-native';
// Importação condicional para não quebrar se não estiver instalado ainda
let QRCode: any;
try {
  QRCode = require('react-native-qrcode-svg').default;
} catch (e) {
  QRCode = null;
}

const { width } = Dimensions.get('window');

interface EventTicketModalProps {
  visible: boolean;
  onClose: () => void;
  event: any;
  user: any;
}

export const EventTicketModal = ({ visible, onClose, event, user }: EventTicketModalProps) => {
  const { t } = useLanguage();
  const { isDark, accent, backgroundPrimary, textPrimary, textSecondary } = useTheme();
  const [predictionMade, setPredictionMade] = React.useState(false);

  if (!event || !user) return null;

  const ticketId = `UNNA-${event.id.slice(0, 4)}-${user.id.slice(0, 4)}`.toUpperCase();
  const qrValue = JSON.stringify({
    t: 'ticket',
    eid: event.id,
    uid: user.id,
    tid: ticketId
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Meu ingresso para o evento ${event.title} no UNNA! Ticket: ${ticketId}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={[styles.container, { backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : '#fff' }]}>
          {/* Header do Ingresso */}
          <LinearGradient
            colors={[accent, '#8000ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ticketHeader}
          >
            <View style={styles.headerTop}>
              <View style={styles.brandContainer}>
                <Text style={styles.brandText}>{t('auto.s7c59a975', 'UNИA')}</Text>
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumText}>{t('auto.sd0bb8031', 'INGRESSO')}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
          </LinearGradient>

          {/* Conteúdo do Ingresso */}
          <View style={styles.ticketBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Calendar size={16} color={accent} />
                <View>
                  <Text style={[styles.infoLabel, { color: textSecondary }]}>{t('auto.se44f9e34', 'DATA')}</Text>
                  <Text style={[styles.infoValue, { color: textPrimary }]}>
                    {new Date(event.event_date).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <Ticket size={16} color={accent} />
                <View>
                  <Text style={[styles.infoLabel, { color: textSecondary }]}>{t('auto.s04313ee6', 'TIPO')}</Text>
                  <Text style={[styles.infoValue, { color: textPrimary }]}>
                    {event.is_paid ? 'PREMIUM' : 'FREE'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.dividerContainer}>
              <View style={[styles.dividerDot, { left: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(20,20,20,0.95)' }]} />
              
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', paddingHorizontal: 20 }}>
                 <View style={[styles.dividerLine, { borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)', borderWidth: 1.5, borderStyle: 'dashed' }]} />
              </View>
              
              <View style={[styles.dividerDot, { right: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(20,20,20,0.95)' }]} />
            </View>

            {/* QR Code Section */}
            <View style={styles.qrSection}>
              <View style={[styles.qrContainer, { backgroundColor: '#fff' }]}>
                {QRCode ? (
                  <QRCode
                    value={qrValue}
                    size={ms(180)}
                    color="#000"
                    backgroundColor="#fff"
                    logoBackgroundColor="transparent"
                  />
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <Text style={{ textAlign: 'center', color: '#666' }}>
                      Instale as dependências para ver o QR Code
                    </Text>
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', paddingHorizontal: 20 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ticketId, { color: textSecondary }]}>{ticketId}</Text>
                  <Text style={[styles.userName, { color: textPrimary }]}>{user.full_name || user.username}</Text>
                </View>
                
                {/* Barcode físico style */}
                <View style={{ flexDirection: 'row', height: 35, alignItems: 'center' }}>
                  {[3,1,2,1,1,3,2,1,4,1,2,2,1,3,1,1,2,4,1,2,3,1].map((w, index) => (
                    <View key={index} style={{ width: w, height: '100%', backgroundColor: isDark ? '#fff' : '#000', marginLeft: w === 1 ? 2 : 1.5 }} />
                  ))}
                </View>
              </View>
            </View>

          </View>

          {/* Ações */}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]} onPress={handleShare}>
              <Share2 size={20} color={textPrimary} />
              <Text style={[styles.actionText, { color: textPrimary }]}>{t('auto.sa3bd2b71', 'Compartilhar')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: accent }]} onPress={onClose}>
              <Download size={20} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>{t('auto.seb7a0fed', 'Salvar')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  ticketHeader: {
    padding: 24,
    paddingTop: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  premiumBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  premiumText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  ticketBody: {
    padding: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  dividerLine: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 1,
  },
  dividerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    zIndex: 1,
  },
  qrSection: {
    alignItems: 'center',
    gap: 12,
  },
  qrContainer: {
    padding: 15,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 0,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bolaoContainer: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  bolaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bolaoTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  bolaoDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  placarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '800',
  },
  scoreBox: {
    width: 40,
    height: 48,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#00B32C',
  },
  betBtn: {
    backgroundColor: '#00B32C',
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  betBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  bolaoSuccess: {
    alignItems: 'center',
    paddingVertical: 12,
  }
});
