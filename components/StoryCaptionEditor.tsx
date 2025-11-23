import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
  Modal,
  Dimensions,
  FlatList,
} from 'react-native';
import { Type, Palette, Sparkles, Check, X, ArrowLeft } from 'lucide-react-native';

interface StoryCaptionEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (caption: CaptionData) => void;
}

interface CaptionData {
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
}

interface TextEffect {
  id: string;
  name: string;
  value: 'none' | 'deco' | 'squeeze' | 'typewriter';
  description: string;
}

interface FontStyle {
  id: string;
  name: string;
  value: 'normal' | 'bold' | 'italic';
  icon: string;
}

const TEXT_EFFECTS: TextEffect[] = [
  { id: '1', name: 'Normal', value: 'none', description: 'Texto simples' },
  { id: '2', name: 'Deco', value: 'deco', description: 'Decorado' },
  { id: '3', name: 'Squeeze', value: 'squeeze', description: 'Comprimido' },
  { id: '4', name: 'Typewriter', value: 'typewriter', description: 'Máquina de escrever' },
];

const FONT_STYLES: FontStyle[] = [
  { id: '1', name: 'Normal', value: 'normal', icon: 'A' },
  { id: '2', name: 'Bold', value: 'bold', icon: '𝐀' },
  { id: '3', name: 'Itálico', value: 'italic', icon: '𝐼' },
];

const PRESET_COLORS = [
  '#FFFFFF', // Branco
  '#000000', // Preto
  '#FF6B6B', // Vermelho
  '#4ECDC4', // Turquesa
  '#FFD700', // Ouro
  '#FF9500', // Laranja
  '#9370DB', // Roxo
  '#34C759', // Verde
  '#FF1744', // Pink
  '#00BCD4', // Cyan
];

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function StoryCaptionEditor({
  visible,
  onClose,
  onSave,
}: StoryCaptionEditorProps) {
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>();
  const [fontStyle, setFontStyle] = useState<'normal' | 'bold' | 'italic'>('normal');
  const [textEffect, setTextEffect] = useState<'none' | 'deco' | 'squeeze' | 'typewriter'>('none');
  const [fontSize, setFontSize] = useState(24);
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(100);
  const [activeTab, setActiveTab] = useState<'text' | 'style' | 'effects'>('text');

  const handleSave = () => {
    if (!text.trim()) {
      alert('Digite algo para adicionar legenda!');
      return;
    }

    const captionData: CaptionData = {
      text,
      text_color: textColor,
      background_color: backgroundColor,
      font_style: fontStyle,
      text_effect: textEffect,
      font_size: fontSize,
      position_x: 0.5,
      position_y: 0.5,
      rotation,
      opacity,
    };

    onSave(captionData);
  };

  const getTextPreviewStyle = (): any => {
    return {
      color: textColor,
      fontSize: fontSize,
      fontWeight: fontStyle === 'bold' ? '700' : '400',
      fontStyle: fontStyle === 'italic' ? ('italic' as const) : ('normal' as const),
      opacity: opacity / 100,
      backgroundColor: backgroundColor,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      textAlign: 'center' as const,
    };
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Adicionar Legenda</Text>
          <TouchableOpacity onPress={handleSave}>
            <Check size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={styles.previewContainer}>
          <View style={styles.previewBackground}>
            <Text style={[getTextPreviewStyle()]}>
              {text || 'Sua legenda aqui...'}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'text' && styles.tabActive]}
            onPress={() => setActiveTab('text')}
          >
            <Type size={20} color={activeTab === 'text' ? '#FFD700' : '#888'} />
            <Text style={[styles.tabText, activeTab === 'text' && styles.tabTextActive]}>
              Texto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'style' && styles.tabActive]}
            onPress={() => setActiveTab('style')}
          >
            <Palette size={20} color={activeTab === 'style' ? '#FFD700' : '#888'} />
            <Text style={[styles.tabText, activeTab === 'style' && styles.tabTextActive]}>
              Estilo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'effects' && styles.tabActive]}
            onPress={() => setActiveTab('effects')}
          >
            <Sparkles size={20} color={activeTab === 'effects' ? '#FFD700' : '#888'} />
            <Text style={[styles.tabText, activeTab === 'effects' && styles.tabTextActive]}>
              Efeitos
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* TAB: TEXTO */}
          {activeTab === 'text' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>✍️ Texto</Text>

              <TextInput
                style={styles.textInput}
                placeholder="Digite sua legenda..."
                placeholderTextColor="#666"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
              />

              <View style={styles.counterContainer}>
                <Text style={styles.counter}>{text.length}/500</Text>
              </View>

              {/* Tamanho da fonte */}
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Tamanho: {fontSize}px</Text>
                <View style={styles.sliderTrack}>
                  {[14, 18, 24, 32, 40, 48].map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sliderButton,
                        fontSize === size && styles.sliderButtonActive,
                      ]}
                      onPress={() => setFontSize(size)}
                    >
                      <Text style={styles.sliderButtonText}>{size}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Rotação */}
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Rotação: {rotation}°</Text>
                <View style={styles.sliderTrack}>
                  {[0, 45, 90, 135, 180].map((angle) => (
                    <TouchableOpacity
                      key={angle}
                      style={[
                        styles.sliderButton,
                        rotation === angle && styles.sliderButtonActive,
                      ]}
                      onPress={() => setRotation(angle)}
                    >
                      <Text style={styles.sliderButtonText}>{angle}°</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* TAB: ESTILO */}
          {activeTab === 'style' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>🎨 Cor do Texto</Text>
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      textColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setTextColor(color)}
                  >
                    {textColor === color && (
                      <Check size={20} color={color === '#FFFFFF' ? '#000' : '#fff'} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>🎨 Cor de Fundo</Text>
              <View style={styles.colorGrid}>
                <TouchableOpacity
                  style={[
                    styles.colorOption,
                    { backgroundColor: 'rgba(0,0,0,0)' },
                    !backgroundColor && styles.colorOptionSelected,
                  ]}
                  onPress={() => setBackgroundColor(undefined)}
                >
                  <Text style={styles.noneText}>Nenhum</Text>
                </TouchableOpacity>

                {PRESET_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      backgroundColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setBackgroundColor(color)}
                  >
                    {backgroundColor === color && (
                      <Check size={20} color={color === '#FFFFFF' ? '#000' : '#fff'} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📝 Estilo da Fonte</Text>
              <View style={styles.fontStyleGrid}>
                {FONT_STYLES.map((style) => (
                  <TouchableOpacity
                    key={style.id}
                    style={[
                      styles.fontStyleButton,
                      fontStyle === style.value && styles.fontStyleButtonActive,
                    ]}
                    onPress={() => setFontStyle(style.value)}
                  >
                    <Text style={[
                      styles.fontStyleButtonText,
                      { fontWeight: style.value === 'bold' ? '700' : '400' },
                      { fontStyle: style.value === 'italic' ? 'italic' : 'normal' },
                    ]}>
                      {style.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Opacidade */}
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>Opacidade: {opacity}%</Text>
                <View style={styles.sliderTrack}>
                  {[100, 80, 60, 40, 20].map((op) => (
                    <TouchableOpacity
                      key={op}
                      style={[
                        styles.sliderButton,
                        opacity === op && styles.sliderButtonActive,
                      ]}
                      onPress={() => setOpacity(op)}
                    >
                      <Text style={styles.sliderButtonText}>{op}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* TAB: EFEITOS */}
          {activeTab === 'effects' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>✨ Efeito de Texto</Text>

              {TEXT_EFFECTS.map((effect) => (
                <TouchableOpacity
                  key={effect.id}
                  style={[
                    styles.effectOption,
                    textEffect === effect.value && styles.effectOptionActive,
                  ]}
                  onPress={() => setTextEffect(effect.value)}
                >
                  <View>
                    <Text style={styles.effectName}>{effect.name}</Text>
                    <Text style={styles.effectDescription}>{effect.description}</Text>
                  </View>
                  {textEffect === effect.value && (
                    <Check size={24} color="#FFD700" />
                  )}
                </TouchableOpacity>
              ))}

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💡 <Text style={{ fontWeight: 'bold' }}>Dicas de efeitos:</Text>
                </Text>
                <Text style={styles.infoText}>• Normal: Texto simples e direto</Text>
                <Text style={styles.infoText}>• Deco: Adiciona decorações ao redor</Text>
                <Text style={styles.infoText}>• Squeeze: Comprime o texto</Text>
                <Text style={styles.infoText}>• Typewriter: Efeito de digitação</Text>
              </View>
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
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  previewContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  previewBackground: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    minHeight: 80,
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  tabActive: {
    borderBottomColor: '#FFD700',
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFD700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tabContent: {
    paddingBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  counterContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  counter: {
    color: '#888',
    fontSize: 12,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  sliderTrack: {
    flexDirection: 'row',
    gap: 8,
  },
  sliderButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  sliderButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: '#FFD700',
  },
  sliderButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: (SCREEN_WIDTH - 48) / 5,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  noneText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  fontStyleGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  fontStyleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  fontStyleButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: '#FFD700',
  },
  fontStyleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  effectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 8,
  },
  effectOptionActive: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  effectName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  effectDescription: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  infoText: {
    color: '#FFD700',
    fontSize: 13,
    marginBottom: 6,
  },
});
