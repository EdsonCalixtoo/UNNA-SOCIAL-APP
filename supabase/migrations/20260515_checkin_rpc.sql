-- Migration: Função de Check-in por QR Code
-- Descrição: Função segura para validar tickets na porta do evento

CREATE OR REPLACE FUNCTION public.confirm_event_checkin(p_event_id UUID, p_ticket_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_participant_id UUID;
BEGIN
    -- 1. Verifica se o ticket existe para este evento específico
    SELECT id INTO v_participant_id
    FROM public.event_participants
    WHERE event_id = p_event_id 
      AND ticket_id = p_ticket_id
      AND checked_in_at IS NULL; -- Só permite se não tiver feito check-in ainda

    -- 2. Se encontrou um ticket válido não utilizado
    IF v_participant_id IS NOT NULL THEN
        -- Marca como utilizado agora
        UPDATE public.event_participants
        SET checked_in_at = NOW()
        WHERE id = v_participant_id;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
