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
  Check,
  Ticket
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uploadFile } from '@/lib/storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Video, ResizeMode } from 'expo-av';
import * as Haptics from 'expo-haptics';
import StoryCameraModal from '@/components/StoryCameraModal';
import StoryAdvancedEditor from '@/components/StoryAdvancedEditor';
import Animated, { 
  FadeInRight, 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';

import SuccessModal from '@/components/SuccessModal';
import { useTheme } from '@/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  { id: 'media', title: 'Atualizar mídia', subtitle: 'Fotos e vídeos do seu evento' },
  { id: 'details', title: 'Informações', subtitle: 'O que mudou no seu evento?' },
  { id: 'logistics', title: 'Onde e quando?', subtitle: 'Local e horário atualizados' },
  { id: 'settings', title: 'Regras', subtitle: 'Preços e limites' },
  { id: 'review', title: 'Revisão', subtitle: 'Confira as alterações' }
];

export default function EditEvent() {
  const { id } = useLocalSearchParams();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [contentType, setContentType] = useState<'event' | 'publication'>('event');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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
  const getLocalDateString = (d: Date = new Date()) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [eventDate, setEventDate] = useState(() => getLocalDateString());
  const [eventTime, setEventTime] = useState('19:00');
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
  const [ticketUrl, setTicketUrl] = useState('');

  useEffect(() => {
    loadCategories();
    if (id) fetchEventData();
  }, [id]);

  const fetchEventData = async () => {
    try {
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
      if (error) throw error;
      
      setContentType(data.type || 'event');
      setTitle(data.title);
      setDescription(data.description);
      setSelectedCategory(data.category_id);
      setSelectedSubcategory(data.subcategory_id || '');
      setEventDate(data.event_date || getLocalDateString());
      setEventTime(data.event_time ? data.event_time.slice(0, 5) : '19:00');
      if (data.location_name && data.location_name.includes(',')) {
        const parts = data.location_name.split(',');
        setLocationName(parts[0].trim());
        setLocationNumber(parts.slice(1).join(',').trim());
      } else {
        setLocationName(data.location_name || '');
        setLocationNumber('');
      }
      setLat(data.latitude);
      setLng(data.longitude);
      setIsPaid(data.is_paid);
      setPrice(data.price?.toString() || '0');
      setMinAge(data.min_age?.toString() || '0');
      setMaxParticipants(data.max_participants?.toString() || '0');
      setTicketUrl(data.ticket_url || '');
      
      // Populate media
      const media = (data.image_urls || [data.image_url]).map((url: string, index: number) => ({
        uri: url,
        type: data.media_types?.[index] || data.media_type || 'image'
      }));
      setMediaFiles(media);

    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar os dados do evento');
      router.back();
    } finally {
      setFetching(false);
    }
  };

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring((currentStep + 1) / STEPS.length, { damping: 15 });
  }, [currentStep]);

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
    if (currentStep === 0 && mediaFiles.length === 0) return Alert.alert('Atenção', 'Mantenha pelo menos uma mídia.');
    if (currentStep === 1 && (!title || !selectedCategory)) return Alert.alert('Atenção', 'Título e categoria são obrigatórios.');
    
    if (contentType === 'publication' && currentStep === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCurrentStep(4);
      return;
    }

    if (currentStep === 2 && !locationName) return Alert.alert('Atenção', 'Localização é obrigatória.');
    
    if (currentStep < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (contentType === 'publication' && currentStep === 4) {
      setCurrentStep(1);
      return;
    }
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleUpdate = async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      const mediaTypes: ('image' | 'video')[] = [];

      for (const media of mediaFiles) {
        if (media.uri.startsWith('http')) {
          // Mídia já existente
          uploadedUrls.push(media.uri);
          mediaTypes.push(media.type);
        } else {
          // Nova mídia para upload
          const extension = media.type === 'video' ? 'mp4' : 'jpg';
          const storagePath = `events/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
          const publicUrl = await uploadFile(media.uri, storagePath, media.type === 'video' ? 'video/mp4' : 'image/jpeg');
          if (!publicUrl) throw new Error('Falha no upload');
          uploadedUrls.push(publicUrl);
          mediaTypes.push(media.type);
        }
      }

      const { error } = await supabase.from('events').update({
        title, description, 
        image_url: uploadedUrls[0],
        image_urls: uploadedUrls,
        media_type: mediaTypes[0],
        media_types: mediaTypes,
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
        ticket_url: contentType === 'event' && ticketUrl ? (ticketUrl.trim().startsWith('http') ? ticketUrl.trim() : `https://${ticketUrl.trim()}`) : null
      }).eq('id', id);

      if (error) throw error;
      setShowSuccessModal(true);
    } catch (e: any) { 
      Alert.alert('Erro ao atualizar', e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  if (fetching) return <View style={styles.center}><ActivityIndicator color={accent} /></View>;

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <LinearGradient colors={isDark ? ['#050505', '#101018'] : ['#f5f5f7', '#ffffff']} style={StyleSheet.absoluteFill} />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + vs(100) }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
          {/* Header */}
          <View style={[styles.stepHeader, { paddingTop: insets.top + vs(20) }]}>
            <TouchableOpacity onPress={prevStep} style={styles.backCircle}><ArrowLeft size={24} color={textPrimary} /></TouchableOpacity>
            <View style={styles.stepInfo}>
              <Text style={[styles.stepTitle, { color: textPrimary }]}>{STEPS[currentStep].title}</Text>
              <Text style={[styles.stepSubtitle, { color: textSecondary }]}>{STEPS[currentStep].subtitle}</Text>
            </View>
            <View style={styles.progressBarBg}><Animated.View style={[styles.progressBarFill, { width: `${(currentStep + 1) * 20}%`, backgroundColor: accent }]} /></View>
          </View>

          {currentStep === 0 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={styles.mediaGrid}>
                {mediaFiles.map((media, index) => (
                  <View key={index} style={styles.mediaItem}>
                    {media.type === 'video' ? (
                      <Video source={{ uri: media.uri }} style={styles.mediaPreview} resizeMode={ResizeMode.COVER} isLooping shouldPlay isMuted />
                    ) : (
                      <Image source={{ uri: media.uri }} style={styles.mediaPreview} />
                    )}
                    <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeMedia(index)}><X size={16} color="#fff" /></TouchableOpacity>
                  </View>
                ))}
                {mediaFiles.length < 5 && (
                  <TouchableOpacity style={styles.mediaPickerSmall} onPress={() => setShowCamera(true)}>
                    <Camera size={30} color={accent} /><Text style={{ color: textPrimary, marginTop: 8 }}>Adicionar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}

          {currentStep === 1 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: accent }]}>NOME DO EVENTO</Text>
                <TextInput style={[styles.hugeInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textPrimary, borderWidth: 1 }]} value={title} onChangeText={setTitle} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: accent }]}>CATEGORIA</Text>
                <TouchableOpacity style={[styles.selectorButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderWidth: 1 }]} onPress={() => setShowCatModal(true)}>
                  <Text style={{ color: textPrimary, fontSize: 16, fontWeight: '600' }}>{categories.find(c => c.id === selectedCategory)?.name || 'Escolher...'}</Text>
                  <ChevronRight size={20} color={textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: accent }]}>DESCRIÇÃO</Text>
                <TextInput style={[styles.textArea, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textPrimary, borderWidth: 1 }]} value={description} onChangeText={setDescription} multiline />
              </View>
            </Animated.View>
          )}

          {currentStep === 2 && (
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
                      paddingLeft: 4,
                    },
                    listView: {
                      position: 'absolute',
                      top: 68,
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
                      maxHeight: 280,
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
                      marginLeft: 64,
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
                  disableScroll={false}
                />
              </View>

              <View style={[styles.inputGroup, { marginTop: 16, zIndex: 1 }]}>
                <Text style={[styles.label, { color: accent }]}>NÚMERO E COMPLEMENTO</Text>
                <TextInput 
                  style={[styles.hugeInput, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: textPrimary, fontSize: 16, height: 60, borderWidth: 1 }]}
                  placeholder="Ex: 123, Apto 42"
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                  value={locationNumber}
                  onChangeText={setLocationNumber}
                />
                
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
                <TouchableOpacity style={[styles.glassButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderWidth: 1 }]} onPress={() => setShowDatePicker(true)}>
                  <Calendar size={20} color="#ff1493" />
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>DATA</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary, marginTop: 2 }}>{new Date(eventDate).toLocaleDateString('pt-BR')}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.glassButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderWidth: 1 }]} onPress={() => setShowTimePicker(true)}>
                  <Clock size={20} color={accent} />
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>HORA</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: textPrimary, marginTop: 2 }}>{eventTime}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {currentStep === 3 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <View style={[styles.premiumCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderWidth: 1 }]}>
                <View>
                  <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800' }}>Evento Pago?</Text>
                  <Text style={{ color: textSecondary, fontSize: 14, marginTop: 2 }}>Ative para cobrar ingressos</Text>
                </View>
                <Switch value={isPaid} onValueChange={setIsPaid} trackColor={{ true: accent }} />
              </View>
              {isPaid && (
                <Animated.View entering={FadeInRight} style={[styles.priceBox, { backgroundColor: isDark ? 'rgba(0, 217, 255, 0.05)' : 'rgba(0, 217, 255, 0.08)', borderColor: isDark ? 'rgba(0, 217, 255, 0.2)' : 'rgba(0, 217, 255, 0.3)', borderWidth: 1 }]}>
                  <Text style={{ color: accent, fontSize: 24, fontWeight: '900', marginRight: 12 }}>R$</Text>
                  <TextInput style={{ color: textPrimary, fontSize: 32, flex: 1, fontWeight: '900' }} keyboardType="numeric" value={price} onChangeText={setPrice} />
                </Animated.View>
              )}
              <View style={{ width: '100%', marginTop: 20 }}>
                <Text style={[styles.label, { color: accent, marginBottom: 8 }]}>LINK PARA COMPRA DE INGRESSOS (OPCIONAL)</Text>
                <View style={[styles.selectorButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderWidth: 1, flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 16 }]}>
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

          {currentStep === 4 && (
            <Animated.View entering={FadeInRight} style={styles.stepContainer}>
              <TouchableOpacity style={styles.publishButton} onPress={handleUpdate} disabled={loading}>
                <LinearGradient colors={['#00d9ff', '#ff1493']} style={styles.publishGradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishText}>SALVAR ALTERAÇÕES</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Navigation Buttons */}
      {currentStep < 4 && (
        <View style={[styles.fabContainer, { bottom: insets.bottom + 20 }]}>
          <View style={styles.fabRow}>
            <TouchableOpacity style={styles.fab} onPress={prevStep}><ArrowLeft size={28} color="#fff" /></TouchableOpacity>
            <TouchableOpacity style={styles.fab} onPress={nextStep}><ArrowRight size={28} color="#fff" /></TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modals copied from create.tsx */}
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
          router.push('/(tabs)');
        }} 
        onViewEvent={() => {
          setShowSuccessModal(false);
          router.push(`/event/${id}`);
        }} 
        title="Evento Atualizado!" 
      />
      
      {/* Category Modal */}
      <Modal visible={showCatModal} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: backgroundPrimary }]}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 20 }]}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>Categorias</Text>
            <TouchableOpacity onPress={() => setShowCatModal(false)}><X size={24} color={textPrimary} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {categories.map(cat => (
              <TouchableOpacity key={cat.id} style={styles.subcatItem} onPress={() => { setSelectedCategory(cat.id); setShowCatModal(false); }}>
                <Text style={{ color: textPrimary }}>{cat.icon} {cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Date/Time Pickers */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.pickerModalContainer}>
            <View style={[styles.pickerSheet, { backgroundColor: backgroundSecondary }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={{ color: textSecondary, fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800' }}>Selecionar Data</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={{ color: accent, fontSize: 16, fontWeight: '700' }}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={new Date(eventDate + 'T00:00:00')}
                mode="date"
                display="spinner"
                textColor={textPrimary}
                onChange={(e, d) => {
                  if (d) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
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
            onChange={(e, d) => {
              setShowDatePicker(false);
              if (d) setEventDate(getLocalDateString(d));
            }}
          />
        )
      )}

      {Platform.OS === 'ios' ? (
        <Modal visible={showTimePicker} transparent animationType="slide">
          <View style={styles.pickerModalContainer}>
            <View style={[styles.pickerSheet, { backgroundColor: backgroundSecondary }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={{ color: textSecondary, fontSize: 16, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800' }}>Horário de Início</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={{ color: accent, fontSize: 16, fontWeight: '700' }}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={new Date(`${eventDate}T${eventTime}`)}
                mode="time"
                display="spinner"
                is24Hour
                textColor={textPrimary}
                onChange={(e, d) => {
                  if (d) {
                    setEventTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showTimePicker && (
          <DateTimePicker
            value={new Date(`${eventDate}T${eventTime}`)}
            mode="time"
            display="default"
            is24Hour
            onChange={(e, d) => {
              setShowTimePicker(false);
              if (d) setEventTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
            }}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24 },
  stepHeader: { paddingBottom: 20 },
  backCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  stepInfo: { marginBottom: 24 },
  stepTitle: { fontSize: 28, fontWeight: '900' },
  stepSubtitle: { fontSize: 16, opacity: 0.5 },
  progressBarBg: { height: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%' },
  stepContainer: { flex: 1 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  mediaItem: { width: (SCREEN_WIDTH - 60) / 2, height: 180, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  mediaPreview: { width: '100%', height: '100%' },
  removeMediaBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,0,0,0.7)', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  mediaPickerSmall: { width: (SCREEN_WIDTH - 60) / 2, height: 180, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 12, opacity: 0.6 },
  hugeInput: { fontSize: 24, fontWeight: '800', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 20 },
  textArea: { fontSize: 16, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 20, height: 120, textAlignVertical: 'top' },
  selectorButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 20 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 16, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 12 },
  glassButton: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 16, gap: 12 },
  premiumCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', padding: 24, borderRadius: 20 },
  priceBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 20, paddingHorizontal: 24, height: 80, marginTop: 12 },
  publishButton: { borderRadius: 24, overflow: 'hidden', height: 64 },
  publishGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  publishText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  fabContainer: { position: 'absolute', left: 24, right: 24 },
  fabRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fab: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900' },
  modalScroll: { paddingHorizontal: 24, paddingBottom: 40 },
  subcatItem: { padding: 16, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12, marginBottom: 8 },
  pickerModalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
});
