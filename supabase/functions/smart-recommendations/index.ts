import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obter todos os usuários com push_token ativo e categorias preferidas
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name, username, push_token, preferred_categories')
      .not('push_token', 'is', null);

    if (usersError) throw usersError;
    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum usuário com push_token encontrado." }), { status: 200 });
    }

    // 2. Obter eventos ativos nos próximos dias
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id, 
        title, 
        category_id, 
        event_date,
        categories (
          name
        )
      `)
      .gte('event_date', today.toISOString())
      .lte('event_date', nextWeek.toISOString())
      .limit(50);

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum evento futuro encontrado." }), { status: 200 });
    }

    // 2.5 Obter template do banco (com fallback)
    const { data: templateData } = await supabase
      .from('notification_templates')
      .select('title_template, body_template')
      .eq('id', 'smart_recommendation')
      .single();

    const templateTitle = templateData?.title_template || 'Sua boa para os próximos dias! 🔥';
    const templateBody = templateData?.body_template || 'Ei [NOME], tem [CATEGORIA] rolando [DIA_SEMANA]! Clica aqui e confira o evento "[EVENTO]".';

    const replaceVars = (text: string, vars: Record<string, string>) => {
      let result = text;
      for (const [key, value] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
      }
      return result;
    };

    // 3. Cruzar preferências e enviar Push
    const notifications = [];

    for (const user of users) {
      if (!user.preferred_categories || user.preferred_categories.length === 0) continue;

      // Filtrar eventos que combinem com as categorias do usuário
      const matchedEvents = events.filter(e => user.preferred_categories.includes(e.category_id));

      if (matchedEvents.length > 0) {
        // Pega um evento aleatório dentre os matches para variar a notificação
        const event = matchedEvents[Math.floor(Math.random() * matchedEvents.length)];
        
        const firstName = (user.full_name || user.username || 'Amigo').split(' ')[0];
        const categoryName = event.categories?.name || 'evento';
        
        const eventDateObj = new Date(event.event_date);
        const dayOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][eventDateObj.getDay()];
        
        const vars = {
          NOME: firstName,
          CATEGORIA: categoryName,
          DIA_SEMANA: dayOfWeek,
          EVENTO: event.title
        };

        const finalTitle = replaceVars(templateTitle, vars);
        const finalMessage = replaceVars(templateBody, vars);

        notifications.push({
          to: user.push_token,
          sound: "default",
          title: finalTitle,
          body: finalMessage,
          data: { event_id: event.id },
          badge: 1,
          priority: "high"
        });
        
        // Também salvamos no banco para histórico no in-app
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: 'system',
          title: finalTitle,
          message: finalMessage,
          data: { event_id: event.id },
          read: false,
        });
      }
    }

    if (notifications.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum match encontrado." }), { status: 200 });
    }

    // Enviar lote para o Expo
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notifications),
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, sent: notifications.length, result }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
