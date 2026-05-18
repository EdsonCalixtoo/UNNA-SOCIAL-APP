-- Adiciona coluna is_admin na tabela de participantes da conversa
ALTER TABLE public.conversation_participants ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Adiciona coluna description na tabela de conversas
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS description TEXT;

-- Habilita RLS para a tabela conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Limpa políticas anteriores se existirem
DROP POLICY IF EXISTS "Allow select for conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow insert for conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow update for conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow delete for conversation participants" ON public.conversation_participants;

-- Políticas robustas para a tabela conversation_participants
CREATE POLICY "Allow select for conversation participants" 
ON public.conversation_participants 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert for conversation participants" 
ON public.conversation_participants 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow update for conversation participants" 
ON public.conversation_participants 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow delete for conversation participants" 
ON public.conversation_participants 
FOR DELETE 
TO authenticated 
USING (true);

-- Habilita RLS para a tabela conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Limpa políticas anteriores se existirem
DROP POLICY IF EXISTS "Allow select for conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow insert for conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow update for conversations" ON public.conversations;
DROP POLICY IF EXISTS "Allow delete for conversations" ON public.conversations;

-- Políticas robustas para a tabela conversations
CREATE POLICY "Allow select for conversations" 
ON public.conversations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow insert for conversations" 
ON public.conversations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow update for conversations" 
ON public.conversations 
FOR UPDATE 
TO authenticated 
USING (true);
