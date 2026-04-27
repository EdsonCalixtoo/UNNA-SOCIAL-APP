import { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Image, TouchableOpacity, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { X, RotateCw, Crop, ZoomIn, ZoomOut, Check, Undo2 } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { manipulateAsync, SaveFormat, FlipType } from 'expo-image-manipulator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  flipHorizontal: boolean;
  flipVertical: boolean;
}

const TABS = [
  { id: 'adjust', label: 'Ajustar' },
  { id: 'transform', label: 'Transformar' },
  { id: 'filters', label: 'Filtros' },
];

const FILTERS = [
  { id: 'original', label: 'Original', brightness: 0, contrast: 0, saturation: 0 },
  { id: 'vivid', label: 'Vívido', brightness: 0.1, contrast: 0.2, saturation: 0.3 },
  { id: 'warm', label: 'Quente', brightness: 0.15, contrast: 0.1, saturation: 0.2 },
  { id: 'cool', label: 'Frio', brightness: -0.1, contrast: 0.15, saturation: -0.1 },
  { id: 'dramatic', label: 'Dramático', brightness: -0.2, contrast: 0.4, saturation: 0.1 },
  { id: 'fade', label: 'Fade', brightness: 0.2, contrast: -0.2, saturation: -0.3 },
  { id: 'mono', label: 'Mono', brightness: 0, contrast: 0.2, saturation: -1 },
];

export default function ImageEditor({ visible, imageUri, onClose, onSave }: ImageEditorProps) {
  const [activeTab, setActiveTab] = useState('adjust');
  const [editState, setEditState] = useState<EditState>({
    rotation: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    flipHorizontal: false,
    flipVertical: false,
  });
  const [previewUri, setPreviewUri] = useState(imageUri);
  const [processing, setProcessing] = useState(false);
  const originalState = useRef<EditState>({
    rotation: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    flipHorizontal: false,
    flipVertical: false,
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
          compress: 0.8,
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

  const handleRotate = () => {
    const newRotation = (editState.rotation + 90) % 360;
    setEditState(prev => ({ ...prev, rotation: newRotation }));
  };

  const handleFlipHorizontal = () => {
    setEditState(prev => ({ ...prev, flipHorizontal: !prev.flipHorizontal }));
  };

  const handleFlipVertical = () => {
    setEditState(prev => ({ ...prev, flipVertical: !prev.flipVertical }));
  };

  const handleReset = () => {
    setEditState(originalState.current);
    setPreviewUri(imageUri);
  };

  const handleApplyFilter = (filter: typeof FILTERS[0]) => {
    setEditState(prev => ({
      ...prev,
      brightness: filter.brightness,
      contrast: filter.contrast,
      saturation: filter.saturation,
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

  const renderAdjustTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Brilho</Text>
        <Slider
          style={styles.slider}
          minimumValue={-1}
          maximumValue={1}
          value={editState.brightness}
          onValueChange={(value) => setEditState(prev => ({ ...prev, brightness: value }))}
          minimumTrackTintColor="#00d9ff"
          maximumTrackTintColor="#3d3d3d"
          thumbTintColor="#00d9ff"
        />
        <Text style={styles.sliderValue}>{Math.round(editState.brightness * 100)}%</Text>
      </View>

      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Contraste</Text>
        <Slider
          style={styles.slider}
          minimumValue={-1}
          maximumValue={1}
          value={editState.contrast}
          onValueChange={(value) => setEditState(prev => ({ ...prev, contrast: value }))}
          minimumTrackTintColor="#ff1493"
          maximumTrackTintColor="#3d3d3d"
          thumbTintColor="#ff1493"
        />
        <Text style={styles.sliderValue}>{Math.round(editState.contrast * 100)}%</Text>
      </View>

      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Saturação</Text>
        <Slider
          style={styles.slider}
          minimumValue={-1}
          maximumValue={1}
          value={editState.saturation}
          onValueChange={(value) => setEditState(prev => ({ ...prev, saturation: value }))}
          minimumTrackTintColor="#34C759"
          maximumTrackTintColor="#3d3d3d"
          thumbTintColor="#34C759"
        />
        <Text style={styles.sliderValue}>{Math.round(editState.saturation * 100)}%</Text>
      </View>
    </View>
  );

  const renderTransformTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.transformButtons}>
        <TouchableOpacity style={styles.transformButton} onPress={handleRotate}>
          <RotateCw size={24} color="#00d9ff" />
          <Text style={styles.transformButtonText}>Girar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.transformButton} onPress={handleFlipHorizontal}>
          <View style={styles.flipIcon}>
            <Text style={styles.flipIconText}>↔</Text>
          </View>
          <Text style={styles.transformButtonText}>Espelhar H</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.transformButton} onPress={handleFlipVertical}>
          <View style={styles.flipIcon}>
            <Text style={styles.flipIconText}>↕</Text>
          </View>
          <Text style={styles.transformButtonText}>Espelhar V</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFiltersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.filtersGrid}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={styles.filterButton}
            onPress={() => handleApplyFilter(filter)}
          >
            <View style={[
              styles.filterPreview,
              filter.id === 'original' && styles.filterOriginal,
            ]}>
              <Text style={styles.filterLabel}>{filter.label}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Foto</Text>
          <TouchableOpacity onPress={handleReset} style={styles.headerButton}>
            <Undo2 size={24} color="#00d9ff" />
          </TouchableOpacity>
        </View>

        <View style={styles.previewContainer}>
          {processing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00d9ff" />
              <Text style={styles.loadingText}>Processando...</Text>
            </View>
          ) : (
            <Image
              source={{ uri: previewUri }}
              style={[
                styles.previewImage,
                {
                  transform: [
                    { rotate: `${editState.rotation}deg` },
                    { scaleX: editState.flipHorizontal ? -1 : 1 },
                    { scaleY: editState.flipVertical ? -1 : 1 },
                  ],
                },
              ]}
              resizeMode="cover"
            />
          )}
        </View>

        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'adjust' && renderAdjustTab()}
          {activeTab === 'transform' && renderTransformTab()}
          {activeTab === 'filters' && renderFiltersTab()}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, processing && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Check size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Salvar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
  },
  headerButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  tabsContainer: {
    backgroundColor: '#1a1a1a',
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#2d2d2d',
  },
  tabActive: {
    backgroundColor: '#00d9ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderValue: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  transformButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  transformButton: {
    flex: 1,
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  transformButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  flipIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3d3d3d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipIconText: {
    fontSize: 24,
    color: '#00d9ff',
    fontWeight: 'bold',
  },
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterButton: {
    width: (SCREEN_WIDTH - 56) / 3,
  },
  filterPreview: {
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#2d2d2d',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3d3d3d',
  },
  filterOriginal: {
    borderColor: '#00d9ff',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#2d2d2d',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2d2d2d',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#00d9ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
