import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, ActivityIndicator, Alert, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Category, Subcategory } from '@/types/database';
import { Calendar, Clock, MapPin, Users, DollarSign, Image as ImageIcon, ArrowRight, ArrowLeft, Check, Upload, Locate, Edit3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { notifyFollowersAboutNewEvent } from '@/lib/notifications';
import SuccessModal from '@/components/SuccessModal';
import { uploadImage } from '@/lib/storage';
import ImageEditor from '@/components/ImageEditor';

const STEPS = ['Básico', 'Detalhes', 'Revisar'];

export default function CreateEvent() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [animationTrigger, setAnimationTrigger] = useState(0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [eventDate, setEventDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [eventTime, setEventTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [locationName, setLocationName] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{latitude: number, longitude: number} | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [maxParticipants, setMaxParticipants] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);

  useEffect(() => {
    setCategories([]);
    loadCategories();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  useEffect(() => {
    if (selectedCategory) {
      loadSubcategories(selectedCategory);
    } else {
      setSubcategories([]);
      setSelectedSubcategory('');
    }
  }, [selectedCategory]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (locationName.length > 2) {
        searchLocation(locationName);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [locationName]);

  const loadCategories = async () => {
    try {
      console.log('[CreateEvent] Loading categories...');
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      console.log('[CreateEvent] Categories loaded:', { count: data?.length, error });
      if (error) {
        console.error('[CreateEvent] Error:', error);
        throw error;
      }
      setCategories(data || []);
      console.log('[CreateEvent] Categories set in state:', data?.length);
      console.log('[CreateEvent] Category names:', data?.map(c => c.name).join(', '));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSubcategories = async (categoryId: string) => {
    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .order('name');

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };

  const searchLocation = async (query: string) => {
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

      if (!apiKey || apiKey === 'YOUR_GOOGLE_PLACES_API_KEY_HERE') {
        console.warn('Google Places API Key not configured, falling back to Nominatim');
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1${userLocation ? `&lat=${userLocation.latitude}&lon=${userLocation.longitude}` : ''}`,
          {
            headers: {
              'User-Agent': 'EventApp/1.0',
            },
          }
        );
        const data = await response.json();
        setLocationSuggestions(data);
        setShowSuggestions(data.length > 0);
        return;
      }

      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${apiKey}&language=pt-BR`;

      if (userLocation) {
        url += `&location=${userLocation.latitude},${userLocation.longitude}&radius=50000`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.predictions) {
        const placesWithDetails = await Promise.all(
          data.predictions.map(async (prediction: any) => {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&key=${apiKey}&fields=geometry,formatted_address`;
            const detailsResponse = await fetch(detailsUrl);
            const detailsData = await detailsResponse.json();

            return {
              place_id: prediction.place_id,
              description: prediction.description,
              display_name: prediction.description,
              lat: detailsData.result?.geometry?.location?.lat,
              lon: detailsData.result?.geometry?.location?.lng,
            };
          })
        );

        setLocationSuggestions(placesWithDetails);
        setShowSuggestions(placesWithDetails.length > 0);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      setEventDate(date.toISOString().split('T')[0]);
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (time) {
      setSelectedTime(time);
      setEventTime(`${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`);
    }
  };

  const selectLocation = (place: any) => {
    setLocationName(place.display_name || place.description);
    if (place.lat && place.lon) {
      setSelectedCoordinates({
        latitude: parseFloat(place.lat),
        longitude: parseFloat(place.lon)
      });
    }
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const canGoNext = () => {
    if (currentStep === 0) {
      return title.trim() !== '' && description.trim() !== '' && imageUrl.trim() !== '';
    }
    if (currentStep === 1) {
      return selectedCategory !== '' && eventDate.trim() !== '' && eventTime.trim() !== '' && locationName.trim() !== '';
    }
    return true;
  };

  const handleNext = () => {
    if (canGoNext()) {
      setAnimationTrigger(animationTrigger + 1);
      setCurrentStep(currentStep + 1);
    } else {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setAnimationTrigger(animationTrigger + 1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreate = async () => {
    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado para criar um evento');
      return;
    }

    setLoading(true);

    try {
      let uploadedImageUrl = imageUrl;

      if (imageUrl && !imageUrl.startsWith('http')) {
        const uploaded = await uploadImage(
          imageUrl,
          'media',
          'events',
          user.id
        );

        if (uploaded) {
          uploadedImageUrl = uploaded;
        } else {
          Alert.alert('Aviso', 'Não foi possível fazer upload da imagem. Continuando sem imagem.');
          uploadedImageUrl = '';
        }
      }

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert({
          creator_id: user.id,
          title,
          description,
          image_url: uploadedImageUrl || null,
          event_date: eventDate,
          event_time: eventTime,
          location_name: locationName,
          latitude: selectedCoordinates?.latitude || null,
          longitude: selectedCoordinates?.longitude || null,
          max_participants: maxParticipants ? parseInt(maxParticipants) : 0,
          is_paid: isPaid,
          price: isPaid && price ? parseFloat(price) : 0,
          category_id: selectedCategory,
          subcategory_id: selectedSubcategory || null,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: `Novo evento: ${title}`,
          image_url: uploadedImageUrl || null,
          event_id: eventData.id,
        });

      if (postError) throw postError;

      await notifyFollowersAboutNewEvent(user.id, eventData.id, title);

      setCreatedEventId(eventData.id);
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Erro ao criar evento');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    const today = new Date();
    setEventDate(today.toISOString().split('T')[0]);
    const now = new Date();
    setEventTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setLocationName('');
    setSelectedCoordinates(null);
    setMaxParticipants('');
    setIsPaid(false);
    setPrice('');
    setSelectedCategory('');
    setSelectedSubcategory('');
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    resetForm();
    setCurrentStep(0);
    router.push('/(tabs)');
  };

  const handleViewEvent = () => {
    setShowSuccessModal(false);
    resetForm();
    setCurrentStep(0);
    if (createdEventId) {
      router.push(`/event/${createdEventId}`);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      <View style={styles.stepsContainer}>
        {STEPS.map((step, index) => (
          <View key={index} style={styles.stepWrapper}>
            <View style={[
              styles.stepDot,
              index <= currentStep && styles.stepDotActive,
              index < currentStep && styles.stepDotCompleted
            ]}>
              {index < currentStep ? (
                <Check size={14} color="#fff" />
              ) : (
                <Text style={[
                  styles.stepNum,
                  index <= currentStep && styles.stepNumActive
                ]}>
                  {index + 1}
                </Text>
              )}
            </View>
            {index < STEPS.length - 1 && (
              <View style={[
                styles.stepConnector,
                index < currentStep && styles.stepConnectorActive
              ]} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.stepsLabels}>
        {STEPS.map((step, index) => (
          <Text key={index} style={[
            styles.stepName,
            index <= currentStep && styles.stepNameActive
          ]}>
            {step}
          </Text>
        ))}
      </View>
    </View>
  );

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à sua galeria para selecionar uma imagem.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUrl(result.assets[0].uri);
        setShowImageEditor(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem. Tente novamente.');
    }
  };

  const handleSaveEditedImage = (editedUri: string) => {
    setImageUrl(editedUri);
    setShowImageEditor(false);
  };

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Crie seu Evento</Text>
      <Text style={styles.stepDescription}>Comece com uma imagem inspiradora</Text>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.imagePickerButton}
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {imageUrl ? (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.imageGradientOverlay}
              >
                <View style={styles.imageOverlay}>
                  <Upload size={28} color="#fff" />
                  <Text style={styles.imageOverlayText}>Mudar Foto</Text>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <View style={styles.uploadIconContainer}>
                <Upload size={44} color="#00d9ff" />
              </View>
              <Text style={styles.imagePlaceholderTitle}>Adicionar Imagem</Text>
              <Text style={styles.imagePlaceholderText}>Escolha uma foto marcante</Text>
            </View>
          )}
        </TouchableOpacity>

        {imageUrl && (
          <TouchableOpacity
            style={styles.editImageButton}
            onPress={() => setShowImageEditor(true)}
            activeOpacity={0.7}
          >
            <Edit3 size={16} color="#fff" />
            <Text style={styles.editImageButtonText}>Editar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Nome do Evento *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Pelada de Futebol no Parque"
          placeholderTextColor="#6E6E73"
          value={title}
          onChangeText={setTitle}
          maxLength={60}
        />
        <Text style={styles.charCount}>{title.length}/60</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Descrição *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descreva seu evento..."
          placeholderTextColor="#6E6E73"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={300}
        />
        <Text style={styles.charCount}>{description.length}/300</Text>
      </View>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Quando e Onde?</Text>
      <Text style={styles.stepDescription}>Localização, data e categoria</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Categoria *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryCard,
                selectedCategory === category.id && styles.categoryCardSelected
              ]}
              onPress={() => setSelectedCategory(category.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={[
                styles.categoryName,
                selectedCategory === category.id && styles.categoryNameSelected
              ]} numberOfLines={2}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {subcategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Subcategoria</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScrollContent}
          >
            {subcategories.map((subcategory) => (
              <TouchableOpacity
                key={subcategory.id}
                style={[
                  styles.chip,
                  selectedSubcategory === subcategory.id && styles.chipSelected
                ]}
                onPress={() => setSelectedSubcategory(subcategory.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.chipText,
                  selectedSubcategory === subcategory.id && styles.chipTextSelected
                ]}>
                  {subcategory.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.dateTimeRow}>
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.label}>Data *</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Calendar size={18} color="#00d9ff" />
            <Text style={styles.dateTimeText} numberOfLines={1}>{eventDate}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.label}>Hora *</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <Clock size={18} color="#ff1493" />
            <Text style={styles.dateTimeText} numberOfLines={1}>{eventTime}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
              is24Hour={true}
            />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Local *</Text>
          {userLocation && (
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => {
                setLocationName('');
                searchLocation('');
              }}
              activeOpacity={0.7}
            >
              <Locate size={14} color="#34C759" />
              <Text style={styles.locationButtonText}>Localização</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.inputIcon}>
          <MapPin size={18} color="#8E8E93" style={styles.icon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="Endereço, local..."
            placeholderTextColor="#6E6E73"
            value={locationName}
            onChangeText={setLocationName}
          />
        </View>
        {showSuggestions && locationSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {locationSuggestions.map((place, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionItem}
                onPress={() => selectLocation(place)}
                activeOpacity={0.6}
              >
                <MapPin size={14} color="#00d9ff" />
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {place.display_name || place.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Últimos Detalhes</Text>
      <Text style={styles.stepDescription}>Participantes e valores</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Máximo de Participantes</Text>
        <View style={styles.inputIcon}>
          <Users size={18} color="#8E8E93" style={styles.icon} />
          <TextInput
            style={[styles.input, styles.inputWithIcon]}
            placeholder="0 = ilimitado"
            placeholderTextColor="#6E6E73"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.hint}>Deixe em branco ou 0 para ilimitado</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.switchCard}>
          <View style={styles.switchContent}>
            <View style={[
              styles.switchIconBg,
              isPaid && styles.switchIconBgPaid
            ]}>
              <DollarSign size={20} color={isPaid ? '#fff' : '#8E8E93'} />
            </View>
            <View style={styles.switchTextContainer}>
              <Text style={styles.switchLabel}>Evento Pago</Text>
              <Text style={styles.switchSubtext}>
                {isPaid ? 'Acesso pago' : 'Evento gratuito'}
              </Text>
            </View>
          </View>
          <Switch
            value={isPaid}
            onValueChange={setIsPaid}
            trackColor={{ false: '#2d2d2d', true: '#34C759' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {isPaid && (
        <View style={styles.section}>
          <Text style={styles.label}>Valor da Entrada (R$)</Text>
          <View style={styles.inputIcon}>
            <DollarSign size={18} color="#34C759" style={styles.icon} />
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="0.00"
              placeholderTextColor="#6E6E73"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      )}

      <View style={styles.reviewCard}>
        <Text style={styles.reviewTitle}>Confira os Detalhes</Text>

        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.reviewImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Evento</Text>
          <Text style={styles.reviewValue}>{title || 'Não informado'}</Text>
        </View>

        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Data e Hora</Text>
          <Text style={styles.reviewValue}>{eventDate} às {eventTime}</Text>
        </View>

        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Local</Text>
          <Text style={styles.reviewValue}>{locationName || 'Não informado'}</Text>
        </View>

        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Categoria</Text>
          <Text style={styles.reviewValue}>
            {categories.find(c => c.id === selectedCategory)?.name || 'Não informado'}
          </Text>
        </View>

        {isPaid && (
          <View style={[styles.reviewItem, styles.reviewItemHighlight]}>
            <Text style={styles.reviewLabel}>Valor</Text>
            <Text style={styles.reviewValuePrice}>R$ {price || '0.00'}</Text>
          </View>
        )}

        {maxParticipants && maxParticipants !== '0' && (
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Limite</Text>
            <Text style={styles.reviewValue}>{maxParticipants} participantes</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#00d9ff', '#ff1493']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Criar Evento</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((currentStep + 1) / STEPS.length) * 100}%` }]} />
            </View>
            <Text style={styles.headerSubtitle}>Passo {currentStep + 1} de {STEPS.length}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 280 }]}
        scrollEventThrottle={16}
      >
        {renderStepIndicator()}

        {currentStep === 0 && renderStep0()}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
          >
            <ArrowLeft size={20} color="#007AFF" />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        )}

        {currentStep < STEPS.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextButton, !canGoNext() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!canGoNext()}
          >
            <Text style={styles.nextButtonText}>Próximo</Text>
            <ArrowRight size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Check size={20} color="#fff" />
                <Text style={styles.createButtonText}>Criar Evento</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <SuccessModal
        visible={showSuccessModal}
        onClose={handleCloseSuccessModal}
        onViewEvent={handleViewEvent}
        title="Evento Criado!"
        message="Seu evento foi publicado e já está disponível no feed para todos verem"
      />

      {imageUrl && (
        <ImageEditor
          visible={showImageEditor}
          imageUri={imageUrl}
          onClose={() => setShowImageEditor(false)}
          onSave={handleSaveEditedImage}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    gap: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.8,
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  stepIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#0a0a0a',
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2d2d2d',
  },
  stepDotActive: {
    backgroundColor: '#00d9ff',
    borderColor: '#00d9ff',
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  stepDotCompleted: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  stepNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8E8E93',
  },
  stepNumActive: {
    color: '#fff',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#2d2d2d',
    marginHorizontal: 6,
  },
  stepConnectorActive: {
    backgroundColor: '#34C759',
  },
  stepsLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepName: {
    fontSize: 12,
    color: '#6E6E73',
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },
  stepNameActive: {
    color: '#00d9ff',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },
  stepContent: {
    backgroundColor: '#0a0a0a',
    borderRadius: 0,
    padding: 20,
    marginHorizontal: 0,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 24,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: '#2d2d2d',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#6E6E73',
    marginTop: 6,
    fontWeight: '500',
  },
  inputIcon: {
    position: 'relative',
  },
  inputWithIcon: {
    paddingLeft: 44,
  },
  icon: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  hint: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 6,
  },
  categoryScroll: {
    marginTop: 8,
  },
  categoryScrollContent: {
    paddingRight: 20,
  },
  categoryCard: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: '#2d2d2d',
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 95,
  },
  categoryCardSelected: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderColor: '#00d9ff',
    borderWidth: 2,
  },
  categoryIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 15,
  },
  categoryNameSelected: {
    color: '#00d9ff',
    fontWeight: '700',
  },
  chipScrollContent: {
    paddingRight: 20,
  },
  chip: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#2d2d2d',
  },
  chipSelected: {
    backgroundColor: '#00d9ff',
    borderColor: '#00d9ff',
  },
  chipText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#0a0a0a',
    fontWeight: '700',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  switchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2d2d2d',
  },
  switchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 139, 147, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchIconBgPaid: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
  },
  switchTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
  },
  switchSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  reviewCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#2d2d2d',
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  reviewImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    marginBottom: 14,
  },
  reviewItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d2d',
  },
  reviewItemHighlight: {
    backgroundColor: 'rgba(52, 199, 89, 0.08)',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 0,
    paddingBottom: 12,
  },
  reviewLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reviewValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
  reviewValuePrice: {
    fontSize: 18,
    color: '#34C759',
    fontWeight: '800',
  },
  imagePickerButton: {
    marginTop: 8,
  },
  imagePlaceholder: {
    height: 220,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00d9ff',
    borderStyle: 'dashed',
  },
  uploadIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  imagePlaceholderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  imagePlaceholderText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    fontWeight: '500',
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
  },
  imageGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  imageOverlayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  editImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00d9ff',
    borderRadius: 12,
    padding: 11,
    marginTop: 10,
    gap: 6,
  },
  editImageButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0a0a0a',
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 88,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1.5,
    borderTopColor: '#1a1a1a',
    gap: 12,
  },
  backButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#2d2d2d',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00d9ff',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00d9ff',
    borderRadius: 14,
    padding: 16,
    gap: 6,
    shadowColor: '#00d9ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0a0a0a',
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    borderRadius: 14,
    padding: 16,
    gap: 6,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2d2d2d',
    overflow: 'hidden',
    maxHeight: 240,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d2d',
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    lineHeight: 16,
    fontWeight: '500',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1.5,
    borderColor: '#2d2d2d',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  dateTimeText: {
    fontSize: 15,
    color: '#fff',
    flex: 1,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  locationButtonText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '700',
  },
});
