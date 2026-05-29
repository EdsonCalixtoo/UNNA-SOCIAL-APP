-- Tabela do Catálogo de Prêmios (Loja)
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cost_coins INTEGER NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '🎁',
  color TEXT DEFAULT '#ff1493',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Prêmios Resgatados pelos Usuários
CREATE TABLE IF NOT EXISTS public.user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- 'active' (em uso), 'used' (já consumido/expirado)
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

-- Políticas para a loja de prêmios (Todo mundo pode ver o catálogo)
CREATE POLICY "Everyone can see active rewards" ON public.rewards
  FOR SELECT USING (is_active = true);

-- Políticas para prêmios resgatados (O usuário vê os seus próprios, sistema pode inserir)
CREATE POLICY "Users can see own rewards" ON public.user_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards" ON public.user_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Inserir alguns prêmios padrão iniciais na Loja
INSERT INTO public.rewards (title, description, cost_coins, icon, color)
VALUES
  ('Borda VIP Dourada', 'Destaca sua foto de perfil com uma borda neon dourada exclusiva por 30 dias.', 500, '🌟', '#FFD700'),
  ('Selo de Rei/Rainha', 'Adiciona um selo de coroa permanente ao lado do seu nome.', 1500, '👑', '#7b2fff'),
  ('1 Ingresso Sorteio VIP', 'Ticket virtual que te dá 1 chance a mais nos sorteios de ingressos grátis do aplicativo.', 800, '🎫', '#00d9ff'),
  ('Drink Grátis Virtual', 'Cupom que pode ser trocado por um brinde surpresa no próximo evento parceiro.', 2500, '🍹', '#FF3B30');
