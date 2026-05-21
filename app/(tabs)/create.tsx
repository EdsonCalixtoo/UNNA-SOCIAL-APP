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
  Modal,
  FlatList,
  SafeAreaView
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
  Flag,
  Check,
  Search,
  Ticket
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uploadFile } from '@/lib/storage';
import { processMedia } from '@/lib/mediaOptimizer';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import StoryCameraModal from '@/components/StoryCameraModal';
import StoryAdvancedEditor from '@/components/StoryAdvancedEditor';
import Animated, { 
  FadeInRight, 
  FadeInDown,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [eventEndTime, setEventEndTime] = useState(() => {
    const end = new Date();
    end.setHours(end.getHours() + 3);
    return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
  });
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
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState('');

  // Recurrence State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]); // 0-6 (0 é Domingo)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(() => {
    const defaultEnd = new Date();
    defaultEnd.setMonth(defaultEnd.getMonth() + 1); // Padrão: 1 mês a frente
    return defaultEnd.toISOString().split('T')[0];
  });
  const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);

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
    const end = new Date();
    end.setHours(end.getHours() + 3);
    setEventEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
    setLocationName('');
    setLocationNumber('');
    setLat(null);
    setLng(null);
    setIsPaid(false);
    setPrice('');
    setMinAge('0');
    setMaxParticipants('');
    setCatSearch('');
    setTicketUrl('');
    setIsRecurring(false);
    setRecurrenceType('none');
    setWeeklyDays([]);
    const defaultEnd = new Date();
    defaultEnd.setMonth(defaultEnd.getMonth() + 1);
    setRecurrenceEndDate(defaultEnd.toISOString().split('T')[0]);
  };

  // Função generateRecurrentDates removida pois a lógica agora é feita no backend via Trigger do Supabase

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring((currentStep + 1) / STEPS.length, { damping: 15 });
  }, [currentStep]);

  useEffect(() => { loadCategories(); }, []);
  const loadCategories = async () => { const { data } = await supabase.from('categories').select('*').order('order'); if (data) setCategories(data); };
  const loadSubcategories = async (categoryId: string) => { const { data } = await supabase.from('subcategories').select('*').eq('category_id', categoryId).order('name'); if (data) setSubcategories(data); };
  
  useEffect(() => { if (selectedCategory) loadSubcategories(selectedCategory); }, [selectedCategory]);

  // Reload categories when category modal is opened
  useEffect(() => {
    if (showCatModal) {
      loadCategories();
    }
  }, [showCatModal]);

  // Reload subcategories when subcategory modal is opened
  useEffect(() => {
    if (showSubcatModal && selectedCategory) {
      loadSubcategories(selectedCategory);
    }
  }, [showSubcatModal, selectedCategory]);

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
    if (currentStep === 1 && mediaFiles.length === 0) return Alert.alert('Atenção', 'Escolha pelo menos uma imagem ou vídeo.');
    if (currentStep === 2 && (!title || !selectedCategory)) return Alert.alert('Atenção', 'Dê um título e escolha uma categoria.');
    
    if (contentType === 'publication') {
      if (currentStep === 2) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setCurrentStep(5);
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
    
    let finalLat = lat;
    let finalLng = lng;

    if (contentType === 'event' && (!lat || !lng)) {
      setLoading(true);
      try {
        const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${googleApiKey}`
        );
        const geoData = await response.json();
        
        if (geoData.results && geoData.results[0]) {
          finalLat = geoData.results[0].geometry.location.lat;
          finalLng = geoData.results[0].geometry.location.lng;
          setLat(finalLat);
          setLng(finalLng);
        } else {
          setLoading(false);
          return Alert.alert('Localização Não Encontrada', 'Não conseguimos obter as coordenadas desse endereço.');
        }
      } catch (error) {
        setLoading(false);
        return Alert.alert('Erro de Localização', 'Problema ao validar o endereço.');
      }
    }

    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const uploadedUrls: string[] = [];
      const mediaTypes: ('image' | 'video')[] = [];

      for (const media of mediaFiles) {
        const optimizedMedia = await processMedia(media.uri, media.type);
        const storagePath = `events/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${optimizedMedia.extension}`;
        const publicUrl = await uploadFile(optimizedMedia.uri, storagePath, optimizedMedia.contentType);

        if (!publicUrl) throw new Error('Falha no upload para o R2');
        uploadedUrls.push(publicUrl);
        mediaTypes.push(optimizedMedia.type);
      }
      
      const baseDateStr = contentType === 'event' ? eventDate : null;

      const eventToInsert = {
        creator_id: user.id, 
        title: title, 
        description: description, 
        type: contentType,
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls,
        media_type: mediaTypes[0],
        media_types: mediaTypes,
        event_date: baseDateStr, 
        event_time: contentType === 'event' ? eventTime : null, 
        end_time: contentType === 'event' ? eventEndTime : null,
        location_name: locationName ? (locationNumber ? `${locationName}, ${locationNumber}` : locationName) : null,
        is_paid: isPaid, 
        price: parseFloat(price) || 0, 
        min_age: parseInt(minAge) || 0, 
        max_participants: parseInt(maxParticipants) || 0,
        category_id: selectedCategory, 
        subcategory_id: selectedSubcategory || null,
        latitude: finalLat,
        longitude: finalLng,
        status: 'ao_vivo',
        ticket_url: contentType === 'event' && ticketUrl ? (ticketUrl.trim().startsWith('http') ? ticketUrl.trim() : `https://${ticketUrl.trim()}`) : null,
        is_recurring: contentType === 'event' ? isRecurring : false,
        recurrence_type: contentType === 'event' && isRecurring ? recurrenceType : null,
        recurrence_end_date: contentType === 'event' && isRecurring ? recurrenceEndDate : null,
        recurrence_days: contentType === 'event' && isRecurring && recurrenceType === 'weekly' ? weeklyDays : null
      };

      const { data: insertedEvents, error } = await supabase
        .from('events')
        .insert([eventToInsert])
        .select();

      if (error) throw error;
      if (!insertedEvents || insertedEvents.length === 0) throw new Error('Nenhum evento foi criado');

      const eventData = insertedEvents[0];

      await supabase.from('posts').insert({
        user_id: user.id,
        content: contentType === 'event' ? `Criei um novo evento: ${title}${isRecurring ? ' (Recorrente 🔁)' : ''}` : `Publiquei algo novo: ${title}`,
        event_id: eventData.id,
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls
      });

      setCreatedEventId(eventData.id);
      setShowSuccessModal(true);
    } catch (e: any) { 
      Alert.alert('Erro ao publicar', e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const filteredSubcategories = subcategories.filter(s => 
    s.name.toLowerCase().includes(subcatSearch.toLowerCase())
  );

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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + vs(100) }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
          <StepHeader />
          {currentStep === 0 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={styles.typeSelectionGrid}>
                <TouchableOpacity style={[styles.typeCard, contentType === 'event' && { borderColor: accent, backgroundColor: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.08)' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setContentType('event'); }}>
                  <LinearGradient colors={['#00d9ff', '#0055ff']} style={styles.typeIconBg}><Calendar size={32} color="#fff" /></LinearGradient>
                  <Text style={[styles.typeTitle, { color: textPrimary }]}>Evento</Text>
                  <Text style={[styles.typeDesc, { color: textSecondary }]}>Tem data, hora e local marcados. Ideal para festas, encontros e treinos.</Text>
                  {contentType === 'event' && <View style={[styles.checkCircle, { backgroundColor: accent }]}><Check size={14} color="#fff" strokeWidth={4} /></View>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.typeCard, contentType === 'publication' && { borderColor: '#ff1493', backgroundColor: 'rgba(255, 20, 147, 0.05)' }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setContentType('publication'); }}>
                  <LinearGradient colors={['#ff1493', '#ff0055']} style={styles.typeIconBg}><Flag size={32} color="#fff" /></LinearGradient>
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
                    {media.type === 'video' ? <Video source={{ uri: media.uri }} style={styles.mediaPreview} resizeMode={ResizeMode.COVER} isLooping shouldPlay isMuted /> : <Image source={{ uri: media.uri }} style={styles.mediaPreview} />}
                    <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeMedia(index)}><X size={16} color="#fff" /></TouchableOpacity>
                  </View>
                ))}
                {mediaFiles.length < 5 && (
                  <TouchableOpacity activeOpacity={0.9} style={[styles.mediaPickerSmall, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={() => setShowCamera(true)}>
                    <LinearGradient colors={isDark ? ['#1a1a25', '#0a0a0f'] : ['#ffffff', '#f0f0f0']} style={styles.mediaPlaceholderSmall}><Camera size={30} color={accent} /><Text style={[styles.placeholderSmallText, { color: textPrimary }]}>Adicionar</Text></LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}
          {currentStep === 2 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: accent }]}>NOME DO EVENTO</Text>
                <TextInput style={[styles.hugeInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textPrimary }]} placeholder="Seu evento aqui..." placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} value={title} onChangeText={setTitle} autoFocus />
              </View>
              <View style={styles.categorySection}>
                <Text style={[styles.label, { color: accent }]}>CATEGORIA</Text>
                <TouchableOpacity style={[styles.selectorButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }, selectedCategory && { borderColor: accent, backgroundColor: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.08)' }]} onPress={() => setShowCatModal(true)}>
                  <View style={styles.selectorInfo}><Layers size={20} color={selectedCategory ? accent : textSecondary} /><Text style={[styles.selectorText, { color: textSecondary }, selectedCategory && { color: textPrimary }]}>{selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Escolher categoria...'}</Text></View><ChevronRight size={20} color={textSecondary} />
                </TouchableOpacity>
              </View>
              {selectedCategory && (
                <View style={styles.categorySection}>
                  <Text style={[styles.label, { color: accent }]}>SUBCATEGORIA</Text>
                  <TouchableOpacity style={[styles.selectorButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }, selectedSubcategory && { borderColor: accent, backgroundColor: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.08)' }]} onPress={() => setShowSubcatModal(true)}>
                    <View style={styles.selectorInfo}><Plus size={20} color={selectedSubcategory ? accent : textSecondary} /><Text style={[styles.selectorText, { color: textSecondary }, selectedSubcategory && { color: textPrimary }]}>{selectedSubcategory ? subcategories.find(s => s.id === selectedSubcategory)?.name : 'Escolher subcategoria...'}</Text></View><ChevronRight size={20} color={textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: accent }]}>DESCRIÇÃO</Text>
                <TextInput style={[styles.textArea, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textPrimary }]} placeholder="Conte os detalhes..." placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} value={description} onChangeText={setDescription} multiline />
              </View>
            </Animated.View>
          )}
          {currentStep === 3 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={[styles.inputGroup, { zIndex: 100 }]}>
                <Text style={[styles.label, { color: accent }]}>LOCALIZAÇÃO</Text>
                <GooglePlacesAutocomplete
                  placeholder="Onde será o encontro?"
                  onPress={(data, details = null) => {
                    setLocationName(data.structured_formatting?.main_text || data.description || '');
                    if (details?.geometry?.location) { setLat(details.geometry.location.lat); setLng(details.geometry.location.lng); }
                  }}
                  fetchDetails={true}
                  query={{ key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY, language: 'pt-BR' }}
                  styles={{
                    container: { flex: 0, zIndex: 100 },
                    textInputContainer: { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: 20, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center', height: 60 },
                    textInput: { backgroundColor: 'transparent', color: textPrimary, fontSize: 16, flex: 1, height: '100%', paddingRight: 16, paddingLeft: 4 },
                    listView: { 
                      position: 'absolute', 
                      top: 70, 
                      left: 0, 
                      right: 0, 
                      backgroundColor: isDark ? '#1a1a24' : '#ffffff', 
                      borderRadius: 24, 
                      borderWidth: 1, 
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', 
                      elevation: 10, 
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.1,
                      shadowRadius: 20,
                      maxHeight: 300, 
                      zIndex: 1000,
                      overflow: 'hidden'
                    },
                    row: {
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: 'transparent',
                    },
                    separator: {
                      height: 1,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    },
                    description: {
                      fontSize: 15,
                      color: textPrimary,
                      fontWeight: '600'
                    }
                  }}
                  renderLeftButton={() => <View style={{ justifyContent: 'center', paddingLeft: 18, paddingRight: 8 }}><MapPin size={22} color={accent} /></View>}
                  renderRow={(data) => {
                    const mainText = data.structured_formatting?.main_text || data.description;
                    const secondaryText = data.structured_formatting?.secondary_text || '';
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center', marginRight: 15 }}>
                          <MapPin size={18} color={accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 2 }}>{mainText}</Text>
                          {!!secondaryText && <Text style={{ color: textSecondary, fontSize: 13 }} numberOfLines={1}>{secondaryText}</Text>}
                        </View>
                      </View>
                    );
                  }}
                  enablePoweredByContainer={false}
                  textInputProps={{ placeholderTextColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', value: locationName, onChangeText: setLocationName }}
                />
              </View>
              <View style={[styles.inputGroup, { marginTop: 16 }]}>
                <Text style={[styles.label, { color: accent }]}>NÚMERO E COMPLEMENTO</Text>
                <TextInput style={[styles.hugeInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textPrimary, fontSize: 16, height: 60 }]} placeholder="Ex: 123, Apto 42" placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} value={locationNumber} onChangeText={setLocationNumber} />
              </View>
              {contentType === 'event' && (
                <View style={{ marginTop: 24, gap: 12 }}>
                  <TouchableOpacity 
                    style={[styles.glassButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', width: '100%' }]} 
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Calendar size={22} color="#ff1493" />
                    <View>
                      <Text style={[styles.glassLabel, { color: textSecondary }]}>DATA DO EVENTO</Text>
                      <Text style={[styles.glassValue, { color: textPrimary, fontSize: 18 }]}>{new Date(Platform.OS === 'ios' ? eventDate + 'T00:00:00' : eventDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.row}>
                    <TouchableOpacity 
                      style={[styles.glassButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', flex: 1 }]} 
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Clock size={20} color={accent} />
                      <View>
                        <Text style={[styles.glassLabel, { color: textSecondary }]}>INÍCIO</Text>
                        <Text style={[styles.glassValue, { color: textPrimary }]}>{eventTime}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.glassButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', flex: 1 }]} 
                      onPress={() => setShowEndTimePicker(true)}
                    >
                      <Clock size={20} color="#ff3b30" />
                      <View>
                        <Text style={[styles.glassLabel, { color: textSecondary }]}>FIM</Text>
                        <Text style={[styles.glassValue, { color: textPrimary }]}>{eventEndTime}</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Seção de Recorrência */}
                  <View style={[styles.premiumCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', marginTop: 12 }]}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={[styles.premiumTitle, { color: textPrimary }]}>Repetir Evento?</Text>
                      <Text style={[styles.premiumSub, { color: textSecondary }]}>Ative para criar eventos recorrentes</Text>
                    </View>
                    <Switch 
                      value={isRecurring} 
                      onValueChange={(val) => {
                        setIsRecurring(val);
                        setRecurrenceType(val ? 'weekly' : 'none');
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }} 
                      trackColor={{ false: isDark ? '#333' : '#ccc', true: accent }} 
                      thumbColor={isRecurring ? '#fff' : '#f4f3f4'} 
                    />
                  </View>

                  {isRecurring && (
                    <Animated.View entering={FadeInDown} style={{ gap: 12, marginTop: 8 }}>
                      {/* Tipo de Recorrência */}
                      <Text style={[styles.label, { color: accent, marginTop: 8 }]}>FREQUÊNCIA DE REPETIÇÃO</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.chip,
                              { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', borderWidth: 1 },
                              recurrenceType === type && { backgroundColor: accent, borderColor: accent }
                            ]}
                            onPress={() => {
                              setRecurrenceType(type);
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                          >
                            <Text style={[styles.chipText, { color: recurrenceType === type ? '#fff' : textPrimary }]}>
                              {type === 'daily' ? 'Diário' : type === 'weekly' ? 'Semanal' : type === 'monthly' ? 'Mensal' : 'Anual'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Se for Semanal: Seleção dos Dias */}
                      {recurrenceType === 'weekly' && (
                        <View style={{ gap: 8 }}>
                          <Text style={[styles.label, { color: accent }]}>DIAS DA SEMANA</Text>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4 }}>
                            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((dayName, index) => {
                              const isSelected = weeklyDays.includes(index);
                              return (
                                <TouchableOpacity
                                  key={index}
                                  style={[
                                    styles.dayCircle,
                                    { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                                    isSelected && { backgroundColor: '#ff1493' }
                                  ]}
                                  onPress={() => {
                                    setWeeklyDays(prev => 
                                      prev.includes(index) 
                                        ? prev.filter(d => d !== index) 
                                        : [...prev, index]
                                    );
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  }}
                                >
                                  <Text style={{ color: isSelected ? '#fff' : textPrimary, fontWeight: '700', fontSize: 14 }}>
                                    {dayName}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {/* Data de Término */}
                      <TouchableOpacity 
                        style={[styles.glassButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', width: '100%', marginTop: 8 }]} 
                        onPress={() => setShowRecurrenceEndPicker(true)}
                      >
                        <Calendar size={22} color="#ff3b30" />
                        <View>
                          <Text style={[styles.glassLabel, { color: textSecondary }]}>TERMINA EM</Text>
                          <Text style={[styles.glassValue, { color: textPrimary, fontSize: 16 }]}>{new Date(Platform.OS === 'ios' ? recurrenceEndDate + 'T00:00:00' : recurrenceEndDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</Text>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                </View>
              )}
            </Animated.View>
          )}
          {currentStep === 4 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={[styles.premiumCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}><View><Text style={[styles.premiumTitle, { color: textPrimary }]}>Evento Pago?</Text><Text style={[styles.premiumSub, { color: textSecondary }]}>Ative para cobrar ingressos</Text></View><Switch value={isPaid} onValueChange={setIsPaid} trackColor={{ false: isDark ? '#333' : '#ccc', true: accent }} thumbColor={isPaid ? '#fff' : '#f4f3f4'} /></View>
              {isPaid && <View style={[styles.priceBox, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.08)' }]}><Text style={[styles.priceSymbol, { color: accent }]}>R$</Text><TextInput style={[styles.priceInput, { color: textPrimary }]} keyboardType="numeric" placeholder="0,00" placeholderTextColor={isDark ? '#444' : '#999'} value={price} onChangeText={setPrice} /></View>}
              <View style={styles.limitsRow}>
                <View style={[styles.limitBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}><Users size={20} color={accent} /><TextInput style={[styles.limitInput, { color: textPrimary }]} placeholder="Limite" keyboardType="numeric" value={maxParticipants} onChangeText={setMaxParticipants} /></View>
                <View style={[styles.limitBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}><Info size={20} color="#ff1493" /><TextInput style={[styles.limitInput, { color: textPrimary }]} placeholder="Idade" keyboardType="numeric" value={minAge} onChangeText={setMinAge} /></View>
              </View>
              <View style={{ width: '100%', marginTop: 20 }}>
                <Text style={[styles.label, { color: accent, marginBottom: 8 }]}>LINK PARA COMPRA DE INGRESSOS (OPCIONAL)</Text>
                <View style={[styles.limitBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                  <Ticket size={20} color="#ff1493" />
                  <TextInput 
                    style={{ flex: 1, color: textPrimary, fontSize: 14, marginLeft: 8 }} 
                    placeholder="https://exemplo.com/ingressos" 
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                    value={ticketUrl} 
                    onChangeText={setTicketUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>
            </Animated.View>
          )}
          {currentStep === 5 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={styles.reviewCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewMediaScroll}>{mediaFiles.map((media, index) => (<View key={index} style={styles.reviewMediaItem}>{media.type === 'video' ? <Video source={{ uri: media.uri }} style={styles.reviewImage} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted /> : <Image source={{ uri: media.uri }} style={styles.reviewImage} />}</View>))}</ScrollView>
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFill} />
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewTag}>{categories.find(c => c.id === selectedCategory)?.name}</Text>
                  <Text style={styles.reviewMainTitle}>{title}</Text>
                  {contentType === 'event' ? (
                    <>
                      <View style={styles.reviewRow}><Calendar size={14} color="#fff" /><Text style={styles.reviewText}>{new Date(Platform.OS === 'ios' ? eventDate + 'T00:00:00' : eventDate).toLocaleDateString('pt-BR')} das {eventTime} às {eventEndTime}</Text></View>
                      <View style={styles.reviewRow}><MapPin size={14} color="#fff" /><Text style={styles.reviewText} numberOfLines={1}>{locationName}</Text></View>
                    </>
                  ) : (
                    <>
                      <View style={styles.reviewRow}><Flag size={14} color="#fff" /><Text style={styles.reviewText}>Publicação sem data fixa</Text></View>
                      {locationName && <View style={styles.reviewRow}><MapPin size={14} color="#fff" /><Text style={styles.reviewText} numberOfLines={1}>{locationName}</Text></View>}
                    </>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.publishButton} onPress={handleCreate} disabled={loading}><LinearGradient colors={['#00d9ff', '#ff1493']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.publishGradient}>{loading ? <ActivityIndicator color="#fff" /> : <><Text style={[styles.publishText, { color: '#fff' }]}>PUBLICAR {contentType === 'event' ? 'EVENTO' : 'AGORA'}</Text><Sparkles size={20} color="#fff" /></>}</LinearGradient></TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCatModal} animationType="fade" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: backgroundPrimary }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Selecione a Categoria</Text>
              <TouchableOpacity onPress={() => setShowCatModal(false)} style={styles.closeModalBtn}>
                <X size={24} color={textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchBarWrap}>
              <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Search size={20} color={textSecondary} />
                <TextInput 
                  style={{ flex: 1, color: textPrimary, marginLeft: 10, fontSize: 16 }} 
                  placeholder="Buscar categoria..." 
                  placeholderTextColor={textSecondary} 
                  value={catSearch} 
                  onChangeText={setCatSearch} 
                />
              </View>
            </View>

            <ScrollView 
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
            >
              {filteredCategories.map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  activeOpacity={0.7}
                  style={[
                    styles.modalItem, 
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff' },
                    selectedCategory === item.id && { borderColor: accent, backgroundColor: isDark ? accent + '10' : accent + '05' }
                  ]}
                  onPress={() => {
                    setSelectedCategory(item.id);
                    setSelectedSubcategory('');
                    setShowCatModal(false);
                    setCatSearch('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={styles.modalItemContent}>
                    <Text style={styles.modalEmoji}>{item.icon}</Text>
                    <Text style={[styles.modalItemText, { color: textPrimary }]}>{item.name}</Text>
                  </View>
                  {selectedCategory === item.id ? (
                    <View style={[styles.selectedCircle, { backgroundColor: accent }]}>
                      <Check size={14} color="#fff" strokeWidth={4} />
                    </View>
                  ) : (
                    <ChevronRight size={20} color={textSecondary} opacity={0.3} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal visible={showSubcatModal} animationType="fade" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: backgroundPrimary }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>Selecione a Subcategoria</Text>
              <TouchableOpacity onPress={() => setShowSubcatModal(false)} style={styles.closeModalBtn}>
                <X size={24} color={textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchBarWrap}>
              <View style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Search size={20} color={textSecondary} />
                <TextInput 
                  style={{ flex: 1, color: textPrimary, marginLeft: 10, fontSize: 16 }} 
                  placeholder="Buscar subcategoria..." 
                  placeholderTextColor={textSecondary} 
                  value={subcatSearch} 
                  onChangeText={setSubcatSearch} 
                />
              </View>
            </View>

            <ScrollView 
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
            >
              {filteredSubcategories.map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  activeOpacity={0.7}
                  style={[
                    styles.modalItem, 
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff' },
                    selectedSubcategory === item.id && { borderColor: accent, backgroundColor: isDark ? accent + '10' : accent + '05' }
                  ]}
                  onPress={() => {
                    setSelectedSubcategory(item.id);
                    setShowSubcatModal(false);
                    setSubcatSearch('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: textPrimary, marginLeft: 0 }]}>{item.name}</Text>
                  {selectedSubcategory === item.id ? (
                    <View style={[styles.selectedCircle, { backgroundColor: accent }]}>
                      <Check size={14} color="#fff" strokeWidth={4} />
                    </View>
                  ) : (
                    <ChevronRight size={20} color={textSecondary} opacity={0.3} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {currentStep < 5 && (
        <View style={[styles.fabContainer, { bottom: insets.bottom + vs(20) }]}>
          <View style={styles.fabRow}>
            {currentStep > 0 ? <TouchableOpacity style={styles.fab} onPress={prevStep}><LinearGradient colors={['#333', '#1a1a1a']} style={styles.fabGradient}><ArrowLeft size={28} color="#fff" /></LinearGradient></TouchableOpacity> : <View style={{ width: 64 }} />}
            <TouchableOpacity style={styles.fab} onPress={nextStep}><LinearGradient colors={['#00d9ff', '#0055ff']} style={styles.fabGradient}><ArrowRight size={28} color="#fff" /></LinearGradient></TouchableOpacity>
          </View>
        </View>
      )}

      {/* Date Picker */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.dateTimePickerModalOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowDatePicker(false)}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
            </Pressable>
            <View style={[styles.dateTimePickerModalContent, { backgroundColor: backgroundSecondary }]}>
              <View style={styles.dateTimePickerModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.dateTimePickerModalCancelText, { color: textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={[styles.dateTimePickerModalTitleText, { color: textPrimary }]}>Selecionar Data</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.dateTimePickerModalConfirmText, { color: accent }]}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={new Date(eventDate + 'T00:00:00')}
                mode="date"
                display="spinner"
                textColor={textPrimary}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    setEventDate(`${year}-${month}-${day}`);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={new Date(eventDate + 'T00:00:00')}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setEventDate(selectedDate.toISOString().split('T')[0]);
            }}
          />
        )
      )}

      {/* Time Picker */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.dateTimePickerModalOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowTimePicker(false)}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
            </Pressable>
            <View style={[styles.dateTimePickerModalContent, { backgroundColor: backgroundSecondary }]}>
              <View style={styles.dateTimePickerModalHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.dateTimePickerModalCancelText, { color: textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={[styles.dateTimePickerModalTitleText, { color: textPrimary }]}>Horário de Início</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={[styles.dateTimePickerModalConfirmText, { color: accent }]}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={(() => {
                  const [hours, minutes] = eventTime.split(':');
                  const d = new Date();
                  if (hours && minutes) {
                    d.setHours(parseInt(hours, 10));
                    d.setMinutes(parseInt(minutes, 10));
                  }
                  return d;
                })()}
                mode="time"
                is24Hour={true}
                display="spinner"
                textColor={textPrimary}
                onChange={(event, selectedDate) => {
                  if (selectedDate) setEventTime(`${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showTimePicker && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(event, selectedDate) => {
              setShowTimePicker(false);
              if (selectedDate) setEventTime(`${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`);
            }}
          />
        )
      )}

      {/* End Time Picker */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showEndTimePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowEndTimePicker(false)}
        >
          <View style={styles.dateTimePickerModalOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowEndTimePicker(false)}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
            </Pressable>
            <View style={[styles.dateTimePickerModalContent, { backgroundColor: backgroundSecondary }]}>
              <View style={styles.dateTimePickerModalHeader}>
                <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                  <Text style={[styles.dateTimePickerModalCancelText, { color: textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={[styles.dateTimePickerModalTitleText, { color: textPrimary }]}>Horário de Término</Text>
                <TouchableOpacity onPress={() => setShowEndTimePicker(false)}>
                  <Text style={[styles.dateTimePickerModalConfirmText, { color: accent }]}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={(() => {
                  const [hours, minutes] = eventEndTime.split(':');
                  const d = new Date();
                  if (hours && minutes) {
                    d.setHours(parseInt(hours, 10));
                    d.setMinutes(parseInt(minutes, 10));
                  }
                  return d;
                })()}
                mode="time"
                is24Hour={true}
                display="spinner"
                textColor={textPrimary}
                onChange={(event, selectedDate) => {
                  if (selectedDate) setEventEndTime(`${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showEndTimePicker && (
          <DateTimePicker
            value={new Date()}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndTimePicker(false);
              if (selectedDate) setEventEndTime(`${String(selectedDate.getHours()).padStart(2, '0')}:${String(selectedDate.getMinutes()).padStart(2, '0')}`);
            }}
          />
        )
      )}

      {/* Recurrence End Picker */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showRecurrenceEndPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRecurrenceEndPicker(false)}
        >
          <View style={styles.dateTimePickerModalOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowRecurrenceEndPicker(false)}>
              <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFillObject} />
            </Pressable>
            <View style={[styles.dateTimePickerModalContent, { backgroundColor: backgroundSecondary }]}>
              <View style={styles.dateTimePickerModalHeader}>
                <TouchableOpacity onPress={() => setShowRecurrenceEndPicker(false)}>
                  <Text style={[styles.dateTimePickerModalCancelText, { color: textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={[styles.dateTimePickerModalTitleText, { color: textPrimary }]}>Repetir Até</Text>
                <TouchableOpacity onPress={() => setShowRecurrenceEndPicker(false)}>
                  <Text style={[styles.dateTimePickerModalConfirmText, { color: accent }]}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={new Date(recurrenceEndDate + 'T00:00:00')}
                mode="date"
                display="spinner"
                textColor={textPrimary}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    setRecurrenceEndDate(`${year}-${month}-${day}`);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showRecurrenceEndPicker && (
          <DateTimePicker
            value={new Date(recurrenceEndDate + 'T00:00:00')}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowRecurrenceEndPicker(false);
              if (selectedDate) setRecurrenceEndDate(selectedDate.toISOString().split('T')[0]);
            }}
          />
        )
      )}

      <StoryCameraModal visible={showCamera} onClose={() => setShowCamera(false)} onCapture={handleCapture} usageType="event" />
      {capturedMedia && <StoryAdvancedEditor visible={showEditor} mediaUri={capturedMedia.uri} mediaType={capturedMedia.type} mode="event" onClose={() => setShowEditor(false)} onSave={handleSaveEditor} />}
      <SuccessModal visible={showSuccessModal} onClose={() => { setShowSuccessModal(false); resetForm(); router.push('/(tabs)'); }} onViewEvent={() => { setShowSuccessModal(false); resetForm(); router.push({ pathname: '/event/[id]', params: { id: createdEventId || '' } }); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  stepHeader: { paddingHorizontal: 20, paddingBottom: 20, gap: 15 },
  backCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  stepInfo: { gap: 4 },
  stepTitle: { fontSize: ms(24), fontWeight: '900', letterSpacing: -0.5 },
  stepSubtitle: { fontSize: ms(14), opacity: 0.7 },
  progressBarBg: { height: 4, width: '100%', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 2 },
  stepContainer: { paddingHorizontal: 20, paddingTop: 20 },
  typeSelectionGrid: { gap: 16 },
  typeCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', position: 'relative' },
  typeIconBg: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  typeTitle: { fontSize: ms(18), fontWeight: '800', marginBottom: 8 },
  typeDesc: { fontSize: ms(13), lineHeight: 20, opacity: 0.8 },
  checkCircle: { position: 'absolute', top: 20, right: 20, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mediaItem: { width: (SCREEN_WIDTH - 52) / 2, height: (SCREEN_WIDTH - 52) / 2, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  mediaPreview: { width: '100%', height: '100%' },
  removeMediaBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mediaPickerSmall: { width: (SCREEN_WIDTH - 52) / 2, height: (SCREEN_WIDTH - 52) / 2, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed' },
  mediaPlaceholderSmall: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, borderRadius: 20 },
  placeholderSmallText: { fontSize: ms(13), fontWeight: '700' },
  inputGroup: { gap: 10, marginBottom: 20 },
  label: { fontSize: ms(11), fontWeight: '900', letterSpacing: 1 },
  hugeInput: { height: 70, borderRadius: 24, paddingHorizontal: 20, fontSize: ms(20), fontWeight: '700', borderWidth: 1 },
  selectorButton: { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderWidth: 1 },
  selectorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectorText: { fontSize: ms(15), fontWeight: '600' },
  textArea: { minHeight: 120, borderRadius: 24, padding: 20, fontSize: ms(16), borderWidth: 1, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  glassButton: { height: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, borderWidth: 1 },
  glassLabel: { fontSize: ms(10), fontWeight: '800' },
  glassValue: { fontSize: ms(14), fontWeight: '700' },
  premiumCard: { padding: 20, borderRadius: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  premiumTitle: { fontSize: ms(16), fontWeight: '800' },
  premiumSub: { fontSize: ms(13), opacity: 0.7 },
  priceBox: { height: 70, borderRadius: 24, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10, marginTop: 16, borderWidth: 1 },
  priceSymbol: { fontSize: ms(20), fontWeight: '900' },
  priceInput: { fontSize: ms(24), fontWeight: '900', flex: 1 },
  limitsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  limitBox: { flex: 1, height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10, borderWidth: 1 },
  limitInput: { fontSize: ms(15), fontWeight: '700', flex: 1 },
  reviewCard: { height: vs(350), borderRadius: 32, overflow: 'hidden', position: 'relative' },
  reviewMediaScroll: { ...StyleSheet.absoluteFillObject },
  reviewMediaItem: { width: SCREEN_WIDTH - 40, height: vs(350) },
  reviewImage: { width: '100%', height: '100%' },
  reviewContent: { position: 'absolute', bottom: 30, left: 25, right: 25, gap: 8 },
  reviewTag: { alignSelf: 'flex-start', backgroundColor: '#ff1493', color: '#fff', fontSize: ms(10), fontWeight: '900', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, textTransform: 'uppercase' },
  reviewMainTitle: { color: '#fff', fontSize: ms(28), fontWeight: '900' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.9 },
  reviewText: { color: '#fff', fontSize: ms(14), fontWeight: '600' },
  publishButton: { marginTop: 24, height: 70, borderRadius: 35, overflow: 'hidden', elevation: 10, shadowColor: '#ff1493', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  publishGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  publishText: { fontSize: ms(18), fontWeight: '900' },
  fabContainer: { position: 'absolute', left: 20, right: 20 },
  fabRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fab: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10 },
  fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  categorySection: { marginBottom: 15 },

  // MODAL STYLES (CORRIGIDO)
  modalOverlay: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: ms(20), fontWeight: '900', letterSpacing: -0.5 },
  closeModalBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  searchBarWrap: { paddingHorizontal: 24, paddingVertical: 16 },
  searchBar: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  modalItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    padding: 20, 
    borderRadius: 24, 
    marginBottom: 12, 
    borderWidth: 1.5, 
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2
  },
  modalItemContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modalEmoji: { fontSize: ms(24), marginRight: 16 },
  modalItemText: { fontSize: ms(16), fontWeight: '800' },
  selectedCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: ms(14),
    fontWeight: '700',
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTimePickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  dateTimePickerModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dateTimePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    marginBottom: 10,
  },
  dateTimePickerModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimePickerModalTitleText: {
    fontSize: 18,
    fontWeight: '800',
  },
  dateTimePickerModalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
