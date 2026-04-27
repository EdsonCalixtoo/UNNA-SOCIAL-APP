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
  SafeAreaView,
  Pressable,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '@/utils/responsive';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/Colors';
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
  Check, 
  X,
  Plus,
  ChevronRight,
  Info,
  Layers,
  Flag
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInRight, 
  FadeOutLeft, 
  Layout, 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';


import StoryCameraModal from '@/components/StoryCameraModal';
import StoryAdvancedEditor from '@/components/StoryAdvancedEditor';
import SuccessModal from '@/components/SuccessModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STEPS = ['Capa', 'Detalhes', 'Regras', 'Publicar'];

export default function CreateEvent() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // PASSO 1: Mídia, Título, Descrição
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [showCamera, setShowCamera] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);

  // PASSO 2: Categoria, Data, Hora, Local
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState(() => `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`);
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // PASSO 3: Financeiro e Idade
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [minAge, setMinAge] = useState('0');
  const [maxParticipants, setMaxParticipants] = useState('');

  // SUCESSO
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  const progress = useSharedValue(0.25);

  useEffect(() => {
    progress.value = withSpring((currentStep + 1) / STEPS.length);
  }, [currentStep]);

  useEffect(() => { loadCategories(); }, []);
  const loadCategories = async () => { const { data } = await supabase.from('categories').select('*').order('name'); if (data) setCategories(data); };
  const loadSubcategories = async (categoryId: string) => { const { data } = await supabase.from('subcategories').select('*').eq('category_id', categoryId).order('name'); if (data) setSubcategories(data); };
  useEffect(() => { if (selectedCategory) loadSubcategories(selectedCategory); }, [selectedCategory]);

  const handleCapture = (uri: string, type: 'image' | 'video') => { setCapturedMedia({ uri, type }); setShowCamera(false); setShowEditor(true); };
  const handleSaveEditor = (finalUri: string) => { 
    setMediaUrl(finalUri); 
    setMediaType('image'); 
    setShowEditor(false); 
  };

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const extension = mediaType === 'video' ? 'mp4' : 'jpg';
      const fileName = `${user.id}/${Date.now()}.${extension}`;
      
      const base64 = await FileSystem.readAsStringAsync(mediaUrl, { encoding: FileSystem.EncodingType.Base64 });
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(`events/${fileName}`, decode(base64), { 
          contentType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(`events/${fileName}`);

      const { data: eventData, error } = await supabase.from('events').insert({
        creator_id: user.id, 
        title, 
        description, 
        image_url: publicUrl, 
        media_type: mediaType, 
        event_date: eventDate, 
        event_time: eventTime, 
        location_name: locationName,
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

      await supabase.from('posts').insert({
        user_id: user.id,
        content: description,
        image_url: publicUrl,
        event_id: eventData.id
      });

      setCreatedEventId(eventData.id);
      setShowSuccessModal(true);
    } catch (e: any) { 
      Alert.alert('Erro', e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const nextStep = () => {
    if (currentStep === 0 && (!title || !mediaUrl)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Aviso', 'Título e Capa são obrigatórios');
    }
    if (currentStep === 1 && !selectedCategory) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return Alert.alert('Aviso', 'Escolha uma categoria');
    }
    if (currentStep < 3) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(currentStep - 1);
    }
  };

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + vs(10) }]}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerSubtitle}>Passo {currentStep + 1} de {STEPS.length}</Text>
          <Text style={styles.headerTitle}>{STEPS[currentStep]}</Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <X size={ms(24)} color={Colors.text.tertiary} />
        </TouchableOpacity>
      </View>
      <View style={styles.progressWrapper}>
        {STEPS.map((_, index) => (
          <View key={index} style={styles.progressStepContainer}>
            <View 
              style={[
                styles.progressStep, 
                index <= currentStep && { backgroundColor: Colors.accent.cyan },
                index < currentStep && { opacity: 0.5 }
              ]} 
            />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={{ paddingBottom: vs(40) }} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          {currentStep === 0 && (
             <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.page}>
                <TouchableOpacity activeOpacity={0.8} style={styles.mediaContainer} onPress={() => setShowCamera(true)}>
                   {mediaUrl ? (
                      <View style={{ flex: 1 }}>
                         {mediaType === 'video' ? (
                            <Video 
                              source={{ uri: mediaUrl }} 
                              style={styles.media} 
                              resizeMode={ResizeMode.COVER} 
                              isLooping 
                              shouldPlay 
                              isMuted 
                            />
                         ) : (
                            <Image source={{ uri: mediaUrl }} style={styles.media} />
                         )}
                         <BlurView intensity={30} style={styles.mediaEditOverlay}>
                           <Camera size={ms(20)} color="#fff" />
                           <Text style={styles.mediaEditText}>Alterar Capa</Text>
                         </BlurView>
                      </View>
                   ) : (
                      <LinearGradient 
                        colors={['#1a1a1a', '#2d2d2d']} 
                        style={styles.mediaPlaceholder}
                      >
                         <View style={styles.cameraIconContainer}>
                           <Camera size={ms(32)} color={Colors.accent.cyan} />
                         </View>
                         <Text style={styles.mediaPlaceholderTitle}>Adicionar Capa</Text>
                         <Text style={styles.mediaPlaceholderSub}>Foto ou vídeo (até 15s)</Text>
                      </LinearGradient>
                   )}
                </TouchableOpacity>

                <View style={styles.inputSection}>
                   <View style={styles.inputLabelContainer}>
                     <Text style={styles.inputLabel}>NOME DO EVENTO</Text>
                   </View>
                   <TextInput 
                     style={styles.mainInput} 
                     value={title} 
                     onChangeText={setTitle} 
                     placeholder="Dê um título incrível..." 
                     placeholderTextColor={Colors.text.tertiary} 
                   />
                </View>

                <View style={[styles.inputSection, { marginTop: vs(30) }]}>
                   <View style={styles.inputLabelContainer}>
                     <Text style={styles.inputLabel}>DESCRIÇÃO</Text>
                   </View>
                   <TextInput 
                     style={[styles.mainInput, styles.descriptionInput]} 
                     value={description} 
                     onChangeText={setDescription} 
                     multiline 
                     placeholder="O que os convidados devem saber?" 
                     placeholderTextColor={Colors.text.tertiary} 
                   />
                </View>
             </Animated.View>
          )}

          {currentStep === 1 && (
             <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.page}>
                <View style={styles.sectionHeader}>
                  <Layers size={ms(18)} color={Colors.accent.cyan} />
                  <Text style={styles.sectionTitle}>Categoria</Text>
                </View>
                
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.categoryList}
                >
                   {categories.map(c => (
                      <TouchableOpacity 
                        key={c.id} 
                        activeOpacity={0.7}
                        style={[styles.categoryCard, selectedCategory === c.id && styles.categoryCardActive]} 
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedCategory(c.id);
                          setSelectedSubcategory('');
                        }}
                      >
                         <Text style={styles.categoryIcon}>{c.icon}</Text>
                         <Text style={[styles.categoryName, selectedCategory === c.id && styles.categoryNameActive]}>{c.name}</Text>
                         {selectedCategory === c.id && (
                           <View style={styles.checkBadge}>
                             <Check size={ms(10)} color="#fff" strokeWidth={4} />
                           </View>
                         )}
                      </TouchableOpacity>
                   ))}
                </ScrollView>

                {selectedCategory && subcategories.length > 0 && (
                  <Animated.View entering={FadeInRight} style={{ marginTop: vs(25) }}>
                    <View style={styles.sectionHeader}>
                      <Plus size={ms(18)} color={Colors.accent.cyan} />
                      <Text style={styles.sectionTitle}>Subcategoria</Text>
                    </View>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      contentContainerStyle={styles.categoryList}
                    >
                       {subcategories.map(s => (
                          <TouchableOpacity 
                            key={s.id} 
                            activeOpacity={0.7}
                            style={[styles.subcatCard, selectedSubcategory === s.id && styles.subcatCardActive]} 
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setSelectedSubcategory(s.id);
                            }}
                          >
                             <Text style={[styles.categoryName, selectedSubcategory === s.id && styles.categoryNameActive]}>{s.name}</Text>
                          </TouchableOpacity>
                       ))}
                    </ScrollView>
                  </Animated.View>
                )}

                <View style={[styles.sectionHeader, { marginTop: vs(40) }]}>
                  <Calendar size={ms(18)} color={Colors.accent.pink} />
                  <Text style={styles.sectionTitle}>Data e Hora</Text>
                </View>

                <View style={styles.dateTimeRow}>
                   <TouchableOpacity 
                     style={styles.dateTimeButton} 
                     onPress={() => setShowDatePicker(true)}
                   >
                      <View style={styles.dtIconContainer}>
                        <Calendar size={ms(20)} color={Colors.accent.cyan} />
                      </View>
                     <View>
                        <Text style={styles.dtLabel}>Data</Text>
                        <Text style={styles.dtValue}>{new Date(eventDate).toLocaleDateString('pt-BR')}</Text>
                     </View>
                   </TouchableOpacity>

                   <TouchableOpacity 
                     style={styles.dateTimeButton} 
                     onPress={() => setShowTimePicker(true)}
                   >
                      <View style={styles.dtIconContainer}>
                        <Clock size={ms(20)} color={Colors.accent.pink} />
                      </View>
                     <View>
                        <Text style={styles.dtLabel}>Hora</Text>
                        <Text style={styles.dtValue}>{eventTime}</Text>
                     </View>
                   </TouchableOpacity>
                </View>

                <View style={[styles.sectionHeader, { marginTop: vs(40) }]}>
                  <MapPin size={ms(18)} color={Colors.accent.cyan} />
                  <Text style={styles.sectionTitle}>Localização</Text>
                </View>
                
                <View style={styles.locationContainer}>
                   <GooglePlacesAutocomplete
                     placeholder="Buscar endereços ou lugares..."
                     onPress={(data, details = null) => {
                       setLocationName(data.description || data.structured_formatting?.main_text || '');
                       if (details) {
                         setLat(details.geometry.location.lat);
                         setLng(details.geometry.location.lng);
                       }
                     }}
                     fetchDetails={true}
                     query={{
                       key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
                       language: 'pt-BR',
                       types: 'geocode|establishment',
                     }}
                     styles={{
                       container: { flex: 0 },
                       textInput: styles.locationInput,
                       description: { color: '#fff' },
                       predefinedPlacesDescription: { color: '#fff' },
                       listView: [styles.autocompleteList, { position: 'relative' }],
                       row: styles.autocompleteRow,
                       separator: styles.autocompleteSeparator,
                     }}
                     enablePoweredByContainer={false}
                     textInputProps={{
                       placeholderTextColor: Colors.text.tertiary,
                       value: locationName,
                       onChangeText: setLocationName,
                     }}
                   />
                </View>
             </Animated.View>
          )}

          {currentStep === 2 && (
             <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.page}>
                <View style={styles.sectionHeader}>
                  <DollarSign size={ms(18)} color={Colors.status.success} />
                  <Text style={styles.sectionTitle}>Ingressos</Text>
                </View>
                
                <TouchableOpacity 
                   activeOpacity={0.8}
                   onPress={() => {
                     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                     setIsPaid(!isPaid);
                   }}
                   style={[styles.premiumToggle, isPaid && styles.premiumToggleActive]}
                >
                   <View style={styles.toggleInfo}>
                      <Text style={styles.toggleText}>Evento Pago</Text>
                      <Text style={styles.toggleSub}>{isPaid ? 'Os participantes pagam para entrar' : 'Evento gratuito para todos'}</Text>
                   </View>
                   <Switch 
                     value={isPaid} 
                     onValueChange={(val) => {
                       Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                       setIsPaid(val);
                     }}
                     trackColor={{ false: '#333', true: Colors.status.success }} 
                     thumbColor="#fff"
                   />
                </TouchableOpacity>

                {isPaid && (
                  <Animated.View entering={FadeInRight} style={styles.priceContainer}>
                    <Text style={styles.priceSymbol}>R$</Text>
                    <TextInput 
                      style={styles.priceInput} 
                      value={price} 
                      onChangeText={setPrice} 
                      keyboardType="numeric" 
                      placeholder="0,00" 
                      placeholderTextColor="#444" 
                    />
                  </Animated.View>
                )}

                <View style={[styles.sectionHeader, { marginTop: vs(40) }]}>
                  <Users size={ms(18)} color={Colors.accent.cyan} />
                  <Text style={styles.sectionTitle}>Restrições e Limites</Text>
                </View>

                <View style={styles.limitsGrid}>
                   <View style={styles.limitItem}>
                      <View style={styles.limitIconBg}>
                        <Flag size={ms(18)} color={Colors.accent.pink} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.limitLabel}>Idade Mínima</Text>
                        <TextInput 
                          style={styles.limitInput} 
                          value={minAge} 
                          onChangeText={setMinAge} 
                          keyboardType="numeric" 
                          placeholder="Livre" 
                          placeholderTextColor={Colors.text.tertiary} 
                        />
                      </View>
                   </View>

                   <View style={styles.limitItem}>
                      <View style={styles.limitIconBg}>
                        <Users size={ms(18)} color={Colors.accent.cyan} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.limitLabel}>Vagas</Text>
                        <TextInput 
                          style={styles.limitInput} 
                          value={maxParticipants} 
                          onChangeText={setMaxParticipants} 
                          keyboardType="numeric" 
                          placeholder="∞" 
                          placeholderTextColor={Colors.text.tertiary} 
                        />
                      </View>
                   </View>
                </View>
                
                <View style={styles.infoBox}>
                  <Info size={ms(16)} color={Colors.text.tertiary} />
                  <Text style={styles.infoText}>Você pode alterar essas informações depois que o evento estiver publicado.</Text>
                </View>
             </Animated.View>
          )}

          {currentStep === 3 && (
             <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.page}>
                <View style={styles.reviewCard}>
                   <View style={styles.reviewMedia}>
                      {mediaType === 'video' ? (
                        <Video 
                          source={{ uri: mediaUrl }} 
                          style={styles.finalMedia} 
                          isLooping 
                          shouldPlay 
                          isMuted 
                          resizeMode={ResizeMode.COVER} 
                        />
                      ) : (
                        <Image source={{ uri: mediaUrl }} style={styles.finalMedia} />
                      )}
                      <LinearGradient 
                        colors={['transparent', 'rgba(0,0,0,0.8)']} 
                        style={styles.mediaShadow} 
                      />
                      <View style={styles.mediaLabel}>
                        <Text style={styles.mediaLabelText}>{categories.find(c => c.id === selectedCategory)?.name || 'Evento'}</Text>
                      </View>
                   </View>
                   
                   <View style={styles.reviewInfo}>
                      <Text style={styles.reviewTitle}>{title}</Text>
                      
                      <View style={styles.reviewDetailsRow}>
                        <View style={styles.reviewDetail}>
                          <Calendar size={ms(14)} color={Colors.accent.cyan} />
                          <Text style={styles.reviewDetailText}>{new Date(eventDate).toLocaleDateString('pt-BR')}</Text>
                        </View>
                        <View style={styles.reviewDetail}>
                          <Clock size={ms(14)} color={Colors.accent.cyan} />
                          <Text style={styles.reviewDetailText}>{eventTime}</Text>
                        </View>
                      </View>

                      <View style={styles.reviewDetail}>
                        <MapPin size={ms(14)} color={Colors.accent.pink} />
                        <Text style={styles.reviewDetailText} numberOfLines={1}>{locationName}</Text>
                      </View>

                      <View style={styles.reviewDivider} />
                      
                      <Text style={styles.reviewDesc} numberOfLines={3}>{description}</Text>

                      <View style={styles.reviewBadges}>
                        <View style={[styles.badge, { backgroundColor: isPaid ? 'rgba(52, 199, 89, 0.1)' : 'rgba(0, 217, 255, 0.1)' }]}>
                          <Text style={[styles.badgeText, { color: isPaid ? Colors.status.success : Colors.accent.cyan }]}>
                            {isPaid ? `R$ ${price}` : 'Grátis'}
                          </Text>
                        </View>
                        {parseInt(minAge) > 0 && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>{minAge}+ Anos</Text>
                          </View>
                        )}
                      </View>
                   </View>
                </View>

                <TouchableOpacity 
                  style={styles.publishButton} 
                  onPress={handleCreate} 
                  disabled={loading}
                >
                   {loading ? (
                     <ActivityIndicator color="#000" />
                   ) : (
                     <View style={styles.publishContent}>
                        <Text style={styles.publishButtonText}>PUBLICAR EVENTO</Text>
                        <ArrowRight size={ms(20)} color="#000" strokeWidth={3} />
                     </View>
                   )}
                </TouchableOpacity>
             </Animated.View>
          )}

        </ScrollView>
        <View style={styles.navFooterContainer}>
          <BlurView 
            intensity={80} 
            tint="dark" 
            style={styles.navFooter}
          >
            {currentStep > 0 ? (
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={prevStep}
                activeOpacity={0.7}
              >
                <ArrowLeft size={ms(22)} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <X size={ms(22)} color="#fff" />
              </TouchableOpacity>
            )}

            <View style={styles.stepDots}>
              {STEPS.map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.stepDot, 
                    i === currentStep && styles.stepDotActive,
                    i === currentStep && { backgroundColor: Colors.accent.cyan }
                  ]} 
                />
              ))}
            </View>

            {currentStep < 3 ? (
              <TouchableOpacity 
                  style={[styles.nextButton, { backgroundColor: Colors.accent.cyan }]} 
                  onPress={nextStep}
                  activeOpacity={0.8}
              >
                  <Text style={styles.nextButtonText}>Avançar</Text>
                  <ArrowRight size={ms(20)} color="#000" strokeWidth={3} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: s(44) }} />
            )}
          </BlurView>
        </View>
      </KeyboardAvoidingView>

      <StoryCameraModal visible={showCamera} onClose={() => setShowCamera(false)} onCapture={handleCapture} />
      {capturedMedia && (
        <StoryAdvancedEditor 
          visible={showEditor} 
          mediaUri={capturedMedia.uri} 
          mediaType={capturedMedia.type} 
          mode="event" 
          onClose={() => setShowEditor(false)} 
          onSave={handleSaveEditor} 
        />
      )}
      <SuccessModal 
        visible={showSuccessModal} 
        onClose={() => { setShowSuccessModal(false); router.push('/(tabs)'); }} 
        onViewEvent={() => router.push({ pathname: '/event/[id]', params: { id: createdEventId || '' } } as any)} 
        title="Evento postado com sucesso!" 
      />
      <Modal 
        visible={showDatePicker} 
        transparent 
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Selecionar Data</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.doneText}>Concluir</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker 
              value={new Date(eventDate)} 
              mode="date" 
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'} 
              themeVariant="dark"
              onChange={(e, d) => { 
                if(d) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEventDate(d.toISOString().split('T')[0]);
                }
              }} 
            />
          </BlurView>
        </View>
      </Modal>

      <Modal 
        visible={showTimePicker} 
        transparent 
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Selecionar Horário</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.doneText}>Concluir</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker 
              value={new Date(`${eventDate}T${eventTime}`)} 
              mode="time" 
              display="spinner" 
              is24Hour 
              themeVariant="dark"
              onChange={(e, d) => { 
                if(d) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEventTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                }
              }} 
            />
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  
  header: {
    paddingHorizontal: s(25),
    paddingBottom: vs(20),
    backgroundColor: '#000',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: vs(20),
  },
  closeButton: {
    width: s(44),
    height: s(44),
    borderRadius: ms(22),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtitle: {
    color: Colors.accent.cyan,
    fontSize: ms(10),
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: vs(4),
  },
  headerTitle: {
    color: '#fff',
    fontSize: ms(28),
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  progressWrapper: {
    flexDirection: 'row',
    gap: s(8),
    width: '100%',
  },
  progressStepContainer: {
    flex: 1,
    height: vs(4),
  },
  progressStep: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: ms(2),
  },

  content: { flex: 1 },
  page: { paddingHorizontal: s(25), paddingTop: vs(10) },
  
  mediaContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: ms(32),
    overflow: 'hidden',
    marginBottom: vs(35),
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(20) },
    shadowOpacity: 0.5,
    shadowRadius: ms(30),
    elevation: 20,
  },
  media: { flex: 1, width: '100%', height: '100%' },
  mediaPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  cameraIconContainer: {
    width: s(80),
    height: s(80),
    borderRadius: ms(40),
    backgroundColor: 'rgba(0, 217, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(15),
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
  mediaPlaceholderTitle: {
    color: '#fff',
    fontSize: ms(20),
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  mediaPlaceholderSub: {
    color: Colors.text.tertiary,
    fontSize: ms(14),
    marginTop: vs(6),
    opacity: 0.7,
  },
  mediaEditOverlay: {
    position: 'absolute',
    bottom: vs(20),
    right: s(20),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
    borderRadius: ms(24),
    gap: s(8),
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mediaEditText: {
    color: '#fff',
    fontSize: ms(14),
    fontWeight: '700',
  },

  inputSection: {
    width: '100%',
  },
  inputLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(12),
    opacity: 0.6,
  },
  inputLabel: {
    color: '#fff',
    fontSize: ms(10),
    fontWeight: '900',
    letterSpacing: 2,
  },
  mainInput: {
    color: '#fff',
    fontSize: ms(20),
    fontWeight: '600',
    paddingVertical: vs(12),
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  descriptionInput: {
    fontSize: ms(16),
    height: vs(120),
    textAlignVertical: 'top',
    lineHeight: ms(24),
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    marginBottom: vs(20),
  },
  sectionTitle: {
    color: '#fff',
    fontSize: ms(18),
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  categoryList: {
    paddingRight: s(25),
    paddingVertical: vs(5),
  },
  categoryCard: {
    width: s(110),
    height: vs(135),
    backgroundColor: '#0F0F0F',
    borderRadius: ms(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(16),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  categoryCardActive: {
    borderColor: Colors.accent.cyan,
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
    shadowColor: Colors.accent.cyan,
    shadowOffset: { width: 0, height: vs(10) },
    shadowOpacity: 0.2,
    shadowRadius: ms(15),
    elevation: 10,
  },
  categoryIcon: {
    fontSize: ms(36),
    marginBottom: vs(12),
  },
  categoryName: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: ms(12),
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryNameActive: {
    color: '#fff',
  },
  checkBadge: {
    position: 'absolute',
    top: vs(12),
    right: s(12),
    backgroundColor: Colors.accent.cyan,
    width: s(22),
    height: s(22),
    borderRadius: ms(11),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0F0F0F',
  },

  dateTimeRow: {
    flexDirection: 'row',
    gap: s(16),
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    padding: s(16),
    borderRadius: ms(24),
    gap: s(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dtIconContainer: {
    width: s(44),
    height: s(44),
    borderRadius: ms(14),
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dtLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: ms(10),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: vs(2),
  },
  dtValue: {
    color: '#fff',
    fontSize: ms(15),
    fontWeight: '800',
  },

  locationContainer: {
    zIndex: 10,
  },
  locationInput: {
    backgroundColor: '#0F0F0F',
    borderRadius: ms(24),
    paddingHorizontal: s(20),
    height: vs(64),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: ms(15),
    fontWeight: '600',
  },
  autocompleteList: {
    backgroundColor: '#0F0F0F',
    borderRadius: ms(24),
    marginTop: vs(8),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: ms(8),
  },
  autocompleteRow: {
    backgroundColor: 'transparent',
    padding: ms(16),
    borderRadius: ms(16),
  },
  autocompleteSeparator: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    height: 1,
  },
  subcatCard: {
    paddingHorizontal: s(22),
    paddingVertical: vs(14),
    backgroundColor: '#0F0F0F',
    borderRadius: ms(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(10),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  subcatCardActive: {
    borderColor: Colors.accent.cyan,
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    borderTopLeftRadius: ms(40),
    borderTopRightRadius: ms(40),
    padding: ms(25),
    paddingBottom: vs(50),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(25),
  },
  pickerTitle: {
    color: '#fff',
    fontSize: ms(20),
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  doneText: {
    color: Colors.accent.cyan,
    fontSize: ms(17),
    fontWeight: '800',
  },
  
  premiumToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    padding: s(24),
    borderRadius: ms(30),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  premiumToggleActive: {
    borderColor: Colors.status.success,
    backgroundColor: 'rgba(52, 199, 89, 0.05)',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleText: {
    color: '#fff',
    fontSize: ms(18),
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  toggleSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: ms(14),
    marginTop: vs(4),
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    marginTop: vs(16),
    paddingHorizontal: s(24),
    height: vs(72),
    borderRadius: ms(24),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  priceSymbol: {
    color: Colors.status.success,
    fontSize: ms(24),
    fontWeight: '900',
    marginRight: s(12),
  },
  priceInput: {
    flex: 1,
    color: '#fff',
    fontSize: ms(32),
    fontWeight: '900',
  },
  limitsGrid: {
    flexDirection: 'row',
    gap: s(16),
  },
  limitItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    padding: s(16),
    borderRadius: ms(24),
    gap: s(12),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  limitIconBg: {
    width: s(40),
    height: s(40),
    borderRadius: ms(12),
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: ms(10),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  limitInput: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '800',
    marginTop: vs(4),
  },
  infoBox: {
    flexDirection: 'row',
    gap: s(12),
    marginTop: vs(35),
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: s(20),
    borderRadius: ms(24),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  infoText: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: ms(13),
    lineHeight: ms(20),
  },

  reviewCard: {
    backgroundColor: '#0F0F0F',
    borderRadius: ms(40),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(20) },
    shadowOpacity: 0.4,
    shadowRadius: ms(30),
    elevation: 15,
  },
  reviewMedia: {
    width: '100%',
    height: vs(280),
  },
  finalMedia: {
    width: '100%',
    height: '100%',
  },
  mediaShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: vs(120),
  },
  mediaLabel: {
    position: 'absolute',
    top: vs(24),
    left: s(24),
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: ms(20),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mediaLabelText: {
    color: '#fff',
    fontSize: ms(12),
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  reviewInfo: {
    padding: s(30),
  },
  reviewTitle: {
    color: '#fff',
    fontSize: ms(32),
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: vs(20),
  },
  reviewDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(20),
    marginBottom: vs(12),
  },
  reviewDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(12),
  },
  reviewDetailText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: ms(15),
    fontWeight: '600',
  },
  reviewDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: vs(20),
  },
  reviewDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: ms(15),
    lineHeight: ms(24),
    marginBottom: vs(25),
  },
  reviewBadges: {
    flexDirection: 'row',
    gap: s(12),
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: s(16),
    paddingVertical: vs(10),
    borderRadius: ms(16),
  },
  badgeText: {
    color: '#fff',
    fontSize: ms(13),
    fontWeight: '800',
  },

  publishButton: {
    backgroundColor: Colors.accent.cyan,
    marginTop: vs(40),
    height: vs(72),
    borderRadius: ms(30),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent.cyan,
    shadowOffset: { width: 0, height: vs(12) },
    shadowOpacity: 0.4,
    shadowRadius: ms(20),
    elevation: 10,
  },
  publishContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  publishButtonText: {
    color: '#000',
    fontSize: ms(18),
    fontWeight: '900',
    letterSpacing: 1,
  },

  navFooterContainer: {
    paddingHorizontal: s(20),
    paddingBottom: vs(20),
    backgroundColor: '#000',
  },
  navFooter: {
    paddingHorizontal: s(12),
    paddingVertical: vs(12),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: ms(36),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(15) },
    shadowOpacity: 0.5,
    shadowRadius: ms(30),
    elevation: 20,
  },
  backButton: {
    width: s(52),
    height: s(52),
    borderRadius: ms(26),
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepDots: {
    flexDirection: 'row',
    gap: s(8),
    alignItems: 'center',
  },
  stepDot: {
    width: s(6),
    height: s(6),
    borderRadius: ms(3),
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  stepDotActive: {
    width: s(12),
    height: s(6),
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(24),
    height: vs(52),
    borderRadius: ms(26),
    gap: s(8),
  },
  nextButtonText: {
    color: '#000',
    fontSize: ms(16),
    fontWeight: '900',
  },
});
