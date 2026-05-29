-- 1. Add staff_pin to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS staff_pin TEXT UNIQUE;

-- 2. Create function to generate a random 6-character PIN
CREATE OR REPLACE FUNCTION generate_staff_pin() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Update handle_new_user to generate PIN for business accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SET search_path = public
AS $$
DECLARE
  acc_type TEXT;
  new_pin TEXT;
BEGIN
  acc_type := COALESCE(new.raw_user_meta_data->>'account_type', 'user');
  
  IF acc_type = 'business' THEN
    -- Try to generate a unique PIN
    LOOP
      new_pin := public.generate_staff_pin();
      BEGIN
        INSERT INTO public.profiles (id, username, full_name, avatar_url, account_type, staff_pin)
        VALUES (
          new.id,
          new.raw_user_meta_data->>'username',
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url',
          acc_type,
          new_pin
        )
        ON CONFLICT (id) DO UPDATE SET
          account_type = EXCLUDED.account_type,
          staff_pin = COALESCE(public.profiles.staff_pin, EXCLUDED.staff_pin);
        EXIT; -- success
      EXCEPTION WHEN unique_violation THEN
        -- retry if PIN exists
      END;
    END LOOP;
  ELSE
    INSERT INTO public.profiles (id, username, full_name, avatar_url, account_type)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url',
      acc_type
    )
    ON CONFLICT (id) DO UPDATE SET
      account_type = EXCLUDED.account_type;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create business_staff table
CREATE TABLE IF NOT EXISTS public.business_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, staff_id)
);

ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view own links" ON public.business_staff;
CREATE POLICY "Staff can view own links" ON public.business_staff
    FOR SELECT USING (auth.uid() = staff_id OR auth.uid() = business_id);

DROP POLICY IF EXISTS "Users can join as staff" ON public.business_staff;
CREATE POLICY "Users can join as staff" ON public.business_staff
    FOR INSERT WITH CHECK (auth.uid() = staff_id);

DROP POLICY IF EXISTS "Business can manage staff" ON public.business_staff;
CREATE POLICY "Business can manage staff" ON public.business_staff
    FOR DELETE USING (auth.uid() = business_id OR auth.uid() = staff_id);

-- 5. Update user_rewards RLS again to include business_staff
DROP POLICY IF EXISTS "Users and providers can see rewards" ON public.user_rewards;
CREATE POLICY "Users and providers can see rewards" ON public.user_rewards
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = (SELECT provider_id FROM public.rewards WHERE id = user_rewards.reward_id) OR
    EXISTS (
      SELECT 1 FROM public.business_staff 
      WHERE business_staff.staff_id = auth.uid() 
      AND business_staff.business_id = (SELECT provider_id FROM public.rewards WHERE id = user_rewards.reward_id)
    )
  );

DROP POLICY IF EXISTS "Providers can update own rewards" ON public.user_rewards;
CREATE POLICY "Providers can update own rewards" ON public.user_rewards
  FOR UPDATE USING (
    auth.uid() = (SELECT provider_id FROM public.rewards WHERE id = user_rewards.reward_id) OR
    EXISTS (
      SELECT 1 FROM public.business_staff 
      WHERE business_staff.staff_id = auth.uid() 
      AND business_staff.business_id = (SELECT provider_id FROM public.rewards WHERE id = user_rewards.reward_id)
    )
  );
