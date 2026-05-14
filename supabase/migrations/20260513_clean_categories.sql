-- 1. LIMPEZA DE SUBCATEGORIAS "HORRÍVEIS" OU INADEQUADAS
-- Removemos o que não agrega valor social positivo ou é foco em problemas

DELETE FROM subcategories 
WHERE name IN (
    'Álcool e Drogas', 
    'Acne', 
    'Depressão', 
    'Problemas Familiares',
    'Doenças'
);

-- 2. MODERNIZAÇÃO DA CATEGORIA "ADOLESCÊNCIA" (OU EQUIVALENTE)
-- Vamos renomear para algo mais "cool" e focado em interesses atuais

UPDATE categories 
SET name = 'Lifestyle Jovem' 
WHERE name = 'Adolescência';

-- 3. ADIÇÃO DE INTERESSES PREMIUM E MODERNOS
-- Inserindo subcategorias que geram engajamento real em eventos

-- Primeiro, pegamos o ID da categoria que era "Adolescência"
DO $$
DECLARE
    cat_id UUID;
BEGIN
    SELECT id INTO cat_id FROM categories WHERE name IN ('Lifestyle Jovem', 'Adolescência') LIMIT 1;
    
    IF cat_id IS NOT NULL THEN
        -- Adicionando novos interesses saudáveis e modernos
        INSERT INTO subcategories (category_id, name) VALUES
        (cat_id, 'Gaming & eSports'),
        (cat_id, 'Criação de Conteúdo'),
        (cat_id, 'Moda & Sneakerhead'),
        (cat_id, 'Skate & Surf Culture'),
        (cat_id, 'Study & Coffee');
    END IF;
END $$;

-- 4. REVISÃO GERAL DE OUTRAS CATEGORIAS
-- Adicionando subcategorias de alto nível para Gastronomia e Esportes (Exemplos)

DO $$
DECLARE
    gastro_id UUID;
    esporte_id UUID;
BEGIN
    SELECT id INTO gastro_id FROM categories WHERE name ILIKE '%Gastronomia%' OR name ILIKE '%Culinária%' LIMIT 1;
    SELECT id INTO esporte_id FROM categories WHERE name ILIKE '%Esportes%' LIMIT 1;
    
    IF gastro_id IS NOT NULL THEN
        INSERT INTO subcategories (category_id, name) VALUES
        (gastro_id, 'Fine Dining'),
        (gastro_id, 'Cafés Especiais'),
        (gastro_id, 'Wine & Cheese');
    END IF;
    
    IF esporte_id IS NOT NULL THEN
        INSERT INTO subcategories (category_id, name) VALUES
        (esporte_id, 'Beach Tennis'),
        (esporte_id, 'Padel'),
        (esporte_id, 'Crossfit & Wellness');
    END IF;
END $$;
