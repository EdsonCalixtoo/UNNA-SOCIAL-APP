-- Migration: Pacote Geral de Melhorias UNNA (Segurança + Gamificação + Social)
-- Descrição: Cria toda a estrutura de banco necessária para as funcionalidades premium

-- 1. SISTEMA DE DENÚNCIAS (REPORTS)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL, -- 'event', 'profile', 'comment'
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SISTEMA DE XP E NÍVEIS (PROFILE STATS)
CREATE TABLE IF NOT EXISTS public.profile_stats (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    events_created INTEGER DEFAULT 0,
    events_attended INTEGER DEFAULT 0,
    total_likes_received INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. HABILITAR RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_stats ENABLE ROW LEVEL SECURITY;

-- Garantir que a coluna role existe na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Políticas de Reports
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view reports" ON public.reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin' OR id = '65432100-0000-0000-0000-000000000000'))
);

-- Políticas de Profile Stats
CREATE POLICY "Anyone can view profile stats" ON public.profile_stats FOR SELECT USING (true);
CREATE POLICY "System updates profile stats" ON public.profile_stats FOR ALL USING (true);

-- 4. FUNÇÃO PARA CALCULAR NÍVEL BASEADO EM XP
CREATE OR REPLACE FUNCTION public.calculate_level(p_xp INTEGER) 
RETURNS INTEGER AS $$
BEGIN
    -- Lógica simples: Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 300 XP, etc.
    RETURN floor(sqrt(p_xp / 50)) + 1;
END;
$$ LANGUAGE plpgsql;

-- 5. TRIGGER PARA GANHO DE XP AUTOMÁTICO (Ao Confirmar Presença)
CREATE OR REPLACE FUNCTION public.on_presence_confirmed()
RETURNS TRIGGER AS $$
BEGIN
    -- Insere ou atualiza stats do usuário
    INSERT INTO public.profile_stats (user_id, xp)
    VALUES (NEW.user_id, 20) -- 20 XP por confirmar presença
    ON CONFLICT (user_id) DO UPDATE 
    SET xp = profile_stats.xp + 20,
        last_updated = NOW();
    
    -- Atualiza o nível
    UPDATE public.profile_stats 
    SET level = public.calculate_level(xp)
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_presence_xp
AFTER INSERT ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION public.on_presence_confirmed();

-- 6. TRIGGER PARA XP EXTRA NO CHECK-IN (Ao entrar no evento)
CREATE OR REPLACE FUNCTION public.on_checkin_done()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.checked_in_at IS NULL AND NEW.checked_in_at IS NOT NULL) THEN
        UPDATE public.profile_stats 
        SET xp = xp + 100, -- 100 XP por realmente ir ao evento
            events_attended = events_attended + 1,
            level = public.calculate_level(xp + 100),
            last_updated = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_checkin_xp
AFTER UPDATE ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION public.on_checkin_done();
