-- Adicionar sistema de pontos e reputação ao perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS flaker_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Atualizar a tabela de participantes para rastrear a presença real
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'participation_status') THEN
        CREATE TYPE participation_status AS ENUM ('confirmed', 'attended', 'flaked');
    END IF;
END $$;

ALTER TABLE public.event_participants 
ADD COLUMN IF NOT EXISTS status participation_status DEFAULT 'confirmed',
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.total_points IS 'Pontos ganhos por participar de eventos e interagir';
COMMENT ON COLUMN public.profiles.flaker_count IS 'Número de vezes que o usuário confirmou e não foi';
COMMENT ON COLUMN public.event_participants.status IS 'Status da participação: confirmed (confirmou), attended (foi de fato), flaked (furão)';
