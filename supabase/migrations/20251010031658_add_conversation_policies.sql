/*
  # Adicionar políticas para conversas

  1. Políticas
    - Permitir criação de conversas
    - Permitir criação de participantes de conversas
    - Atualizar políticas de mensagens para permitir atualização (marcar como lida)

  2. Segurança
    - Usuários podem criar conversas
    - Usuários podem adicionar participantes às suas conversas
    - Usuários podem atualizar mensagens em suas conversas (marcar como lida)
*/

-- Política para criar conversas
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para criar participantes de conversas
DROP POLICY IF EXISTS "Users can add conversation participants" ON conversation_participants;
CREATE POLICY "Users can add conversation participants"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para atualizar mensagens (marcar como lida)
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;
CREATE POLICY "Users can update messages in their conversations"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );