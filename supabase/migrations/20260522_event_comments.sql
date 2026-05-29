-- Cria tabela de comentários para eventos/publicações
CREATE TABLE IF NOT EXISTS event_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_user_id ON event_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_created_at ON event_comments(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa autenticada pode ler comentários
CREATE POLICY "event_comments_select" ON event_comments
  FOR SELECT USING (true);

-- Apenas usuário autenticado pode inserir seu próprio comentário
CREATE POLICY "event_comments_insert" ON event_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Apenas o dono do comentário pode deletar
CREATE POLICY "event_comments_delete" ON event_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Habilitar realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE event_comments;
