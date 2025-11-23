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
import { MapPin, Users, Hash, Link as LinkIcon, Check, X, Plus, Trash2 } from 'lucide-react-native';

interface StoryTagEditorProps {
  visible: boolean;
  onClose: () => void;
  onSave: (tags: TagData[]) => void;
}

interface TagData {
  tag_type: 'person' | 'location' | 'hashtag' | 'link';
  tag_value: string;
  tagged_user_id?: string;
  position_x: number;
  position_y: number;
}

interface Tag extends TagData {
  id: string;
}

interface TagType {
  id: string;
  name: string;
  value: 'person' | 'location' | 'hashtag' | 'link';
  icon: string;
  placeholder: string;
  color: string;
}

const TAG_TYPES: TagType[] = [
  {
    id: '1',
    name: 'Pessoa',
    value: 'person',
    icon: 'Users',
    placeholder: 'Nome da pessoa',
    color: '#FF6B6B',
  },
  {
    id: '2',
    name: 'Local',
    value: 'location',
    icon: 'MapPin',
    placeholder: 'Nome do local',
    color: '#4ECDC4',
  },
  {
    id: '3',
    name: 'Hashtag',
    value: 'hashtag',
    icon: 'Hash',
    placeholder: 'hashtag (sem #)',
    color: '#FFD700',
  },
  {
    id: '4',
    name: 'Link',
    value: 'link',
    icon: 'Link',
    placeholder: 'https://...',
    color: '#9370DB',
  },
];

const MOCK_USERS = [
  { id: '1', name: 'João Silva' },
  { id: '2', name: 'Maria Santos' },
  { id: '3', name: 'Pedro Oliveira' },
  { id: '4', name: 'Ana Costa' },
  { id: '5', name: 'Lucas Ferreira' },
];

const MOCK_LOCATIONS = [
  { id: '1', name: 'São Paulo, Brasil' },
  { id: '2', name: 'Rio de Janeiro' },
  { id: '3', name: 'Praia do Futuro' },
  { id: '4', name: 'Copacabana' },
  { id: '5', name: 'Pão de Açúcar' },
];

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function StoryTagEditor({
  visible,
  onClose,
  onSave,
}: StoryTagEditorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTab, setActiveTab] = useState<'person' | 'location' | 'hashtag' | 'link'>('person');
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const getTagTypeInfo = (type: 'person' | 'location' | 'hashtag' | 'link') => {
    return TAG_TYPES.find((t) => t.value === type)!;
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);

    if (!text.trim()) {
      setSuggestions([]);
      return;
    }

    let filtered: any[] = [];
    const lowerText = text.toLowerCase();

    if (activeTab === 'person') {
      filtered = MOCK_USERS.filter((u) =>
        u.name.toLowerCase().includes(lowerText)
      );
    } else if (activeTab === 'location') {
      filtered = MOCK_LOCATIONS.filter((l) =>
        l.name.toLowerCase().includes(lowerText)
      );
    }

    setSuggestions(filtered);
    setShowSuggestions(true);
  };

  const handleAddTag = (value?: string, userId?: string) => {
    const finalValue = value || inputValue;

    if (!finalValue.trim()) {
      alert('Digite um valor para adicionar');
      return;
    }

    // Validar hashtag
    if (activeTab === 'hashtag' && finalValue.startsWith('#')) {
      alert('Não use # no começo, será adicionado automaticamente');
      return;
    }

    // Validar link
    if (activeTab === 'link' && !finalValue.startsWith('http')) {
      alert('Digite uma URL válida (comece com http ou https)');
      return;
    }

    const newTag: Tag = {
      id: Date.now().toString(),
      tag_type: activeTab,
      tag_value: activeTab === 'hashtag' ? `#${finalValue}` : finalValue,
      tagged_user_id: userId,
      position_x: Math.random(),
      position_y: Math.random(),
    };

    setTags([...tags, newTag]);
    setInputValue('');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleRemoveTag = (id: string) => {
    setTags(tags.filter((t) => t.id !== id));
  };

  const handleSave = () => {
    onSave(tags.map(({ id, ...rest }) => rest));
  };

  const renderTagItem = ({ item }: { item: Tag }) => {
    const tagTypeInfo = getTagTypeInfo(item.tag_type);

    return (
      <View
        style={[
          styles.tagItem,
          { borderLeftColor: tagTypeInfo.color },
        ]}
      >
        <View style={styles.tagItemContent}>
          <Text style={styles.tagItemType}>{tagTypeInfo.name}</Text>
          <Text style={styles.tagItemValue}>{item.tag_value}</Text>
        </View>
        <TouchableOpacity onPress={() => handleRemoveTag(item.id)}>
          <Trash2 size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderSuggestion = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleAddTag(item.name, item.id)}
    >
      <Text style={styles.suggestionText}>{item.name}</Text>
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Marcar Pessoas e Locais</Text>
          <TouchableOpacity onPress={handleSave}>
            <Check size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {TAG_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.tab,
                activeTab === type.value && styles.tabActive,
              ]}
              onPress={() => {
                setActiveTab(type.value as any);
                setInputValue('');
                setShowSuggestions(false);
              }}
            >
              {type.value === 'person' && <Users size={20} color={activeTab === type.value ? '#FFD700' : '#888'} />}
              {type.value === 'location' && <MapPin size={20} color={activeTab === type.value ? '#FFD700' : '#888'} />}
              {type.value === 'hashtag' && <Hash size={20} color={activeTab === type.value ? '#FFD700' : '#888'} />}
              {type.value === 'link' && <LinkIcon size={20} color={activeTab === type.value ? '#FFD700' : '#888'} />}
              <Text style={[styles.tabText, activeTab === type.value && styles.tabTextActive]}>
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>
              ➕ Adicionar {getTagTypeInfo(activeTab).name}
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={getTagTypeInfo(activeTab).placeholder}
                placeholderTextColor="#666"
                value={inputValue}
                onChangeText={handleInputChange}
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: getTagTypeInfo(activeTab).color },
                ]}
                onPress={() => handleAddTag()}
              >
                <Plus size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={suggestions}
                  renderItem={renderSuggestion}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>
            )}

            {/* Quick suggestions */}
            {!inputValue && (activeTab === 'person' || activeTab === 'location') && (
              <>
                <Text style={styles.quickSuggestionsTitle}>Sugestões rápidas:</Text>
                <View style={styles.quickSuggestionsContainer}>
                  {(activeTab === 'person' ? MOCK_USERS : MOCK_LOCATIONS).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.quickSuggestionButton}
                      onPress={() => handleAddTag(item.name, item.id)}
                    >
                      <Text style={styles.quickSuggestionText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Tags List */}
          {tags.length > 0 && (
            <View style={styles.tagsListContainer}>
              <View style={styles.tagsHeader}>
                <Text style={styles.sectionTitle}>🏷️ Tags Adicionadas ({tags.length})</Text>
              </View>

              <FlatList
                data={tags}
                renderItem={renderTagItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.tagSeparator} />}
              />
            </View>
          )}

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 Dicas de Tags</Text>
            <Text style={styles.infoText}>
              • <Text style={{ fontWeight: 'bold' }}>Pessoas:</Text> Marque amigos e seguidores
            </Text>
            <Text style={styles.infoText}>
              • <Text style={{ fontWeight: 'bold' }}>Locais:</Text> Indique onde está
            </Text>
            <Text style={styles.infoText}>
              • <Text style={{ fontWeight: 'bold' }}>Hashtags:</Text> Use para descoberta (#viagem)
            </Text>
            <Text style={styles.infoText}>
              • <Text style={{ fontWeight: 'bold' }}>Links:</Text> Compartilhe URLs relacionadas
            </Text>
            <Text style={styles.infoText}>
              • Você pode adicionar várias tags de cada tipo!
            </Text>
          </View>

          <View style={styles.spacer} />
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
    gap: 6,
  },
  tabActive: {
    borderBottomColor: '#FFD700',
  },
  tabText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFD700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: '#fff',
    fontSize: 14,
  },
  addButton: {
    width: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 12,
    maxHeight: 150,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  suggestionText: {
    color: '#fff',
    fontSize: 14,
  },
  quickSuggestionsTitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  quickSuggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSuggestionButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  quickSuggestionText: {
    color: '#fff',
    fontSize: 12,
  },
  tagsListContainer: {
    marginBottom: 24,
  },
  tagsHeader: {
    marginBottom: 12,
  },
  tagItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  tagItemContent: {
    flex: 1,
  },
  tagItemType: {
    color: '#888',
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  tagItemValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  tagSeparator: {
    height: 8,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#FFD700',
    fontSize: 12,
    marginBottom: 4,
  },
  spacer: {
    height: 20,
  },
});
