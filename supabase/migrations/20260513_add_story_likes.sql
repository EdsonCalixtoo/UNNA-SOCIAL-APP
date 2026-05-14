-- Create story_likes table
CREATE TABLE IF NOT EXISTS public.story_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(story_id, user_id)
);

-- Add story_like to notification types (if checked via check constraint)
-- Note: Assuming notifications table has a check constraint or just text
-- If it's a check constraint, we might need to update it.

-- Enable RLS
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see all story likes"
    ON public.story_likes FOR SELECT
    USING (true);

CREATE POLICY "Users can like stories"
    ON public.story_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike stories"
    ON public.story_likes FOR DELETE
    USING (auth.uid() = user_id);
