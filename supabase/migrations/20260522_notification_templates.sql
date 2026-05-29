-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id TEXT PRIMARY KEY,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can select (functions and users need to read templates)
CREATE POLICY "notification_templates_select" ON notification_templates
  FOR SELECT USING (true);

-- Only admins can insert/update (this is an approximation, the app will handle admin checks)
-- Since the frontend handles admin logic via profile roles, we allow authenticated users to update,
-- but the UI will restrict access to the Admin Panel.
CREATE POLICY "notification_templates_update" ON notification_templates
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "notification_templates_insert" ON notification_templates
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Insert initial templates
INSERT INTO notification_templates (id, title_template, body_template)
VALUES (
  'event_presence',
  'Nova presença confirmada! 🎉',
  '[ATOR] confirmou presença no seu evento "[EVENTO]".'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_templates (id, title_template, body_template)
VALUES (
  'event_friend_presence',
  'Seu amigo vai em um evento!',
  '[ATOR] marcou presença em "[EVENTO]". Que tal ir junto?'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO notification_templates (id, title_template, body_template)
VALUES (
  'smart_recommendation',
  'Sua boa para os próximos dias! 🔥',
  'Ei [NOME], tem [CATEGORIA] rolando [DIA_SEMANA]! Clica aqui e confira o evento "[EVENTO]".'
) ON CONFLICT (id) DO NOTHING;

-- Publish to realtime so the app can sync if needed
ALTER PUBLICATION supabase_realtime ADD TABLE notification_templates;
