-- Adiciona suporte a respostas (replies) nos comentários
ALTER TABLE event_comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES event_comments(id) ON DELETE CASCADE;

-- Índice para buscar respostas mais rápido
CREATE INDEX IF NOT EXISTS idx_event_comments_parent_id ON event_comments(parent_id);
