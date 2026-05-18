-- Adiciona a coluna is_edited na tabela de mensagens se ela não existir
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
