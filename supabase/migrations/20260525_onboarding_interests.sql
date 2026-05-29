-- 20260525_onboarding_interests.sql
-- Add onboarding fields to profiles if not exists

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_categories') THEN
        ALTER TABLE public.profiles ADD COLUMN preferred_categories UUID[] DEFAULT '{}'::UUID[];
    END IF;
END $$;
