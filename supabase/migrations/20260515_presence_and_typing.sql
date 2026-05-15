-- Create user_presence table
CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user presence"
    ON public.user_presence FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own presence"
    ON public.user_presence FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create typing_indicators table
CREATE TABLE IF NOT EXISTS public.typing_indicators (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view typing indicators"
    ON public.typing_indicators FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants
            WHERE conversation_id = typing_indicators.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own typing indicators"
    ON public.typing_indicators FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create a function to clean up old typing indicators
CREATE OR REPLACE FUNCTION public.cleanup_typing_indicators()
RETURNS void AS $$
BEGIN
    DELETE FROM public.typing_indicators
    WHERE created_at < now() - interval '10 seconds';
END;
$$ LANGUAGE plpgsql;
