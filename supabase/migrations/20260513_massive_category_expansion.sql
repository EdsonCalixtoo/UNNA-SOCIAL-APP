-- 1. LIMPEZA TOTAL
TRUNCATE TABLE subcategories CASCADE;
DELETE FROM categories;

-- 2. CRIAÇÃO DAS CATEGORIAS MESTRE (19 Categorias)
-- Ordem definida pelo usuário: ACHADOS E PERDIDOS, VOLUNTARIADOS, ONGS, PETS, ROLES E FESTAS, ESPORTES
INSERT INTO categories (name, icon, "order") VALUES
('Achados e Perdidos', '🔍', 1),
('Voluntariado', '🌟', 2),
('ONGS', '🤝', 3),
('Pets', '🐾', 4),
('Rolês e Festas', '🔥', 5),
('Esportes', '⚽', 6),
('Música', '🎵', 7),
('Filmes e Séries', '🎬', 8),
('Games', '🎮', 9),
('Tecnologia', '💻', 10),
('Lifestyle', '✨', 11),
('Relacionamentos', '❤️', 12),
('Humor', '😂', 13),
('Viagens', '✈️', 14),
('Comida', '🍕', 15),
('Moda e Beleza', '💄', 16),
('Negócios', '📈', 17),
('Estudos', '📚', 18),
('Arte e Criatividade', '🎨', 19);

-- 3. CRIAÇÃO DAS SUBCATEGORIAS
DO $$
DECLARE
    c_achados UUID; c_volunt UUID; c_ongs UUID; c_roles UUID;
    c_esporte UUID; c_musica UUID; c_filmes UUID; c_games UUID;
    c_tech UUID; c_life UUID; c_relac UUID; c_humor UUID;
    c_viagem UUID; c_comida UUID; c_moda UUID; c_negoc UUID;
    c_estudo UUID; c_pets UUID; c_arte UUID;
BEGIN
    -- Pegando IDs
    SELECT id INTO c_achados FROM categories WHERE name = 'Achados e Perdidos';
    SELECT id INTO c_volunt FROM categories WHERE name = 'Voluntariado';
    SELECT id INTO c_ongs FROM categories WHERE name = 'ONGS';
    SELECT id INTO c_roles FROM categories WHERE name = 'Rolês e Festas';
    SELECT id INTO c_esporte FROM categories WHERE name = 'Esportes';
    SELECT id INTO c_musica FROM categories WHERE name = 'Música';
    SELECT id INTO c_filmes FROM categories WHERE name = 'Filmes e Séries';
    SELECT id INTO c_games FROM categories WHERE name = 'Games';
    SELECT id INTO c_tech FROM categories WHERE name = 'Tecnologia';
    SELECT id INTO c_life FROM categories WHERE name = 'Lifestyle';
    SELECT id INTO c_relac FROM categories WHERE name = 'Relacionamentos';
    SELECT id INTO c_humor FROM categories WHERE name = 'Humor';
    SELECT id INTO c_viagem FROM categories WHERE name = 'Viagens';
    SELECT id INTO c_comida FROM categories WHERE name = 'Comida';
    SELECT id INTO c_moda FROM categories WHERE name = 'Moda e Beleza';
    SELECT id INTO c_negoc FROM categories WHERE name = 'Negócios';
    SELECT id INTO c_estudo FROM categories WHERE name = 'Estudos';
    SELECT id INTO c_pets FROM categories WHERE name = 'Pets';
    SELECT id INTO c_arte FROM categories WHERE name = 'Arte e Criatividade';

    -- Subcategorias: Achados e Perdidos
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_achados, 'Documentos'), (c_achados, 'Celulares & Tech'), (c_achados, 'Chaves'), (c_achados, 'Carteiras'), (c_achados, 'Bolsas & Mochilas'), (c_achados, 'Óculos');

    -- Subcategorias: Voluntariado
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_volunt, 'Eventos Beneficentes'), (c_volunt, 'Aulas Particulares'), (c_volunt, 'Mutirão de Limpeza'), (c_volunt, 'Cozinha Comunitária');

    -- Subcategorias: ONGS
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_ongs, 'Proteção Animal'), (c_ongs, 'Causas Ambientais'), (c_ongs, 'Direitos Humanos'), (c_ongs, 'Saúde Pública');

    -- Subcategorias: Rolês e Festas
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_roles, 'Baladas'), (c_roles, 'Festivais'), (c_roles, 'Resenhas'), (c_roles, 'Rooftops'), (c_roles, 'Open Air'), (c_roles, 'Pool Parties');

    -- Subcategorias: Esportes
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_esporte, 'Futebol'), (c_esporte, 'Academia'), (c_esporte, 'Corrida'), (c_esporte, 'Basquete'), (c_esporte, 'Vôlei'), (c_esporte, 'Skate'), (c_esporte, 'Surf'), (c_esporte, 'Bike'), (c_esporte, 'Natação'), (c_esporte, 'Lutas'), (c_esporte, 'Tênis'), (c_esporte, 'Futsal'), (c_esporte, 'Crossfit'), (c_esporte, 'Yoga'), (c_esporte, 'Trilhas'), (c_esporte, 'Pesca'), (c_esporte, 'Fórmula 1'), (c_esporte, 'E-sports'), (c_esporte, 'Dança'), (c_esporte, 'Alongamento');

    -- Subcategorias: Música
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_musica, 'Funk'), (c_musica, 'Rap'), (c_musica, 'Trap'), (c_musica, 'Sertanejo'), (c_musica, 'Pop'), (c_musica, 'Rock'), (c_musica, 'Gospel'), (c_musica, 'Eletrônica'), (c_musica, 'Pagode'), (c_musica, 'Samba'), (c_musica, 'Indie'), (c_musica, 'K-pop'), (c_musica, 'MPB'), (c_musica, 'Jazz'), (c_musica, 'Reggae'), (c_musica, 'Forró'), (c_musica, 'Lo-fi'), (c_musica, 'DJs'), (c_musica, 'Instrumentos'), (c_musica, 'Shows');

    -- Subcategorias: Filmes e Séries
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_filmes, 'Netflix'), (c_filmes, 'Animes'), (c_filmes, 'Terror'), (c_filmes, 'Romance'), (c_filmes, 'Ação'), (c_filmes, 'Comédia'), (c_filmes, 'Suspense'), (c_filmes, 'Marvel'), (c_filmes, 'DC'), (c_filmes, 'Doramas'), (c_filmes, 'Ficção Científica'), (c_filmes, 'Cinema Nacional'), (c_filmes, 'Documentários'), (c_filmes, 'True Crime'), (c_filmes, 'Streaming'), (c_filmes, 'Séries'), (c_filmes, 'Pixar'), (c_filmes, 'HBO'), (c_filmes, 'Disney'), (c_filmes, 'Cinema');

    -- Subcategorias: Games
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_games, 'FPS'), (c_games, 'Battle Royale'), (c_games, 'RPG'), (c_games, 'Minecraft'), (c_games, 'Roblox'), (c_games, 'GTA'), (c_games, 'Valorant'), (c_games, 'Fortnite'), (c_games, 'Free Fire'), (c_games, 'League of Legends'), (c_games, 'Mobile Games'), (c_games, 'Playstation'), (c_games, 'Xbox'), (c_games, 'Nintendo'), (c_games, 'PC Gamer'), (c_games, 'Retro Games'), (c_games, 'Terror'), (c_games, 'Simulação'), (c_games, 'Corrida'), (c_games, 'Indie Games');

    -- Subcategorias: Tecnologia
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_tech, 'IA'), (c_tech, 'Programação'), (c_tech, 'Startups'), (c_tech, 'Android'), (c_tech, 'iPhone'), (c_tech, 'Gadgets'), (c_tech, 'Hardware'), (c_tech, 'Software'), (c_tech, 'Web Design'), (c_tech, 'UI/UX'), (c_tech, 'Banco de Dados'), (c_tech, 'APIs'), (c_tech, 'Cloud'), (c_tech, 'Robótica'), (c_tech, 'Cibersegurança'), (c_tech, 'Open Source'), (c_tech, 'Automação'), (c_tech, 'Desenvolvimento'), (c_tech, 'Criação de Apps'), (c_tech, 'Setup Gamer');

    -- Subcategorias: Lifestyle
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_life, 'Rotina'), (c_life, 'Produtividade'), (c_life, 'Minimalismo'), (c_life, 'Luxo'), (c_life, 'Organização'), (c_life, 'Hábitos'), (c_life, 'Motivação'), (c_life, 'Vlogs'), (c_life, 'Home Office'), (c_life, 'Self Care'), (c_life, 'Café'), (c_life, 'Digital Nomad'), (c_life, 'Rotina Noturna'), (c_life, 'Rotina Fitness'), (c_life, 'Estudos'), (c_life, 'Morning Routine'), (c_life, 'Viagens'), (c_life, 'Inspiração'), (c_life, 'Wellness'), (c_life, 'Diário');

    -- Subcategorias: Relacionamentos
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_relac, 'Amizade'), (c_relac, 'Namoro'), (c_relac, 'Conversas'), (c_relac, 'Conselhos'), (c_relac, 'Romance'), (c_relac, 'Dating'), (c_relac, 'Crush'), (c_relac, 'Histórias'), (c_relac, 'Autoestima'), (c_relac, 'Família'), (c_relac, 'Casamento'), (c_relac, 'Psicologia'), (c_relac, 'Red Flags'), (c_relac, 'Green Flags'), (c_relac, 'Tinder'), (c_relac, 'Relacionamento à Distância'), (c_relac, 'Masculino'), (c_relac, 'Feminino'), (c_relac, 'Confissões'), (c_relac, 'Lifestyle');

    -- Subcategorias: Humor
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_humor, 'Memes'), (c_humor, 'Vídeos Engraçados'), (c_humor, 'Trollagens'), (c_humor, 'Stand-up'), (c_humor, 'Pegadinhas'), (c_humor, 'Humor Nerd'), (c_humor, 'Reações'), (c_humor, 'Viral'), (c_humor, 'TikTok Funny'), (c_humor, 'GIFs'), (c_humor, 'Áudios'), (c_humor, 'Zoeira'), (c_humor, 'Shorts'), (c_humor, 'Paródias'), (c_humor, 'Ironia'), (c_humor, 'Humor Brasileiro'), (c_humor, 'Animais Engraçados'), (c_humor, 'Internet'), (c_humor, 'Satíra'), (c_humor, 'Comédia');

    -- Subcategorias: Viagens
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_viagem, 'Praias'), (c_viagem, 'Camping'), (c_viagem, 'Resorts'), (c_viagem, 'Mochilão'), (c_viagem, 'Road Trip'), (c_viagem, 'Trilhas'), (c_viagem, 'Turismo'), (c_viagem, 'Hotéis'), (c_viagem, 'Gastronomia'), (c_viagem, 'Europa'), (c_viagem, 'EUA'), (c_viagem, 'Ásia'), (c_viagem, 'América Latina'), (c_viagem, 'Viagens Econômicas'), (c_viagem, 'Cruzeiros'), (c_viagem, 'Natureza'), (c_viagem, 'Fotografia'), (c_viagem, 'Aventuras'), (c_viagem, 'Intercâmbio'), (c_viagem, 'Cidades');

    -- Subcategorias: Comida
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_comida, 'Pizza'), (c_comida, 'Hambúrguer'), (c_comida, 'Sushi'), (c_comida, 'Churrasco'), (c_comida, 'Doces'), (c_comida, 'Cafés'), (c_comida, 'Receitas'), (c_comida, 'Drinks'), (c_comida, 'Fast Food'), (c_comida, 'Gourmet'), (c_comida, 'Fitness'), (c_comida, 'Vegana'), (c_comida, 'Italiana'), (c_comida, 'Japonesa'), (c_comida, 'Brasileira'), (c_comida, 'Sobremesas'), (c_comida, 'Air Fryer'), (c_comida, 'Massas'), (c_comida, 'Saudável'), (c_comida, 'Food Lovers');

    -- Subcategorias: Moda e Beleza
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_moda, 'Streetwear'), (c_moda, 'Sneakers'), (c_moda, 'Maquiagem'), (c_moda, 'Perfumes'), (c_moda, 'Cabelo'), (c_moda, 'Skincare'), (c_moda, 'Looks'), (c_moda, 'Masculina'), (c_moda, 'Feminina'), (c_moda, 'Luxo'), (c_moda, 'Acessórios'), (c_moda, 'Relógios'), (c_moda, 'Joias'), (c_moda, 'Nails'), (c_moda, 'Glow Up'), (c_moda, 'Cosméticos'), (c_moda, 'Vintage'), (c_moda, 'Tendências'), (c_moda, 'Estilo'), (c_moda, 'Salão');

    -- Subcategorias: Negócios
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_negoc, 'Empreendedorismo'), (c_negoc, 'Marketing'), (c_negoc, 'Vendas'), (c_negoc, 'Investimentos'), (c_negoc, 'Startups'), (c_negoc, 'Networking'), (c_negoc, 'E-commerce'), (c_negoc, 'Finanças'), (c_negoc, 'Social Media'), (c_negoc, 'Branding'), (c_negoc, 'Tráfego Pago'), (c_negoc, 'Copywriting'), (c_negoc, 'Freelance'), (c_negoc, 'Dropshipping'), (c_negoc, 'IA nos Negócios'), (c_negoc, 'Carreira'), (c_negoc, 'Produtividade'), (c_negoc, 'Liderança'), (c_negoc, 'Criação de Conteúdo'), (c_negoc, 'Criptomoedas');

    -- Subcategorias: Estudos
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_estudo, 'ENEM'), (c_estudo, 'Vestibular'), (c_estudo, 'Programação'), (c_estudo, 'Inglês'), (c_estudo, 'Matemática'), (c_estudo, 'História'), (c_estudo, 'Geografia'), (c_estudo, 'Física'), (c_estudo, 'Química'), (c_estudo, 'Biologia'), (c_estudo, 'Redação'), (c_estudo, 'Idiomas'), (c_estudo, 'Cursos'), (c_estudo, 'Faculdade'), (c_estudo, 'Concursos'), (c_estudo, 'Ciências'), (c_estudo, 'Psicologia'), (c_estudo, 'Filosofia'), (c_estudo, 'Literatura'), (c_estudo, 'Estudos em Grupo');

    -- Subcategorias: Pets
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_pets, 'Cachorros'), (c_pets, 'Gatos'), (c_pets, 'Adoção'), (c_pets, 'Treinamento'), (c_pets, 'Veterinário'), (c_pets, 'Grooming'), (c_pets, 'Pets Fofos'), (c_pets, 'Alimentação'), (c_pets, 'Saúde Animal'), (c_pets, 'Aquários'), (c_pets, 'Aves'), (c_pets, 'Répteis'), (c_pets, 'Coelhos'), (c_pets, 'Hamsters'), (c_pets, 'Brinquedos'), (c_pets, 'Cuidados'), (c_pets, 'Passeios'), (c_pets, 'Pet Lovers'), (c_pets, 'Raças'), (c_pets, 'Exóticos');

    -- Subcategorias: Arte e Criatividade
    INSERT INTO subcategories (category_id, name) VALUES 
    (c_arte, 'Fotografia'), (c_arte, 'Desenho'), (c_arte, 'Pintura'), (c_arte, 'Digital Art'), (c_arte, 'Design'), (c_arte, 'Canva'), (c_arte, 'Photoshop'), (c_arte, 'Blender'), (c_arte, 'Tatuagem'), (c_arte, 'Graffiti'), (c_arte, 'Fanarts'), (c_arte, 'Arte 3D'), (c_arte, 'Vídeos'), (c_arte, 'Edição'), (c_arte, 'Criatividade'), (c_arte, 'Produção'), (c_arte, 'Ilustração'), (c_arte, 'Street Art'), (c_arte, 'Música'), (c_arte, 'Cinematografia');

END $$;
