import { useLanguage } from '@/lib/i18n';
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TextInput, FlatList, 
  TouchableOpacity, ActivityIndicator, Switch, Image, 
  KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, Search, ShieldCheck, Sparkles, UserSearch } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/contexts/ThemeContext';
import { s, vs, ms } from '@/utils/responsive';
import { ActionFeedback } from './ActionFeedback';

const PRESET_COLORS = [
  '#00d9ff', // Cyan
  '#7b2fff', // Purple
  '#ff1493', // Pink
  '#00e676', // Green
  '#ff9500', // Orange
  '#ff3b30', // Red
  '#2979ff', // Blue
  '#ffcc00', // Yellow
];

interface AdminPanelModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdminPanelModal({ visible, onClose }: AdminPanelModalProps) {
  const { t } = useLanguage();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'verification' | 'badges' | 'categories' | 'notifications'>('verification');

  // Verification State
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Category & Subcategory Management State
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  const [newSubcategoryNames, setNewSubcategoryNames] = useState<{[catId: string]: string}>({});
  
  // Form for Adding/Editing Category
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catOrder, setCatOrder] = useState('');
  const [catColor, setCatColor] = useState('#00d9ff');

  // General feedback overlay state
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Notifications State
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  // Badges Management State
  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [showBadgeForm, setShowBadgeForm] = useState(false);
  const [editingBadge, setEditingBadge] = useState<any | null>(null);
  const [badgeName, setBadgeName] = useState('');
  const [badgeDesc, setBadgeDesc] = useState('');
  const [badgeIcon, setBadgeIcon] = useState('✨');
  const [badgeCategory, setBadgeCategory] = useState('social');
  
  // User Badges (for modal assignment)
  const [managingUserId, setManagingUserId] = useState<string | null>(null);
  const [userBadges, setUserBadges] = useState<Set<string>>(new Set());
  const [loadingUserBadges, setLoadingUserBadges] = useState(false);

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase.from('notification_templates').select('*');
      // If table doesn't exist yet, it will error, we just ignore for now
      if (error && error.code !== '42P01') throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({ title_template: templateTitle, body_template: templateBody, updated_at: new Date().toISOString() })
        .eq('id', editingTemplate.id);
      
      if (error) throw error;
      setFeedback({ type: 'success', message: 'Notificação atualizada com sucesso!' });
      setEditingTemplate(null);
      loadTemplates();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao salvar: ' + err.message });
    }
  };

  const loadBadges = async () => {
    setLoadingBadges(true);
    try {
      const { data, error } = await supabase.from('badges').select('*').order('created_at', { ascending: false });
      if (error && error.code !== '42P01') throw error;
      setAllBadges(data || []);
    } catch (err: any) {
      console.error('Error fetching badges:', err);
    } finally {
      setLoadingBadges(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (visible) {
      if (activeTab === 'verification' && users.length === 0) {
        searchUsers('');
      } else if (activeTab === 'categories') {
        loadCategories();
      } else if (activeTab === 'notifications') {
        loadTemplates();
      } else if (activeTab === 'badges') {
        loadBadges();
      }
    }
  }, [visible, activeTab]);

  // --- USER VERIFICATION ROUTINES ---
  const searchUsers = async (query: string) => {
    setLoading(true);
    try {
      let rpc = supabase.from('profiles').select('id, username, full_name, avatar_url, is_verified');
      
      if (query.length > 0) {
        rpc = rpc.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);
      }
      
      const { data, error } = await rpc.limit(20).order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      if (!currentStatus) {
        // Enviar notificação de que foi verificado
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'system',
          title: 'Selo de Verificação',
          message: 'O perfil @UNNAsocialappoficial verificou sua conta! Parabéns!',
          data: { is_verified: true }
        });
      }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !currentStatus } : u));
      setFeedback({ type: 'success', message: 'Selo atualizado com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro: ' + err.message });
    }
  };

  // --- BADGES ROUTINES ---
  const handleSaveBadge = async () => {
    if (!badgeName.trim() || !badgeIcon.trim()) {
      setFeedback({ type: 'error', message: 'Nome e Ícone são obrigatórios!' });
      return;
    }

    try {
      if (editingBadge) {
        const { error } = await supabase
          .from('badges')
          .update({
            name: badgeName.trim(),
            description: badgeDesc.trim(),
            icon: badgeIcon.trim(),
            category: badgeCategory
          })
          .eq('id', editingBadge.id);

        if (error) throw error;
        setFeedback({ type: 'success', message: 'Selo atualizado!' });
      } else {
        const { error } = await supabase
          .from('badges')
          .insert({
            name: badgeName.trim(),
            description: badgeDesc.trim(),
            icon: badgeIcon.trim(),
            category: badgeCategory
          });

        if (error) throw error;
        setFeedback({ type: 'success', message: 'Selo criado com sucesso!' });
      }

      setShowBadgeForm(false);
      setEditingBadge(null);
      loadBadges();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao salvar selo: ' + err.message });
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    try {
      const { error } = await supabase.from('badges').delete().eq('id', badgeId);
      if (error) throw error;
      setFeedback({ type: 'success', message: 'Selo removido com sucesso!' });
      loadBadges();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao remover selo: ' + err.message });
    }
  };

  const openManageBadges = async (userId: string) => {
    setManagingUserId(userId);
    setLoadingUserBadges(true);
    // ensure badges are loaded
    if (allBadges.length === 0) {
      await loadBadges();
    }
    
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      setUserBadges(new Set((data || []).map(b => b.badge_id)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUserBadges(false);
    }
  };

  const toggleUserBadge = async (badgeId: string) => {
    if (!managingUserId) return;
    
    const hasBadge = userBadges.has(badgeId);
    
    try {
      if (hasBadge) {
        const { error } = await supabase
          .from('user_badges')
          .delete()
          .match({ user_id: managingUserId, badge_id: badgeId });
        if (error) throw error;
        
        setUserBadges(prev => {
          const newSet = new Set(prev);
          newSet.delete(badgeId);
          return newSet;
        });
      } else {
        const { error } = await supabase
          .from('user_badges')
          .insert({ user_id: managingUserId, badge_id: badgeId });
        if (error) throw error;
        
        setUserBadges(prev => {
          const newSet = new Set(prev);
          newSet.add(badgeId);
          return newSet;
        });

        // Get badge info to send notification
        const badge = allBadges.find(b => b.id === badgeId);
        if (badge) {
          await supabase.from('notifications').insert({
            user_id: managingUserId,
            type: 'system',
            title: 'Novo Selo Conquistado!',
            message: `Você recebeu o selo ${badge.name} do @UNNAsocialappoficial!`,
            data: { badge_id: badgeId }
          });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao alterar selo do usuário: ' + err.message });
    }
  };

  // --- CATEGORIES & SUBCATEGORIES ROUTINES ---
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*, subcategories(*)')
        .order('order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error('Error fetching categories:', err);
      setFeedback({ type: 'error', message: 'Erro ao carregar categorias.' });
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) {
      setFeedback({ type: 'error', message: 'O nome da categoria é obrigatório!' });
      return;
    }
    const orderNum = parseInt(catOrder) || (categories.length + 1);

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: catName.trim(),
            icon: catIcon.trim() || '✨',
            order: orderNum,
            color: catColor
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        setFeedback({ type: 'success', message: 'Categoria atualizada!' });
      } else {
        // Insert new category
        const { error } = await supabase
          .from('categories')
          .insert({
            name: catName.trim(),
            icon: catIcon.trim() || '✨',
            order: orderNum,
            color: catColor
          });

        if (error) throw error;
        setFeedback({ type: 'success', message: 'Categoria criada com sucesso!' });
      }

      setCatName('');
      setCatIcon('');
      setCatOrder('');
      setEditingCategory(null);
      setShowCategoryForm(false);
      loadCategories();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao salvar categoria: ' + err.message });
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', catId);

      if (error) throw error;
      setFeedback({ type: 'success', message: 'Categoria removida com sucesso!' });
      loadCategories();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao remover categoria: ' + err.message });
    }
  };

  const handleAddSubcategory = async (catId: string) => {
    const subName = newSubcategoryNames[catId];
    if (!subName || !subName.trim()) return;

    try {
      const parentCat = categories.find(c => c.id === catId);
      const parentColor = parentCat?.color || '#00d9ff';

      const { error } = await supabase
        .from('subcategories')
        .insert({
          category_id: catId,
          name: subName.trim(),
          color: parentColor
        });

      if (error) throw error;

      setNewSubcategoryNames(prev => ({ ...prev, [catId]: '' }));
      setFeedback({ type: 'success', message: 'Subcategoria adicionada!' });
      loadCategories();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao criar subcategoria: ' + err.message });
    }
  };

  const handleDeleteSubcategory = async (subId: string) => {
    try {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subId);

      if (error) throw error;
      setFeedback({ type: 'success', message: 'Subcategoria removida!' });
      loadCategories();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao remover subcategoria: ' + err.message });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={[styles.content, { backgroundColor: backgroundPrimary }]}>
          <View style={styles.indicator} />
          
          {/* HEADER HEADER */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBg, { backgroundColor: accent + '22' }]}>
                <ShieldCheck size={22} color={accent} />
              </View>
              <View>
                <Text style={[styles.title, { color: textPrimary }]}>{t('auto.s0462a551', 'Painel Administrativo')}</Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>{t('auto.s203d5391', 'Controle geral do UNNA Social')}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <X size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>

          {/* GLASS SEGMENTED TAB SELECTOR */}
          <View style={[styles.tabBar, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 0 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'verification' && { borderBottomColor: accent }]}
                onPress={() => setActiveTab('verification')}
              >
                <Text style={[styles.tabText, { color: activeTab === 'verification' ? textPrimary : textSecondary, fontWeight: activeTab === 'verification' ? '800' : '500' }]}>
                  Usuários
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'badges' && { borderBottomColor: accent }]}
                onPress={() => setActiveTab('badges')}
              >
                <Text style={[styles.tabText, { color: activeTab === 'badges' ? textPrimary : textSecondary, fontWeight: activeTab === 'badges' ? '800' : '500' }]}>
                  Selos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'categories' && { borderBottomColor: accent }]}
                onPress={() => setActiveTab('categories')}
              >
                <Text style={[styles.tabText, { color: activeTab === 'categories' ? textPrimary : textSecondary, fontWeight: activeTab === 'categories' ? '800' : '500' }]}>
                  Categorias & Sub
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'notifications' && { borderBottomColor: accent }]}
                onPress={() => setActiveTab('notifications')}
              >
                <Text style={[styles.tabText, { color: activeTab === 'notifications' ? textPrimary : textSecondary, fontWeight: activeTab === 'notifications' ? '800' : '500' }]}>
                  Notificações
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* TAB 1: USER VERIFICATIONS */}
          {activeTab === 'verification' && (
            <View style={{ flex: 1 }}>
              <View style={styles.searchWrapper}>
                <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                  <Search size={20} color={textSecondary} />
                  <TextInput
                    style={[styles.input, { color: textPrimary }]}
                    placeholder={t('auto.s81ca4deb', 'Nome ou @username...')}
                    placeholderTextColor={textSecondary}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={() => searchUsers(search)}
                    returnKeyType="search"
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearch(''); searchUsers(''); }}>
                      <X size={16} color={textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity 
                  style={[styles.searchBtn, { backgroundColor: accent }]}
                  onPress={() => searchUsers(search)}
                >
                  <Text style={styles.searchBtnText}>{t('auto.s113f7428', 'Buscar')}</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color={accent} />
                  <Text style={[styles.loaderText, { color: textSecondary }]}>{t('auto.s1c7e930e', 'Buscando usuários...')}</Text>
                </View>
              ) : (
                <FlatList
                  data={users}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                      <View>
                        <View style={[styles.userCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderBottomWidth: managingUserId === item.id ? 0 : 1, flexDirection: 'column', padding: 14, gap: 12 }]}>
                          {/* TOP ROW: Avatar + Name */}
                          <View style={styles.userMainInfo}>
                            {item.avatar_url ? (
                              <Image 
                                source={{ uri: item.avatar_url }} 
                                style={[styles.avatar, { borderColor: item.is_verified ? accent : 'transparent' }]} 
                              />
                            ) : (
                              <View style={[styles.avatarPlaceholder, { backgroundColor: accent }]}>
                                <Text style={styles.avatarText}>
                                  {item.username?.charAt(0).toUpperCase() || item.full_name?.charAt(0).toUpperCase() || 'U'}
                                </Text>
                              </View>
                            )}
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={[styles.userName, { color: textPrimary, flexShrink: 1 }]} numberOfLines={1}>{item.full_name}</Text>
                                {item.is_verified && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: accent + '20', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                                    <Sparkles size={10} color={accent} fill={accent} />
                                    <Text style={{ color: accent, fontSize: 10, fontWeight: '700' }}>{t('auto.se0b3f379', 'Verificado')}</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.userHandle, { color: textSecondary }]}>@{item.username}</Text>
                            </View>
                          </View>

                          {/* BOTTOM ROW: Action Buttons */}
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            {/* Selos Button */}
                            <TouchableOpacity 
                              onPress={() => managingUserId === item.id ? setManagingUserId(null) : openManageBadges(item.id)}
                              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: managingUserId === item.id ? accent + '25' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'), borderWidth: 1, borderColor: managingUserId === item.id ? accent + '50' : 'transparent' }}
                            >
                              <Text style={{ fontSize: 15 }}>{t('auto.s7ee2594b', '🎖️')}</Text>
                              <Text style={{ color: managingUserId === item.id ? accent : textPrimary, fontSize: 13, fontWeight: '700' }}>
                                {managingUserId === item.id ? 'Fechar Selos' : 'Selos'}
                              </Text>
                            </TouchableOpacity>

                            {/* Verificar Button */}
                            <TouchableOpacity 
                              onPress={() => toggleVerification(item.id, item.is_verified)}
                              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: item.is_verified ? accent + '20' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'), borderWidth: 1, borderColor: item.is_verified ? accent + '50' : 'transparent' }}
                            >
                              <Sparkles size={14} color={item.is_verified ? accent : textSecondary} fill={item.is_verified ? accent : 'none'} />
                              <Text style={{ color: item.is_verified ? accent : textSecondary, fontSize: 13, fontWeight: '700' }}>
                                {item.is_verified ? 'Verificado' : 'Verificar'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        {/* Manage Badges Inline Panel */}
                        {managingUserId === item.id && (
                          <View style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', padding: 15, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, marginBottom: 12, borderWidth: 1, borderTopWidth: 0, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                            <Text style={{ color: textPrimary, fontWeight: '700', marginBottom: 12, fontSize: 14 }}>🎖️ Atribuir Selos ({allBadges.length})</Text>
                            {loadingUserBadges ? (
                              <ActivityIndicator color={accent} style={{ marginVertical: 10 }} />
                            ) : (
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {allBadges.length === 0 ? (
                                  <Text style={{ color: textSecondary, fontSize: 13 }}>{t('auto.sa5d2e75a', 'Nenhum selo criado ainda. Vá à aba "Selos" para criar.')}</Text>
                                ) : (
                                  allBadges.map(badge => {
                                    const isActive = userBadges.has(badge.id);
                                    return (
                                      <TouchableOpacity
                                        key={badge.id}
                                        onPress={() => toggleUserBadge(badge.id)}
                                        style={{
                                          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20,
                                          borderWidth: 1.5,
                                          borderColor: isActive ? accent : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'),
                                          backgroundColor: isActive ? accent + '15' : 'transparent',
                                          gap: 6, minHeight: 42
                                        }}
                                      >
                                        <Text style={{ fontSize: 18 }}>{badge.icon}</Text>
                                        <Text style={{ color: isActive ? accent : textPrimary, fontSize: 13, fontWeight: isActive ? '800' : '500' }}>{badge.name}</Text>
                                      </TouchableOpacity>
                                    );
                                  })
                                )}
                              </View>
                            )}
                          </View>
                        )}
                      </View>

                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <UserSearch size={60} color={textSecondary} strokeWidth={1} />
                      <Text style={[styles.emptyText, { color: textPrimary }]}>{t('auto.s6d277ec2', 'Nenhum usuário encontrado')}</Text>
                      <Text style={[styles.emptySubtext, { color: textSecondary }]}>{t('auto.s843a23fc', 'Tente pesquisar por outro nome ou termo.')}</Text>
                    </View>
                  }
                />
              )}
            </View>
          )}

          {/* TAB 2: BADGES CONSOLE */}
          {activeTab === 'badges' && (
            <View style={{ flex: 1 }}>
              <View style={styles.catHeader}>
                <Text style={[styles.catSectionTitle, { color: textPrimary }]}>Selos Cadastrados ({allBadges.length})</Text>
                <TouchableOpacity 
                  style={[styles.addCatBtn, { backgroundColor: accent }]}
                  onPress={() => {
                    setEditingBadge(null);
                    setBadgeName('');
                    setBadgeDesc('');
                    setBadgeIcon('✨');
                    setBadgeCategory('social');
                    setShowBadgeForm(true);
                  }}
                >
                  <Text style={styles.addCatBtnText}>{t('auto.s5841cb58', '+ Novo Selo')}</Text>
                </TouchableOpacity>
              </View>

              {/* DYNAMIC EDIT/CREATE OVERLAY CARD */}
              {showBadgeForm && (
                <View style={[styles.catFormCard, { backgroundColor: backgroundSecondary, borderColor: accent + '33' }]}>
                  <Text style={[styles.formTitle, { color: textPrimary }]}>
                    {editingBadge ? '✏️ Editar Selo' : '🎖️ Novo Selo'}
                  </Text>
                  
                  <View style={styles.formRow}>
                    <TextInput 
                      style={[styles.formInput, { color: textPrimary, flex: 2 }]} 
                      placeholder={t('auto.se0c52dbe', 'Nome do Selo (ex: Rei do Rolê)')}
                      placeholderTextColor={textSecondary}
                      value={badgeName}
                      onChangeText={setBadgeName}
                    />
                    <TextInput 
                      style={[styles.formInput, { color: textPrimary, flex: 1, textAlign: 'center' }]} 
                      placeholder={t('auto.s68305e25', 'Emoji')}
                      placeholderTextColor={textSecondary}
                      value={badgeIcon}
                      onChangeText={setBadgeIcon}
                    />
                  </View>
                  
                  <TextInput 
                    style={[styles.formInput, { color: textPrimary, marginTop: 10 }]} 
                    placeholder={t('auto.s940fc7a4', 'Descrição breve...')}
                    placeholderTextColor={textSecondary}
                    value={badgeDesc}
                    onChangeText={setBadgeDesc}
                  />

                  <View style={styles.formActions}>
                    <TouchableOpacity 
                      style={[styles.formCancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]} 
                      onPress={() => { setShowBadgeForm(false); setEditingBadge(null); }}
                    >
                      <Text style={[styles.formActionText, { color: textSecondary }]}>{t('auto.s847607d7', 'Cancelar')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.formSaveBtn, { backgroundColor: accent }]} 
                      onPress={handleSaveBadge}
                    >
                      <Text style={[styles.formActionText, { color: '#fff' }]}>{t('auto.s5adb6496', 'Salvar Selo')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {loadingBadges ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color={accent} />
                  <Text style={[styles.loaderText, { color: textSecondary }]}>{t('auto.s5f188ae0', 'Carregando selos...')}</Text>
                </View>
              ) : (
                <FlatList
                  data={allBadges}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={[styles.catCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={[styles.catIconBg, { backgroundColor: accent + '22', width: 48, height: 48, borderRadius: 24 }]}>
                        <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.catName, { color: textPrimary }]}>{item.name}</Text>
                        <Text style={[styles.catSubtext, { color: textSecondary }]}>{item.description || 'Sem descrição'}</Text>
                      </View>
                      
                      {/* Edit / Delete Buttons */}
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity 
                          onPress={() => {
                            setEditingBadge(item);
                            setBadgeName(item.name);
                            setBadgeDesc(item.description || '');
                            setBadgeIcon(item.icon);
                            setBadgeCategory(item.category || 'social');
                            setShowBadgeForm(true);
                          }}
                          style={[styles.actionIconBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                        >
                          <Text style={{ fontSize: 13 }}>{t('auto.s94c3103e', '✏️')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => handleDeleteBadge(item.id)}
                          style={[styles.actionIconBtn, { backgroundColor: 'rgba(255,59,48,0.1)' }]}
                        >
                          <Text style={{ fontSize: 13 }}>❌</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyText, { color: textPrimary }]}>{t('auto.sec0f26c8', 'Nenhum selo criado')}</Text>
                    </View>
                  }
                />
              )}
            </View>
          )}

          {/* TAB 3: CATEGORY & SUBCATEGORY CONSOLE */}
          {activeTab === 'categories' && (
            <View style={{ flex: 1 }}>
              <View style={styles.catHeader}>
                <Text style={[styles.catSectionTitle, { color: textPrimary }]}>Categorias do App ({categories.length})</Text>
                <TouchableOpacity 
                  style={[styles.addCatBtn, { backgroundColor: accent }]}
                  onPress={() => {
                    setEditingCategory(null);
                    setCatName('');
                    setCatIcon('✨');
                    setCatOrder((categories.length + 1).toString());
                    setCatColor('#00d9ff');
                    setShowCategoryForm(true);
                  }}
                >
                  <Text style={styles.addCatBtnText}>{t('auto.s5bb63ed1', '+ Nova Categoria')}</Text>
                </TouchableOpacity>
              </View>

              {/* DYNAMIC EDIT/CREATE OVERLAY CARD */}
              {showCategoryForm && (
                <View style={[styles.catFormCard, { backgroundColor: backgroundSecondary, borderColor: accent + '33' }]}>
                  <Text style={[styles.formTitle, { color: textPrimary }]}>
                    {editingCategory ? '✏️ Editar Categoria' : '✨ Nova Categoria'}
                  </Text>
                  
                  <View style={styles.formRow}>
                    <TextInput 
                      style={[styles.formInput, { color: textPrimary, flex: 2 }]} 
                      placeholder={t('auto.s331c4fa2', 'Nome da Categoria (ex: Teatro)')}
                      placeholderTextColor={textSecondary}
                      value={catName}
                      onChangeText={setCatName}
                    />
                    <TextInput 
                      style={[styles.formInput, { color: textPrimary, flex: 1, textAlign: 'center' }]} 
                      placeholder={t('auto.sf41940b4', 'Emoji (ex: 🎭)')}
                      placeholderTextColor={textSecondary}
                      value={catIcon}
                      onChangeText={setCatIcon}
                    />
                    <TextInput 
                      style={[styles.formInput, { color: textPrimary, flex: 0.8, textAlign: 'center' }]} 
                      placeholder={t('auto.saad2aa39', 'Ordem')}
                      placeholderTextColor={textSecondary}
                      value={catOrder}
                      onChangeText={order => setCatOrder(order.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  {/* PRESET COLOR SELECTOR */}
                  <View style={styles.colorSelectorContainer}>
                    <Text style={[styles.colorLabel, { color: textSecondary }]}>{t('auto.sef2c3fad', 'Cor Temática da Categoria:')}</Text>
                    <View style={styles.colorsRow}>
                      {PRESET_COLORS.map(color => {
                        const isSelected = catColor === color;
                        return (
                          <TouchableOpacity
                            key={color}
                            onPress={() => setCatColor(color)}
                            style={[
                              styles.colorCircle,
                              { backgroundColor: color },
                              isSelected && [styles.colorCircleSelected, { borderColor: textPrimary }]
                            ]}
                          >
                            {isSelected && (
                              <View style={styles.colorCircleInner} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  
                  <View style={styles.formActions}>
                    <TouchableOpacity 
                      style={[styles.formCancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]} 
                      onPress={() => { setShowCategoryForm(false); setEditingCategory(null); }}
                    >
                      <Text style={[styles.formActionText, { color: textSecondary }]}>{t('auto.s847607d7', 'Cancelar')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.formSaveBtn, { backgroundColor: accent }]} 
                      onPress={handleSaveCategory}
                    >
                      <Text style={[styles.formActionText, { color: '#fff' }]}>{t('auto.seb7a0fed', 'Salvar')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {loadingCategories ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color={accent} />
                  <Text style={[styles.loaderText, { color: textSecondary }]}>Carregando categorias...</Text>
                </View>
              ) : (
                <FlatList
                  data={categories}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const isExpanded = expandedCategoryIds.includes(item.id);
                    return (
                      <View style={[styles.catCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <View style={styles.catMainInfo}>
                          <View style={[styles.catIconBg, { backgroundColor: (item.color || accent) + '22' }]}>
                            <Text style={styles.catIconText}>{item.icon || '✨'}</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={[styles.catName, { color: textPrimary }]}>{item.name}</Text>
                              <View style={[styles.orderBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                                <Text style={[styles.orderText, { color: textSecondary }]}>Ordem #{item.order}</Text>
                              </View>
                            </View>
                            <Text style={[styles.catSubtext, { color: textSecondary }]}>
                              {item.subcategories?.length || 0} subcategorias cadastradas
                            </Text>
                          </View>
                          
                          {/* Edit / Delete Buttons */}
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity 
                              onPress={() => {
                                setEditingCategory(item);
                                setCatName(item.name);
                                setCatIcon(item.icon);
                                setCatOrder(item.order.toString());
                                setCatColor(item.color || '#00d9ff');
                                setShowCategoryForm(true);
                              }}
                              style={[styles.actionIconBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                            >
                              <Text style={{ fontSize: 13 }}>{t('auto.s94c3103e', '✏️')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => handleDeleteCategory(item.id)}
                              style={[styles.actionIconBtn, { backgroundColor: 'rgba(255,59,48,0.1)' }]}
                            >
                              <Text style={{ fontSize: 13 }}>❌</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        {/* Collapsible Subcategories Trigger */}
                        <TouchableOpacity 
                          style={[styles.expandBtn, { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                          onPress={() => {
                            if (isExpanded) {
                              setExpandedCategoryIds(prev => prev.filter(id => id !== item.id));
                            } else {
                              setExpandedCategoryIds(prev => [...prev, item.id]);
                            }
                          }}
                        >
                          <Text style={[styles.expandText, { color: accent }]}>
                            {isExpanded ? '▲ Ocultar Subcategorias' : '▼ Gerenciar Subcategorias'}
                          </Text>
                        </TouchableOpacity>
                        
                        {isExpanded && (
                          <View style={styles.subsContainer}>
                            {/* List subcategories */}
                            <View style={styles.subsList}>
                              {(item.subcategories || []).map((sub: any) => (
                                <View key={sub.id} style={[styles.subBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sub.color || item.color || accent, marginRight: 6 }} />
                                  <Text style={[styles.subBadgeText, { color: textPrimary }]}>{sub.name}</Text>
                                  <TouchableOpacity onPress={() => handleDeleteSubcategory(sub.id)} style={styles.deleteSubBtn}>
                                    <Text style={{ color: '#FF3B30', fontSize: 10, fontWeight: '900', marginLeft: 4 }}>✕</Text>
                                  </TouchableOpacity>
                                </View>
                              ))}
                              {(!item.subcategories || item.subcategories.length === 0) && (
                                <Text style={[styles.emptySubsText, { color: textSecondary }]}>{t('auto.s294a4f21', 'Nenhuma subcategoria ainda.')}</Text>
                              )}
                            </View>
                            
                            {/* Fast subcategory adder */}
                            <View style={styles.addSubWrapper}>
                              <TextInput 
                                style={[styles.addSubInput, { color: textPrimary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} 
                                placeholder={t('auto.s1feae47d', 'Nova subcategoria (ex: Stand Up)...')}
                                placeholderTextColor={textSecondary}
                                value={newSubcategoryNames[item.id] || ''}
                                onChangeText={text => setNewSubcategoryNames(prev => ({ ...prev, [item.id]: text }))}
                              />
                              <TouchableOpacity 
                                style={[styles.addSubBtnSubmit, { backgroundColor: accent }]}
                                onPress={() => handleAddSubcategory(item.id)}
                              >
                                <Text style={styles.addSubBtnText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  }}
                />
              )}
            </View>
          )}

          {/* TAB 3: NOTIFICATIONS TEMPLATES */}
          {activeTab === 'notifications' && (
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
              <View style={{ marginVertical: 15 }}>
                <Text style={[styles.catSectionTitle, { color: textPrimary }]}>{t('auto.sce465e0f', 'Mensagens Automáticas')}</Text>
                <Text style={{ color: textSecondary, fontSize: 13, marginTop: 4 }}>
                  Personalize os textos que o app dispara sozinho. Você pode usar tags como [NOME], [EVENTO], [CATEGORIA] e [DIA_SEMANA].
                </Text>
              </View>

              {/* DYNAMIC EDIT TEMPLATE OVERLAY CARD */}
              {editingTemplate && (
                <View style={[styles.catFormCard, { backgroundColor: backgroundSecondary, borderColor: accent + '33', marginBottom: 20 }]}>
                  <Text style={[styles.formTitle, { color: textPrimary }]}>
                    ✏️ Editando: {editingTemplate.id === 'event_presence' ? 'Presença no seu Evento' : editingTemplate.id === 'event_friend_presence' ? 'Amigo vai ao Evento' : editingTemplate.id === 'smart_recommendation' ? 'Recomendação de Fim de Semana' : editingTemplate.id}
                  </Text>
                  
                  <View style={{ gap: 10, marginTop: 10 }}>
                    <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700' }}>{t('auto.sad5bedca', 'TÍTULO DA NOTIFICAÇÃO')}</Text>
                    <TextInput 
                      style={[styles.formInput, { color: textPrimary, paddingVertical: 12 }]} 
                      placeholder={t('auto.sae5a9284', 'Ex: Nova presença confirmada!')}
                      placeholderTextColor={textSecondary}
                      value={templateTitle}
                      onChangeText={setTemplateTitle}
                    />
                    
                    <Text style={{ color: textSecondary, fontSize: 12, fontWeight: '700', marginTop: 10 }}>{t('auto.s97553041', 'MENSAGEM (CORPO)')}</Text>
                    <TextInput 
                      style={[styles.formInput, { color: textPrimary, minHeight: 80, textAlignVertical: 'top' }]} 
                      placeholder={t('auto.s346f77dd', 'Ex: Ei [NOME], partiu [EVENTO]?')}
                      placeholderTextColor={textSecondary}
                      value={templateBody}
                      onChangeText={setTemplateBody}
                      multiline
                    />
                  </View>
                  
                  <View style={[styles.formActions, { marginTop: 20 }]}>
                    <TouchableOpacity 
                      style={[styles.formCancelBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]} 
                      onPress={() => setEditingTemplate(null)}
                    >
                      <Text style={[styles.formActionText, { color: textSecondary }]}>{t('auto.s847607d7', 'Cancelar')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.formSaveBtn, { backgroundColor: accent }]} 
                      onPress={handleSaveTemplate}
                    >
                      <Text style={[styles.formActionText, { color: '#fff' }]}>{t('auto.s326057a0', 'Salvar Texto')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {loadingTemplates ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color={accent} />
                  <Text style={[styles.loaderText, { color: textSecondary }]}>{t('auto.s923b5fe9', 'Carregando mensagens...')}</Text>
                </View>
              ) : templates.length === 0 ? (
                <View style={styles.emptyContent}>
                  <Text style={[styles.emptyTitle, { color: textPrimary }]}>{t('auto.s2bf4173e', 'Tabela Não Encontrada')}</Text>
                  <Text style={[styles.emptySubtitle, { color: textSecondary, textAlign: 'center' }]}>
                    Por favor, rode o script SQL '20260522_notification_templates.sql' no Supabase primeiro.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={templates}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 50, gap: 12 }}
                  renderItem={({ item }) => (
                    <View style={[styles.catCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={[styles.catName, { color: textPrimary, fontSize: 16 }]}>
                          {item.id === 'event_presence' ? '🎉 Presença no seu Evento' : item.id === 'event_friend_presence' ? '👀 Amigo vai ao Evento (FOMO)' : item.id === 'smart_recommendation' ? '🔥 Recomendação Semanal' : item.id}
                        </Text>
                        <Text style={{ color: textSecondary, fontSize: 13, marginTop: 8, fontWeight: '700' }}>{t('auto.sa16ead69', 'Título Atual:')}</Text>
                        <Text style={{ color: textPrimary, fontSize: 14 }}>{item.title_template}</Text>
                        <Text style={{ color: textSecondary, fontSize: 13, marginTop: 8, fontWeight: '700' }}>{t('auto.s4a66afe0', 'Mensagem Atual:')}</Text>
                        <Text style={{ color: textPrimary, fontSize: 14 }}>{item.body_template}</Text>
                      </View>
                      
                      <TouchableOpacity 
                        onPress={() => {
                          setEditingTemplate(item);
                          setTemplateTitle(item.title_template);
                          setTemplateBody(item.body_template);
                        }}
                        style={[styles.actionIconBtn, { backgroundColor: accent + '20', height: 44, width: 44, alignSelf: 'flex-start' }]}
                      >
                        <Text style={{ fontSize: 18 }}>{t('auto.s94c3103e', '✏️')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )}
            </View>
          )}

          {feedback && (
            <ActionFeedback
              visible={!!feedback}
              type={feedback.type}
              title={feedback.type === 'success' ? 'Sucesso!' : 'Erro'}
              message={feedback.message}
              onClose={() => setFeedback(null)}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  colorSelectorContainer: {
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  colorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  colorCircleSelected: {
    borderWidth: 2,
    transform: [{ scale: 1.15 }],
  },
  colorCircleInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  content: {
    height: '92%',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
  },
  indicator: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(150,150,150,0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 16,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: ms(18),
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: ms(12),
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: ms(14),
  },
  searchWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 15,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: ms(16),
    fontWeight: '500',
  },
  searchBtn: {
    paddingHorizontal: 20,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: ms(14),
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    borderWidth: 1,
  },
  userMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: ms(18),
    fontWeight: 'bold',
  },
  textContainer: {
    marginLeft: 15,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  userName: {
    fontSize: ms(15),
    fontWeight: '800',
    maxWidth: '85%',
  },
  userHandle: {
    fontSize: ms(13),
    marginTop: 2,
  },
  switchWrapper: {
    alignItems: 'center',
    marginLeft: 10,
  },
  switchLabel: {
    fontSize: ms(10),
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  loaderText: {
    marginTop: 15,
    fontSize: ms(14),
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: ms(18),
    fontWeight: '900',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: ms(14),
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  
  // Category management styles
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  catSectionTitle: {
    fontSize: ms(15),
    fontWeight: '800',
  },
  addCatBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCatBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: ms(13),
  },
  catFormCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  formTitle: {
    fontSize: ms(14),
    fontWeight: '800',
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: ms(13),
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  formCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  formSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  formActionText: {
    fontSize: ms(13),
    fontWeight: '700',
  },
  catCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  catMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  catIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catIconText: {
    fontSize: 20,
  },
  catName: {
    fontSize: ms(15),
    fontWeight: '800',
  },
  orderBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderText: {
    fontSize: ms(10),
    fontWeight: '800',
  },
  catSubtext: {
    fontSize: ms(12),
    marginTop: 2,
    fontWeight: '500',
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  expandText: {
    fontSize: ms(12),
    fontWeight: '700',
  },
  subsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  subsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 8,
  },
  subBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  subBadgeText: {
    fontSize: ms(12),
    fontWeight: '600',
  },
  deleteSubBtn: {
    marginLeft: 4,
    padding: 2,
  },
  emptySubsText: {
    fontSize: ms(12),
    fontStyle: 'italic',
    fontWeight: '500',
  },
  addSubWrapper: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  addSubInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: ms(12),
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  addSubBtnSubmit: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSubBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  emptyTitle: {
    fontSize: ms(18),
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: ms(14),
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '500',
  },
});
