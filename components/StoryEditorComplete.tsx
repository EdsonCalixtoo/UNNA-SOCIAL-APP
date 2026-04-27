import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
  Platform,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { RotateCw, Type, Music, MapPin, Users, Hash, Link as LinkIcon, Check, X, Maximize2 } from 'lucide-react-native';

interface StoryEditorCompleteProps {
  visible?: boolean;
  imageUri?: string;
  onClose?: () => void;
  onSave: (editedData: CompleteStoryData) => void;
  initialData?: CompleteStoryData;
  isEditing?: boolean;
}

export interface CompleteStoryData {
  imageUri?: string;
  cropData?: {
    crop_width?: number;
    crop_height?: number;
    crop_top?: number;
    crop_left?: number;
    rotation?: number;
    aspect_ratio?: string;
    imageUrl?: string;
  };
  captionData?: {
    text?: string;
    text_color?: string;
    color?: string;
    background_color?: string;
    font_style?: 'normal' | 'bold' | 'italic';
    text_effect?: 'none' | 'deco' | 'squeeze' | 'typewriter';
    effect?: string;
    font_size?: number;
    fontSize?: number;
    fontFamily?: string;
    font_family?: string;
    position_x?: number;
    position_y?: number;
    rotation?: number;
    opacity?: number;
  };
  audioData?: {
    audio_url?: string;
    songId?: string;
    song_id?: string;
    audio_title?: string;
    songName?: string;
    song_name?: string;
    audio_artist?: string;
    audio_source?: 'spotify' | 'local' | 'youtube';
    audio_duration?: number;
    start_time?: number;
    volume?: number;
  };
  tagsData?: Array<{
    id?: string;
    tag_type?: 'person' | 'location' | 'hashtag' | 'link';
    type?: 'person' | 'location' | 'hashtag' | 'link';
    tag_value?: string;
    value?: string;
    position_x?: number;
    x_position?: number;
    x?: number;
    position_y?: number;
    y_position?: number;
    y?: number;
  }>;
  tags?: Array<{
    id?: string;
    type?: 'person' | 'location' | 'hashtag' | 'link';
    value?: string;
    x?: number;
    y?: number;
  }>;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_SIZE = 320;

const ASPECT_RATIOS = [
  { name: 'Livre', ratio: 'free', width: 1, height: 1 },
  { name: '1:1', ratio: '1:1', width: 1, height: 1 },
  { name: '4:5', ratio: '4:5', width: 4, height: 5 },
  { name: '16:9', ratio: '16:9', width: 16, height: 9 },
];

const TEXT_COLORS = ['#FFFFFF', '#000000', '#FF6B6B', '#4ECDC4', '#FFD700', '#FF9500', '#9370DB', '#34C759'];
const TEXT_EFFECTS = [
  { name: 'Normal', value: 'none' },
  { name: 'Deco', value: 'deco' },
  { name: 'Squeeze', value: 'squeeze' },
  { name: 'Typewriter', value: 'typewriter' },
];
const FONT_SIZES = [14, 18, 24, 32, 40, 48];

const MOCK_AUDIOS = [
  { id: '1', title: 'Summer Vibes', artist: 'The Wave', url: 'https://example.com/1.mp3', duration: 180 },
  { id: '2', title: 'Night Drive', artist: 'Neon Dreams', url: 'https://example.com/2.mp3', duration: 220 },
  { id: '3', title: 'Chill Beats', artist: 'Lo-Fi Master', url: 'https://example.com/3.mp3', duration: 240 },
  { id: '4', title: 'Party Time', artist: 'DJ Sonic', url: 'https://example.com/4.mp3', duration: 200 },
];

const MOCK_USERS = [
  { id: '1', name: 'João Silva' },
  { id: '2', name: 'Maria Santos' },
  { id: '3', name: 'Pedro Oliveira' },
];

const MOCK_LOCATIONS = [
  { id: '1', name: 'São Paulo, Brasil' },
  { id: '2', name: 'Rio de Janeiro' },
  { id: '3', name: 'Praia do Futuro' },
];

export default function StoryEditorComplete({
  visible = true,
  imageUri: initialImageUri,
  onClose,
  onSave,
  initialData,
  isEditing = false,
}: StoryEditorCompleteProps) {
  // Estados de Crop
  const [rotation, setRotation] = useState(initialData?.cropData?.rotation || 0);
  const [aspectRatio, setAspectRatio] = useState(
    ASPECT_RATIOS.find(ar => ar.ratio === initialData?.cropData?.aspect_ratio) || ASPECT_RATIOS[1]
  );
  const [croppingArea, setCroppingArea] = useState({ top: 0, left: 0, width: PREVIEW_SIZE, height: PREVIEW_SIZE });

  // Estados de Legenda
  const [captionText, setCaptionText] = useState(initialData?.captionData?.text || '');
  const [textColor, setTextColor] = useState(initialData?.captionData?.color || initialData?.captionData?.text_color || '#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>(initialData?.captionData?.background_color);
  const [fontStyle, setFontStyle] = useState<'normal' | 'bold' | 'italic'>(initialData?.captionData?.font_style || 'normal');
  const [textEffect, setTextEffect] = useState<'none' | 'deco' | 'squeeze' | 'typewriter'>(
    (initialData?.captionData?.effect || initialData?.captionData?.text_effect || 'none') as 'none' | 'deco' | 'squeeze' | 'typewriter'
  );
  const [fontSize, setFontSize] = useState(initialData?.captionData?.fontSize || initialData?.captionData?.font_size || 24);
  const [textOpacity, setTextOpacity] = useState((initialData?.captionData?.opacity || 1) * 100);

  // Estados de Áudio
  const [selectedAudio, setSelectedAudio] = useState<any>(
    initialData?.audioData 
      ? { id: initialData.audioData.songId, title: initialData.audioData.songName, volume: initialData.audioData.volume }
      : null
  );
  const [audioVolume, setAudioVolume] = useState(initialData?.audioData?.volume || 100);

  // Estados de Tags
  const [tags, setTags] = useState<any[]>(initialData?.tags || initialData?.tagsData || []);
  const [tagInput, setTagInput] = useState('');
  const [tagType, setTagType] = useState<'person' | 'location' | 'hashtag' | 'link'>('person');

  // Tab ativa
  const [activeTab, setActiveTab] = useState<'crop' | 'caption' | 'audio' | 'tags'>('crop');

  // Preview
  const [preview, setPreview] = useState(initialData?.cropData?.imageUrl || initialImageUri || '');

  const handleAddTag = () => {
    if (!tagInput.trim()) return;

    const newTag = {
      id: Date.now().toString(),
      tag_type: tagType,
      tag_value: tagType === 'hashtag' ? `#${tagInput}` : tagInput,
      position_x: Math.random(),
      position_y: Math.random(),
    };

    setTags([...tags, newTag]);
    setTagInput('');
  };

  const handleSave = async () => {
    const completeData: CompleteStoryData = {
      imageUri: preview,
    };

    // Adicionar cropData se houver alterações
    if (rotation !== 0 || aspectRatio.ratio !== '1:1') {
      completeData.cropData = {
        crop_width: croppingArea.width,
        crop_height: croppingArea.height,
        crop_top: croppingArea.top,
        crop_left: croppingArea.left,
        rotation,
        aspect_ratio: aspectRatio.ratio,
      };
    }

    // Adicionar captionData se houver texto
    if (captionText) {
      completeData.captionData = {
        text: captionText,
        text_color: textColor,
        background_color: backgroundColor,
        font_style: fontStyle,
        text_effect: textEffect,
        font_size: fontSize,
        position_x: 0.5,
        position_y: 0.5,
        rotation: 0,
        opacity: textOpacity,
      };
    }

    // Adicionar audioData se houver seleção
    if (selectedAudio) {
      completeData.audioData = {
        audio_url: selectedAudio.url,
        audio_title: selectedAudio.title,
        audio_artist: selectedAudio.artist,
        audio_source: 'spotify',
        audio_duration: selectedAudio.duration,
        volume: audioVolume,
        start_time: 0,
      };
    }

    // Adicionar tagsData se houver tags
    if (tags.length > 0) {
      completeData.tagsData = tags;
    }

    onSave(completeData);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.headerButton}
            >
              <View style={styles.iconContainer}>
                <X size={22} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <View style={styles.headerMiddle}>
              <Text style={styles.headerTitle}>✏️ Editar Story</Text>
              <View style={styles.headerSubtitle}>
                <View style={styles.progressDot} />
                <Text style={styles.headerSubtitleText}>Customize seu story</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleSave}
              style={[styles.headerButton, styles.saveButton]}
            >
              <View style={styles.iconContainer}>
                <Check size={22} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Gradient line under header */}
          <View style={styles.headerGradient} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'crop' && styles.tabActive]}
            onPress={() => setActiveTab('crop')}
          >
            <Maximize2 size={16} color={activeTab === 'crop' ? '#FF8C3D' : '#999BA4'} />
            <Text style={[styles.tabText, activeTab === 'crop' && styles.tabTextActive]}>Recortar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'caption' && styles.tabActive]}
            onPress={() => setActiveTab('caption')}
          >
            <Type size={16} color={activeTab === 'caption' ? '#FF8C3D' : '#999BA4'} />
            <Text style={[styles.tabText, activeTab === 'caption' && styles.tabTextActive]}>Legenda</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'audio' && styles.tabActive]}
            onPress={() => setActiveTab('audio')}
          >
            <Music size={16} color={activeTab === 'audio' ? '#FF8C3D' : '#999BA4'} />
            <Text style={[styles.tabText, activeTab === 'audio' && styles.tabTextActive]}>Música</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'tags' && styles.tabActive]}
            onPress={() => setActiveTab('tags')}
          >
            <MapPin size={16} color={activeTab === 'tags' ? '#FF8C3D' : '#999BA4'} />
            <Text style={[styles.tabText, activeTab === 'tags' && styles.tabTextActive]}>Tags</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={styles.previewSection}>
          <Image source={{ uri: preview }} style={styles.previewImage} resizeMode="contain" />
          {captionText && (
            <View
              style={[
                styles.captionPreview,
                {
                  backgroundColor: backgroundColor,
                  opacity: textOpacity / 100,
                },
              ]}
            >
              <Text
                style={{
                  color: textColor,
                  fontSize: fontSize,
                  fontWeight: fontStyle === 'bold' ? '700' : '400',
                  fontStyle: fontStyle === 'italic' ? 'italic' : 'normal',
                  textAlign: 'center',
                }}
              >
                {captionText}
              </Text>
            </View>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* TAB: CROP */}
          {activeTab === 'crop' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>✂️ Recortar & Girar</Text>

              <TouchableOpacity style={styles.controlButton} onPress={() => setRotation((r) => (r + 90) % 360)}>
                <RotateCw size={16} color="#FF8C3D" />
                <Text style={styles.controlButtonText}>Girar 90° (Atual: {rotation}°)</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>📐 Proporção</Text>
              <View style={styles.ratioGrid}>
                {ASPECT_RATIOS.map((ratio) => (
                  <TouchableOpacity
                    key={ratio.ratio}
                    style={[styles.ratioButton, aspectRatio.ratio === ratio.ratio && styles.ratioButtonActive]}
                    onPress={() => setAspectRatio(ratio)}
                  >
                    <Text style={styles.ratioButtonText}>{ratio.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* TAB: CAPTION */}
          {activeTab === 'caption' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>✍️ Adicionar Legenda</Text>

              <TextInput
                style={styles.textInput}
                placeholder="Digite sua legenda..."
                placeholderTextColor="#666"
                value={captionText}
                onChangeText={setCaptionText}
                multiline
                maxLength={500}
              />

              <Text style={styles.counter}>{captionText.length}/500</Text>

              <Text style={styles.sectionTitle}>🎨 Cor do Texto</Text>
              <View style={styles.colorGrid}>
                {TEXT_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      textColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setTextColor(color)}
                  />
                ))}
              </View>

              <Text style={styles.sectionTitle}>🔤 Tamanho</Text>
              <View style={styles.sizeGrid}>
                {FONT_SIZES.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.sizeButton, fontSize === size && styles.sizeButtonActive]}
                    onPress={() => setFontSize(size)}
                  >
                    <Text style={styles.sizeButtonText}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>✨ Efeito</Text>
              <View style={styles.effectGrid}>
                {TEXT_EFFECTS.map((effect) => (
                  <TouchableOpacity
                    key={effect.value}
                    style={[styles.effectButton, textEffect === effect.value && styles.effectButtonActive]}
                    onPress={() => setTextEffect(effect.value as any)}
                  >
                    <Text style={styles.effectButtonText}>{effect.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* TAB: AUDIO */}
          {activeTab === 'audio' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>🎵 Selecionar Música</Text>

              {MOCK_AUDIOS.map((audio) => (
                <TouchableOpacity
                  key={audio.id}
                  style={[styles.audioItem, selectedAudio?.id === audio.id && styles.audioItemSelected]}
                  onPress={() => setSelectedAudio(audio)}
                >
                  <View>
                    <Text style={styles.audioTitle}>{audio.title}</Text>
                    <Text style={styles.audioArtist}>{audio.artist}</Text>
                  </View>
                  {selectedAudio?.id === audio.id && <Check size={20} color="#FF8C3D" />}
                </TouchableOpacity>
              ))}

              {selectedAudio && (
                <View style={styles.volumeContainer}>
                  <Text style={styles.sectionTitle}>🔊 Volume</Text>
                  <View style={styles.volumeGrid}>
                    {[0, 25, 50, 75, 100].map((vol) => (
                      <TouchableOpacity
                        key={vol}
                        style={[styles.volButton, audioVolume === vol && styles.volButtonActive]}
                        onPress={() => setAudioVolume(vol)}
                      >
                        <Text style={styles.volButtonText}>{vol}%</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* TAB: TAGS */}
          {activeTab === 'tags' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>📍 Adicionar Tags</Text>

              <View style={styles.tagTypeGrid}>
                {(['person', 'location', 'hashtag', 'link'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.tagTypeButton, tagType === type && styles.tagTypeButtonActive]}
                    onPress={() => setTagType(type)}
                  >
                    {type === 'person' && <Users size={14} color={tagType === type ? '#FF8C3D' : '#999BA4'} />}
                    {type === 'location' && <MapPin size={14} color={tagType === type ? '#FF8C3D' : '#999BA4'} />}
                    {type === 'hashtag' && <Hash size={14} color={tagType === type ? '#FF8C3D' : '#999BA4'} />}
                    {type === 'link' && <LinkIcon size={14} color={tagType === type ? '#FF8C3D' : '#999BA4'} />}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.tagInputContainer}>
                <TextInput
                  style={styles.tagInput}
                  placeholder={
                    tagType === 'person'
                      ? 'Nome da pessoa'
                      : tagType === 'location'
                      ? 'Nome do local'
                      : tagType === 'hashtag'
                      ? 'hashtag'
                      : 'URL'
                  }
                  placeholderTextColor="#666"
                  value={tagInput}
                  onChangeText={setTagInput}
                />
                <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag}>
                  <Text style={styles.addTagButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              {tagType === 'person' && (
                <View style={styles.suggestionsContainer}>
                  {MOCK_USERS.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setTagInput(user.name);
                      }}
                    >
                      <Text style={styles.suggestionText}>{user.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {tagType === 'location' && (
                <View style={styles.suggestionsContainer}>
                  {MOCK_LOCATIONS.map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setTagInput(loc.name);
                      }}
                    >
                      <Text style={styles.suggestionText}>{loc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {tags.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>📌 Tags Adicionadas ({tags.length})</Text>
                  {tags.map((tag) => (
                    <View key={tag.id} style={styles.addedTag}>
                      <Text style={styles.addedTagText}>{tag.tag_value}</Text>
                      <TouchableOpacity onPress={() => setTags(tags.filter((t) => t.id !== tag.id))}>
                        <X size={14} color="#FF8C3D" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
  },
  header: {
    backgroundColor: '#FF8C3D',
    paddingHorizontal: 0,
    paddingTop: Platform.OS === 'ios' ? 14 : 8,
    paddingBottom: 0,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    shadowColor: '#FF8C3D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerMiddle: {
    flex: 1,
    marginHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'center',
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginRight: 6,
  },
  headerSubtitleText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  headerGradient: {
    height: 3,
    backgroundColor: '#FF6B9D',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 2,
    borderRadius: 6,
  },
  tabActive: {
    borderBottomColor: '#FF8C3D',
    backgroundColor: 'rgba(255, 140, 61, 0.08)',
  },
  tabText: {
    color: '#999BA4',
    fontSize: 9,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FF8C3D',
  },
  previewSection: {
    height: 220,
    backgroundColor: '#F8F9FC',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F0',
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  captionPreview: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#F8F9FC',
  },
  tabContent: {
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#2D2D3D',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 6,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  controlButtonText: {
    color: '#2D2D3D',
    fontSize: 12,
    fontWeight: '500',
  },
  ratioGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  ratioButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    alignItems: 'center',
  },
  ratioButtonActive: {
    borderColor: '#FF8C3D',
    backgroundColor: '#FFF5F0',
  },
  ratioButtonText: {
    color: '#2D2D3D',
    fontSize: 11,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 11,
    color: '#2D2D3D',
    fontSize: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 6,
    fontWeight: '500',
  },
  counter: {
    color: '#999BA4',
    fontSize: 10,
    textAlign: 'right',
    marginBottom: 10,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  colorOptionSelected: {
    borderColor: '#2D2D3D',
  },
  sizeGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  sizeButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    alignItems: 'center',
  },
  sizeButtonActive: {
    backgroundColor: '#FF8C3D',
    borderColor: '#FF8C3D',
  },
  sizeButtonText: {
    color: '#2D2D3D',
    fontSize: 10,
    fontWeight: '500',
  },
  effectGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  effectButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    alignItems: 'center',
  },
  effectButtonActive: {
    backgroundColor: '#FF8C3D',
    borderColor: '#FF8C3D',
  },
  effectButtonText: {
    color: '#2D2D3D',
    fontSize: 10,
    fontWeight: '500',
  },
  audioItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    marginBottom: 8,
  },
  audioItemSelected: {
    borderColor: '#FF8C3D',
    backgroundColor: '#FFF5F0',
  },
  audioTitle: {
    color: '#2D2D3D',
    fontSize: 12,
    fontWeight: '600',
  },
  audioArtist: {
    color: '#999BA4',
    fontSize: 10,
    marginTop: 2,
  },
  volumeContainer: {
    marginTop: 10,
  },
  volumeGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  volButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    alignItems: 'center',
  },
  volButtonActive: {
    backgroundColor: '#FF8C3D',
    borderColor: '#FF8C3D',
  },
  volButtonText: {
    color: '#2D2D3D',
    fontSize: 10,
    fontWeight: '500',
  },
  tagTypeGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  tagTypeButton: {
    flex: 1,
    paddingVertical: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8F0',
    alignItems: 'center',
  },
  tagTypeButtonActive: {
    borderColor: '#FF8C3D',
    backgroundColor: '#FFF5F0',
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8F0',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 11,
    color: '#2D2D3D',
    fontSize: 12,
    fontWeight: '500',
  },
  addTagButton: {
    width: 42,
    borderRadius: 8,
    backgroundColor: '#FF8C3D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF8C3D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  addTagButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    marginBottom: 10,
  },
  suggestionItem: {
    paddingVertical: 8,
    paddingHorizontal: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  suggestionText: {
    color: '#2D2D3D',
    fontSize: 11,
    fontWeight: '500',
  },
  addedTag: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 7,
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C3D',
    borderWidth: 1,
    borderColor: '#E8E8F0',
  },
  addedTagText: {
    color: '#2D2D3D',
    fontSize: 11,
    fontWeight: '500',
  },
});
