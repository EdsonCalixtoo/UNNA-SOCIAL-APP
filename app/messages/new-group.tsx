import { useLanguage } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check, Users, Camera, X, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { uploadImage } from '@/lib/storage';
import Animated, { FadeInRight, FadeInUp, Layout } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
}

export default function NewGroupScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (profile: Profile) => {
    setSelectedUsers(prev => 
      prev.find(u => u.id === profile.id) 
        ? prev.filter(u => u.id !== profile.id) 
        : [...prev, profile]
    );
  };

  const pickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Precisamos da permissão da galeria para selecionar uma imagem.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setGroupAvatar(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error launching library:', err);
      Alert.alert('Erro', 'Não foi possível acessar a galeria.');
    }
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Atenção', 'Dê um nome bem legal ao seu grupo!');
      return;
    }
    if (selectedUsers.length < 1) {
      Alert.alert('Atenção', 'Convide pelo menos um amigo para o grupo.');
      return;
    }

    setCreating(true);
    try {
      let avatarUrl = null;

      if (groupAvatar) {
        avatarUrl = await uploadImage(groupAvatar, 'media', 'groups', user?.id || 'unknown');
      }

      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: groupName,
          is_group: true,
          avatar_url: avatarUrl,
          description: groupDescription,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError) throw convError;

      const participants = [
        { conversation_id: conversation.id, user_id: user?.id, is_admin: true },
        ...selectedUsers.map(u => ({
          conversation_id: conversation.id,
          user_id: u.id,
          is_admin: false
        }))
      ];

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (partError) throw partError;

      router.replace(`/messages/${conversation.id}`);
    } catch (err) {
      console.error(err);
      Alert.alert('Erro no Banco', 'Certifique-se de rodar o SQL para adicionar as colunas: name, is_group e avatar_url na tabela conversations.');
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <LinearGradient
        colors={['#00d9ff', '#ff1493']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('auto.sdc2d65a0', 'Criar Grupo')}</Text>
          <TouchableOpacity 
            onPress={createGroup} 
            disabled={creating}
            style={[styles.createBtn, (selectedUsers.length === 0 || !groupName) && styles.createBtnDisabled]}
          >
            {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.createBtnText}>{t('auto.s75b1629a', 'Criar')}</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.groupInfoCard}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {groupAvatar ? (
              <Image source={{ uri: groupAvatar }} style={styles.groupAvatar} cachePolicy="none" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Camera color="#fff" size={28} />
              </View>
            )}
            <View style={styles.editBadge}>
              <X size={12} color="#fff" style={{ transform: [{ rotate: '45deg' }] }} />
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1, gap: 8 }}>
            <TextInput
              style={styles.groupNameInput}
              placeholder={t('auto.scb40cbda', 'Nome do Grupo')}
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={groupName}
              onChangeText={setGroupName}
              maxLength={30}
            />
            <TextInput
              style={styles.groupDescriptionInput}
              placeholder={t('auto.s00d736a9', 'Descrição do Grupo (opcional)')}
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={groupDescription}
              onChangeText={setGroupDescription}
              maxLength={150}
              multiline
            />
          </View>
        </View>
      </LinearGradient>

      {selectedUsers.length > 0 && (
        <View style={[styles.selectedContainer, { borderBottomColor: isDark ? '#1a1a1a' : '#e5e5e7' }]}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={selectedUsers}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.selectedList}
            renderItem={({ item }) => (
              <Animated.View entering={FadeInRight} layout={Layout.springify()} style={styles.selectedUser}>
                <View>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.selectedAvatar} cachePolicy="memory-disk" />
                  ) : (
                    <View style={[styles.selectedAvatarPlaceholder, { backgroundColor: isDark ? '#222' : '#e5e5e7' }]}>
                      <Text style={[styles.selectedAvatarLetter, { color: textPrimary }]}>{item.full_name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={[styles.removeUser, { borderColor: backgroundPrimary }]} onPress={() => toggleUser(item)}>
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.selectedName, { color: textPrimary }]} numberOfLines={1}>{item.full_name.split(' ')[0]}</Text>
              </Animated.View>
            )}
          />
        </View>
      )}

      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: backgroundSecondary }]}>
          <Search size={20} color={isDark ? '#8E8E93' : '#a1a1a6'} />
          <TextInput
            style={[styles.searchInput, { color: textPrimary }]}
            placeholder={t('auto.sf98a15e9', 'Buscar amigos...')}
            placeholderTextColor={isDark ? '#8E8E93' : '#a1a1a6'}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.usersList}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={5}
        removeClippedSubviews={true}
        renderItem={({ item, index }) => {
          const isSelected = selectedUsers.find(u => u.id === item.id);
          return (
            <Animated.View entering={FadeInUp.delay(index * 50)}>
              <TouchableOpacity 
                style={[
                  styles.userItem, 
                  isSelected && { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.08)' }
                ]} 
                onPress={() => toggleUser(item)}
              >
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.userAvatar} cachePolicy="memory-disk" />
                ) : (
                  <View style={[styles.avatarPlaceholderCircle, { backgroundColor: isDark ? '#222' : '#e5e5e7' }]}>
                    <Text style={[styles.avatarLetter, { color: textPrimary }]}>{item.full_name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: textPrimary }]}>{item.full_name}</Text>
                  <Text style={[styles.userUsername, { color: textSecondary }]}>@{item.username}</Text>
                </View>
                <View style={[
                  styles.checkbox, 
                  { borderColor: isDark ? '#333' : '#d1d1d6' }, 
                  isSelected && { backgroundColor: accent, borderColor: accent }
                ]}>
                  {isSelected && <Check color="#fff" size={14} />}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        ListEmptyComponent={loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={accent} />
        ) : (
          <View style={styles.emptyContainer}>
            <Users size={48} color={isDark ? '#333' : '#ccc'} />
            <Text style={[styles.emptyText, { color: textSecondary }]}>{t('auto.s6cf2f0ab', 'Nenhum amigo encontrado')}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  createBtn: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: '#ff1493', fontWeight: 'bold', fontSize: 15 },
  groupInfoCard: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  avatarContainer: { width: 80, height: 80, position: 'relative' },
  groupAvatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#fff' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderStyle: 'dashed' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#00d9ff', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  groupNameInput: { flex: 1, fontSize: 24, fontWeight: '700', color: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.3)', paddingVertical: 8 },
  groupDescriptionInput: { fontSize: 13, color: 'rgba(255,255,255,0.8)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)', paddingVertical: 4, marginTop: 4 },
  selectedContainer: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  selectedList: { paddingHorizontal: 20, gap: 15 },
  selectedUser: { alignItems: 'center', width: 60 },
  selectedAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#00d9ff' },
  removeUser: { position: 'absolute', top: -2, right: -2, backgroundColor: '#ff3b30', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  selectedName: { color: '#fff', fontSize: 11, marginTop: 5, fontWeight: '600' },
  searchSection: { padding: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 15, paddingHorizontal: 15, gap: 10, height: 50 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  usersList: { paddingHorizontal: 10, paddingBottom: 40 },
  userItem: { flexDirection: 'row', padding: 12, alignItems: 'center', gap: 15, borderRadius: 15, marginBottom: 5 },
  userItemActive: { backgroundColor: 'rgba(0, 217, 255, 0.05)' },
  userAvatar: { width: 55, height: 55, borderRadius: 27.5 },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontSize: 17, fontWeight: '600' },
  userUsername: { color: '#8E8E93', fontSize: 14, marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#333', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#00d9ff', borderColor: '#00d9ff' },
  emptyContainer: { alignItems: 'center', marginTop: 50, opacity: 0.5 },
  emptyText: { color: '#8E8E93', fontSize: 16, marginTop: 15 },
  selectedAvatarPlaceholder: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#00d9ff', justifyContent: 'center', alignItems: 'center' },
  selectedAvatarLetter: { fontSize: 18, fontWeight: 'bold' },
  avatarPlaceholderCircle: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: 'bold' },
});
