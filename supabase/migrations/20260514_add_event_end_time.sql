-- Adicionar coluna de horário de término aos eventos
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Comentário para documentação
COMMENT ON COLUMN public.events.end_time IS 'Horário previsto para o término do evento';

-- Atualizar a função de auditoria para usar o end_time se disponível
CREATE OR REPLACE FUNCTION public.process_event_flakers()
RETURNS void AS $$
BEGIN
    -- 1. Incrementar o contador de furos no perfil dos usuários
    UPDATE public.profiles
    SET flaker_count = flaker_count + 1
    WHERE id IN (
        SELECT user_id 
        FROM public.event_participants ep
        JOIN public.events e ON ep.event_id = e.id
        WHERE (
            -- Se tiver end_time, usa ele. Se não, assume 4 horas após o início.
            CASE 
                WHEN e.end_time IS NOT NULL THEN (e.event_date + e.end_time::time)
                ELSE (e.event_date + e.event_time::time + INTERVAL '4 hours')
            END
        ) < NOW()
        AND ep.status = 'confirmed'
    );

    -- 2. Atualizar o status da participação para 'flaked'
    UPDATE public.event_participants
    SET status = 'flaked'
    WHERE id IN (
        SELECT ep.id
        FROM public.event_participants ep
        JOIN public.events e ON ep.event_id = e.id
        WHERE (
            CASE 
                WHEN e.end_time IS NOT NULL THEN (e.event_date + e.end_time::time)
                ELSE (e.event_date + e.event_time::time + INTERVAL '4 hours')
            END
        ) < NOW()
        AND ep.status = 'confirmed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
