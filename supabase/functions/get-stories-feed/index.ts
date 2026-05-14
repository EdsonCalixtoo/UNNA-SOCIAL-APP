import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )

  try {
    const CDN_URL = Deno.env.get('CDN_URL') || "https://pub-1884ab04089e47fdb37182e819bf455a.r2.dev";

    // Buscar Stories das últimas 24h com profiles
    const { data: stories, error } = await supabaseClient
      .from('stories')
      .select(`
        id,
        user_id,
        media_url,
        media_type,
        created_at,
        profiles (
          username,
          avatar_url
        )
      `)
      .gt('created_at', new Date(Date.now() - 86400000).toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transformar URLs para CDN Otimizada
    const optimizedStories = (stories || []).map((s: any) => {
      const isVideo = s.media_type === 'video';
      const rawUrl = s.media_url;
      
      // Se for vídeo, assume que existe uma versão HLS (ex: master.m3u8) na pasta /hls/
      // Se for imagem, usa o Cloudflare Image Resizing se configurado no domínio
      const main_url = isVideo 
        ? `${CDN_URL}/hls/${s.id}/master.m3u8` // Exemplo de estrutura HLS
        : `${CDN_URL}/cdn-cgi/image/width=1080,format=auto,quality=85/${rawUrl}`;
      
      return {
        ...s,
        main_url: main_url,
        preview_url: `${CDN_URL}/cdn-cgi/image/width=150,blur=10,quality=30/${rawUrl}`,
        profiles: Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
      };
    });

    return new Response(
      JSON.stringify(optimizedStories),
      {
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" 
        },
        status: 200,
      }
    );

  } catch (err) {
    const error = err as Error;
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500 
    });
  }
})
