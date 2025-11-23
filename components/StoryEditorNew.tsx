import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { RotateCw, Type, Music, MapPin, Users, Hash, Link as LinkIcon, Check, X, Maximize2 } from 'lucide-react-native';

interface StoryEditorCompleteProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: (editedData: CompleteStoryData) => void;
}

export interface CompleteStoryData {
  imageUri: string;
  cropData?: {
    crop_width: number;
    crop_height: number;
    crop_top: number;
    crop_left: number;
    rotation: number;
    aspect_ratio: string;
  };
  captionData?: {
    text: string;
    text_color: string;
    background_color?: string;
    font_style: 'normal' | 'bold' | 'italic';
    text_effect: 'none' | 'deco' | 'squeeze' | 'typewriter';
    font_size: number;
    position_x: number;
    position_y: number;
    rotation: number;
    opacity: number;
  };
  audioData?: {
    audio_url: string;
    audio_title: string;
    audio_artist: string;
    audio_source: 'spotify' | 'local' | 'youtube';
    audio_duration: number;
    start_time: number;
    volume: number;
  };
  tagsData?: {
    tag_type: 'person' | 'location' | 'hashtag' | 'link';
    tag_value: string;
    position_x: number;
    position_y: number;
  }[];
}

const ASPECT_RATIOS = [
  { name: 'Livre', ratio: 'free' },
  { name: '1:1', ratio: '1:1' },
  { name: '4:5', ratio: '4:5' },
  { name: '16:9', ratio: '16:9' },
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
  visible,
  imageUri,
  onClose,
  onSave,
}: StoryEditorCompleteProps) {
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [captionText, setCaptionText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>();
  const [fontStyle, setFontStyle] = useState<'normal' | 'bold' | 'italic'>('normal');
  const [textEffect, setTextEffect] = useState<'none' | 'deco' | 'squeeze' | 'typewriter'>('none');
  const [fontSize, setFontSize] = useState(24);
  const [textOpacity, setTextOpacity] = useState(100);
  const [selectedAudio, setSelectedAudio] = useState<any>(null);
  const [audioVolume, setAudioVolume] = useState(100);
  const [tags, setTags] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tagType, setTagType] = useState<'person' | 'location' | 'hashtag' | 'link'>('person');
  const [activeTab, setActiveTab] = useState<'crop' | 'caption' | 'audio' | 'tags'>('crop');
  const [preview, setPreview] = useState(imageUri);

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

  const handleSave = () => {
    const completeData: CompleteStoryData = {
      imageUri: preview,
    };

    if (rotation !== 0 || aspectRatio !== '1:1') {
      completeData.cropData = {
        crop_width: 300,
        crop_height: 300,
        crop_top: 0,
        crop_left: 0,
        rotation,
        aspect_ratio: aspectRatio,
      };
    }

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
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#2D2D3D" strokeWidth={3} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Story</Text>
          <TouchableOpacity onPress={handleSave}>
            <Check size={24} color="#FF8C3D" strokeWidth={3} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['crop', 'caption', 'audio', 'tags'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              {tab === 'crop' && <Maximize2 size={18} color={activeTab === tab ? '#FF8C3D' : '#999BA4'} />}
              {tab === 'caption' && <Type size={18} color={activeTab === tab ? '#FF8C3D' : '#999BA4'} />}
              {tab === 'audio' && <Music size={18} color={activeTab === tab ? '#FF8C3D' : '#999BA4'} />}
              {tab === 'tags' && <MapPin size={18} color={activeTab === tab ? '#FF8C3D' : '#999BA4'} />}
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'crop' && 'Recortar'}
                {tab === 'caption' && 'Legenda'}
                {tab === 'audio' && 'Música'}
                {tab === 'tags' && 'Tags'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview */}
        <View style={styles.previewContainer}>
          <Image source={{ uri: preview }} style={styles.previewImage} resizeMode="contain" />
          {captionText && (
            <View style={[styles.captionPreview, { backgroundColor, opacity: textOpacity / 100 }]}>
              <Text style={{ color: textColor, fontSize, fontWeight: fontStyle === 'bold' ? '700' : '400', fontStyle: fontStyle === 'italic' ? 'italic' : 'normal', textAlign: 'center' }}>
                {captionText}
              </Text>
            </View>
          )}
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* CROP TAB */}
          {activeTab === 'crop' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>✂️ Recortar & Girar</Text>
              <TouchableOpacity style={styles.controlButton} onPress={() => setRotation((r) => (r + 90) % 360)}>
                <RotateCw size={18} color="#FF8C3D" />
                <Text style={styles.controlButtonText}>Girar 90° (Atual: {rotation}°)</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>📐 Proporção</Text>
              <View style={styles.ratioGrid}>
                {ASPECT_RATIOS.map((ratio) => (
                  <TouchableOpacity
                    key={ratio.ratio}
                    style={[styles.ratioButton, aspectRatio === ratio.ratio && styles.ratioButtonActive]}
                    onPress={() => setAspectRatio(ratio.ratio)}
                  >
                    <Text style={[styles.ratioButtonText, aspectRatio === ratio.ratio && styles.ratioButtonTextActive]}>
                      {ratio.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* CAPTION TAB */}
          {activeTab === 'caption' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>✍️ Adicionar Legenda</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Digite sua legenda..."
                placeholderTextColor="#CCC"
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
                    style={[styles.colorOption, { backgroundColor: color }, textColor === color && styles.colorOptionSelected]}
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
                    <Text style={[styles.sizeButtonText, fontSize === size && styles.sizeButtonActiveText]}>
                      {size}
                    </Text>
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
                    <Text style={[styles.effectButtonText, textEffect === effect.value && styles.effectButtonActiveText]}>
                      {effect.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* AUDIO TAB */}
          {activeTab === 'audio' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>🎵 Selecionar Música</Text>
              {MOCK_AUDIOS.map((audio) => (
                <TouchableOpacity
                  key={audio.id}
                  style={[styles.audioItem, selectedAudio?.id === audio.id && styles.audioItemSelected]}
                  onPress={() => setSelectedAudio(audio)}
                >
                  <View style={styles.audioInfo}>
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
                        <Text style={[styles.volButtonText, audioVolume === vol && styles.volButtonActiveText]}>
                          {vol}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* TAGS TAB */}
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
                    {type === 'person' && <Users size={16} color={tagType === type ? '#FF8C3D' : '#999BA4'} />}
                    {type === 'location' && <MapPin size={16} color={tagType === type ? '#FF8C3D' : '#999BA4'} />}
                    {type === 'hashtag' && <Hash size={16} color={tagType === type ? '#FF8C3D' : '#999BA4'} />}
                    {type === 'link' && <LinkIcon size={16} color={tagType === type ? '#FF8C3D' : '#999BA4'} />}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.tagInputContainer}>
                <TextInput
                  style={styles.tagInput}
                  placeholder={tagType === 'person' ? 'Nome' : tagType === 'location' ? 'Local' : tagType === 'hashtag' ? 'hashtag' : 'URL'}
                  placeholderTextColor="#CCC"
                  value={tagInput}
                  onChangeText={setTagInput}
                />
                <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag}>
                  <Text style={styles.addTagButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              {tags.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Tags ({tags.length})</Text>
                  {tags.map((tag) => (
                    <View key={tag.id} style={styles.addedTag}>
                      <Text style={styles.addedTagText}>{tag.tag_value}</Text>
                      <TouchableOpacity onPress={() => setTags(tags.filter((t) => t.id !== tag.id))}>
                        <X size={16} color="#FF8C3D" />
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
  container: { flex: 1, backgroundColor: '#F8F9FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  headerTitle: { color: '#2D2D3D', fontSize: 17, fontWeight: '600' },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8E8F0', paddingHorizontal: 8, paddingVertical: 8 },
  tab: { flex: 1, paddingVertical: 10, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 3, borderRadius: 8 },
  tabActive: { borderBottomColor: '#FF8C3D', backgroundColor: 'rgba(255, 140, 61, 0.08)' },
  tabText: { color: '#999BA4', fontSize: 10, fontWeight: '500' },
  tabTextActive: { color: '#FF8C3D' },
  previewContainer: { height: 240, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E8E8F0', position: 'relative', paddingHorizontal: 12 },
  previewImage: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#F5F5F5' },
  captionPreview: { position: 'absolute', bottom: 16, left: 16, right: 16, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  content: { flex: 1, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#F8F9FC' },
  tabContent: { paddingBottom: 20 },
  sectionTitle: { color: '#2D2D3D', fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 6 },
  controlButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderRadius: 8, marginBottom: 10, gap: 10, borderWidth: 1, borderColor: '#E8E8F0' },
  controlButtonText: { color: '#2D2D3D', fontSize: 12, fontWeight: '500' },
  ratioGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  ratioButton: { flex: 1, paddingVertical: 9, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E8E8F0', alignItems: 'center' },
  ratioButtonActive: { borderColor: '#FF8C3D', backgroundColor: '#FFF5F0' },
  ratioButtonText: { color: '#2D2D3D', fontSize: 11, fontWeight: '500' },
  ratioButtonTextActive: { color: '#FF8C3D' },
  textInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E8F0', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 11, color: '#2D2D3D', fontSize: 13, minHeight: 80, textAlignVertical: 'top', marginBottom: 6, fontWeight: '500' },
  counter: { color: '#999BA4', fontSize: 11, textAlign: 'right', marginBottom: 10 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  colorOption: { width: 48, height: 48, borderRadius: 10, borderWidth: 2, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  colorOptionSelected: { borderColor: '#2D2D3D' },
  sizeGrid: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  sizeButton: { flex: 1, paddingVertical: 9, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#E8E8F0', alignItems: 'center' },
  sizeButtonActive: { backgroundColor: '#FF8C3D', borderColor: '#FF8C3D' },
  sizeButtonText: { color: '#2D2D3D', fontSize: 11, fontWeight: '500' },
  sizeButtonActiveText: { color: '#FFFFFF' },
  effectGrid: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  effectButton: { flex: 1, paddingVertical: 8, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#E8E8F0', alignItems: 'center' },
  effectButtonActive: { backgroundColor: '#FF8C3D', borderColor: '#FF8C3D' },
  effectButtonText: { color: '#2D2D3D', fontSize: 11, fontWeight: '500' },
  effectButtonActiveText: { color: '#FFFFFF' },
  audioItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 11, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E8E8F0', marginBottom: 8 },
  audioItemSelected: { borderColor: '#FF8C3D', backgroundColor: '#FFF5F0' },
  audioInfo: { flex: 1 },
  audioTitle: { color: '#2D2D3D', fontSize: 12, fontWeight: '600' },
  audioArtist: { color: '#999BA4', fontSize: 11, marginTop: 2 },
  volumeContainer: { marginTop: 12 },
  volumeGrid: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  volButton: { flex: 1, paddingVertical: 9, backgroundColor: '#FFFFFF', borderRadius: 6, borderWidth: 1, borderColor: '#E8E8F0', alignItems: 'center' },
  volButtonActive: { backgroundColor: '#FF8C3D', borderColor: '#FF8C3D' },
  volButtonText: { color: '#2D2D3D', fontSize: 11, fontWeight: '500' },
  volButtonActiveText: { color: '#FFFFFF' },
  tagTypeGrid: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  tagTypeButton: { flex: 1, paddingVertical: 10, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E8E8F0', alignItems: 'center' },
  tagTypeButtonActive: { borderColor: '#FF8C3D', backgroundColor: '#FFF5F0' },
  tagInputContainer: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tagInput: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E8F0', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 11, color: '#2D2D3D', fontSize: 12, fontWeight: '500' },
  addTagButton: { width: 44, borderRadius: 8, backgroundColor: '#FF8C3D', justifyContent: 'center', alignItems: 'center', shadowColor: '#FF8C3D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  addTagButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  addedTag: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 11, backgroundColor: '#FFFFFF', borderRadius: 8, marginBottom: 7, borderLeftWidth: 3, borderLeftColor: '#FF8C3D', borderWidth: 1, borderColor: '#E8E8F0' },
  addedTagText: { color: '#2D2D3D', fontSize: 12, fontWeight: '500' },
});
