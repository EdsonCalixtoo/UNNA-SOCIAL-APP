/*
  # Adicionar campos de onboarding aos perfis

  1. Alterações
    - Adiciona coluna `preferred_categories` (array de UUIDs) para armazenar categorias favoritas
    - Adiciona coluna `onboarding_completed` (boolean) para controlar se o usuário já completou o onboarding
  
  2. Segurança
    - Mantém as políticas RLS existentes
*/

-- Adicionar campo de categorias preferidas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'preferred_categories'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_categories uuid[] DEFAULT '{}';
  END IF;
END $$;

-- Adicionar campo de onboarding completado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;
END $$;