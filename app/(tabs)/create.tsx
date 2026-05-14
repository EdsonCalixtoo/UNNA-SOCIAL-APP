import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Switch, 
  ActivityIndicator, 
  Alert, 
  Image, 
  Platform, 
  KeyboardAvoidingView,
  Dimensions,
  Pressable,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '@/utils/responsive';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Category, Subcategory } from '@/types/database';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  Camera, 
  ArrowRight, 
  ArrowLeft, 
  X,
  Plus,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  Search,
  Flag,
  Check
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uploadFile } from '@/lib/storage';
import { processMedia } from '@/lib/mediaOptimizer';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import StoryCameraModal from '@/components/StoryCameraModal';
import StoryAdvancedEditor from '@/components/StoryAdvancedEditor';
import Animated, { 
  FadeInRight, 
  FadeOutLeft, 
  Layout, 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';

import SuccessModal from '@/components/SuccessModal';
import { useTheme } from '@/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  { id: 'type', title: 'O que criar?', subtitle: 'Escolha o tipo de conteúdo' },
  { id: 'media', title: 'A identidade', subtitle: 'Escolha uma capa impactante' },
  { id: 'details', title: 'O que é?', subtitle: 'Dê um nome e descreva' },
  { id: 'logistics', title: 'Onde e quando?', subtitle: 'Defina o local e horário' },
  { id: 'settings', title: 'Regras', subtitle: 'Preços e limites' },
  { id: 'review', title: 'Revisão', subtitle: 'Confira se tudo está perfeito' }
];

export default function CreateEvent() {
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [contentType, setContentType] = useState<'event' | 'publication'>('event');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaFiles, setMediaFiles] = useState<{ uri: string; type: 'image' | 'video' }[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState(() => `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`);
  const [locationName, setLocationName] = useState('');
  const [locationNumber, setLocationNumber] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [minAge, setMinAge] = useState('0');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [showSubcatModal, setShowSubcatModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [subcatSearch, setSubcatSearch] = useState('');
  const [catSearch, setCatSearch] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentStep(0);
    setTitle('');
    setDescription('');
    setMediaFiles([]);
    setCapturedMedia(null);
    setSelectedCategory('');
    setSelectedSubcategory('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventTime(`${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`);
    setLocationName('');
    setLocationNumber('');
    setLat(null);
    setLng(null);
    setIsPaid(false);
    setPrice('');
    setMinAge('0');
    setMaxParticipants('');
    setSubcatSearch('');
    setCatSearch('');
  };

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring((currentStep + 1) / STEPS.length, { damping: 15 });
  }, [currentStep]);

  useEffect(() => { loadCategories(); }, []);
  const loadCategories = async () => { const { data } = await supabase.from('categories').select('*').order('order'); if (data) setCategories(data); };
  const loadSubcategories = async (categoryId: string) => { const { data } = await supabase.from('subcategories').select('*').eq('category_id', categoryId).order('name'); if (data) setSubcategories(data); };
  useEffect(() => { if (selectedCategory) loadSubcategories(selectedCategory); }, [selectedCategory]);

  const handleCapture = (uri: string, type: 'image' | 'video') => { 
    setCapturedMedia({ uri, type }); 
    setShowCamera(false); 
    setShowEditor(true); 
  };
  
  const handleSaveEditor = (finalUri: string) => { 
    if (capturedMedia) {
      setMediaFiles(prev => [...prev, { uri: finalUri, type: capturedMedia.type }]);
    }
    setShowEditor(false); 
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const nextStep = () => {
    if (currentStep === 0) {
      // Step Type Selection - No validation needed
    }
    if (currentStep === 1 && mediaFiles.length === 0) return Alert.alert('Atenção', 'Escolha pelo menos uma imagem ou vídeo.');
    if (currentStep === 2 && (!title || !selectedCategory)) return Alert.alert('Atenção', 'Dê um título e escolha uma categoria.');
    
    if (contentType === 'publication') {
      if (currentStep === 2) {
        // Skip Logistics and Settings for publications
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCurrentStep(5); // Jump to Review
        return;
      }
    } else {
      if (currentStep === 3 && !locationName) return Alert.alert('Atenção', 'Defina um local para o evento.');
    }
    
    if (currentStep < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (contentType === 'publication' && currentStep === 5) {
      setCurrentStep(2);
      return;
    }
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(currentStep - 1);
    } else {
      router.push('/(tabs)');
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    if (mediaFiles.length === 0) return Alert.alert('Erro', 'Adicione pelo menos uma mídia.');
    
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const uploadedUrls: string[] = [];
      const mediaTypes: ('image' | 'video')[] = [];

      for (const media of mediaFiles) {
        console.log(`🚀 Otimizando mídia antes do upload: ${media.type}`);
        const optimizedMedia = await processMedia(media.uri, media.type);
        
        const storagePath = `events/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${optimizedMedia.extension}`;
        
        console.log('🚀 Iniciando upload para R2:', storagePath);
        
        const publicUrl = await uploadFile(
          optimizedMedia.uri,
          storagePath,
          optimizedMedia.contentType
        );

        if (!publicUrl) throw new Error('Falha no upload para o R2');
        
        uploadedUrls.push(publicUrl);
        mediaTypes.push(optimizedMedia.type);
      }
      
      console.log('✅ Todos uploads concluídos com sucesso!');

      const { data: eventData, error } = await supabase.from('events').insert({
        creator_id: user.id, 
        title, 
        description, 
        type: contentType,
        image_url: uploadedUrls[0], // Capa principal
        image_urls: uploadedUrls, // Todas as mídias
        media_type: mediaTypes[0], // Tipo da capa
        media_types: mediaTypes, // Todos os tipos
        event_date: contentType === 'event' ? eventDate : null, 
        event_time: contentType === 'event' ? eventTime : null, 
        location_name: locationName ? (locationNumber ? `${locationName}, ${locationNumber}` : locationName) : null,
        is_paid: isPaid, 
        price: parseFloat(price) || 0, 
        min_age: parseInt(minAge) || 0, 
        max_participants: parseInt(maxParticipants) || 0,
        category_id: selectedCategory, 
        subcategory_id: selectedSubcategory || null,
        latitude: lat,
        longitude: lng,
        status: 'ao_vivo'
      }).select().single();

      if (error) throw error;

      // IMPORTANTE: Criar um POST para esse evento aparecer no Feed
      console.log('📝 Tentando criar post no feed para o evento:', eventData.id);
      const { error: postError } = await supabase.from('posts').insert({
        user_id: user.id,
        content: contentType === 'event' ? `Criei um novo evento: ${title}` : `Publiquei algo novo: ${title}`,
        event_id: eventData.id,
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls
      });

      if (postError) {
        console.error('❌ Erro ao criar post no feed:', postError);
      } else {
        console.log('✅ Post do feed criado com sucesso!');
      }

      setCreatedEventId(eventData.id);
      setShowSuccessModal(true);
    } catch (e: any) { 
      Alert.alert('Erro ao publicar', e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  // Components
  const StepHeader = () => (
    <View style={[styles.stepHeader, { paddingTop: insets.top + vs(20), backgroundColor: backgroundPrimary }]}>
      <TouchableOpacity onPress={prevStep} style={[styles.backCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <ArrowLeft size={24} color={textPrimary} />
      </TouchableOpacity>
      
      <View style={styles.stepInfo}>
        <Text style={[styles.stepTitle, { color: textPrimary }]}>{STEPS[currentStep].title}</Text>
        <Text style={[styles.stepSubtitle, { color: textSecondary }]}>{STEPS[currentStep].subtitle}</Text>
      </View>

      <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <Animated.View style={[styles.progressBarFill, { width: `${((currentStep + 1) / STEPS.length) * 100}%`, backgroundColor: accent }]} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <LinearGradient colors={isDark ? ['#050505', '#101018'] : ['#f5f5f7', '#ffffff']} style={StyleSheet.absoluteFill} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + vs(100) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          <StepHeader />
          
          {currentStep === 0 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={styles.typeSelectionGrid}>
                <TouchableOpacity 
                  activeOpacity={0.9} 
                  style={[styles.typeCard, contentType === 'event' && { borderColor: accent, backgroundColor: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.08)' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setContentType('event');
                  }}
                >
                  <LinearGradient colors={['#00d9ff', '#0055ff']} style={styles.typeIconBg}>
                    <Calendar size={32} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.typeTitle, { color: textPrimary }]}>Evento</Text>
                  <Text style={[styles.typeDesc, { color: textSecondary }]}>Tem data, hora e local marcados. Ideal para festas, encontros e treinos.</Text>
                  {contentType === 'event' && <View style={[styles.checkCircle, { backgroundColor: accent }]}><Check size={14} color="#fff" strokeWidth={4} /></View>}
                </TouchableOpacity>

                <TouchableOpacity 
                  activeOpacity={0.9} 
                  style={[styles.typeCard, contentType === 'publication' && { borderColor: '#ff1493', backgroundColor: 'rgba(255, 20, 147, 0.05)' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setContentType('publication');
                  }}
                >
                  <LinearGradient colors={['#ff1493', '#ff0055']} style={styles.typeIconBg}>
                    <Flag size={32} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.typeTitle, { color: textPrimary }]}>Publicação</Text>
                  <Text style={[styles.typeDesc, { color: textSecondary }]}>Sem data fixa. Ideal para doações, avisos, anúncios ou compartilhamento geral.</Text>
                  {contentType === 'publication' && <View style={[styles.checkCircle, { backgroundColor: '#ff1493' }]}><Check size={14} color="#fff" strokeWidth={4} /></View>}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
          
          {currentStep === 1 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={styles.mediaGrid}>
                {mediaFiles.map((media, index) => (
                  <View key={index} style={[styles.mediaItem, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    {media.type === 'video' ? (
                      <Video source={{ uri: media.uri }} style={styles.mediaPreview} resizeMode={ResizeMode.COVER} isLooping shouldPlay isMuted />
                    ) : (
                      <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
                    )}
                    <TouchableOpacity 
                      style={styles.removeMediaBtn} 
                      onPress={() => removeMedia(index)}
                    >
                      <X size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                
                {mediaFiles.length < 5 && (
                  <TouchableOpacity 
                    activeOpacity={0.9} 
                    style={[styles.mediaPickerSmall, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
                    onPress={() => setShowCamera(true)}
                  >
                    <LinearGradient colors={isDark ? ['#1a1a25', '#0a0a0f'] : ['#ffffff', '#f0f0f0']} style={styles.mediaPlaceholderSmall}>
                      <Camera size={30} color={accent} />
                      <Text style={[styles.placeholderSmallText, { color: textPrimary }]}>Adicionar</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
              
              {mediaFiles.length === 0 && (
                <View style={styles.emptyMediaInfo}>
                  <Info size={20} color={accent} />
                  <Text style={[styles.emptyMediaText, { color: textSecondary }]}>
                    Adicione até 5 fotos ou vídeos para destacar seu evento.
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {currentStep === 2 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: accent }]}>NOME DO EVENTO</Text>
                <TextInput 
                  style={[styles.hugeInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textPrimary }]}
                  placeholder="Seu evento aqui..."
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                  value={title}
                  onChangeText={setTitle}
                  autoFocus
                />
              </View>

              <View style={styles.categorySection}>
                <Text style={[styles.label, { color: accent }]}>CATEGORIA</Text>
                <TouchableOpacity 
                  style={[styles.selectorButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }, selectedCategory && [styles.selectorButtonActive, { borderColor: accent, backgroundColor: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.08)' }]]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowCatModal(true);
                  }}
                >
                  <View style={styles.selectorInfo}>
                    <Layers size={20} color={selectedCategory ? accent : textSecondary} />
                    <Text style={[styles.selectorText, { color: textSecondary }, selectedCategory && [styles.selectorTextActive, { color: textPrimary }]]}>
                      {selectedCategory 
                        ? categories.find(c => c.id === selectedCategory)?.name 
                        : 'Escolher categoria...'}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={textSecondary} />
                </TouchableOpacity>
              </View>
              {selectedCategory && (
                <View style={styles.categorySection}>
                  <Text style={[styles.label, { color: accent }]}>SUBCATEGORIA</Text>
                  <TouchableOpacity 
                    style={[styles.selectorButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }, selectedSubcategory && [styles.selectorButtonActive, { borderColor: accent, backgroundColor: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.08)' }]]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowSubcatModal(true);
                    }}
                  >
                    <View style={styles.selectorInfo}>
                      <Plus size={20} color={selectedSubcategory ? accent : textSecondary} />
                      <Text style={[styles.selectorText, { color: textSecondary }, selectedSubcategory && [styles.selectorTextActive, { color: textPrimary }]]}>
                        {selectedSubcategory 
                          ? subcategories.find(s => s.id === selectedSubcategory)?.name 
                          : 'Escolher subcategoria...'}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={textSecondary} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: accent }]}>DESCRIÇÃO</Text>
                <TextInput 
                  style={[styles.textArea, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textPrimary }]}
                  placeholder="Conte os detalhes..."
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>
            </Animated.View>
          )}

          {currentStep === 3 && (
            <Animated.View entering={FadeInRight} style={[styles.stepContainer, { zIndex: 10 }]}>
              <View style={[styles.inputGroup, { zIndex: 100 }]}>
                <Text style={[styles.label, { color: accent }]}>LOCALIZAÇÃO</Text>
                <GooglePlacesAutocomplete
                  placeholder="Onde será o encontro?"
                  onPress={(data, details = null) => {
                    setLocationName(data.structured_formatting?.main_text || data.description || '');
                    if (details?.geometry?.location) {
                      setLat(details.geometry.location.lat);
                      setLng(details.geometry.location.lng);
                    }
                  }}
                  fetchDetails={true}
                  query={{ key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY, language: 'pt-BR' }}
                  styles={{
                    container: { flex: 0, zIndex: 100 },
                    textInputContainer: {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      height: 60,
                    },
                    textInput: {
                      backgroundColor: 'transparent',
                      color: textPrimary,
                      fontSize: 16,
                      flex: 1,
                      height: '100%',
                      paddingRight: 16,
                      paddingLeft: 4, // Compensation since MapPin gives padding
                    },
                    listView: {
                      position: 'absolute',
                      top: 68, // Flutua abaixo do input
                      left: 0,
                      right: 0,
                      backgroundColor: isDark ? '#1a1a24' : '#ffffff',
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      elevation: 10,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.3,
                      shadowRadius: 20,
                      maxHeight: 280, // Limita altura com scroll suave
                      zIndex: 1000,
                    },
                    row: {
                      paddingHorizontal: 20,
                      paddingVertical: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      minHeight: 70,
                      backgroundColor: 'transparent',
                    },
                    separator: {
                      height: 1,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                      marginLeft: 64, // Alinha com o texto, ignorando o ícone
                      marginRight: 20,
                    },
                  }}
                  renderLeftButton={() => (
                    <View style={{ justifyContent: 'center', paddingLeft: 18, paddingRight: 8 }}>
                      <MapPin size={22} color={accent} />
                    </View>
                  )}
                  renderRow={(data) => {
                    const mainText = data.structured_formatting?.main_text || data.description;
                    const secondaryText = data.structured_formatting?.secondary_text || '';
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center', marginRight: 16 }}>
                          <MapPin size={18} color={textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '700', marginBottom: secondaryText ? 4 : 0 }}>
                            {mainText}
                          </Text>
                          {!!secondaryText && (
                            <Text style={{ color: textSecondary, fontSize: 14, lineHeight: 20 }} numberOfLines={2}>
                              {secondaryText}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  }}
                  enablePoweredByContainer={false}
                  textInputProps={{ 
                    placeholderTextColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', 
                    value: locationName, 
                    onChangeText: setLocationName 
                  }}
                  listUnderlayColor={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'}
                  disableScroll={false} // Ativa o scroll interno do dropdown limitando maxHeight
                />
              </View>

              {/* Novo Campo para Número e Complemento com PREVIEW */}
              <View style={[styles.inputGroup, { marginTop: 16, zIndex: 1 }]}>
                <Text style={[styles.label, { color: accent }]}>NÚMERO E COMPLEMENTO</Text>
                <TextInput 
                  style={[styles.hugeInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textPrimary, fontSize: 16, height: 60 }]}
                  placeholder="Ex: 123, Apto 42"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                  value={locationNumber}
                  onChangeText={setLocationNumber}
                />
                
                {/* PREVIEW DO ENDEREÇO FINAL */}
                {(locationName !== '' || locationNumber !== '') && (
                  <Animated.View entering={FadeInRight} style={{ marginTop: 16, padding: 20, backgroundColor: isDark ? 'rgba(0, 217, 255, 0.03)' : 'rgba(0, 217, 255, 0.05)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0, 217, 255, 0.15)', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 217, 255, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
                      <Check size={20} color="#00d9ff" strokeWidth={3} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#00d9ff', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 4 }}>ENDEREÇO FINAL</Text>
                      <Text style={{ color: textPrimary, fontSize: 15, fontWeight: '600', lineHeight: 22 }}>
                        {locationName}{locationNumber ? `, ${locationNumber}` : ''}
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </View>

              <View style={[styles.row, { marginTop: 24 }]}>
                <TouchableOpacity style={[styles.glassButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={() => setShowDatePicker(true)}>
                  <Calendar size={20} color="#ff1493" />
                  <View>
                    <Text style={[styles.glassLabel, { color: textSecondary }]}>DATA</Text>
                    <Text style={[styles.glassValue, { color: textPrimary }]}>{new Date(eventDate).toLocaleDateString('pt-BR')}</Text>
                  </View>
                </TouchableOpacity>
 
                <TouchableOpacity style={[styles.glassButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]} onPress={() => setShowTimePicker(true)}>
                  <Clock size={20} color={accent} />
                  <View>
                    <Text style={[styles.glassLabel, { color: textSecondary }]}>HORA</Text>
                    <Text style={[styles.glassValue, { color: textPrimary }]}>{eventTime}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {currentStep === 4 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={[styles.premiumCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <View>
                  <Text style={[styles.premiumTitle, { color: textPrimary }]}>Evento Pago?</Text>
                  <Text style={[styles.premiumSub, { color: textSecondary }]}>Ative para cobrar ingressos</Text>
                </View>
                <Switch 
                  value={isPaid} 
                  onValueChange={setIsPaid} 
                  trackColor={{ false: isDark ? '#333' : '#ccc', true: accent }}
                  thumbColor={isPaid ? '#fff' : '#f4f3f4'}
                />
              </View>

              {isPaid && (
                <Animated.View entering={FadeInRight} style={[styles.priceBox, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.08)', borderColor: isDark ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 217, 255, 0.3)' }]}>
                  <Text style={[styles.priceSymbol, { color: accent }]}>R$</Text>
                  <TextInput 
                    style={[styles.priceInput, { color: textPrimary }]}
                    keyboardType="numeric"
                    placeholder="0,00"
                    placeholderTextColor={isDark ? '#444' : '#999'}
                    value={price}
                    onChangeText={setPrice}
                  />
                </Animated.View>
              )}

              <View style={styles.limitsRow}>
                <View style={[styles.limitBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <Users size={20} color={accent} />
                  <TextInput 
                    style={[styles.limitInput, { color: textPrimary }]}
                    placeholder="Limite"
                    placeholderTextColor={isDark ? '#444' : '#999'}
                    keyboardType="numeric"
                    value={maxParticipants}
                    onChangeText={setMaxParticipants}
                  />
                </View>
                <View style={[styles.limitBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                  <Info size={20} color="#ff1493" />
                  <TextInput 
                    style={[styles.limitInput, { color: textPrimary }]}
                    placeholder="Idade"
                    placeholderTextColor={isDark ? '#444' : '#999'}
                    keyboardType="numeric"
                    value={minAge}
                    onChangeText={setMinAge}
                  />
                </View>
              </View>
            </Animated.View>
          )}

          {currentStep === 5 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={styles.reviewCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewMediaScroll}>
                  {mediaFiles.map((media, index) => (
                    <View key={index} style={styles.reviewMediaItem}>
                      {media.type === 'video' ? (
                        <Video 
                          source={{ uri: media.uri }} 
                          style={styles.reviewImage} 
                          resizeMode={ResizeMode.COVER} 
                          shouldPlay 
                          isLooping 
                          isMuted 
                        />
                      ) : (
                        <Image source={{ uri: media.uri }} style={styles.reviewImage} />
                      )}
                    </View>
                  ))}
                </ScrollView>
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFill} />
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewTag}>{categories.find(c => c.id === selectedCategory)?.name}</Text>
                  <Text style={styles.reviewMainTitle}>{title}</Text>
                  {contentType === 'event' ? (
                    <>
                      <View style={styles.reviewRow}>
                        <Calendar size={14} color="#fff" />
                        <Text style={styles.reviewText}>{new Date(eventDate).toLocaleDateString('pt-BR')} às {eventTime}</Text>
                      </View>
                      <View style={styles.reviewRow}>
                        <MapPin size={14} color="#fff" />
                        <Text style={styles.reviewText} numberOfLines={1}>{locationName}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.reviewRow}>
                      <Flag size={14} color="#fff" />
                      <Text style={styles.reviewText}>Publicação sem data fixa</Text>
                    </View>
                  )}
                </View>
              </View>
              
              <TouchableOpacity style={styles.publishButton} onPress={handleCreate} disabled={loading}>
                <LinearGradient colors={['#00d9ff', '#ff1493']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.publishGradient}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={[styles.publishText, { color: '#fff' }]}>PUBLICAR {contentType === 'event' ? 'EVENTO' : 'AGORA'}</Text>
                      <Sparkles size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Action Button Group */}
      {currentStep < 5 && (
        <View style={[styles.fabContainer, { bottom: insets.bottom + vs(20) }]}>
          <View style={styles.fabRow}>
            {currentStep > 0 ? (
              <TouchableOpacity 
                style={styles.fab} 
                onPress={prevStep}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#333', '#1a1a1a']} style={styles.fabGradient}>
                  <ArrowLeft size={28} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 64 }} /> // Espaçador para manter simetria
            )}
            
            <TouchableOpacity 
              style={styles.fab} 
              onPress={nextStep}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#00d9ff', '#0055ff']} style={styles.fabGradient}>
                <ArrowRight size={28} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modals */}
      <StoryCameraModal 
        visible={showCamera} 
        onClose={() => setShowCamera(false)} 
        onCapture={handleCapture}
        usageType="event"
      />
      {capturedMedia && (
        <StoryAdvancedEditor visible={showEditor} mediaUri={capturedMedia.uri} mediaType={capturedMedia.type} mode="event" onClose={() => setShowEditor(false)} onSave={handleSaveEditor} />
      )}
      <SuccessModal 
        visible={showSuccessModal} 
        onClose={() => { 
          setShowSuccessModal(false); 
          resetForm();
          router.push('/(tabs)'); 
        }} 
        onViewEvent={() => {
          setShowSuccessModal(false);
          resetForm();
          router.push({ pathname: '/event/[id]', params: { id: createdEventId || '' } } as any);
        }} 
        title="Evento Publicado!" 
      />

      {/* Modal de Categorias */}
      <Modal visible={showCatModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: backgroundPrimary }]}>
          <LinearGradient colors={isDark ? ['#050505', '#0f0f18'] : ['#f5f5f7', '#ffffff']} style={StyleSheet.absoluteFill} />
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>Categorias</Text>
            <TouchableOpacity onPress={() => setShowCatModal(false)} style={[styles.closeCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <X size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>
 
          <View style={[styles.modalSearchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Search size={20} color={textSecondary} />
            <TextInput 
              style={[styles.modalSearchInput, { color: textPrimary }]}
              placeholder="Buscar categoria..."
              placeholderTextColor={textSecondary}
              value={catSearch}
              onChangeText={setCatSearch}
              autoFocus
            />
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.subcatGrid}>
              {categories
                .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
                .map(cat => (
                  <TouchableOpacity 
                    key={cat.id}
                    style={[styles.subcatItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, selectedCategory === cat.id && [styles.subcatItemActive, { backgroundColor: accent, borderColor: accent }]]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedCategory(cat.id);
                      setSelectedSubcategory('');
                      setShowCatModal(false);
                      setCatSearch('');
                    }}
                  >
                    <Text style={styles.catIconSmall}>{cat.icon}</Text>
                    <Text style={[styles.subcatItemText, { color: textSecondary }, selectedCategory === cat.id && styles.subcatItemTextActive]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de Subcategorias com Busca */}
      <Modal visible={showSubcatModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: backgroundPrimary }]}>
          <LinearGradient colors={isDark ? ['#050505', '#0f0f18'] : ['#f5f5f7', '#ffffff']} style={StyleSheet.absoluteFill} />
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>Subcategorias</Text>
            <TouchableOpacity onPress={() => setShowSubcatModal(false)} style={[styles.closeCircle, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <X size={20} color={textPrimary} />
            </TouchableOpacity>
          </View>
 
          <View style={[styles.modalSearchContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Search size={20} color={textSecondary} />
            <TextInput 
              style={[styles.modalSearchInput, { color: textPrimary }]}
              placeholder="Buscar subcategoria..."
              placeholderTextColor={textSecondary}
              value={subcatSearch}
              onChangeText={setSubcatSearch}
              autoFocus
            />
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.subcatGrid}>
              {subcategories
                .filter(s => s.name.toLowerCase().includes(subcatSearch.toLowerCase()))
                .map(sub => (
                  <TouchableOpacity 
                    key={sub.id}
                    style={[styles.subcatItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, selectedSubcategory === sub.id && [styles.subcatItemActive, { backgroundColor: accent, borderColor: accent }]]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedSubcategory(sub.id);
                      setShowSubcatModal(false);
                      setSubcatSearch('');
                    }}
                  >
                    <Text style={[styles.subcatItemText, { color: textSecondary }, selectedSubcategory === sub.id && styles.subcatItemTextActive]}>
                      {sub.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Seletor de Data Premium */}
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.pickerModalContainer}>
          <TouchableOpacity 
            style={styles.pickerBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowDatePicker(false)} 
          />
          <Animated.View entering={FadeInRight} style={[styles.pickerSheet, { backgroundColor: backgroundSecondary }]}>
            <View style={styles.pickerIndicator} />
            <Text style={[styles.pickerTitle, { color: textPrimary }]}>Selecione a Data</Text>
            
            <View style={styles.pickerWrapper}>
              <DateTimePicker 
                value={new Date(eventDate)} 
                mode="date" 
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                themeVariant={isDark ? 'dark' : 'light'} 
                onChange={(e, d) => d && setEventDate(d.toISOString().split('T')[0])}
                minimumDate={new Date()}
              />
            </View>

            <TouchableOpacity 
              style={[styles.pickerDoneBtn, { backgroundColor: accent }]} 
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowDatePicker(false);
              }}
            >
              <Text style={styles.pickerDoneBtnText}>Confirmar Data</Text>
              <Check size={20} color="#000" strokeWidth={3} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Seletor de Hora Premium */}
      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={styles.pickerModalContainer}>
          <TouchableOpacity 
            style={styles.pickerBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowTimePicker(false)} 
          />
          <Animated.View entering={FadeInRight} style={[styles.pickerSheet, { backgroundColor: backgroundSecondary }]}>
            <View style={styles.pickerIndicator} />
            <Text style={[styles.pickerTitle, { color: textPrimary }]}>Selecione o Horário</Text>
            
            <View style={styles.pickerWrapper}>
              <DateTimePicker 
                value={new Date(`${eventDate}T${eventTime}`)} 
                mode="time" 
                display="spinner" 
                is24Hour 
                themeVariant={isDark ? 'dark' : 'light'} 
                onChange={(e, d) => d && setEventTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`)} 
              />
            </View>

            <TouchableOpacity 
              style={[styles.pickerDoneBtn, { backgroundColor: accent }]} 
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowTimePicker(false);
              }}
            >
              <Text style={styles.pickerDoneBtnText}>Confirmar Horário</Text>
              <Check size={20} color="#000" strokeWidth={3} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  scrollContent: {
    paddingHorizontal: s(24),
    paddingTop: vs(20),
  },
  stepHeader: {
    paddingHorizontal: s(24),
    paddingBottom: vs(20),
    backgroundColor: '#050505',
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(20),
  },
  stepInfo: {
    marginBottom: vs(24),
  },
  stepTitle: {
    fontSize: ms(28),
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: ms(16),
    color: 'rgba(255,255,255,0.4)',
    marginTop: vs(4),
    fontWeight: '500',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00d9ff',
  },
  stepContainer: {
    flex: 1,
  },
  mediaPicker: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: ms(40),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mediaPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: s(40),
  },
  cameraIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(20),
  },
  placeholderMain: {
    fontSize: ms(22),
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  placeholderSub: {
    fontSize: ms(14),
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: vs(8),
    lineHeight: ms(20),
  },
  previewContainer: {
    flex: 1,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  mediaBadge: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mediaBadgeText: {
    color: '#fff',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: vs(32),
  },
  label: {
    fontSize: ms(12),
    fontWeight: '900',
    color: '#00d9ff',
    letterSpacing: 2,
    marginBottom: vs(16),
  },
  hugeInput: {
    fontSize: ms(28),
    fontWeight: '800',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textArea: {
    fontSize: ms(18),
    fontWeight: '500',
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 20,
    height: vs(150),
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categorySection: {
    marginBottom: vs(32),
  },
  catScroll: {
    paddingRight: 40,
  },
  catCard: {
    width: 100,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  catCardActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderColor: '#00d9ff',
  },
  catIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  catName: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  catNameActive: {
    color: '#fff',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: {
    marginRight: 12,
  },
  locationInput: {
    backgroundColor: 'transparent',
    color: '#fff',
    fontSize: 16,
    height: 60,
  },
  autocompleteList: {
    backgroundColor: '#15151a',
    borderRadius: 16,
    marginTop: 8,
  },
  autocompleteRow: {
    backgroundColor: 'transparent',
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  glassButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  glassLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1,
  },
  glassValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  premiumCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  premiumSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
    borderRadius: 24,
    paddingHorizontal: 24,
    height: 80,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
    marginBottom: 20,
  },
  priceSymbol: {
    fontSize: 24,
    fontWeight: '900',
    color: '#00d9ff',
    marginRight: 12,
  },
  priceInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
  },
  limitsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  limitBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    paddingHorizontal: 20,
    height: 70,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  limitInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  reviewCard: {
    width: '100%',
    aspectRatio: 0.9,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  reviewImage: {
    flex: 1,
  },
  reviewContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 30,
  },
  reviewTag: {
    backgroundColor: '#00d9ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    marginBottom: 12,
  },
  reviewMainTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: -1,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reviewText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '600',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  selectorButtonActive: {
    borderColor: '#00d9ff',
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
  },
  selectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectorText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },
  selectorTextActive: {
    color: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalSearchInput: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
    paddingLeft: 12,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  subcatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  subcatItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  subcatItemActive: {
    backgroundColor: '#00d9ff',
    borderColor: '#00d9ff',
  },
  subcatItemText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '700',
  },
  subcatItemTextActive: {
    color: '#000',
  },
  catIconSmall: {
    fontSize: 18,
    marginRight: 8,
  },
  publishButton: {
    marginTop: 24,
    borderRadius: 24,
    overflow: 'hidden',
    height: 70,
  },
  publishGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  publishText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
    left: 24,
    alignItems: 'center',
  },
  fabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  subCatCard: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
  },
  subCatCardActive: {
    backgroundColor: 'rgba(255, 20, 147, 0.1)',
    borderColor: '#ff1493',
  },
  subCatName: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  subCatNameActive: {
    color: '#fff',
  },
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
  },
  pickerModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pickerSheet: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  pickerIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 24,
  },
  pickerWrapper: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  pickerDoneBtn: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  pickerDoneBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(12),
    marginTop: vs(10),
  },
  mediaItem: {
    width: (SCREEN_WIDTH - s(48) - s(24)) / 2,
    height: vs(180),
    borderRadius: ms(20),
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: vs(8),
    right: s(8),
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    width: s(28),
    height: s(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  mediaPickerSmall: {
    width: (SCREEN_WIDTH - s(48) - s(24)) / 2,
    height: vs(180),
    borderRadius: ms(20),
    overflow: 'hidden',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  mediaPlaceholderSmall: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderSmallText: {
    fontSize: ms(12),
    fontWeight: '700',
    marginTop: vs(8),
  },
  emptyMediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
    padding: ms(16),
    borderRadius: ms(16),
    marginTop: vs(24),
    gap: s(12),
  },
  emptyMediaText: {
    fontSize: ms(14),
    flex: 1,
    lineHeight: vs(20),
  },
  reviewMediaScroll: {
    width: '100%',
    height: vs(350),
  },
  reviewMediaItem: {
    width: SCREEN_WIDTH - s(48),
    height: vs(350),
  },
  typeSelectionGrid: {
    gap: vs(20),
    marginTop: vs(10),
  },
  typeCard: {
    borderRadius: ms(25),
    padding: ms(24),
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    position: 'relative',
    overflow: 'hidden',
  },
  typeIconBg: {
    width: s(64),
    height: s(64),
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(16),
  },
  typeTitle: {
    fontSize: ms(22),
    fontWeight: '900',
    marginBottom: vs(8),
  },
  typeDesc: {
    fontSize: ms(14),
    lineHeight: vs(20),
    opacity: 0.8,
  },
  checkCircle: {
    position: 'absolute',
    top: vs(20),
    right: s(20),
    width: s(28),
    height: s(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
});
