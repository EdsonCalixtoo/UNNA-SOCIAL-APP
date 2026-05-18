import { supabase } from '@/lib/supabase';
import { Event } from '@/types/database';

export const eventService = {
  /**
   * Busca eventos ao vivo com todos os relacionamentos necessários
   */
  async getLiveEvents(): Promise<any[]> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        profiles:creator_id (id, username, full_name, avatar_url, is_verified),
        categories:category_id (id, name, icon),
        subcategories:subcategory_id (id, name),
        likes:event_likes(count),
        participants:event_participants(count)
      `)
      .or('status.neq.encerrado,status.is.null') // Mostra tudo, menos o que está encerrado (incluindo nulos)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('event_date', { ascending: true })
      .limit(100);

    if (error) {
      console.error('❌ Supabase error loading events:', error);
      throw error;
    }

    const now = new Date();
    return (data || []).map(event => ({
      ...event,
      likes_count: event.likes?.[0]?.count || 0,
      participants_count: event.participants?.[0]?.count || 0,
    })).filter((event) => {
      // O mapa é EXCLUSIVO para eventos. Publicações não aparecem aqui.
      if (event.type === 'publication') return false;

      // Precisa ter data e hora e não ter acabado há mais de 6h
      if (!event.event_date || !event.event_time) return false;
      
      const [year, month, day] = event.event_date.split('-').map(Number);
      const [hours, minutes] = event.event_time.split(':').map(Number);
      
      const eventDateTime = new Date(year, month - 1, day, hours, minutes);
      if (isNaN(eventDateTime.getTime())) return false;
      
      const eventEndTime = new Date(eventDateTime.getTime() + 6 * 60 * 60 * 1000); // 6h de duração
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
      .order('order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Calcula o status amigável do evento
   */
  getEventStatus(event: Event): 'happening' | 'starting-soon' | 'upcoming' {
    const now = new Date();
    if (!event.event_date || !event.event_time) return 'upcoming';
    
    // Criar data interpretando as strings como horário LOCAL
    const [year, month, day] = event.event_date.split('-').map(Number);
    const [hours, minutes] = event.event_time.split(':').map(Number);
    const eventDateTime = new Date(year, month - 1, day, hours, minutes);
    
    const eventEndTime = new Date(eventDateTime.getTime() + 4 * 60 * 60 * 1000);
    const diff = eventDateTime.getTime() - now.getTime();

    if (diff < 0 && eventEndTime > now) return 'happening';
    if (diff < 2 * 60 * 60 * 1000) return 'starting-soon';
    return 'upcoming';
  }
};
