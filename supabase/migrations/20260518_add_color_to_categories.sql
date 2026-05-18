-- Adiciona a coluna color para as tabelas categories e subcategories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS color text DEFAULT '#00d9ff';
ALTER TABLE public.subcategories ADD COLUMN IF NOT EXISTS color text DEFAULT '#00d9ff';
