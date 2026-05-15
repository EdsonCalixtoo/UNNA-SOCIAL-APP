-- Função para processar usuários que não compareceram aos eventos (Furões)
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
        WHERE (e.event_date + e.event_time::time) < (NOW() - INTERVAL '1 hour') -- Evento acabou há mais de 1 hora
        AND ep.status = 'confirmed' -- Usuário confirmou mas nunca fez check-in
    );

    -- 2. Atualizar o status da participação para 'flaked' (furão)
    UPDATE public.event_participants
    SET status = 'flaked'
    WHERE id IN (
        SELECT ep.id
        FROM public.event_participants ep
        JOIN public.events e ON ep.event_id = e.id
        WHERE (e.event_date + e.event_time::time) < (NOW() - INTERVAL '1 hour')
        AND ep.status = 'confirmed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário: Esta função deve ser chamada periodicamente ou via gatilho
COMMENT ON FUNCTION public.process_event_flakers() IS 'Processa eventos encerrados e marca como furões quem não compareceu';
