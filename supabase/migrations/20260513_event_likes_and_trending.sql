-- Create event_likes table
CREATE TABLE IF NOT EXISTS public.event_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.event_likes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Event likes are viewable by everyone" 
ON public.event_likes FOR SELECT 
USING (true);

CREATE POLICY "Users can like events" 
ON public.event_likes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike events" 
ON public.event_likes FOR DELETE 
USING (auth.uid() = user_id);

-- Create a function to get trending events
CREATE OR REPLACE FUNCTION get_trending_events()
RETURNS SETOF public.events AS $$
BEGIN
    RETURN QUERY
    SELECT e.*
    FROM public.events e
    LEFT JOIN public.event_likes l ON e.id = l.event_id
    LEFT JOIN public.event_participants p ON e.id = p.event_id
    GROUP BY e.id
    ORDER BY (count(DISTINCT l.id) * 2 + count(DISTINCT p.id) * 3) DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
