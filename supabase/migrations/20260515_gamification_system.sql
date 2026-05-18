-- Migration: Sistema de Medalhas e Conquistas UNNA
-- Descrição: Cria a estrutura para gamificação do aplicativo

-- 1. Tabela de Definição de Medalhas
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Emoji ou nome do ícone
    category TEXT, -- 'organizer', 'participant', 'social', 'special'
    requirement_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Medalhas do Usuário
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, badge_id)
);

-- 3. Inserir Medalhas Iniciais
INSERT INTO badges (name, description, icon, category, requirement_count) VALUES
('Pioneiro', 'Membro da primeira leva do UNNA', '🚀', 'special', 0),
('Anfitrião Bronze', 'Organizou 5 eventos', '🥉', 'organizer', 5),
('Anfitrião Prata', 'Organizou 15 eventos', '🥈', 'organizer', 15),
('Anfitrião Ouro', 'Organizou 50 eventos', '🥇', 'organizer', 50),
('Socialite', 'Participou de 10 eventos', '🥂', 'participant', 10),
('Explorador', 'Visitou 5 categorias diferentes', '🧭', 'participant', 5),
('Popular', 'Recebeu 100 curtidas em seus posts', '🔥', 'social', 100);

-- 4. Habilitar RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Badges visíveis para todos') THEN
        CREATE POLICY "Badges visíveis para todos" ON badges FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Medalhas dos usuários visíveis para todos') THEN
        CREATE POLICY "Medalhas dos usuários visíveis para todos" ON user_badges FOR SELECT USING (true);
    END IF;
END $$;
