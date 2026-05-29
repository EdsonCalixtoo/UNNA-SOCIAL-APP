-- Adicionar permissões para provedores gerenciarem seus prêmios

-- 1. Inserir prêmios (Apenas o próprio provedor pode inserir prêmios no seu nome)
DROP POLICY IF EXISTS "Providers can insert rewards" ON public.rewards;
CREATE POLICY "Providers can insert rewards" ON public.rewards
  FOR INSERT WITH CHECK (auth.uid() = provider_id);

-- 2. Atualizar prêmios (Desativar)
DROP POLICY IF EXISTS "Providers can update own rewards" ON public.rewards;
CREATE POLICY "Providers can update own rewards" ON public.rewards
  FOR UPDATE USING (auth.uid() = provider_id);

-- 3. Ver prêmios (O provedor pode ver seus próprios prêmios mesmo inativos, opcional, mas útil para o painel)
DROP POLICY IF EXISTS "Providers can see all own rewards" ON public.rewards;
CREATE POLICY "Providers can see all own rewards" ON public.rewards
  FOR SELECT USING (auth.uid() = provider_id OR is_active = true);
