-- 1. LIMPEZA DE CATEGORIAS ANTIGAS (Mantendo integridade)
-- Primeiro, vamos resetar a ordem de todas para evitar conflitos de UNIQUE se houver
UPDATE categories SET "order" = "order" + 100;

-- 2. DEFINIR A NOVA ORDEM PRIORITÁRIA
-- Esportes, pets, roles e festas, voluntariados, achados e perdidos

-- Esportes
UPDATE categories SET "order" = 1, name = 'Esportes', icon = '⚽' WHERE name ILIKE '%Esportes%';
-- Pets
UPDATE categories SET "order" = 2, name = 'Pets', icon = '🐾' WHERE name ILIKE '%Pets%';
-- Rolês e Festas
UPDATE categories SET "order" = 3, name = 'Rolês e Festas', icon = '🎉' WHERE name ILIKE '%Rolês%' OR name ILIKE '%Festas%';
-- Voluntariados
UPDATE categories SET "order" = 4, name = 'Voluntariados', icon = '🤝' WHERE name ILIKE '%Voluntariado%';
-- Achados e Perdidos
UPDATE categories SET "order" = 5, name = 'Achados e Perdidos', icon = '🔎' WHERE name ILIKE '%Achados%';

-- 3. REMOVER OU MOVER PARA O FINAL CATEGORIAS NÃO MENCIONADAS (Opcional, mas para manter a ordem limpa)
-- Se você quiser APENAS essas 5, podemos deletar o resto. 
-- Por enquanto, vou apenas colocar as outras em ordens bem altas (10+).

UPDATE categories SET "order" = "order" + 20 WHERE "order" > 5;

-- 4. GARANTIR QUE AS 5 PRINCIPAIS EXISTAM (Caso alguma tenha sido deletada antes)
INSERT INTO categories (name, icon, "order")
SELECT 'Esportes', '⚽', 1 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Esportes');

INSERT INTO categories (name, icon, "order")
SELECT 'Pets', '🐾', 2 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Pets');

INSERT INTO categories (name, icon, "order")
SELECT 'Rolês e Festas', '🎉', 3 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Rolês e Festas');

INSERT INTO categories (name, icon, "order")
SELECT 'Voluntariados', '🤝', 4 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Voluntariados');

INSERT INTO categories (name, icon, "order")
SELECT 'Achados e Perdidos', '🔎', 5 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Achados e Perdidos');
