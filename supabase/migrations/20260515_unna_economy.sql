-- Migration: Sistema de Economia UNNA Coins
-- Descrição: Adiciona saldo de moedas e recompensas financeiras virtuais

-- 1. Adicionar coluna de moedas
ALTER TABLE public.profile_stats 
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

-- 2. Atualizar o trigger de Check-in para dar MOEDAS também
CREATE OR REPLACE FUNCTION public.on_checkin_done()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.checked_in_at IS NULL AND NEW.checked_in_at IS NOT NULL) THEN
        UPDATE public.profile_stats 
        SET xp = xp + 100,
            coins = coins + 50, -- Usuário ganha 50 UNNA Coins por comparecer!
            events_attended = events_attended + 1,
            level = public.calculate_level(xp + 100),
            last_updated = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para ganhar moedas ao CRIAR um evento (incentivo para hosts)
CREATE OR REPLACE FUNCTION public.on_event_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profile_stats (user_id, coins, events_created)
    VALUES (NEW.creator_id, 100, 1) -- Ganha 100 coins por hospedar
    ON CONFLICT (user_id) DO UPDATE 
    SET coins = profile_stats.coins + 100,
        events_created = profile_stats.events_created + 1,
        last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_event_created_coins ON public.events;
CREATE TRIGGER trigger_event_created_coins
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.on_event_created();
