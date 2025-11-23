import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, Switch, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Save, Lock, LogOut, Trash2, Bell, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { uploadImage } from '@/lib/storage';

export default function EditProfile() {
  const { profile, user, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: '',
    primary_color: '#00d9ff',
    secondary_color: '#1a1a1a',
    accent_color: '#ff1493',
    is_private: false,
  });
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);


  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        primary_color: profile.primary_color || '#00d9ff',
        secondary_color: profile.secondary_color || '#1a1a1a',
        accent_color: profile.accent_color || '#ff1493',
        is_private: profile.is_private || false,
      });
    }
  }, [profile]);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permissão necessária', 'Precisamos de permissão para acessar suas fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setNewAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.username.trim() || !formData.full_name.trim()) {
      Alert.alert('Erro', 'Nome de usuário e nome completo são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = formData.avatar_url;

      if (newAvatarUri) {
        const uploadedUrl = await uploadImage(
          newAvatarUri,
          'media',
          'avatars',
          user.id
        );

        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else {
          Alert.alert('Aviso', 'Não foi possível fazer upload da imagem. Continuando com a foto anterior.');
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username.trim(),
          full_name: formData.full_name.trim(),
          bio: formData.bio.trim() || null,
          avatar_url: avatarUrl || null,
          primary_color: formData.primary_color || null,
          secondary_color: formData.secondary_color || null,
          accent_color: formData.accent_color || null,
          is_private: formData.is_private || false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      router.back();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.code === '23505') {
        Alert.alert('Erro', 'Este nome de usuário já está em uso');
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o perfil');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword || !currentPassword) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setPasswordLoading(true);
    try {
      // Verificar senha atual fazendo re-autenticação
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        Alert.alert('Erro', 'Senha atual incorreta');
        return;
      }

      // Atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        Alert.alert('Erro', 'Não foi possível atualizar a senha');
        return;
      }

      Alert.alert('Sucesso', 'Senha alterada com sucesso!');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao alterar a senha');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível sair da conta');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Deletar Conta',
      'Tem certeza? Esta ação é irreversível e deletará todos os seus dados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Primeiro deletar o perfil
              await supabase
                .from('profiles')
                .delete()
                .eq('id', user?.id);

              // Deletar a conta de autenticação
              const { error } = await supabase.auth.admin.deleteUser(user?.id || '');
              
              if (error) throw error;

              Alert.alert('Sucesso', 'Conta deletada com sucesso');
              router.replace('/(auth)/login');
            } catch (error: any) {
              console.error('Error deleting account:', error);
              Alert.alert('Erro', 'Não foi possível deletar a conta');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2d2d2d', '#1a1a1a']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#00d9ff" />
          ) : (
            <Save size={24} color="#00d9ff" />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <LinearGradient
          colors={[formData.primary_color, formData.secondary_color]}
          style={styles.avatarSection}
        >
          {(newAvatarUri || formData.avatar_url) ? (
            <Image source={{ uri: newAvatarUri || formData.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {formData.username.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.changeAvatarButton}
            onPress={pickImage}
          >
            <Camera size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome de usuário</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text.toLowerCase().replace(/\s/g, '') })}
              placeholder="seunome"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              style={styles.input}
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
              placeholder="Seu Nome Completo"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholder="Conte um pouco sobre você..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={150}
            />
            <Text style={styles.charCount}>{formData.bio.length}/150</Text>
          </View>

          {/* Tema e cores */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tema e cores</Text>
            <Text style={styles.smallLabel}>Cor de fundo</Text>
            <View style={styles.swatchesRow}>
              {['#00d9ff', '#ff1493', '#34C759', '#AF52DE', '#FF9500', '#1a1a1a'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.swatch, { backgroundColor: c }, formData.primary_color === c ? styles.swatchSelected : null]}
                  onPress={() => setFormData({ ...formData, primary_color: c })}
                />
              ))}
            </View>

            <Text style={styles.smallLabel}>Cor de destaque</Text>
            <View style={styles.swatchesRow}>
              {['#ff1493', '#00d9ff', '#34C759', '#AF52DE', '#FF3B30'].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.swatch, { backgroundColor: c }, formData.accent_color === c ? styles.swatchSelected : null]}
                  onPress={() => setFormData({ ...formData, accent_color: c })}
                />
              ))}
            </View>
          </View>

          {/* Configurações adicionais */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Privacidade</Text>
            <View style={styles.privacyRow}>
              <Text style={styles.privacyText}>Conta privada</Text>
              <Switch
                value={!!formData.is_private}
                onValueChange={(val) => setFormData({ ...formData, is_private: val })}
                thumbColor={formData.is_private ? formData.accent_color : '#fff'}
                trackColor={{ false: '#777', true: '#333' }}
              />
            </View>
          </View>

          {/* Notificações */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notificações</Text>
            <View style={styles.privacyRow}>
              <Text style={styles.privacyText}>Receber notificações</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                thumbColor={notificationsEnabled ? formData.accent_color : '#fff'}
                trackColor={{ false: '#777', true: '#333' }}
              />
            </View>
          </View>

          {/* Segurança */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Segurança</Text>
            <TouchableOpacity 
              style={styles.securityButton}
              onPress={() => setShowPasswordModal(true)}
            >
              <Lock size={20} color="#fff" />
              <Text style={styles.securityButtonText}>Redefinir Senha</Text>
            </TouchableOpacity>
          </View>

          {/* Outras Opções */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Conta</Text>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <LogOut size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Sair da Conta</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
            >
              <Trash2 size={20} color="#ff1493" />
              <Text style={styles.deleteButtonText}>Deletar Conta</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* Modal para redefinir senha */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Redefinir Senha</Text>
              <TouchableOpacity 
                onPress={() => setShowPasswordModal(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha Atual</Text>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Digite sua senha atual"
                  secureTextEntry
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nova Senha</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Digite a nova senha"
                  secureTextEntry
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar Senha</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirme a nova senha"
                  secureTextEntry
                  placeholderTextColor="#666"
                />
              </View>

              <TouchableOpacity 
                style={[styles.publishButton, passwordLoading && styles.publishButtonDisabled]}
                onPress={handleResetPassword}
                disabled={passwordLoading}
              >
                {passwordLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.publishButtonText}>Redefinir Senha</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '900',
  },
  changeAvatarButton: {
    position: 'absolute',
    bottom: 40,
    right: '50%',
    marginRight: -72,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff1493',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  form: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 20,
    margin: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#3d3d3d',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#0a0a0a',
    color: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  smallLabel: {
    fontSize: 12,
    color: '#bbb',
    marginBottom: 8,
  },
  swatchesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#fff',
    transform: [{ scale: 1.05 }],
  },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  privacyText: {
    color: '#fff',
    fontSize: 16,
  },
  securityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#3d3d3d',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  securityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3a3a',
    borderWidth: 1,
    borderColor: '#00d9ff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 12,
  },
  logoutButtonText: {
    color: '#00d9ff',
    fontSize: 16,
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a1a1a',
    borderWidth: 1,
    borderColor: '#ff1493',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  deleteButtonText: {
    color: '#ff1493',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3d3d3d',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalBody: {
    padding: 20,
  },
  publishButton: {
    backgroundColor: '#00d9ff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  publishButtonDisabled: {
    opacity: 0.6,
  },
  publishButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
