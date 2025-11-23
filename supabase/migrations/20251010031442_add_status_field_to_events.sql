/*
  # Adicionar campo de status aos eventos

  1. Alterações
    - Adiciona coluna `status` (text) para controlar o status do evento
    - Valores possíveis: 'rascunho', 'ao_vivo', 'cancelado', 'finalizado'
    - Valor padrão: 'ao_vivo'
  
  2. Segurança
    - Mantém as políticas RLS existentes
*/

-- Adicionar campo de status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'status'
  ) THEN
    ALTER TABLE events ADD COLUMN status text DEFAULT 'ao_vivo' CHECK (status IN ('rascunho', 'ao_vivo', 'cancelado', 'finalizado'));
  END IF;
END $$;

-- Criar índice para melhor performance nas queries
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);