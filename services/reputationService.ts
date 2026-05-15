import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';

export const reputationService = {
  /**
   * Verifica se o usuário está no local de algum evento que ele confirmou presença
   * e realiza o check-in automático se estiver no horário e local corretos.
   */
  async checkAutomaticPresence(userId: string) {
    try {
      // 1. Buscar eventos que o usuário confirmou presença e que estão acontecendo AGORA
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000)).toISOString();
      const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000)).toISOString();

      const { data: participations, error } = await supabase
        .from('event_participants')
        .select(`
          event_id,
          events (
            id,
            title,
            location_name,
            latitude,
            longitude,
            event_date,
            event_time
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'confirmed');

      if (error || !participations || participations.length === 0) return;

      // 2. Obter localização atual do usuário
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      const { latitude: userLat, longitude: userLon } = location.coords;

      for (const p of participations) {
        const event: any = p.events;
        if (!event.latitude || !event.longitude) continue;

        // 3. Calcular distância entre usuário e evento (Haversine Formula)
        const distance = this.calculateDistance(userLat, userLon, event.latitude, event.longitude);

        // Se estiver a menos de 200 metros do local
        if (distance <= 200) {
          await this.markAsAttended(userId, event.id);
        }
      }

      // 4. Rodar auditoria de furões (limpeza de eventos passados)
      await this.runFlakerAudit();
    } catch (error) {
      console.error('Error in automatic check-in:', error);
    }
  },

  /**
   * Chama a função do banco de dados para processar quem não foi aos eventos
   */
  async runFlakerAudit() {
    try {
      await supabase.rpc('process_event_flakers');
    } catch (error) {
      // O erro pode ocorrer se a função ainda não foi migrada no banco
      console.log('Flaker audit skipped or function not found');
    }
  },

  /**
   * Marca o usuário como presente no evento e atribui pontos.
   */
  async markAsAttended(userId: string, eventId: string) {
    try {
      // Atualizar status da participação
      await supabase
        .from('event_participants')
        .update({ 
          status: 'attended',
          checked_in_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('event_id', eventId);

      // Atribuir pontos ao perfil (ex: +50 pontos por presença)
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points, level')
        .eq('id', userId)
        .single();

      if (profile) {
        const newPoints = (profile.total_points || 0) + 50;
        const newLevel = Math.floor(newPoints / 1000) + 1; // Ex: a cada 1000 pontos sobe um nível

        await supabase
          .from('profiles')
          .update({ 
            total_points: newPoints,
            level: newLevel
          })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Error marking as attended:', error);
    }
  },

  /**
   * Varredura periódica (pode ser chamada pelo backend ou ao abrir o app)
   * para identificar quem confirmou mas o evento já passou e não houve check-in.
   */
  async processFlakers() {
    // Essa lógica seria idealmente executada via Supabase Edge Functions (Cron Job)
    // Mas podemos rodar uma versão simplificada no app para atualizar o perfil do próprio usuário
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Raio da terra em metros
    const f1 = lat1 * Math.PI / 180;
    const f2 = lat2 * Math.PI / 180;
    const df = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(df / 2) * Math.sin(df / 2) +
              Math.cos(f1) * Math.cos(f2) *
              Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // metros
  }
};
