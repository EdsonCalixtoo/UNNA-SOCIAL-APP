/*
  # Corrigir RLS Policy para permitir DELETE de mensagens de chat de eventos
  
  O problema: Apenas o remetente (sender_id) pode deletar.
  A solução: Participantes da conversa podem deletar TODAS as mensagens da conversa.
  
  Isto é necessário para:
  - Função "Limpar Chat" do evento (limpa para TODOS)
  - Permite que qualquer participante limpe o histórico
*/

-- Remover a política restritiva anterior
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

-- Nova política: Participantes da conversa podem deletar qualquer mensagem
CREATE POLICY "Conversation participants can delete messages"
  ON messages FOR DELETE
  TO authenticated
  USING (
    -- O usuário é participante da conversa
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Garantir que SELECT continua funcionando para participantes
DROP POLICY IF EXISTS "Anyone can view messages" ON messages;
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    -- O usuário é participante da conversa
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Garantir que INSERT continua funcionando
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    -- O usuário é o remetente
    auth.uid() = sender_id
    AND
    -- O usuário é participante da conversa
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );
