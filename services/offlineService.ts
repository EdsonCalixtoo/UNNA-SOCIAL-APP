import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
  EVENTS: '@unna:cached_events',
  TICKETS: '@unna:cached_tickets',
};

export const offlineService = {
  /**
   * Salva os detalhes de um evento no cache local
   */
  async cacheEvent(event: any) {
    try {
      if (!event || !event.id) return;
      
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.EVENTS);
      let events = cachedData ? JSON.parse(cachedData) : {};
      
      // Atualiza ou adiciona o evento
      events[event.id] = {
        ...event,
        cached_at: new Date().toISOString()
      };

      await AsyncStorage.setItem(CACHE_KEYS.EVENTS, JSON.stringify(events));
    } catch (error) {
      console.error('[OfflineService] Error caching event:', error);
    }
  },

  /**
   * Recupera um evento do cache local
   */
  async getCachedEvent(eventId: string) {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.EVENTS);
      if (!cachedData) return null;
      
      const events = JSON.parse(cachedData);
      return events[eventId] || null;
    } catch (error) {
      console.error('[OfflineService] Error getting cached event:', error);
      return null;
    }
  },

  /**
   * Remove eventos antigos do cache (limpeza)
   */
  async clearOldCache() {
    try {
      // Poderíamos implementar uma lógica para remover eventos que já passaram da data
      await AsyncStorage.removeItem(CACHE_KEYS.EVENTS);
    } catch (error) {
      console.error('[OfflineService] Error clearing cache:', error);
    }
  }
};
