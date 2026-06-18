import { useLanguage } from '@/lib/i18n';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { LogOut, Settings, ChevronRight, Edit3, ShieldCheck } from 'lucide-react-native';
import { vs, s, ms } from '@/utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

export default function BusinessProfile() {
  const { t } = useLanguage();
  const router = useRouter();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  const { user, profile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleSignOut = () => {
    setLogoutModalVisible(true);
  };

  const confirmSignOut = async () => {
    setLogoutModalVisible(false);
    await signOut();
    router.replace('/(auth)/login');
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : profile?.username?.charAt(0).toUpperCase() ?? '?';

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + vs(10), backgroundColor: backgroundSecondary, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('auto.s22b925ff', 'Perfil Empresa')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* PROFILE CARD */}
        <View style={[styles.profileCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <LinearGradient colors={['#00d9ff', '#ff1493']} style={styles.avatarBorder}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: backgroundPrimary }]}>
                <Text style={[styles.avatarInitials, { color: accent }]}>{initials}</Text>
              </View>
            )}
          </LinearGradient>
          
          <Text style={[styles.nameText, { color: textPrimary }]}>{profile?.full_name}</Text>
          <Text style={[styles.usernameText, { color: textSecondary }]}>@{profile?.username}</Text>
          
          <View style={[styles.businessBadge, { backgroundColor: 'rgba(0, 217, 255, 0.1)' }]}>
            <ShieldCheck size={14} color="#00d9ff" />
            <Text style={{ color: '#00d9ff', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>{t('auto.s260f6321', 'Conta Comercial')}</Text>
          </View>
        </View>

        {/* SETTINGS MENU */}
        <View style={[styles.menuSection, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => router.push('/profile/edit')}
          >
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(0, 217, 255, 0.1)' }]}>
              <Edit3 size={20} color="#00d9ff" />
            </View>
            <Text style={[styles.menuText, { color: textPrimary }]}>{t('auto.s91113aa1', 'Editar Perfil')}</Text>
            <ChevronRight size={20} color={textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomWidth: 0 }]}
            onPress={() => router.push('/profile/notification-settings')}
          >
            <View style={[styles.menuIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <Settings size={20} color={textSecondary} />
            </View>
            <Text style={[styles.menuText, { color: textPrimary }]}>{t('auto.s2571dd51', 'Configurações')}</Text>
            <ChevronRight size={20} color={textSecondary} />
          </TouchableOpacity>
        </View>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity 
          style={[styles.menuSection, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
          onPress={handleSignOut}
        >
          <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <View style={[styles.menuIcon, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
              <LogOut size={20} color="#FF3B30" />
            </View>
            <Text style={[styles.menuText, { color: '#FF3B30', fontWeight: '700' }]}>{t('auto.s1ee9fc7c', 'Sair da Conta')}</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* LOGOUT MODAL */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContent, { backgroundColor: backgroundSecondary }]}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>{t('auto.s1ee9fc7c', 'Sair da Conta')}</Text>
            <Text style={[styles.modalText, { color: textSecondary }]}>{t('auto.sc3fb460c', 'Tem certeza que deseja sair?')}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: textPrimary }]}>{t('auto.s847607d7', 'Cancelar')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: '#FF3B30' }]}
                onPress={confirmSignOut}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t('auto.s790ed91f', 'Sair')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: s(16),
    paddingBottom: vs(12),
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: ms(18),
    fontWeight: '800',
  },
  scrollContent: {
    padding: s(16),
    paddingBottom: vs(100),
  },
  profileCard: {
    alignItems: 'center',
    padding: ms(24),
    borderRadius: ms(16),
    borderWidth: 1,
    marginBottom: vs(24),
  },
  avatarBorder: {
    width: ms(90),
    height: ms(90),
    borderRadius: ms(45),
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: ms(45),
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: ms(45),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: ms(32),
    fontWeight: '800',
  },
  nameText: {
    fontSize: ms(20),
    fontWeight: '800',
    marginBottom: 4,
  },
  usernameText: {
    fontSize: ms(14),
    marginBottom: 12,
  },
  businessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  menuSection: {
    borderRadius: ms(16),
    borderWidth: 1,
    marginBottom: vs(24),
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(16),
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: ms(15),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    padding: ms(24),
    borderRadius: ms(20),
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: ms(20),
    fontWeight: '800',
    marginBottom: 8,
  },
  modalText: {
    fontSize: ms(15),
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: ms(15),
    fontWeight: '700',
  }
});
