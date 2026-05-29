-- Script SQL para Habilitar Webhooks de Push Notification no Supabase
-- IMPORTANTE: Substitua 'https://SEU-PROJETO.supabase.co/functions/v1/webhook-push' 
-- pela URL real da sua Edge Function antes de executar.

-- Habilitar a extenso pg_net para fazer chamadas HTTP (se j no estiver habilitada)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Criar a funo genrica que envia a requisio HTTP para a Edge Function
CREATE OR REPLACE FUNCTION notify_push_webhook()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT := 'https://SEU-PROJETO.supabase.co/functions/v1/webhook-push';
  anon_key TEXT := 'COLE_AQUI_SEU_ANON_KEY';
  request_body JSONB;
BEGIN
  request_body := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE null END
  );

  -- Realiza o POST para a Edge Function de forma assncrona via pg_net
  PERFORM net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := request_body
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Criar os Triggers nas tabelas correspondentes

-- A) Mensagens (Tabela: messages)
DROP TRIGGER IF EXISTS on_new_message_push ON messages;
CREATE TRIGGER on_new_message_push
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_push_webhook();

-- B) Seguidores (Tabela: follows)
DROP TRIGGER IF EXISTS on_new_follower_push ON follows;
CREATE TRIGGER on_new_follower_push
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_push_webhook();

-- C) Comentrios (Tabela: event_comments)
DROP TRIGGER IF EXISTS on_new_event_comment_push ON event_comments;
CREATE TRIGGER on_new_event_comment_push
  AFTER INSERT ON event_comments
  FOR EACH ROW EXECUTE FUNCTION notify_push_webhook();

-- D) Curtidas em Story (Tabela: story_likes)
DROP TRIGGER IF EXISTS on_new_story_like_push ON story_likes;
CREATE TRIGGER on_new_story_like_push
  AFTER INSERT ON story_likes
  FOR EACH ROW EXECUTE FUNCTION notify_push_webhook();

-- E) Convites/Participaes (Tabela: event_participants)
DROP TRIGGER IF EXISTS on_new_event_participant_push ON event_participants;
CREATE TRIGGER on_new_event_participant_push
  AFTER INSERT ON event_participants
  FOR EACH ROW EXECUTE FUNCTION notify_push_webhook();

-- NOTA: Como você est no Supabase Dashboard, uma alternativa ainda mais fcil e recomendada 
--  ir em "Database" > "Webhooks" no seu painel e criar webhooks visuais 
-- que apontam para a Edge Function `webhook-push` com mtodo POST.
