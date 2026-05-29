-- Adiciona política de UPDATE para o próprio usuário editar seus comentários
CREATE POLICY "event_comments_update" ON event_comments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
