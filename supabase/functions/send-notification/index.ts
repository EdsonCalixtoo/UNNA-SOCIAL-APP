import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

serve(async (req) => {
  try {
    const { userId, title, message, data, type } = await req.json();

    // Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get user push token and settings
    const { data: profile, error: pError } = await supabase
      .from("profiles")
      .select("push_token")
      .eq("id", userId)
      .single();

    const { data: settings, error: sError } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (!profile?.push_token) {
      return new Response(JSON.stringify({ success: false, error: "No push token" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Check if this type of notification is enabled
    let enabled = true;
    if (settings) {
      if (type === "new_message") enabled = settings.new_messages;
      if (type === "story_like" || type === "post_like") enabled = settings.likes;
      if (type === "new_follower") enabled = settings.new_followers;
      if (type === "event_reminder") enabled = settings.event_reminders;
      if (type === "event_invite") enabled = settings.event_invites;
    }

    if (!enabled) {
      return new Response(JSON.stringify({ success: false, error: "Notification disabled by user" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Save to notifications table for in-app history
    await supabase.from("notifications").insert({
      user_id: userId,
      type: type,
      title: title,
      message: message,
      data: data || {},
      read: false,
    });

    // 4. Send Push via Expo
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
      }),
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, result }), {
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
