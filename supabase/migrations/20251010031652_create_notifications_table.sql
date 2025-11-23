/*
  # Criar tabela de notificações

  1. Nova Tabela
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, referência para profiles)
      - `type` (text) - tipo da notificação
      - `title` (text) - título da notificação
      - `message` (text) - mensagem da notificação
      - `data` (jsonb) - dados adicionais
      - `read` (boolean) - se foi lida
      - `created_at` (timestamptz)

  2. Segurança
    - Habilitar RLS
    - Políticas para usuários visualizarem apenas suas notificações
    - Políticas para marcar como lida

  3. Índices
    - Índice em user_id para melhor performance
    - Índice em created_at para ordenação
*/

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);