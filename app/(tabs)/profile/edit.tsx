import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Switch, 
  Modal, 
  Dimensions,
  Animated,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Camera, 
  Save, 
  Lock, 
  LogOut, 
  Trash2, 
  Bell, 
  X, 
  User, 
  AtSign, 
  Type, 
  Palette, 
  Shield, 
  Check,
  Sparkles,
  ChevronRight,
  Heart,
  Edit3,
  Search,
  FolderOpen
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { uploadImage } from '@/lib/storage';
import UniversalImageEditor from '@/components/UniversalImageEditor';
import { useTheme } from '@/contexts/ThemeContext';
import PremiumConfirmationModal from '@/components/PremiumConfirmationModal';
import { s, vs, ms } from '@/utils/responsive';
import { ActionFeedback } from '@/components/ActionFeedback';

const { width } = Dimensions.get('window');

export default function EditProfile() {
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const { profile, user, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    cover_url: '',
    primary_color: '#00d9ff',
    secondary_color: '#1a1a1a',
    accent_color: '#ff1493',
    is_private: false,
    preferred_categories: [] as string[],
    preferred_subcategories: [] as string[],
    instagram_url: '',
    website_url: '',
    location_city: '',
    birth_date: '',
  });

  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [newCoverUri, setNewCoverUri] = useState<string | null>(null);
  const [imageEditTarget, setImageEditTarget] = useState<'avatar' | 'cover' | null>(null);
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showInterestsModal, setShowInterestsModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(true);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const checkTimeout = useRef<NodeJS.Timeout | null>(null);
  const [feedback, setFeedback] = useState({ visible: false, type: 'success' as 'success' | 'error' | 'info', title: '', message: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  const [subcategories, setSubcategories] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    if (profile) {
      setFormData({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        cover_url: (profile as any).cover_url || '',
        primary_color: profile.primary_color || '#00d9ff',
        secondary_color: profile.secondary_color || '#1a1a1a',
        accent_color: profile.accent_color || '#ff1493',
        is_private: profile.is_private || false,
        preferred_categories: profile.preferred_categories || [],
        preferred_subcategories: (profile as any).preferred_subcategories || [],
        instagram_url: (profile as any).instagram_url || '',
        website_url: (profile as any).website_url || '',
        location_city: (profile as any).location_city || '',
        birth_date: (profile as any).birth_date || '',
      });
    }
  }, [profile]);

  const loadData = async () => {
    const [cats, subcats] = await Promise.all([
      supabase.from('categories').select('*').order('order'),
      supabase.from('subcategories').select('*').order('name')
    ]);
    if (cats.data) setCategories(cats.data);
    if (subcats.data) setSubcategories(subcats.data);
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso à sua câmera para tirar fotos.');
        setShowImageSourceModal(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
        setShowImageEditor(true);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir a câmera');
    } finally {
      setShowImageSourceModal(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de acesso às suas fotos para selecionar imagens.');
        setShowImageSourceModal(false);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, 
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImageUri(result.assets[0].uri);
        setShowImageEditor(true);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    } finally {
      setShowImageSourceModal(false);
    }
  };

  const handleImageSource = () => {
    setImageEditTarget('avatar');
    setShowImageSourceModal(true);
  };

  const handleCoverImageSource = () => {
    setImageEditTarget('cover');
    setShowImageSourceModal(true);
  };

  const handleSaveEditedAvatar = (editedUri: string) => {
    if (imageEditTarget === 'cover') {
      setNewCoverUri(editedUri);
    } else {
      setNewAvatarUri(editedUri);
    }
    setShowImageEditor(false);
  };

  const checkUsername = async (username: string) => {
    if (!username || username === profile?.username) {
      setUsernameAvailable(true);
      setIsCheckingUsername(false);
      return;
    }

    if (username.length < 3) {
      setUsernameAvailable(false);
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      setUsernameAvailable(!data);
    } catch (e) {
      console.error('Erro ao checar usuário:', e);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (text: string) => {
    const cleanText = text.replace(/\s/g, '').toLowerCase();
    setFormData({ ...formData, username: cleanText });
    
    if (checkTimeout.current) clearTimeout(checkTimeout.current);
    
    if (cleanText === profile?.username) {
      setUsernameAvailable(true);
      return;
    }

    checkTimeout.current = setTimeout(() => {
      checkUsername(cleanText);
    }, 600) as any;
  };

  const toggleCategory = (id: string) => {
    setFormData(prev => {
      const exists = prev.preferred_categories.includes(id);
      if (exists) {
        return { ...prev, preferred_categories: prev.preferred_categories.filter(c => c !== id) };
      } else {
        return { ...prev, preferred_categories: [...prev.preferred_categories, id] };
      }
    });
  };

  const toggleSubcategory = (id: string) => {
    setFormData(prev => {
      const exists = prev.preferred_subcategories.includes(id);
      if (exists) {
        return { ...prev, preferred_subcategories: prev.preferred_subcategories.filter(c => c !== id) };
      } else {
        return { ...prev, preferred_subcategories: [...prev.preferred_subcategories, id] };
      }
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.username.trim() || !formData.full_name.trim()) {
      Alert.alert('Erro', 'Usuário e nome são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = formData.avatar_url;
      if (newAvatarUri) {
        const uploadedUrl = await uploadImage(newAvatarUri, 'media', 'avatars', user.id);
        if (uploadedUrl) avatarUrl = uploadedUrl;
      }

      let coverUrl = formData.cover_url;
      if (newCoverUri) {
        const uploadedCoverUrl = await uploadImage(newCoverUri, 'media', 'banners', user.id);
        if (uploadedCoverUrl) coverUrl = uploadedCoverUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username.trim().toLowerCase(),
          full_name: formData.full_name.trim(),
          bio: formData.bio.trim() || null,
          avatar_url: avatarUrl || null,
          cover_url: coverUrl || null,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          accent_color: formData.accent_color,
          is_private: formData.is_private,
          preferred_categories: formData.preferred_categories,
          preferred_subcategories: formData.preferred_subcategories,
          instagram_url: formData.instagram_url,
          website_url: formData.website_url,
          location_city: formData.location_city,
          birth_date: formData.birth_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      setFeedback({
        visible: true,
        type: 'success',
        title: 'Sucesso',
        message: 'Perfil atualizado com sucesso! ✨'
      });
    } catch (error: any) {
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Erro',
        message: error.code === '23505' ? 'Usuário já existe' : 'Não foi possível salvar suas alterações.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await signOut(); 
    router.replace('/(auth)/login');
  };

  const handleDeleteAccount = () => {
    if (loading) return;
    setShowDeleteAccountConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    console.log('Iniciando exclusão de conta para usuário:', user?.id);
    setLoading(true);
    setShowDeleteAccountConfirm(false);
    try {
      if (!user) {
        console.error('Tentativa de exclusão sem usuário logado');
        return;
      }

      // Remove o perfil primeiro
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      if (profileError) {
        console.error('Erro ao excluir perfil:', profileError);
        throw profileError;
      }

      console.log('Perfil excluído com sucesso. Saindo...');

      // Logout
      await signOut();
      
      router.replace('/(auth)/login');
      setFeedback({
        visible: true,
        type: 'success',
        title: 'Conta Excluída',
        message: 'Sua conta e dados foram removidos com sucesso.'
      });
    } catch (error: any) {
      console.error('Erro completo na exclusão:', error);
      setFeedback({
        visible: true,
        type: 'error',
        title: 'Erro ao Excluir',
        message: `Não foi possível excluir sua conta: ${error.message || 'Tente novamente mais tarde.'}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: backgroundPrimary }]}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: backgroundPrimary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={22} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Editar Perfil</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={loading || !usernameAvailable || isCheckingUsername} 
          style={[styles.headerBtn, (!usernameAvailable || isCheckingUsername) && { opacity: 0.5 }]}
        >
          {loading || isCheckingUsername ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Check size={22} color={accent} />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
          
          {/* BANNER COVER EDIT SECTION */}
          <View style={styles.coverEditContainer}>
            { (newCoverUri || formData.cover_url) ? (
              <Image 
                source={{ uri: newCoverUri || formData.cover_url }} 
                style={styles.coverEditImg} 
                resizeMode="cover"
              />
            ) : (
              <LinearGradient 
                colors={[accent, '#7b2fff', '#ff1493']} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={StyleSheet.absoluteFill} 
              />
            )}
            <TouchableOpacity 
              onPress={handleCoverImageSource} 
              style={styles.coverChangeBtn}
              activeOpacity={0.8}
            >
              <BlurView intensity={35} tint="dark" style={styles.coverBtnBlur}>
                <Camera size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.coverBtnText}>Alterar Capa</Text>
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* AVATAR SECTION */}
          <View pointerEvents="box-none" style={[styles.avatarContainer, { marginTop: -65, zIndex: 10 }]}>
            <View style={[styles.avatarRing, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderWidth: 5, borderColor: backgroundPrimary }]}>
              { (newAvatarUri || formData.avatar_url) ? (
                <Image 
                  source={{ uri: newAvatarUri || formData.avatar_url }} 
                  style={styles.avatarImg} 
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { borderWidth: 0 }]}>
                  <Text style={styles.avatarText}>{formData.username.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <TouchableOpacity onPress={handleImageSource} style={[styles.cameraBtn, { backgroundColor: accent }]}>
                <Camera size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.changeText, { color: accent, marginTop: 8 }]}>Mudar foto do perfil</Text>
          </View>

          {/* BASIC INFO */}
          <Section title="Informações Básicas" icon={User} isDark={isDark} accent={accent} textPrimary={textPrimary} backgroundSecondary={backgroundSecondary}>
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabelRow}>
                <AtSign size={14} color={textSecondary} />
                <Text style={[styles.inputLabel, { color: textSecondary }]}>Usuário</Text>
              </View>
              <View style={styles.inputContainer}>
                <TextInput 
                  style={[styles.input, { color: textPrimary, flex: 1 }]}
                  value={formData.username}
                  onChangeText={handleUsernameChange}
                  placeholder="nome_usuario"
                  placeholderTextColor={isDark ? '#444' : '#bbb'}
                  autoCapitalize="none"
                />
                {isCheckingUsername ? (
                  <ActivityIndicator size="small" color={accent} />
                ) : formData.username !== profile?.username ? (
                  usernameAvailable ? (
                    <Check size={18} color="#34C759" />
                  ) : (
                    <X size={18} color="#FF3B30" />
                  )
                ) : null}
              </View>
              {!usernameAvailable && formData.username !== profile?.username && (
                <Text style={styles.errorHint}>Este nome de usuário já está em uso</Text>
              )}
            </View>

            <View style={styles.divider} />

            <View style={styles.inputWrapper}>
              <View style={styles.inputLabelRow}>
                <Type size={14} color={textSecondary} />
                <Text style={[styles.inputLabel, { color: textSecondary }]}>Nome Exibido</Text>
              </View>
              <TextInput 
                style={[styles.input, { color: textPrimary }]}
                value={formData.full_name}
                onChangeText={t => setFormData({ ...formData, full_name: t })}
                placeholder="Seu Nome"
                placeholderTextColor={isDark ? '#444' : '#bbb'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.inputWrapper}>
              <View style={styles.inputLabelRow}>
                <Edit3 size={14} color={textSecondary} />
                <Text style={[styles.inputLabel, { color: textSecondary }]}>Bio</Text>
              </View>
              <TextInput 
                style={[styles.input, styles.bioInput, { color: textPrimary }]}
                value={formData.bio}
                onChangeText={t => setFormData({ ...formData, bio: t })}
                placeholder="Conte algo sobre você..."
                placeholderTextColor={isDark ? '#444' : '#bbb'}
                multiline
                maxLength={150}
              />
              <Text style={styles.charCounter}>{formData.bio.length}/150</Text>
            </View>
          </Section>

          {/* INTERESTS */}
          <Section title="Meus Interesses" icon={Heart} isDark={isDark} accent={accent} textPrimary={textPrimary} backgroundSecondary={backgroundSecondary}>
            <View style={styles.interestsPreview}>
              <View style={styles.interestsGrid}>
                {formData.preferred_categories.length > 0 || formData.preferred_subcategories.length > 0 ? (
                  <>
                    {categories
                      .filter(cat => formData.preferred_categories.includes(cat.id))
                      .map(cat => (
                        <View key={cat.id} style={[styles.interestChipActive, { backgroundColor: accent }]}>
                          <Text style={styles.interestEmoji}>{cat.icon || '✨'}</Text>
                          <Text style={styles.interestLabelActive}>{cat.name}</Text>
                        </View>
                      ))}
                    {subcategories
                      .filter(sub => formData.preferred_subcategories.includes(sub.id))
                      .map(sub => (
                        <View key={sub.id} style={[styles.interestChipActive, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                          <Text style={[styles.interestLabelActive, { opacity: 0.8 }]}>{sub.name}</Text>
                        </View>
                      ))}
                  </>
                ) : (
                  <Text style={[styles.emptyInterests, { color: textSecondary }]}>Nenhum interesse selecionado</Text>
                )}
              </View>
              <TouchableOpacity 
                style={[styles.editInterestsBtn, { borderColor: accent }]}
                onPress={() => setShowInterestsModal(true)}
              >
                <Edit3 size={16} color={accent} />
                <Text style={[styles.editInterestsText, { color: accent }]}>Gerenciar Interesses</Text>
              </TouchableOpacity>
            </View>
          </Section>

          {/* SOCIAL LINKS */}
          <Section title="Links Sociais" icon={Sparkles} isDark={isDark} accent={accent} textPrimary={textPrimary} backgroundSecondary={backgroundSecondary}>
             <View style={styles.inputWrapper}>
                <View style={styles.inputLabelRow}>
                  <Text style={[styles.inputLabel, { color: textSecondary }]}>Instagram</Text>
                </View>
                <TextInput 
                  style={[styles.input, { color: textPrimary }]}
                  value={formData.instagram_url}
                  onChangeText={t => setFormData({ ...formData, instagram_url: t })}
                  placeholder="@seu_instagram"
                  placeholderTextColor={isDark ? '#444' : '#bbb'}
                />
             </View>
             <View style={styles.divider} />
             <View style={styles.inputWrapper}>
                <View style={styles.inputLabelRow}>
                  <Text style={[styles.inputLabel, { color: textSecondary }]}>Site / Link</Text>
                </View>
                <TextInput 
                  style={[styles.input, { color: textPrimary }]}
                  value={formData.website_url}
                  onChangeText={t => setFormData({ ...formData, website_url: t })}
                  placeholder="https://seu_site.com"
                  placeholderTextColor={isDark ? '#444' : '#bbb'}
                />
             </View>
          </Section>

          {/* ADDITIONAL INFO */}
          <Section title="Informações Pessoais" icon={Bell} isDark={isDark} accent={accent} textPrimary={textPrimary} backgroundSecondary={backgroundSecondary}>
             <View style={styles.inputWrapper}>
                <View style={styles.inputLabelRow}>
                  <Text style={[styles.inputLabel, { color: textSecondary }]}>Cidade</Text>
                </View>
                <TextInput 
                  style={[styles.input, { color: textPrimary }]}
                  value={formData.location_city}
                  onChangeText={t => setFormData({ ...formData, location_city: t })}
                  placeholder="Ex: São Paulo, SP"
                  placeholderTextColor={isDark ? '#444' : '#bbb'}
                />
             </View>
             <View style={styles.divider} />
             <View style={styles.inputWrapper}>
                <View style={styles.inputLabelRow}>
                  <Text style={[styles.inputLabel, { color: textSecondary }]}>Data de Nascimento</Text>
                </View>
                <TextInput 
                  style={[styles.input, { color: textPrimary }]}
                  value={formData.birth_date}
                  onChangeText={t => setFormData({ ...formData, birth_date: t })}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={isDark ? '#444' : '#bbb'}
                />
             </View>
          </Section>

          {/* CUSTOMIZATION */}
          <Section title="Personalização" icon={Palette} isDark={isDark} accent={accent} textPrimary={textPrimary} backgroundSecondary={backgroundSecondary}>
            <Text style={[styles.subLabel, { color: textSecondary }]}>Cor do Perfil</Text>
            <View style={styles.colorRow}>
              {['#00d9ff', '#ff1493', '#34C759', '#AF52DE', '#FF9500', '#1a1a1a'].map(c => (
                <TouchableOpacity 
                  key={c} 
                  onPress={() => setFormData({ ...formData, primary_color: c, accent_color: c })}
                  style={[styles.colorCircle, { backgroundColor: c }, formData.primary_color === c && { borderColor: textPrimary, borderWidth: 3 }]}
                />
              ))}
            </View>
          </Section>

          {/* SECURITY & PRIVACY */}
          <Section title="Privacidade e Segurança" icon={Shield} isDark={isDark} accent={accent} textPrimary={textPrimary} backgroundSecondary={backgroundSecondary}>
            <View style={styles.instagramRow}>
              <View style={styles.instaInfo}>
                <View style={[styles.instaIconBox, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.1)' : 'rgba(0, 217, 255, 0.05)' }]}>
                  <Lock size={20} color={accent} />
                </View>
                <View>
                  <Text style={[styles.instaTitle, { color: textPrimary }]}>Conta Privada</Text>
                  <Text style={[styles.instaSub, { color: textSecondary }]}>Somente seguidores aprovados podem ver suas publicações e vídeos.</Text>
                </View>
              </View>
              <Switch 
                value={formData.is_private} 
                onValueChange={v => setFormData({ ...formData, is_private: v })} 
                thumbColor="#fff"
                trackColor={{ true: accent, false: '#333' }}
              />
            </View>
            
            <View style={styles.divider} />
            
            <TouchableOpacity onPress={() => setShowPasswordModal(true)} style={styles.instaActionRow}>
              <View style={styles.instaInfo}>
                <View style={[styles.instaIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }]}>
                  <Shield size={20} color={textSecondary} />
                </View>
                <Text style={[styles.instaTitle, { color: textPrimary }]}>Alterar Senha</Text>
              </View>
              <ChevronRight size={18} color={textSecondary} />
            </TouchableOpacity>
          </Section>

          {/* DANGER ZONE */}
          <View style={styles.dangerZone}>
            <TouchableOpacity onPress={handleLogout} style={[styles.dangerBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <LogOut size={18} color={textSecondary} />
              <Text style={[styles.dangerText, { color: textSecondary }]}>Sair da Conta</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.deleteBtn, loading && { opacity: 0.5 }]}
              onPress={handleDeleteAccount}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color="#FF3B30" />
              <Text style={styles.deleteText}>Excluir Minha Conta</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* PASSWORD MODAL */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: backgroundSecondary }]}>
             <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>Nova Senha</Text>
                <TouchableOpacity onPress={() => setShowPasswordModal(false)}><X size={24} color={textPrimary} /></TouchableOpacity>
             </View>
             <View style={styles.modalBody}>
                <TextInput 
                  secureTextEntry 
                  style={[styles.modalInput, { color: textPrimary, backgroundColor: backgroundPrimary }]} 
                  placeholder="Senha atual" 
                  placeholderTextColor="#666" 
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TextInput 
                  secureTextEntry 
                  style={[styles.modalInput, { color: textPrimary, backgroundColor: backgroundPrimary }]} 
                  placeholder="Nova senha" 
                  placeholderTextColor="#666" 
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]}>
                  <Text style={styles.saveBtnText}>Redefinir Senha</Text>
                </TouchableOpacity>
             </View>
          </View>
        </View>
      </Modal>

      {/* INTERESTS SELECTION MODAL */}
      <Modal visible={showInterestsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentLarge, { backgroundColor: backgroundSecondary }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: textPrimary }]}>Meus Interesses</Text>
                <Text style={[styles.modalSub, { color: textSecondary }]}>Escolha o que você gosta de ver</Text>
              </View>
              <TouchableOpacity onPress={() => setShowInterestsModal(false)} style={styles.closeBtn}>
                <X size={24} color={textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrapper}>
              <Search size={18} color={textSecondary} />
              <TextInput 
                style={[styles.searchInput, { color: textPrimary }]}
                placeholder="Buscar categorias..."
                placeholderTextColor={isDark ? '#444' : '#bbb'}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.interestsScroll}>
              <View style={styles.modalInterestsBody}>
                {categories
                  .filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                subcategories.some(s => s.category_id === cat.id && s.name.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map(cat => {
                    const isSelected = formData.preferred_categories.includes(cat.id);
                    const catSubcats = subcategories.filter(s => s.category_id === cat.id);
                    
                    return (
                      <View key={cat.id} style={styles.categorySection}>
                        <TouchableOpacity 
                          onPress={() => toggleCategory(cat.id)}
                          style={[
                            styles.interestChip, 
                            { backgroundColor: isSelected ? accent : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)') }
                          ]}
                        >
                          <Text style={styles.interestEmoji}>{cat.icon || '✨'}</Text>
                          <Text style={[styles.interestLabel, { color: isSelected ? '#fff' : textPrimary }]}>{cat.name}</Text>
                          {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                        </TouchableOpacity>

                        {isSelected && catSubcats.length > 0 && (
                          <View style={styles.subcategoriesRow}>
                            {catSubcats.map(sub => {
                              const isSubSelected = formData.preferred_subcategories.includes(sub.id);
                              return (
                                <TouchableOpacity 
                                  key={sub.id} 
                                  onPress={() => toggleSubcategory(sub.id)}
                                  style={[
                                    styles.subcategoryChip, 
                                    { borderColor: isSubSelected ? accent : (isDark ? '#333' : '#ddd'),
                                      backgroundColor: isSubSelected ? 'rgba(0, 217, 255, 0.1)' : 'transparent' }
                                  ]}
                                >
                                  <Text style={[styles.subcategoryLabel, { color: isSubSelected ? accent : textSecondary }]}>
                                    {sub.name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    );
                  })}
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: accent, marginTop: 20 }]}
              onPress={() => setShowInterestsModal(false)}
            >
              <Text style={styles.saveBtnText}>Concluído</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {selectedImageUri && (
        <UniversalImageEditor
          visible={showImageEditor}
          imageUri={selectedImageUri}
          mode="profile"
          onClose={() => setShowImageEditor(false)}
          onSave={handleSaveEditedAvatar}
        />
      )}

      <ActionFeedback 
        {...feedback} 
        onClose={() => {
          setFeedback({ ...feedback, visible: false });
          if (feedback.type === 'success' && feedback.title === 'Sucesso') {
            router.back();
          }
        }} 
      />

      <PremiumConfirmationModal
        visible={showLogoutConfirm}
        title="Sair da Conta?"
        description="Você precisará fazer login novamente para acessar seus rolês."
        confirmText="Sair"
        cancelText="Voltar"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        isDestructive
      />

      <PremiumConfirmationModal
        visible={showDeleteAccountConfirm}
        title="Excluir Conta?"
        description="Esta ação é PERMANENTE. Todos os seus dados, fotos e rolês serão apagados para sempre."
        confirmText="Excluir Tudo"
        cancelText="Manter Conta"
        onConfirm={confirmDeleteAccount}
        onCancel={() => setShowDeleteAccountConfirm(false)}
        isDestructive
      />

      {/* CUSTOM PREMIUM ACTION SHEET MODAL */}
      <Modal
        visible={showImageSourceModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowImageSourceModal(false)}
      >
        <TouchableOpacity 
          style={styles.actionSheetOverlay} 
          activeOpacity={1} 
          onPress={() => setShowImageSourceModal(false)}
        >
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          
          <View style={[styles.actionSheetContainer, { backgroundColor: backgroundSecondary }]}>
            <View style={[styles.actionSheetHandle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' }]} />
            
            <Text style={[styles.actionSheetTitle, { color: textPrimary }]}>
              {imageEditTarget === 'cover' ? 'Alterar Imagem de Capa' : 'Alterar Foto de Perfil'}
            </Text>
            
            <Text style={[styles.actionSheetSub, { color: textSecondary }]}>
              Selecione o método de envio da sua foto
            </Text>
            
            <View style={styles.actionSheetOptions}>
              <TouchableOpacity 
                style={[styles.actionSheetOption, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
                activeOpacity={0.8}
                onPress={takePhoto}
              >
                <View style={[styles.actionSheetIconWrapper, { backgroundColor: accent + '15' }]}>
                  <Camera size={22} color={accent} />
                </View>
                <View style={styles.actionSheetOptionText}>
                  <Text style={[styles.actionSheetOptionTitle, { color: textPrimary }]}>Tirar Foto</Text>
                  <Text style={[styles.actionSheetOptionDesc, { color: textSecondary }]}>Tirar foto agora com a câmera</Text>
                </View>
                <ChevronRight size={18} color={textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionSheetOption, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}
                activeOpacity={0.8}
                onPress={pickImage}
              >
                <View style={[styles.actionSheetIconWrapper, { backgroundColor: '#ff1493' + '15' }]}>
                  <FolderOpen size={22} color="#ff1493" />
                </View>
                <View style={styles.actionSheetOptionText}>
                  <Text style={[styles.actionSheetOptionTitle, { color: textPrimary }]}>Escolher da Galeria</Text>
                  <Text style={[styles.actionSheetOptionDesc, { color: textSecondary }]}>Buscar foto no rolo da câmera</Text>
                </View>
                <ChevronRight size={18} color={textSecondary} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.actionSheetCancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
              activeOpacity={0.8}
              onPress={() => setShowImageSourceModal(false)}
            >
              <Text style={[styles.actionSheetCancelText, { color: textPrimary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const Section = ({ title, icon: Icon, children, isDark, accent, textPrimary, backgroundSecondary }: any) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
        <Icon size={18} color={accent} />
      </View>
      <Text style={[styles.sectionTitle, { color: textPrimary }]}>{title}</Text>
    </View>
    <View style={[styles.sectionContent, { backgroundColor: backgroundSecondary }]}>
      {children}
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: ms(17),
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  coverEditContainer: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
    position: 'relative',
  },
  coverEditImg: {
    width: '100%',
    height: '100%',
  },
  coverChangeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  coverBtnBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  coverBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  actionSheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  actionSheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
  },
  actionSheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    marginBottom: 20,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionSheetSub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionSheetOptions: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    width: '100%',
  },
  actionSheetIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionSheetOptionText: {
    flex: 1,
  },
  actionSheetOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  actionSheetOptionDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionSheetCancelBtn: {
    width: '100%',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  actionSheetCancelText: {
    fontSize: 15,
    fontWeight: '800',
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: vs(24),
  },
  avatarRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImg: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  avatarPlaceholder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 54,
    fontWeight: '900',
    color: '#fff',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0f0f18',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  changeText: {
    marginTop: 14,
    fontSize: ms(14),
    fontWeight: '700',
  },

  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: ms(15),
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionContent: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: ms(14),
    fontWeight: '600',
  },

  inputWrapper: {
    paddingVertical: 8,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: ms(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: ms(16),
    fontWeight: '600',
    paddingVertical: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorHint: {
    color: '#FF3B30',
    fontSize: ms(11),
    marginTop: 4,
    fontWeight: '600',
  },
  bioInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCounter: {
    textAlign: 'right',
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 12,
  },

  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestsPreview: {
    gap: 12,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  interestChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  interestEmoji: {
    fontSize: ms(16),
  },
  interestLabel: {
    fontSize: ms(13),
    fontWeight: '700',
  },
  interestLabelActive: {
    fontSize: ms(12),
    fontWeight: '700',
    color: '#fff',
  },
  emptyInterests: {
    fontSize: ms(13),
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  editInterestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  editInterestsText: {
    fontSize: ms(14),
    fontWeight: '700',
  },

  subLabel: {
    fontSize: ms(13),
    fontWeight: '700',
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: 'rgba(0,0,0,0.1)',
    borderWidth: 1,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchTitle: {
    fontSize: ms(15),
    fontWeight: '700',
  },
  switchSub: {
    fontSize: ms(12),
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionText: {
    fontSize: ms(15),
    fontWeight: '600',
  },

  dangerZone: {
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 12,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 20,
  },
  dangerText: {
    fontSize: ms(15),
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    marginBottom: 40,
  },
  deleteText: {
    color: '#FF3B30',
    fontSize: ms(15),
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 30,
    padding: 24,
    elevation: 20,
  },
  modalContentLarge: {
    borderRadius: 30,
    padding: 24,
    elevation: 20,
    width: '100%',
    height: '80%',
    position: 'absolute',
    bottom: 0,
  },
  modalSub: {
    fontSize: ms(13),
    marginTop: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interestsScroll: {
    paddingBottom: 20,
  },
  instagramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  instaActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  instaInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  instaIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instaTitle: {
    fontSize: ms(15),
    fontWeight: '700',
  },
  instaSub: {
    fontSize: ms(11),
    marginTop: 2,
    paddingRight: 20,
    lineHeight: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalInterestsBody: {
    gap: 16,
  },
  categorySection: {
    gap: 8,
    marginBottom: 8,
  },
  subcategoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  subcategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  subcategoryLabel: {
    fontSize: ms(12),
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  modalBody: {
    gap: 16,
  },
  modalInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtn: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
});
