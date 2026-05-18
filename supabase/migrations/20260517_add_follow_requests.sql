-- Criar tabela de solicitações de seguidor (follow_requests)
CREATE TABLE IF NOT EXISTS public.follow_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (requester_id, requested_id)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso RLS
CREATE POLICY "Permitir leitura de solicitações enviadas ou recebidas" 
    ON public.follow_requests 
    FOR SELECT 
    USING (auth.uid() = requester_id OR auth.uid() = requested_id);

CREATE POLICY "Permitir criação de solicitações pelo próprio usuário" 
    ON public.follow_requests 
    FOR INSERT 
    WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Permitir exclusão pelo solicitante ou solicitado" 
    ON public.follow_requests 
    FOR DELETE 
    USING (auth.uid() = requester_id OR auth.uid() = requested_id);

CREATE POLICY "Permitir atualização do status pelo solicitado" 
    ON public.follow_requests 
    FOR UPDATE 
    USING (auth.uid() = requested_id);
