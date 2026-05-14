-- 1. LIMPEZA TOTAL (Tabula Rasa)
-- Desativamos temporariamente as restrições para evitar erros de FK se houver eventos vinculados
-- Nota: Se houver eventos, eles ficarão com category_id NULL (se a FK permitir)

TRUNCATE TABLE subcategories CASCADE;
DELETE FROM categories;

-- 2. CRIAÇÃO DAS CATEGORIAS MESTRE
-- Usamos IDs fixos para referência se necessário, ou deixamos o UUID agir

INSERT INTO categories (name, icon, "order") VALUES
('Achados e Perdidos', '🔍', 1),
('ONGS & Causas', '🤝', 2),
('Voluntariado', '🌟', 3),
('Pets & Animais', '🐾', 4),
('Rolês & Festas', '🔥', 5),
('Esportes & Wellness', '🎾', 6),
('Gastronomia & Bar', '🍷', 7),
('Conexões & Business', '💼', 8);

-- 3. CRIAÇÃO DAS SUBCATEGORIAS (Mapeamento Inteligente)

DO $$
DECLARE
    id_achados UUID;
    id_ongs UUID;
    id_volunt UUID;
    id_pets UUID;
    id_roles UUID;
    id_esporte UUID;
    id_gastro UUID;
    id_business UUID;
BEGIN
    -- Capturando os IDs gerados
    SELECT id INTO id_achados FROM categories WHERE name = 'Achados e Perdidos';
    SELECT id INTO id_ongs FROM categories WHERE name = 'ONGS & Causas';
    SELECT id INTO id_volunt FROM categories WHERE name = 'Voluntariado';
    SELECT id INTO id_pets FROM categories WHERE name = 'Pets & Animais';
    SELECT id INTO id_roles FROM categories WHERE name = 'Rolês & Festas';
    SELECT id INTO id_esporte FROM categories WHERE name = 'Esportes & Wellness';
    SELECT id INTO id_gastro FROM categories WHERE name = 'Gastronomia & Bar';
    SELECT id INTO id_business FROM categories WHERE name = 'Conexões & Business';

    -- Inserindo Subcategorias para Achados e Perdidos
    INSERT INTO subcategories (category_id, name) VALUES
    (id_achados, 'Documentos'),
    (id_achados, 'Eletrônicos'),
    (id_achados, 'Objetos Pessoais'),
    (id_achados, 'Chaves'),
    (id_achados, 'Animais Desaparecidos');

    -- Inserindo Subcategorias para ONGS
    INSERT INTO subcategories (category_id, name) VALUES
    (id_ongs, 'Apoio Comunitário'),
    (id_ongs, 'Arrecadação de Mantimentos'),
    (id_ongs, 'Causas Ambientais'),
    (id_ongs, 'Proteção Animal');

    -- Inserindo Subcategorias para Voluntariado
    INSERT INTO subcategories (category_id, name) VALUES
    (id_volunt, 'Eventos Beneficentes'),
    (id_volunt, 'Educação & Aulas'),
    (id_volunt, 'Mutirão de Limpeza'),
    (id_volunt, 'Apoio a Idosos');

    -- Inserindo Subcategorias para Pets
    INSERT INTO subcategories (category_id, name) VALUES
    (id_pets, 'Encontros de Raças'),
    (id_pets, 'Passeios Coletivos'),
    (id_pets, 'Adoção Responsável'),
    (id_pets, 'Playdates Pet');

    -- Inserindo Subcategorias para Rolês & Festas
    INSERT INTO subcategories (category_id, name) VALUES
    (id_roles, 'Baladas & Clubs'),
    (id_roles, 'Rooftops'),
    (id_roles, 'Shows & Festivais'),
    (id_roles, 'Sunset Parties');

    -- Inserindo Subcategorias para Esportes
    INSERT INTO subcategories (category_id, name) VALUES
    (id_esporte, 'Beach Tennis'),
    (id_esporte, 'Padel'),
    (id_esporte, 'Yoga & Meditação'),
    (id_esporte, 'Corrida de Rua'),
    (id_esporte, 'Functional Training');

    -- Inserindo Subcategorias para Gastronomia
    INSERT INTO subcategories (category_id, name) VALUES
    (id_gastro, 'Fine Dining'),
    (id_gastro, 'Cafés Especiais'),
    (id_gastro, 'Wine & Cheese'),
    (id_gastro, 'Rodízio Premium');

    -- Inserindo Subcategorias para Business
    INSERT INTO subcategories (category_id, name) VALUES
    (id_business, 'Networking Events'),
    (id_business, 'Workshops & Tech'),
    (id_business, 'Rodas de Conversa'),
    (id_business, 'Masterminds');

END $$;
