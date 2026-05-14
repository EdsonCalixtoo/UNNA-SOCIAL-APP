-- Adicionar coluna type à tabela events
ALTER TABLE events ADD COLUMN type VARCHAR(20) DEFAULT 'event';

-- Tornar campos de data/hora opcionais para publicações
ALTER TABLE events ALTER COLUMN event_date DROP NOT NULL;
ALTER TABLE events ALTER COLUMN event_time DROP NOT NULL;
ALTER TABLE events ALTER COLUMN location_name DROP NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN events.type IS 'Tipo do conteúdo: event ou publication';
