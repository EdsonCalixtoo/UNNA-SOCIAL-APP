-- 1. Adicionar account_type na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'user';

-- 2. Adicionar provider_id na tabela rewards
ALTER TABLE public.rewards 
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Atualizar a função handle_new_user para capturar o account_type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, account_type)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'account_type', 'user')
  )
  ON CONFLICT (id) DO UPDATE SET
    account_type = EXCLUDED.account_type;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (Opcional) Trigger vinculada ao auth.users, caso não exista, 
-- não fará mal recriá-la, mas a Supabase pode bloqueá-la no ambiente local/hosted sem grants, 
-- mas por precaução, apenas atualizamos a função.

-- 4. Ajustar RLS para permitir que o Estabelecimento (provider) veja e atualize o cupom
DROP POLICY IF EXISTS "Users can see own rewards" ON public.user_rewards;
CREATE POLICY "Users and providers can see rewards" ON public.user_rewards
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = (SELECT provider_id FROM public.rewards WHERE id = user_rewards.reward_id)
  );

DROP POLICY IF EXISTS "Providers can update own rewards" ON public.user_rewards;
CREATE POLICY "Providers can update own rewards" ON public.user_rewards
  FOR UPDATE USING (
    auth.uid() = (SELECT provider_id FROM public.rewards WHERE id = user_rewards.reward_id)
  );
