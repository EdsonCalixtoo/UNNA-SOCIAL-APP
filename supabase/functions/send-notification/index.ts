import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  try {
    const { userId, title, message, data, type, imageUrl } = await req.json();

    // Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. SEMPRE salvar no banco para histórico e notificações in-app via Realtime
    await supabase.from("notifications").insert({
      user_id: userId,
      type: type || 'system',
      title: title,
      message: message,
      data: data || {},
      read: false,
    });

    // 2. Tentar enviar push nativa apenas se houver token (app em background/fechado)
    const { data: profile } = await supabase
      .from("profiles")
      .select("push_token")
      .eq("id", userId)
      .single();

    if (!profile?.push_token) {
      // Sem token: notificação in-app via Realtime já foi disparada pelo INSERT acima
      return new Response(JSON.stringify({ success: true, inApp: true, push: false }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Enviar Push via Expo para notificações quando o app está em background/fechado
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: profile.push_token,
        sound: "default",
        title: title,
        body: message,
        data: data || {},
        badge: 1,
        priority: "high",
        mutableContent: true,
        attachments: imageUrl ? [{ url: imageUrl }] : [],
        // _displayInForeground REMOVIDO: o app já exibe banner customizado via Realtime
      }),
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, inApp: true, push: true, result }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
