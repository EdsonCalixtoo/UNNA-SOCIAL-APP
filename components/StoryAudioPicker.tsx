import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';
import { Music, Play, Pause, Volume2, Check, X, Search } from 'lucide-react-native';

interface StoryAudioPickerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (audio: AudioData) => void;
}

interface AudioData {
  audio_url: string;
  audio_title: string;
  audio_artist: string;
  audio_source: 'spotify' | 'local' | 'youtube';
  audio_duration: number;
  start_time: number;
  volume: number;
}

interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration: number;
  source: 'spotify' | 'local' | 'youtube';
  thumbnail?: string;
}

// Mock de áudios para demonstração
const MOCK_AUDIO_LIBRARY: AudioTrack[] = [
  {
    id: '1',
    title: 'Summer Vibes',
    artist: 'The Wave',
    url: 'https://example.com/audio1.mp3',
    duration: 180,
    source: 'spotify',
  },
  {
    id: '2',
    title: 'Night Drive',
    artist: 'Neon Dreams',
    url: 'https://example.com/audio2.mp3',
    duration: 220,
    source: 'spotify',
  },
  {
    id: '3',
    title: 'Chill Beats',
    artist: 'Lo-Fi Master',
    url: 'https://example.com/audio3.mp3',
    duration: 240,
    source: 'spotify',
  },
  {
    id: '4',
    title: 'Party Time',
    artist: 'DJ Sonic',
    url: 'https://example.com/audio4.mp3',
    duration: 200,
    source: 'spotify',
  },
  {
    id: '5',
    title: 'Focus Music',
    artist: 'Zen Audio',
    url: 'https://example.com/audio5.mp3',
    duration: 300,
    source: 'spotify',
  },
];

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function StoryAudioPicker({
  visible,
  onClose,
  onSave,
}: StoryAudioPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAudio, setSelectedAudio] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const [startTime, setStartTime] = useState(0);
  const [filteredAudios, setFilteredAudios] = useState(MOCK_AUDIO_LIBRARY);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredAudios(MOCK_AUDIO_LIBRARY);
    } else {
      const filtered = MOCK_AUDIO_LIBRARY.filter(
        (audio) =>
          audio.title.toLowerCase().includes(query.toLowerCase()) ||
          audio.artist.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredAudios(filtered);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectAudio = (audio: AudioTrack) => {
    setSelectedAudio(audio);
    setIsPlaying(false);
    setStartTime(0);
  };

  const handleSave = () => {
    if (!selectedAudio) {
      alert('Selecione uma música!');
      return;
    }

    const audioData: AudioData = {
      audio_url: selectedAudio.url,
      audio_title: selectedAudio.title,
      audio_artist: selectedAudio.artist,
      audio_source: selectedAudio.source,
      audio_duration: selectedAudio.duration,
      start_time: startTime,
      volume,
    };

    onSave(audioData);
  };

  const renderAudioItem = ({ item }: { item: AudioTrack }) => {
    const isSelected = selectedAudio?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.audioItem, isSelected && styles.audioItemSelected]}
        onPress={() => handleSelectAudio(item)}
      >
        <View style={styles.audioIcon}>
          <Music size={24} color="#FFD700" />
        </View>

        <View style={styles.audioInfo}>
          <Text style={styles.audioTitle}>{item.title}</Text>
          <Text style={styles.audioArtist}>{item.artist}</Text>
          <Text style={styles.audioDuration}>{formatDuration(item.duration)}</Text>
        </View>

        {isSelected && (
          <Check size={24} color="#FFD700" />
        )}
      </TouchableOpacity>
    );
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
          <Text style={styles.headerTitle}>Adicionar Música</Text>
          <TouchableOpacity onPress={handleSave} disabled={!selectedAudio}>
            <Check size={28} color={selectedAudio ? '#fff' : '#666'} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar música ou artista..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <X size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Selected Audio Preview */}
          {selectedAudio && (
            <View style={styles.previewContainer}>
              <View style={styles.previewIcon}>
                <Music size={32} color="#FFD700" />
              </View>

              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{selectedAudio.title}</Text>
                <Text style={styles.previewArtist}>{selectedAudio.artist}</Text>
                <View style={styles.previewControls}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <Pause size={20} color="#fff" />
                    ) : (
                      <Play size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                  <View style={styles.durationBar}>
                    <View style={[styles.durationFill, { width: '30%' }]} />
                  </View>
                  <Text style={styles.durationText}>
                    {formatDuration(selectedAudio.duration)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Controls */}
          {selectedAudio && (
            <View style={styles.controlsContainer}>
              <Text style={styles.sectionTitle}>🎛️ Controles</Text>

              {/* Volume */}
              <View style={styles.controlItem}>
                <View style={styles.controlLabel}>
                  <Volume2 size={20} color="#FFD700" />
                  <Text style={styles.controlLabelText}>Volume: {volume}%</Text>
                </View>
                <View style={styles.volumeSlider}>
                  {[0, 25, 50, 75, 100].map((vol) => (
                    <TouchableOpacity
                      key={vol}
                      style={[
                        styles.volumeButton,
                        volume === vol && styles.volumeButtonActive,
                      ]}
                      onPress={() => setVolume(vol)}
                    >
                      <Text style={styles.volumeButtonText}>{vol}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Start Time */}
              <View style={styles.controlItem}>
                <Text style={styles.controlLabelText}>Começar em: {formatDuration(startTime)}</Text>
                <View style={styles.startTimeSlider}>
                  {Array.from({ length: Math.min(5, selectedAudio.duration / 60) }).map((_, i) => {
                    const time = (i * selectedAudio.duration) / 5;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.startTimeButton,
                          startTime === time && styles.startTimeButtonActive,
                        ]}
                        onPress={() => setStartTime(Math.round(time))}
                      >
                        <Text style={styles.startTimeButtonText}>{formatDuration(time)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Audio Library */}
          <View style={styles.libraryContainer}>
            <Text style={styles.sectionTitle}>🎵 Biblioteca de Músicas</Text>

            {filteredAudios.length > 0 ? (
              <FlatList
                data={filteredAudios}
                renderItem={renderAudioItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            ) : (
              <View style={styles.emptyState}>
                <Music size={48} color="#666" />
                <Text style={styles.emptyStateText}>Nenhuma música encontrada</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>💡 Dicas</Text>
            <Text style={styles.infoText}>• Selecione uma música da biblioteca</Text>
            <Text style={styles.infoText}>• Ajuste o volume conforme necessário</Text>
            <Text style={styles.infoText}>• Escolha onde a música começa</Text>
            <Text style={styles.infoText}>• Toque em uma música para ouvir preview</Text>
          </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 16,
    gap: 12,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewArtist: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  previewControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    overflow: 'hidden',
  },
  durationFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  durationText: {
    color: '#888',
    fontSize: 10,
    width: 30,
  },
  controlsContainer: {
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  controlItem: {
    marginBottom: 16,
  },
  controlLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  controlLabelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  volumeSlider: {
    flexDirection: 'row',
    gap: 8,
  },
  volumeButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    alignItems: 'center',
  },
  volumeButtonActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  volumeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  startTimeSlider: {
    flexDirection: 'row',
    gap: 8,
  },
  startTimeButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    alignItems: 'center',
  },
  startTimeButtonActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  startTimeButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  libraryContainer: {
    marginBottom: 24,
  },
  audioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 12,
  },
  audioItemSelected: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  audioIcon: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  audioArtist: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  audioDuration: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
  separator: {
    height: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
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
});
