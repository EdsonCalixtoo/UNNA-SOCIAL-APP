/*
  # Adicionar política de DELETE para mensagens

  1. Políticas
    - Usuários podem deletar suas próprias mensagens
    - Apenas o remetente da mensagem pode deletar ela

  2. Segurança
    - Previne que usuários deletem mensagens de outras pessoas
*/

-- Política para deletar mensagens próprias
DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (
    auth.uid() = sender_id
  );

-- Permitir que aplicação veja quando deletar falhar
CREATE POLICY "Anyone can view messages" ON messages FOR SELECT TO public USING (true);
