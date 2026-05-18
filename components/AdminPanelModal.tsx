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
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, accent, isDark } = useTheme();
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'verification' | 'categories'>('verification');

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

  // Load initial data
  useEffect(() => {
    if (visible) {
      if (activeTab === 'verification' && users.length === 0) {
        searchUsers('');
      } else if (activeTab === 'categories') {
        loadCategories();
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

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !currentStatus } : u));
      setFeedback({ type: 'success', message: 'Selo atualizado com sucesso!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro: ' + err.message });
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
                <Text style={[styles.title, { color: textPrimary }]}>Painel Administrativo</Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>Controle geral do UNNA Social</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <X size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>

          {/* GLASS SEGMENTED TAB SELECTOR */}
          <View style={[styles.tabBar, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'verification' && { borderBottomColor: accent }]}
              onPress={() => setActiveTab('verification')}
            >
              <Text style={[styles.tabText, { color: activeTab === 'verification' ? textPrimary : textSecondary, fontWeight: activeTab === 'verification' ? '800' : '500' }]}>
                Verificações
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
          </View>

          {/* TAB 1: USER VERIFICATIONS */}
          {activeTab === 'verification' && (
            <View style={{ flex: 1 }}>
              <View style={styles.searchWrapper}>
                <View style={[styles.searchBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                  <Search size={20} color={textSecondary} />
                  <TextInput
                    style={[styles.input, { color: textPrimary }]}
                    placeholder="Nome ou @username..."
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
                  <Text style={styles.searchBtnText}>Buscar</Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color={accent} />
                  <Text style={[styles.loaderText, { color: textSecondary }]}>Buscando usuários...</Text>
                </View>
              ) : (
                <FlatList
                  data={users}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={[styles.userCard, { backgroundColor: backgroundSecondary, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
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
                        <View style={styles.textContainer}>
                          <View style={styles.nameRow}>
                            <Text style={[styles.userName, { color: textPrimary }]} numberOfLines={1}>{item.full_name}</Text>
                            {item.is_verified && <Sparkles size={14} color={accent} fill={accent} />}
                          </View>
                          <Text style={[styles.userHandle, { color: textSecondary }]}>@{item.username}</Text>
                        </View>
                      </View>
                      
                      <View style={styles.switchWrapper}>
                        <Text style={[styles.switchLabel, { color: item.is_verified ? accent : textSecondary }]}>
                          {item.is_verified ? 'Verificado' : 'Oferecer'}
                        </Text>
                        <Switch
                          value={item.is_verified}
                          onValueChange={() => toggleVerification(item.id, item.is_verified)}
                          trackColor={{ false: '#767577', true: accent }}
                          thumbColor={Platform.OS === 'android' ? (item.is_verified ? '#fff' : '#f4f3f4') : ''}
                        />
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <UserSearch size={60} color={textSecondary} strokeWidth={1} />
                      <Text style={[styles.emptyText, { color: textPrimary }]}>Nenhum usuário encontrado</Text>
                      <Text style={[styles.emptySubtext, { color: textSecondary }]}>Tente pesquisar por outro nome ou termo.</Text>
                    </View>
                  }
                />
              )}
            </View>
          )}

          {/* TAB 2: CATEGORY & SUBCATEGORY CONSOLE */}
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
                  <Text style={styles.addCatBtnText}>+ Nova Categoria</Text>
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
                      placeholder="Nome da Categoria (ex: Teatro)"
                      placeholderTextColor={textSecondary}
                      value={catName}
                      onChangeText={setCatName}
                    />
                    <TextInput 
                      style={[styles.formInput, { color: textPrimary, flex: 1, textAlign: 'center' }]} 
                      placeholder="Emoji (ex: 🎭)"
                      placeholderTextColor={textSecondary}
                      value={catIcon}
                      onChangeText={setCatIcon}
                    />
                    <TextInput 
                      style={[styles.formInput, { color: textPrimary, flex: 0.8, textAlign: 'center' }]} 
                      placeholder="Ordem"
                      placeholderTextColor={textSecondary}
                      value={catOrder}
                      onChangeText={order => setCatOrder(order.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  {/* PRESET COLOR SELECTOR */}
                  <View style={styles.colorSelectorContainer}>
                    <Text style={[styles.colorLabel, { color: textSecondary }]}>Cor Temática da Categoria:</Text>
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
                      <Text style={[styles.formActionText, { color: textSecondary }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.formSaveBtn, { backgroundColor: accent }]} 
                      onPress={handleSaveCategory}
                    >
                      <Text style={[styles.formActionText, { color: '#fff' }]}>Salvar</Text>
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
                              <Text style={{ fontSize: 13 }}>✏️</Text>
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
                                <Text style={[styles.emptySubsText, { color: textSecondary }]}>Nenhuma subcategoria ainda.</Text>
                              )}
                            </View>
                            
                            {/* Fast subcategory adder */}
                            <View style={styles.addSubWrapper}>
                              <TextInput 
                                style={[styles.addSubInput, { color: textPrimary, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} 
                                placeholder="Nova subcategoria (ex: Stand Up)..."
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
});
