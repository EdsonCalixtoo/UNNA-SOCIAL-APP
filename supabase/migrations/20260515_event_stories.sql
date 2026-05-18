-- Migration: Shared Event Stories
-- Descrição: Tabela para stories vinculados a eventos específicos

CREATE TABLE IF NOT EXISTS public.event_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT DEFAULT 'image', -- 'image' ou 'video'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Habilitar RLS
ALTER TABLE public.event_stories ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Anyone can view event stories" ON public.event_stories FOR SELECT USING (true);
CREATE POLICY "Participants can post stories" ON public.event_stories FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.event_participants 
        WHERE event_id = event_stories.event_id AND user_id = auth.uid()
    )
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_event_stories_event_id ON public.event_stories(event_id);
CREATE INDEX IF NOT EXISTS idx_event_stories_expiry ON public.event_stories(expires_at);
