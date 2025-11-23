import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, Dimensions, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { 
  X, RotateCw, Crop, ZoomIn, ZoomOut, Check, Undo2, 
  Sliders, Palette, Sparkles, Maximize2, Type, Droplets,
  Sun, Contrast, Eye, Wand2, Settings, Download
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { manipulateAsync, SaveFormat, FlipType } from 'expo-image-manipulator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageEditorProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
  onSave: (editedUri: string) => void;
}

interface EditState {
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
  vibrance: number;
  temperature: number;
  exposure: number;
  shadows: number;
  highlights: number;
  clarity: number;
  vignette: number;
  blur: number;
  sharpen: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  filterIntensity: number;
}

const TOOLS = [
  { id: 'adjust', label: 'Ajustar', icon: '⚙️' },
  { id: 'colors', label: 'Cores', icon: '🎨' },
  { id: 'effects', label: 'Efeitos', icon: '✨' },
  { id: 'transform', label: 'Transformar', icon: '↔️' },
  { id: 'presets', label: 'Presets', icon: '🎬' },
];

const PRESETS = [
  { id: 'original', label: 'Original', brightness: 0, contrast: 0, saturation: 0, temperature: 0, exposure: 0 },
  { id: 'vivid', label: 'Vívido', brightness: 0.1, contrast: 0.25, saturation: 0.4, temperature: 0, exposure: 0.1 },
  { id: 'warm', label: 'Quente', brightness: 0.15, contrast: 0.1, saturation: 0.2, temperature: 0.3, exposure: 0.05 },
  { id: 'cool', label: 'Frio', brightness: -0.05, contrast: 0.15, saturation: -0.1, temperature: -0.3, exposure: 0 },
  { id: 'dramatic', label: 'Dramático', brightness: -0.2, contrast: 0.4, saturation: 0.15, temperature: 0, exposure: -0.1 },
  { id: 'fade', label: 'Fade', brightness: 0.25, contrast: -0.2, saturation: -0.3, temperature: 0.1, exposure: 0.15 },
  { id: 'mono', label: 'P&B', brightness: 0, contrast: 0.2, saturation: -1, temperature: 0, exposure: 0 },
  { id: 'movie', label: 'Filme', brightness: 0, contrast: 0.3, saturation: 0.2, temperature: 0.1, exposure: -0.05 },
  { id: 'retro', label: 'Retrô', brightness: 0.1, contrast: -0.1, saturation: 0.3, temperature: 0.2, exposure: 0.1 },
  { id: 'cinematic', label: 'Cinema', brightness: -0.1, contrast: 0.35, saturation: 0.1, temperature: 0.15, exposure: -0.05 },
];

export default function ImageEditor({ visible, imageUri, onClose, onSave }: ImageEditorProps) {
  const [activeTool, setActiveTool] = useState('adjust');
  const [editState, setEditState] = useState<EditState>({
    rotation: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    vibrance: 0,
    temperature: 0,
    exposure: 0,
    shadows: 0,
    highlights: 0,
    clarity: 0,
    vignette: 0,
    blur: 0,
    sharpen: 0,
    flipHorizontal: false,
    flipVertical: false,
    filterIntensity: 1,
  });
  const [previewUri, setPreviewUri] = useState(imageUri);
  const [processing, setProcessing] = useState(false);
  const originalState = useRef<EditState>({
    rotation: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    vibrance: 0,
    temperature: 0,
    exposure: 0,
    shadows: 0,
    highlights: 0,
    clarity: 0,
    vignette: 0,
    blur: 0,
    sharpen: 0,
    flipHorizontal: false,
    flipVertical: false,
    filterIntensity: 1,
  });

  const applyEdits = async () => {
    setProcessing(true);
    try {
      const actions: any[] = [];

      if (editState.rotation !== 0) {
        actions.push({ rotate: editState.rotation });
      }

      if (editState.flipHorizontal) {
        actions.push({ flip: FlipType.Horizontal });
      }

      if (editState.flipVertical) {
        actions.push({ flip: FlipType.Vertical });
      }

      const result = await manipulateAsync(
        imageUri,
        actions,
        {
          compress: 0.85,
          format: SaveFormat.JPEG
        }
      );

      setPreviewUri(result.uri);
    } catch (error) {
      console.error('Error applying edits:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setEditState(originalState.current);
    setPreviewUri(imageUri);
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setEditState(prev => ({
      ...prev,
      brightness: preset.brightness,
      contrast: preset.contrast,
      saturation: preset.saturation,
      temperature: preset.temperature,
      exposure: preset.exposure,
    }));
  };

  const handleSave = async () => {
    setProcessing(true);
    try {
      await applyEdits();
      onSave(previewUri);
      onClose();
    } catch (error) {
      console.error('Error saving image:', error);
    } finally {
      setProcessing(false);
    }
  };

  // Renderizar controles de ajuste
  const renderAdjustControls = () => (
    <ScrollView style={styles.controlsScroll} showsVerticalScrollIndicator={false}>
      <SliderControl
        label="Brilho"
        value={editState.brightness}
        onChange={(value) => setEditState(prev => ({ ...prev, brightness: value }))}
        min={-1}
        max={1}
        color="#FFD700"
      />
      <SliderControl
        label="Contraste"
        value={editState.contrast}
        onChange={(value) => setEditState(prev => ({ ...prev, contrast: value }))}
        min={-1}
        max={1}
        color="#FF6B6B"
      />
      <SliderControl
        label="Saturação"
        value={editState.saturation}
        onChange={(value) => setEditState(prev => ({ ...prev, saturation: value }))}
        min={-1}
        max={1}
        color="#4ECDC4"
      />
      <SliderControl
        label="Vibrance"
        value={editState.vibrance}
        onChange={(value) => setEditState(prev => ({ ...prev, vibrance: value }))}
        min={-1}
        max={1}
        color="#FF69B4"
      />
      <SliderControl
        label="Exposição"
        value={editState.exposure}
        onChange={(value) => setEditState(prev => ({ ...prev, exposure: value }))}
        min={-1}
        max={1}
        color="#FF9500"
      />
    </ScrollView>
  );

  // Renderizar controles de cores
  const renderColorControls = () => (
    <ScrollView style={styles.controlsScroll} showsVerticalScrollIndicator={false}>
      <SliderControl
        label="Temperatura"
        value={editState.temperature}
        onChange={(value) => setEditState(prev => ({ ...prev, temperature: value }))}
        min={-1}
        max={1}
        color="#FF6B35"
      />
      <SliderControl
        label="Sombras"
        value={editState.shadows}
        onChange={(value) => setEditState(prev => ({ ...prev, shadows: value }))}
        min={-1}
        max={1}
        color="#2C3E50"
      />
      <SliderControl
        label="Destaques"
        value={editState.highlights}
        onChange={(value) => setEditState(prev => ({ ...prev, highlights: value }))}
        min={-1}
        max={1}
        color="#ECF0F1"
      />
      <SliderControl
        label="Clareza"
        value={editState.clarity}
        onChange={(value) => setEditState(prev => ({ ...prev, clarity: value }))}
        min={-1}
        max={1}
        color="#34C759"
      />
    </ScrollView>
  );

  // Renderizar controles de efeitos
  const renderEffectControls = () => (
    <ScrollView style={styles.controlsScroll} showsVerticalScrollIndicator={false}>
      <SliderControl
        label="Vinheta"
        value={editState.vignette}
        onChange={(value) => setEditState(prev => ({ ...prev, vignette: value }))}
        min={0}
        max={1}
        color="#8B4513"
      />
      <SliderControl
        label="Desfoque"
        value={editState.blur}
        onChange={(value) => setEditState(prev => ({ ...prev, blur: value }))}
        min={0}
        max={1}
        color="#9370DB"
      />
      <SliderControl
        label="Nitidez"
        value={editState.sharpen}
        onChange={(value) => setEditState(prev => ({ ...prev, sharpen: value }))}
        min={0}
        max={1}
        color="#1E90FF"
      />
    </ScrollView>
  );

  // Renderizar controles de transformação
  const renderTransformControls = () => (
    <View style={styles.transformContainer}>
      <TouchableOpacity
        style={styles.transformButton}
        onPress={() => setEditState(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))}
      >
        <RotateCw size={28} color="#fff" />
        <Text style={styles.transformButtonText}>Girar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.transformButton}
        onPress={() => setEditState(prev => ({ ...prev, flipHorizontal: !prev.flipHorizontal }))}
      >
        <Text style={styles.flipIconLarge}>↔</Text>
        <Text style={styles.transformButtonText}>Espelhar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.transformButton}
        onPress={() => setEditState(prev => ({ ...prev, flipVertical: !prev.flipVertical }))}
      >
        <Text style={styles.flipIconLarge}>↕</Text>
        <Text style={styles.transformButtonText}>Inverter</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.transformButton}
        onPress={handleReset}
      >
        <Undo2 size={28} color="#fff" />
        <Text style={styles.transformButtonText}>Resetar</Text>
      </TouchableOpacity>
    </View>
  );

  // Renderizar presets
  const renderPresets = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.presetsScroll}
      contentContainerStyle={styles.presetsContent}
    >
      {PRESETS.map((preset) => (
        <TouchableOpacity
          key={preset.id}
          style={[styles.presetButton, activePreset === preset.id && styles.presetButtonActive]}
          onPress={() => handleApplyPreset(preset)}
        >
          <View style={styles.presetPreview} />
          <Text style={styles.presetLabel}>{preset.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const [activePreset, setActivePreset] = useState('original');

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editor de Imagem</Text>
          <TouchableOpacity onPress={handleSave} disabled={processing}>
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Check size={28} color="#00d9ff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: previewUri }}
            style={styles.preview}
            resizeMode="contain"
          />
        </View>

        {/* Ferramentas */}
        <View style={styles.toolsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.toolsScroll}
          >
            {TOOLS.map((tool) => (
              <TouchableOpacity
                key={tool.id}
                style={[styles.toolButton, activeTool === tool.id && styles.toolButtonActive]}
                onPress={() => setActiveTool(tool.id)}
              >
                <Text style={styles.toolIcon}>{tool.icon}</Text>
                <Text style={[styles.toolLabel, activeTool === tool.id && styles.toolLabelActive]}>
                  {tool.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Controles */}
        <View style={styles.controlsContainer}>
          {activeTool === 'adjust' && renderAdjustControls()}
          {activeTool === 'colors' && renderColorControls()}
          {activeTool === 'effects' && renderEffectControls()}
          {activeTool === 'transform' && renderTransformControls()}
          {activeTool === 'presets' && renderPresets()}
        </View>
      </View>
    </Modal>
  );
}

// Componente de controle deslizante reutilizável
function SliderControl({ label, value, onChange, min, max, color }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; color: string }) {
  return (
    <View style={styles.sliderControl}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={color}
        maximumTrackTintColor="#3d3d3d"
        thumbTintColor={color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  previewContainer: {
    flex: 0.4,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2d2d2d',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  toolsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  toolsScroll: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  toolButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  toolButtonActive: {
    backgroundColor: '#00d9ff',
  },
  toolIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  toolLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  toolLabelActive: {
    color: '#000',
  },
  controlsContainer: {
    flex: 0.3,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  controlsScroll: {
    padding: 12,
  },
  sliderControl: {
    marginBottom: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sliderValue: {
    fontSize: 12,
    color: '#8E8E93',
  },
  slider: {
    height: 40,
  },
  transformContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 12,
  },
  transformButton: {
    alignItems: 'center',
    width: '45%',
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginVertical: 8,
  },
  transformButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  flipIconLarge: {
    fontSize: 32,
    color: '#fff',
  },
  presetsScroll: {
    padding: 12,
  },
  presetsContent: {
    paddingHorizontal: 4,
  },
  presetButton: {
    alignItems: 'center',
    marginHorizontal: 6,
  },
  presetButtonActive: {
    opacity: 1,
  },
  presetPreview: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#3d3d3d',
  },
  presetLabel: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
});
