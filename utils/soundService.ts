import { Audio } from 'expo-av';

class SoundService {
  private sounds: { [key: string]: Audio.Sound } = {};
  private isMuted: boolean = false;

  async init() {
    try {
      // Pré-carregamento de sons curtos e leves
      // Nota: Em um ambiente real, você usaria arquivos locais em assets/sounds
      // Como não temos acesso aos assets agora, vamos preparar a estrutura
      console.log('[SoundService] Inicializado');
    } catch (e) {
      console.warn('[SoundService] Falha ao carregar sons:', e);
    }
  }

  async play(soundName: 'click' | 'pop' | 'shimmer' | 'success' | 'error') {
    if (this.isMuted) return;

    try {
      // Mapeamento de sons para URLs ou caminhos locais
      // Para demonstração, vamos usar logs. O usuário precisará adicionar os arquivos .mp3
      console.log(`[SoundService] Tocando som: ${soundName}`);
      
      // Exemplo de como seria a implementação real com expo-av:
      /*
      const { sound } = await Audio.Sound.createAsync(
        soundName === 'click' ? require('@/assets/sounds/click.mp3') : ...
      );
      await sound.playAsync();
      // Descarregar após tocar para economizar memória
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) sound.unloadAsync();
      });
      */
    } catch (e) {
      console.warn(`[SoundService] Erro ao tocar ${soundName}:`, e);
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }
}

export const soundService = new SoundService();
