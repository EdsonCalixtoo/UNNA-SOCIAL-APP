-- 20260525_message_reactions.sql
-- Create message reactions table for chat
CREATE TABLE IF NOT EXISTS public.message_reactions (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
    UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for message reactions
CREATE POLICY "Users can view reactions in their conversations" ON public.message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_reactions.message_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert reactions in their conversations" ON public.message_reactions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE m.id = message_reactions.message_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own reactions" ON public.message_reactions
    FOR DELETE USING (auth.uid() = user_id);

-- Publication for realtime
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
