import { supabase } from '@/lib/supabase';
import { Event } from '@/types/database';

export const eventService = {
  /**
   * Busca eventos ao vivo com todos os relacionamentos necessários
   */
  async getLiveEvents(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        profiles:creator_id (id, username, full_name, avatar_url),
        categories:category_id (id, name, icon),
        subcategories:subcategory_id (id, name)
      `)
      .eq('status', 'ao_vivo')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('event_date', { ascending: true })
      .limit(50);

    if (error) {
      console.error('❌ Supabase error loading events:', error);
      throw error;
    }

    const now = new Date();
    // Filtra eventos que não terminaram (4h de duração estimada)
    return (data || []).filter((event) => {
      if (!event.event_date || !event.event_time) return false;
      
      // Cria data/hora do evento (YYYY-MM-DD + THH:mm:ss)
      const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
      if (isNaN(eventDateTime.getTime())) return false;
      
      // Define fim do evento como 4h após o início
      const eventEndTime = new Date(eventDateTime.getTime() + 4 * 60 * 60 * 1000);
      
      return eventEndTime > now;
    });
  },

  /**
   * Busca todas as categorias disponíveis
   */
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, icon')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Calcula o status amigável do evento
   */
  getEventStatus(event: Event): 'happening' | 'starting-soon' | 'upcoming' {
    const now = new Date();
    if (!event.event_date || !event.event_time) return 'upcoming';
    
    const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
    const eventEndTime = new Date(eventDateTime.getTime() + 4 * 60 * 60 * 1000);
    const diff = eventDateTime.getTime() - now.getTime();

    if (diff < 0 && eventEndTime > now) return 'happening';
    if (diff < 2 * 60 * 60 * 1000) return 'starting-soon';
    return 'upcoming';
  }
};
