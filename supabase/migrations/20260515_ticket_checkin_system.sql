-- Migration: Sistema de Check-in e Validação de Ingressos
-- Descrição: Adiciona colunas para controle de entrada em eventos

-- 1. Adicionar colunas de controle na tabela de participantes
ALTER TABLE public.event_participants 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ticket_id TEXT UNIQUE DEFAULT 'TICK-' || upper(substring(gen_random_uuid()::text, 1, 8));

-- 2. Índices para busca rápida durante o scanner
CREATE INDEX IF NOT EXISTS idx_event_participants_ticket_id ON public.event_participants(ticket_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_user ON public.event_participants(event_id, user_id);

-- 3. Comentários para documentação
COMMENT ON COLUMN public.event_participants.checked_in_at IS 'Data e hora que o usuário entrou no evento (via scanner)';
COMMENT ON COLUMN public.event_participants.ticket_id IS 'Código único do ingresso para validação';

-- 4. (Opcional) Função para realizar o check-in via RPC
CREATE OR REPLACE FUNCTION public.confirm_event_checkin(p_ticket_id TEXT, p_organizer_id UUID)
RETURNS JSON AS $$
DECLARE
    v_event_id UUID;
    v_participant_record RECORD;
BEGIN
    -- Verifica se o ticket existe e pega o evento
    SELECT * INTO v_participant_record FROM public.event_participants WHERE ticket_id = p_ticket_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Ingresso não encontrado');
    END IF;

    -- Verifica se quem está escaneando é o criador do evento
    SELECT id INTO v_event_id FROM public.events WHERE id = v_participant_record.event_id AND creator_id = p_organizer_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Apenas o organizador pode realizar o check-in');
    END IF;

    -- Se já fez check-in antes
    IF v_participant_record.checked_in_at IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Este ingresso já foi utilizado');
    END IF;

    -- Realiza o check-in
    UPDATE public.event_participants 
    SET checked_in_at = NOW() 
    WHERE id = v_participant_record.id;

    RETURN json_build_object('success', true, 'message', 'Check-in realizado com sucesso!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
