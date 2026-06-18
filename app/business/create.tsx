import { useLanguage } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, 
  Switch, ActivityIndicator, Alert, Image, Platform, KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, vs, ms } from '@/utils/responsive';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Category, Subcategory } from '@/types/database';
import { 
  ArrowLeft, Calendar, Clock, MapPin, Camera, X, Ticket, Sparkles
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { uploadFile } from '@/lib/storage';
import { processMedia } from '@/lib/mediaOptimizer';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import SuccessModal from '@/components/SuccessModal';

export default function BusinessCreateEvent() {
  const { t } = useLanguage();
  const { backgroundPrimary, backgroundSecondary, textPrimary, textSecondary, isDark, accent } = useTheme();
  const { user, profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaFile, setMediaFile] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventTime, setEventTime] = useState('20:00');
  const [eventEndTime, setEventEndTime] = useState('02:00');
  
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string | null>(null);

  useEffect(() => { loadCategories(); }, []);
  const loadCategories = async () => { 
    const { data } = await supabase.from('categories').select('*').order('order'); 
    if (data) setCategories(data); 
  };

  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setMediaFile({
        uri: result.assets[0].uri,
        type: result.assets[0].type === 'video' ? 'video' : 'image'
      });
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!title || !selectedCategory || !locationName) {
      return Alert.alert('Erro', 'Preencha título, categoria e localização.');
    }
    if (!mediaFile) {
      return Alert.alert('Erro', 'Adicione uma imagem de capa.');
    }
    
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      // 1. Upload Media
      const optimizedMedia = await processMedia(mediaFile.uri, mediaFile.type);
      const storagePath = `events/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${optimizedMedia.extension}`;
      const publicUrl = await uploadFile(optimizedMedia.uri, storagePath, optimizedMedia.contentType);

      if (!publicUrl) throw new Error('Falha no upload da imagem.');
      
      // 2. Fetch coordinates if missing
      let finalLat = lat;
      let finalLng = lng;
      if (!finalLat || !finalLng) {
        const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${googleApiKey}`);
        const geoData = await response.json();
        if (geoData.results && geoData.results[0]) {
          finalLat = geoData.results[0].geometry.location.lat;
          finalLng = geoData.results[0].geometry.location.lng;
        }
      }

      const eventToInsert = {
        creator_id: user.id, 
        title, 
        description, 
        type: 'event',
        image_url: publicUrl,
        image_urls: [publicUrl],
        media_type: mediaFile.type,
        media_types: [mediaFile.type],
        event_date: eventDate, 
        event_time: eventTime, 
        end_time: eventEndTime,
        location_name: locationName,
        is_paid: isPaid, 
        price: parseFloat(price) || 0, 
        category_id: selectedCategory, 
        latitude: finalLat,
        longitude: finalLng,
        status: 'ao_vivo',
        ticket_url: ticketUrl ? (ticketUrl.trim().startsWith('http') ? ticketUrl.trim() : `https://${ticketUrl.trim()}`) : null,
      };

      const { data: insertedEvents, error } = await supabase.from('events').insert([eventToInsert]).select();
      if (error) throw error;
      if (!insertedEvents || insertedEvents.length === 0) throw new Error('Nenhum evento foi criado');

      const eventData = insertedEvents[0];

      await supabase.from('posts').insert({
        user_id: user.id,
        content: `Criei um novo evento: ${title}`,
        event_id: eventData.id,
        image_url: publicUrl,
        image_urls: [publicUrl]
      });

      // Notificar seguidores do criador sobre o novo evento (fire-and-forget)
      supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id)
        .then(({ data: followers }) => {
          if (!followers || followers.length === 0) return;
          const notifications = followers.map((f: any) => ({
            user_id: f.follower_id,
            type: 'new_event',
            title: '🎉 Novo evento publicado!',
            message: `${profile?.full_name || profile?.username || 'Alguém que você segue'} acabou de criar o evento "${title}"`,
            data: { event_id: eventData.id, creator_id: user.id }
          }));
          supabase.from('notifications').insert(notifications).then(() => {});
        });

      setCreatedEventId(eventData.id);
      setShowSuccessModal(true);
    } catch (e: any) { 
      Alert.alert('Erro ao publicar', e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: backgroundPrimary }]}>
      <View style={[styles.header, { paddingTop: insets.top + vs(10), backgroundColor: backgroundSecondary, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>{t('auto.sfd99e617', 'Criação Rápida')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {/* Mídia */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: textPrimary }]}>{t('auto.sefe03f6d', 'Imagem de Capa')}</Text>
            {mediaFile ? (
              <View style={styles.mediaPreviewContainer}>
                <Image source={{ uri: mediaFile.uri }} style={styles.mediaPreview} />
                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setMediaFile(null)}>
                  <X size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.addMediaBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} onPress={pickMedia}>
                <Camera size={32} color={textSecondary} />
                <Text style={{ color: textSecondary, marginTop: 8 }}>{t('auto.se44320e6', 'Toque para escolher da galeria')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Detalhes Básicos */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: textPrimary }]}>{t('auto.s8b93b4b6', 'Nome do Evento')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary }]}
              placeholder={t('auto.s5145c2c9', 'Ex: Festa de Ano Novo')}
              placeholderTextColor={textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.label, { color: textPrimary, marginTop: 16 }]}>{t('auto.s70c4fe80', 'Categoria')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip, 
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                    selectedCategory === cat.id && { backgroundColor: accent }
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={{ color: selectedCategory === cat.id ? '#fff' : textPrimary, fontWeight: '600' }}>
                    {cat.icon} {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: textPrimary, marginTop: 16 }]}>{t('auto.s50eba8b4', 'Descrição (Opcional)')}</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary }]}
              placeholder={t('auto.sa1693513', 'Fale um pouco sobre o evento...')}
              placeholderTextColor={textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          {/* Localização */}
          <View style={[styles.section, { zIndex: 10 }]}>
            <Text style={[styles.label, { color: textPrimary }]}>{t('auto.s39f16b5d', 'Onde vai ser?')}</Text>
            <GooglePlacesAutocomplete
              placeholder={t('auto.s808ec5e6', 'Busque o endereço')}
              onPress={(data, details = null) => {
                setLocationName(data.structured_formatting?.main_text || data.description || '');
                if (details?.geometry?.location) { setLat(details.geometry.location.lat); setLng(details.geometry.location.lng); }
              }}
              fetchDetails={true}
              query={{ key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY, language: 'pt-BR' }}
              styles={{
                container: { flex: 0 },
                textInputContainer: { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 12, height: 50 },
                textInput: { backgroundColor: 'transparent', color: textPrimary, fontSize: 16, height: 50 },
                listView: { position: 'absolute', top: 55, backgroundColor: backgroundSecondary, borderRadius: 12, zIndex: 100 },
                row: { backgroundColor: 'transparent', padding: 13, flexDirection: 'row' },
                description: { color: textPrimary }
              }}
              enablePoweredByContainer={false}
              textInputProps={{ placeholderTextColor: textSecondary, value: locationName, onChangeText: setLocationName }}
            />
          </View>

          {/* Data e Hora Simples (Texto por enquanto para agilidade) */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: textPrimary }]}>{t('auto.s17418540', 'Quando? (Formato YYYY-MM-DD e HH:MM)')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput style={[styles.input, { flex: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary }]} value={eventDate} onChangeText={setEventDate} />
              <TextInput style={[styles.input, { flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary }]} value={eventTime} onChangeText={setEventTime} />
            </View>
          </View>

          {/* Ingressos */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.label, { color: textPrimary, marginBottom: 0 }]}>{t('auto.sa98ee7e2', 'Evento Pago?')}</Text>
              <Switch value={isPaid} onValueChange={setIsPaid} trackColor={{ true: accent }} />
            </View>
            {isPaid && (
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary, marginBottom: 12 }]}
                placeholder={t('auto.s3e571365', 'Preço (ex: 50.00)')}
                placeholderTextColor={textSecondary}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
              />
            )}
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', color: textPrimary }]}
              placeholder={t('auto.s07e33410', 'Link para compra de ingressos (Opcional)')}
              placeholderTextColor={textSecondary}
              value={ticketUrl}
              onChangeText={setTicketUrl}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={styles.publishBtn} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishBtnText}>{t('auto.s0466c8b5', 'Criar Evento')}</Text>}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <SuccessModal 
        visible={showSuccessModal} 
        onClose={() => { setShowSuccessModal(false); }} 
        onViewEvent={() => { setShowSuccessModal(false); router.replace(`/event/${createdEventId}`); }}
        title="Evento Criado!" 
        message="Seu evento já está ao vivo para todos." 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(16), paddingBottom: vs(12), borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: ms(18), fontWeight: '700' },
  scrollContent: { padding: s(16), paddingBottom: vs(100) },
  section: { marginBottom: vs(24) },
  label: { fontSize: ms(14), fontWeight: '700', marginBottom: vs(8) },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: ms(15) },
  textArea: { height: 100, paddingTop: 16, textAlignVertical: 'top' },
  addMediaBtn: { height: vs(150), borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  mediaPreviewContainer: { position: 'relative', height: vs(200), width: '100%', borderRadius: 16, overflow: 'hidden' },
  mediaPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  removeMediaBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  catChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 8 },
  publishBtn: { backgroundColor: '#00d9ff', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  publishBtnText: { color: '#fff', fontSize: ms(16), fontWeight: '800' }
});
