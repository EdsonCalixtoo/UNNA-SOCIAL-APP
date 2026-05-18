-- 1. Habilita RLS para as tabelas categories e subcategories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- 2. Limpa políticas antigas se houver
DROP POLICY IF EXISTS "Allow select categories for everyone" ON public.categories;
DROP POLICY IF EXISTS "Allow write categories for admins" ON public.categories;
DROP POLICY IF EXISTS "Allow select subcategories for everyone" ON public.subcategories;
DROP POLICY IF EXISTS "Allow write subcategories for admins" ON public.subcategories;

-- 3. Cria políticas para a tabela categories
CREATE POLICY "Allow select categories for everyone" 
ON public.categories FOR SELECT 
USING (true);

CREATE POLICY "Allow write categories for admins" 
ON public.categories FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'super_admin' OR username = 'unnasocialappoficial')
  )
);

-- 4. Cria políticas para a tabela subcategories
CREATE POLICY "Allow select subcategories for everyone" 
ON public.subcategories FOR SELECT 
USING (true);

CREATE POLICY "Allow write subcategories for admins" 
ON public.subcategories FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role = 'admin' OR role = 'super_admin' OR username = 'unnasocialappoficial')
  )
);
