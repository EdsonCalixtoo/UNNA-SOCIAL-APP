-- Extended categories and subcategories seed
-- This migration adds 50 categories with 30 subcategories each

-- Insert 50 Categories
INSERT INTO categories (name, icon) VALUES
('Musica', '🎵'),
('Artes Cenicas', '🎭'),
('Cinema e Video', '🎬'),
('Literatura', '📚'),
('Danca', '💃'),
('Fotografia', '📸'),
('Culinaria', '🍳'),
('Viagens', '✈️'),
('Moda', '👗'),
('Beleza', '💄'),
('Tecnologia', '💻'),
('Educacao', '🎓'),
('Esportes', '⚽'),
('Saude', '🏥'),
('Bem-estar', '🧘'),
('Jogo e Entretenimento', '🎮'),
('Animais de Estimacao', '🐾'),
('Jardinagem', '🌿'),
('DIY e Artesanato', '🛠️'),
('Automovel', '🚗'),
('Motos', '🏍️'),
('Natureza', '🏞️'),
('Outdoor', '⛺'),
('Voluntariado', '🤝'),
('Filantropia', '❤️'),
('Politica', '🗳️'),
('Economia', '💰'),
('Negocios', '💼'),
('Carreira', '📊'),
('Empreendedorismo', '🚀'),
('Networking', '🤝'),
('Familia', '👨‍👩‍👧‍👦'),
('Relacionamentos', '💑'),
('Casamento', '💍'),
('Paternidade', '👶'),
('Educacao Infantil', '🍎'),
('Adolescencia', '👦'),
('Terceira Idade', '👴'),
('Espiritualidade', '🙏'),
('Religiao', '⛪'),
('Meditacao', '🧘‍♀️'),
('Filosofia', '💭'),
('Astronomia', '🌌'),
('Ciencia', '🔬'),
('Historia', '📖'),
('Geografia', '🗺️'),
('Mundo', '🌍'),
('Sustentabilidade', '♻️'),
('Energia', '⚡'),
('Legalidade', '⚖️')
ON CONFLICT (name) DO NOTHING;

-- Insert subcategories for Musica
INSERT INTO subcategories (category_id, name) SELECT id, 'Classica' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Pop' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Rock' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Jazz' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Blues' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Eletronica' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Hip-hop' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Reggae' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Country' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Latino' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Metal' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'R&B' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Soul' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Funk' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Samba' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Bossa Nova' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Forro' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Axe' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Sertanejo' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Trap' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Indie' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Alternativa' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Experimental' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Acustica' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Orquestra' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Opera' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Coral' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'K-pop' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'J-pop' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Dancehall' FROM categories WHERE name = 'Musica' ON CONFLICT DO NOTHING;

-- Insert subcategories for Artes Cenicas
INSERT INTO subcategories (category_id, name) SELECT id, 'Teatro' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Opera' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Ballet' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Musical' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Stand-up' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Comedia' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Performance' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Danca Contemporanea' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Circo' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Marionete' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Improvisos' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Monologo' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Peca Dramatica' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Pantomima' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Clown' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Burlesco' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Tragedia' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Comedia Musical' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Satira' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Instalacao' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Happening' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Sessao de Leitura' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Recitais' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Concertos' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Orquestras' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Corais' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Pecas Religiosas' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Infantil' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Familiar' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;
INSERT INTO subcategories (category_id, name) SELECT id, 'Experimental' FROM categories WHERE name = 'Artes Cenicas' ON CONFLICT DO NOTHING;

-- Simplified approach: insert remaining categories' subcategories
-- Cinema e Video
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Ficcao Cientifica'), ('Acao'), ('Drama'), ('Comedia'), ('Horror'), ('Thriller'), ('Documentario'), ('Animacao'), ('Romantico'), ('Western'), ('Policial'), ('Aventura'), ('Fantasia'), ('Historico'), ('Biografico'), ('Infantil'), ('Familiar'), ('Cult'), ('Indie'), ('Classicos'), ('Curtas'), ('Series'), ('Podcasts'), ('YouTubers'), ('Twitch'), ('Webseries'), ('Trailer'), ('Making of'), ('Entrevistas'), ('Reviews')) as t(sub) WHERE categories.name = 'Cinema e Video' ON CONFLICT DO NOTHING;

-- Literatura
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Ficcao'), ('Poesia'), ('Drama'), ('Misterio'), ('Romance'), ('Fantasia'), ('Ficcao Cientifica'), ('Horror'), ('Infantil'), ('Educativo'), ('Biografia'), ('Memoria'), ('Ensaio'), ('Cronica'), ('Conto'), ('Novela'), ('Satira'), ('Fabula'), ('Mito'), ('Folclore'), ('Classicos'), ('Contemporaneo'), ('Literatura Brasileira'), ('Literatura Estrangeira'), ('Autores Independentes'), ('Adaptacao'), ('Graphic Novel'), ('Audiolivro'), ('E-book'), ('Clube do Livro')) as t(sub) WHERE categories.name = 'Literatura' ON CONFLICT DO NOTHING;

-- Danca
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Bale'), ('Jazz'), ('Contemporanea'), ('Street'), ('Hip-hop'), ('Salsa'), ('Forro'), ('Samba'), ('Tango'), ('Flamenco'), ('Danca do Ventre'), ('Belly Dance'), ('Kathak'), ('Bharata'), ('Rumba'), ('Axe'), ('Zouk'), ('Sapateado'), ('Pole Dance'), ('Danca Aerea'), ('Contato Improvisacao'), ('Buto'), ('Danca Teatral'), ('Danca Folclorica'), ('Danca Grega'), ('Danca Irlandesa'), ('Danca Africana'), ('Danca Indigena'), ('Danca Classica'), ('Fusao')) as t(sub) WHERE categories.name = 'Danca' ON CONFLICT DO NOTHING;

-- Fotografia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Retratos'), ('Paisagem'), ('Macrofotografia'), ('Fotografia Aerea'), ('Arquitetura'), ('Rua'), ('Natureza Morta'), ('Submarina'), ('Espaco'), ('Astrofotografia'), ('Viagem'), ('Evento'), ('Casamento'), ('Editorial'), ('Comercial'), ('Moda'), ('Publicidade'), ('Artistica'), ('Experimental'), ('Digital'), ('Preto e Branco'), ('Cores'), ('Drone'), ('Cinematica'), ('Documental'), ('Fantasia'), ('Conceitual'), ('Abstrata'), ('Minimalista'), ('HDR')) as t(sub) WHERE categories.name = 'Fotografia' ON CONFLICT DO NOTHING;

-- Culinaria
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Culinaria Brasileira'), ('Italiana'), ('Asiatica'), ('Francesa'), ('Mexicana'), ('Arabe'), ('Africana'), ('Indigena'), ('Vegetariana'), ('Vegana'), ('Fitness'), ('Desintoxicacao'), ('Doces'), ('Bolos'), ('Paes'), ('Sorvete'), ('Cafe'), ('Cha'), ('Bebidas'), ('Coquetel'), ('Fermentacao'), ('Picles'), ('Conserva'), ('Slow Cook'), ('Gourmet'), ('Caseira'), ('Rapida'), ('Lean'), ('Organica'), ('Saudavel')) as t(sub) WHERE categories.name = 'Culinaria' ON CONFLICT DO NOTHING;

-- Viagens
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Europa'), ('Asia'), ('America'), ('Africa'), ('Oceania'), ('America do Sul'), ('America do Norte'), ('America Central'), ('Caribe'), ('Oriente Medio'), ('Turismo de Aventura'), ('Turismo Cultural'), ('Turismo Gastronomico'), ('Turismo de Bem-estar'), ('Turismo Urbano'), ('Turismo Rural'), ('Turismo de Praia'), ('Turismo de Montanha'), ('Turismo Religioso'), ('Backpacking'), ('Viagem de Luxo'), ('Viagem Economica'), ('Viagem em Familia'), ('Viagem Solo'), ('Viagem de Negocios'), ('Volunturismo'), ('Eco-turismo'), ('Turismo LGBTQ'), ('Digital Nomade'), ('Viagem Responsavel')) as t(sub) WHERE categories.name = 'Viagens' ON CONFLICT DO NOTHING;

-- Moda
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Moda Feminina'), ('Moda Masculina'), ('Moda Infantil'), ('Moda Plus Size'), ('Moda Sustentavel'), ('Moda Contemporanea'), ('Moda Classica'), ('Moda Streetwear'), ('Moda de Festa'), ('Moda Casual'), ('Moda Desportiva'), ('Moda Vintage'), ('Moda Retro'), ('Moda Futurista'), ('Alta Costura'), ('Pret-a-Porter'), ('Fast Fashion'), ('Slow Fashion'), ('Acessorios'), ('Calcados'), ('Bolsas'), ('Joias'), ('Relogios'), ('Oculos'), ('Chapeus'), ('Cintos'), ('Lencos'), ('Maquiagem'), ('Cabelo'), ('Unhas')) as t(sub) WHERE categories.name = 'Moda' ON CONFLICT DO NOTHING;

-- Beleza
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Maquiagem'), ('Skincare'), ('Haircare'), ('Cuidados Corporais'), ('Perfumaria'), ('Cosmeticos Naturais'), ('Cosmeticos Organicos'), ('Maquiagem Artistica'), ('Maquiagem para Casamento'), ('Maquiagem para Festa'), ('Maquiagem de Palco'), ('Maquiagem Corretiva'), ('Contorno'), ('Sobrancelhas'), ('Cilios'), ('Labios'), ('Olhos'), ('Tratamentos Faciais'), ('Peelings'), ('Mascaras'), ('Cremes'), ('Seruns'), ('Tonicos'), ('Oleos'), ('Terapia Capilar'), ('Coloracao'), ('Escova Progressiva'), ('Lisos'), ('Cachos'), ('Penteados')) as t(sub) WHERE categories.name = 'Beleza' ON CONFLICT DO NOTHING;

-- Tecnologia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Programacao'), ('Web Design'), ('Mobile Apps'), ('Inteligencia Artificial'), ('Big Data'), ('Seguranca Cibernetica'), ('Cloud Computing'), ('IoT'), ('Blockchain'), ('Realidade Virtual'), ('Realidade Aumentada'), ('Desenvolvimento de Jogos'), ('Startup'), ('Inovacao'), ('Hardware'), ('Software'), ('Computador'), ('Smartphone'), ('Tablet'), ('Gadgets'), ('Robotica'), ('Impressora 3D'), ('Drone'), ('Camera de Vigilancia'), ('Smart Home'), ('Carros Autonomos'), ('Eletronicos'), ('Computador de Mesa'), ('Notebook'), ('Fone de Ouvido')) as t(sub) WHERE categories.name = 'Tecnologia' ON CONFLICT DO NOTHING;

-- Educacao
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Ensino Fundamental'), ('Ensino Medio'), ('Ensino Superior'), ('Cursos Online'), ('Educacao a Distancia'), ('Educacao Executiva'), ('Educacao Tecnica'), ('Educacao Continuada'), ('Educacao Corporativa'), ('Certificacoes'), ('Idiomas'), ('Matematica'), ('Ciencias'), ('Historia'), ('Geografia'), ('Arte'), ('Musica'), ('Educacao Fisica'), ('Tecnologia'), ('Filosofia'), ('Educacao Inclusiva'), ('Educacao Especial'), ('Educacao no Exterior'), ('Bolsa de Estudos'), ('Intercambio'), ('Educacao de Adultos'), ('Alfabetizacao'), ('Educacao Ambiental'), ('Educacao Financeira'), ('Mentoria')) as t(sub) WHERE categories.name = 'Educacao' ON CONFLICT DO NOTHING;

-- Esportes
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Futebol'), ('Basquete'), ('Volei'), ('Tenis'), ('Natacao'), ('Atletismo'), ('Ginastica'), ('Danca Esportiva'), ('Lutas'), ('Artes Marciais'), ('Hoquei'), ('Criquete'), ('Beisebol'), ('Golfe'), ('Esqui'), ('Snowboard'), ('Surfe'), ('Skate'), ('BMX'), ('Parkour'), ('Escalada'), ('Bungee Jump'), ('Paraquedismo'), ('Asa Delta'), ('Iatismo'), ('Polo Aquatico'), ('Remo'), ('Canoagem'), ('Badminton'), ('Xadrez')) as t(sub) WHERE categories.name = 'Esportes' ON CONFLICT DO NOTHING;

-- Saude
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Medico Geral'), ('Cirurgia'), ('Pediatria'), ('Ginecologia'), ('Cardiologia'), ('Neurologia'), ('Psiquiatria'), ('Oftalmologia'), ('Otorrinolaringologia'), ('Odontologia'), ('Dermatologia'), ('Nutricao'), ('Fisioterapia'), ('Psicologia'), ('Fonoaudiologia'), ('Terapia Ocupacional'), ('Farmacia'), ('Enfermagem'), ('Veterinaria'), ('Acupuntura'), ('Homeopatia'), ('Fitoenergetica'), ('Radiologia'), ('Patologia'), ('Oncologia'), ('Geriatria'), ('Urologia'), ('Proctologia'), ('Gastroenterologia'), ('Endocrinologia')) as t(sub) WHERE categories.name = 'Saude' ON CONFLICT DO NOTHING;

-- Bem-estar
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Yoga'), ('Pilates'), ('Meditacao'), ('Tai Chi'), ('Qigong'), ('Reiki'), ('Massagem'), ('Reflexologia'), ('Aromaterapia'), ('Fitoenergetica'), ('Terapia Floral'), ('Cristaloterapia'), ('Geoterapia'), ('Sonoterapia'), ('Cromoterapia'), ('Auriculoterapia'), ('Ventosaterapia'), ('Moxa'), ('Shiatsu'), ('Ayurveda'), ('Termalismo'), ('Balneoterapia'), ('Hidroterapia'), ('Fangoterapia'), ('Espaco Holistico'), ('Retiro Wellness'), ('Spa'), ('Estancia de Saude'), ('Clinica Holistica'), ('Consultorio Alternativo')) as t(sub) WHERE categories.name = 'Bem-estar' ON CONFLICT DO NOTHING;

-- Jogo e Entretenimento
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Videogames'), ('Jogos de Tabuleiro'), ('Jogos de Cartas'), ('Puzzles'), ('Charadas'), ('Trivia'), ('RPG'), ('Estrategia'), ('Acao'), ('Aventura'), ('Simulacao'), ('Corrida'), ('Esportes'), ('Terror'), ('Educativo'), ('Infantil'), ('Indie'), ('Retro'), ('Console'), ('PC'), ('Mobile'), ('Streaming'), ('E-sports'), ('Torneios'), ('Comunidade Gamer'), ('Cosplay'), ('Fan Art'), ('Modding'), ('Machinima'), ('Lets Play')) as t(sub) WHERE categories.name = 'Jogo e Entretenimento' ON CONFLICT DO NOTHING;

-- Animais de Estimacao
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Cao'), ('Gato'), ('Passaro'), ('Peixe'), ('Reptil'), ('Roedor'), ('Coelho'), ('Hamster'), ('Cobaia'), ('Chinchila'), ('Ferret'), ('Lagarto'), ('Tartaruga'), ('Serpente'), ('Sapo'), ('Aranha'), ('Inseto'), ('Cavalo'), ('Porco'), ('Galinha'), ('Criacao de Animais'), ('Treinamento'), ('Comportamento'), ('Veterinaria'), ('Nutricao Animal'), ('Grooming'), ('Acessorios'), ('Brinquedos'), ('Adocao'), ('Bem-estar Animal')) as t(sub) WHERE categories.name = 'Animais de Estimacao' ON CONFLICT DO NOTHING;

-- Jardinagem
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Cultivo de Flores'), ('Cultivo de Vegetais'), ('Cultivo de Frutas'), ('Cultivo de Ervas'), ('Cultivo de Suculentas'), ('Cultivo de Orquideas'), ('Cultivo de Bonsai'), ('Cultivo Hidroponico'), ('Cultivo Organico'), ('Agroecologia'), ('Plantas Medicinais'), ('Plantas Ornamentais'), ('Plantas Aromaticas'), ('Paisagismo'), ('Jardinagem Urbana'), ('Horta Caseira'), ('Compostagem'), ('Fertilizantes'), ('Pesticidas Naturais'), ('Ferramentas'), ('Sementes'), ('Mudas'), ('Vasos'), ('Solos'), ('Adubos'), ('Tecnicas de Poda'), ('Propagacao'), ('Enraizamento'), ('Transplante'), ('Pragas')) as t(sub) WHERE categories.name = 'Jardinagem' ON CONFLICT DO NOTHING;

-- DIY e Artesanato
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Marcenaria'), ('Carpintaria'), ('Metalurgia'), ('Ceramica'), ('Vidro'), ('Joalheria'), ('Costura'), ('Bordado'), ('Trico'), ('Croche'), ('Origami'), ('Papiroflexia'), ('Decoupage'), ('Patchwork'), ('Croque Frances'), ('Pintura'), ('Desenho'), ('Escultura'), ('Mosaico'), ('Encadernacao'), ('Reparo de Moveis'), ('Restauracao'), ('Decoracao'), ('Customizacao'), ('Reciclagem Criativa'), ('Upcycling'), ('Projetos Caseiros'), ('Tutoriais'), ('Marcas DIY'), ('Ferramentas')) as t(sub) WHERE categories.name = 'DIY e Artesanato' ON CONFLICT DO NOTHING;

-- Automovel
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Carro de Passeio'), ('SUV'), ('Caminhonete'), ('Utilitario'), ('Esportivo'), ('Classico'), ('Antigo'), ('Eletrico'), ('Hibrido'), ('Caminhao'), ('Manutencao'), ('Reparo'), ('Customizacao'), ('Tunagem'), ('Mecanica'), ('Motor'), ('Pneus'), ('Vidros'), ('Pintura'), ('Aerossois'), ('Acessorios'), ('GPS'), ('Seguranca'), ('Seguros'), ('Financiamento'), ('Compra e Venda'), ('Leilao'), ('Test Drive'), ('Seminovo'), ('Revisao')) as t(sub) WHERE categories.name = 'Automovel' ON CONFLICT DO NOTHING;

-- Motos
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Moto de Passeio'), ('Moto Esportiva'), ('Moto Classica'), ('Moto de Trilha'), ('Moto Eletrica'), ('Scooter'), ('Bicicleta Motorizada'), ('Moto de Corrida'), ('Moto Adventure'), ('Moto Custom'), ('Manutencao'), ('Reparo'), ('Customizacao'), ('Acessorios'), ('Protecao'), ('Seguranca'), ('Pilotagem'), ('Aceleracao'), ('Off-road'), ('Stunt'), ('Mecanica'), ('Motor'), ('Corrente'), ('Pneus'), ('Freios'), ('Suspensao'), ('Combustivel'), ('Oleo'), ('Comunitario'), ('Trilhas')) as t(sub) WHERE categories.name = 'Motos' ON CONFLICT DO NOTHING;

-- Natureza
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Montanhas'), ('Florestas'), ('Rios'), ('Cachoeiras'), ('Cavernas'), ('Desertos'), ('Praia'), ('Mangue'), ('Mata'), ('Cerrado'), ('Pantanal'), ('Caatinga'), ('Tundra'), ('Savana'), ('Pampas'), ('Recife de Coral'), ('Geleiras'), ('Vulcoes'), ('Canions'), ('Oasis'), ('Observacao de Fauna'), ('Observacao de Flora'), ('Fotografia da Natureza'), ('Trilhas Ecologicas'), ('Camping'), ('Piquenique'), ('Birding'), ('Mergulho'), ('Snorkel'), ('Conservacao')) as t(sub) WHERE categories.name = 'Natureza' ON CONFLICT DO NOTHING;

-- Outdoor
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Acampamento'), ('Trilha'), ('Escalada'), ('Rappel'), ('Canyoning'), ('Tirolesa'), ('Paraquedismo'), ('Asa Delta'), ('Parapente'), ('Balonismo'), ('Rafting'), ('Canoagem'), ('Kayak'), ('Mergulho'), ('Snorkel'), ('Surfe'), ('Skate'), ('BMX'), ('Mountain Bike'), ('Corrida de Aventura'), ('Orienteering'), ('Geocaching'), ('Busca e Resgate'), ('Sobrevivencia'), ('Sobrevivencia na Selva'), ('Sobrevivencia no Deserto'), ('Sobrevivencia no Artico'), ('Camping Selvagem'), ('Equipamento'), ('Seguranca')) as t(sub) WHERE categories.name = 'Outdoor' ON CONFLICT DO NOTHING;

-- Voluntariado
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Organizacoes sem Fins Lucrativos'), ('Trabalho Social'), ('Educacao'), ('Saude'), ('Meio Ambiente'), ('Direitos Humanos'), ('Igualdade de Genero'), ('Diversidade'), ('Inclusao Social'), ('Combate a Pobreza'), ('Acesso a Agua'), ('Seguranca Alimentar'), ('Habitacao'), ('Tecnologia'), ('Arte e Cultura'), ('Esportes'), ('Recreacao'), ('Animais'), ('Plantas'), ('Comunidades Indigenas'), ('Refugiados'), ('Migrantes'), ('Pessoas com Deficiencia'), ('Idosos'), ('Criancas'), ('Adolescentes'), ('Mulheres'), ('LGBTQ'), ('Doacoes'), ('Campanhas')) as t(sub) WHERE categories.name = 'Voluntariado' ON CONFLICT DO NOTHING;

-- Filantropia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Caridade'), ('Ajuda Social'), ('Educacao'), ('Pesquisa Medica'), ('Conservacao'), ('Preservacao'), ('Arte e Cultura'), ('Esportes'), ('Desastres'), ('Emergencia'), ('Reabilitacao'), ('Reintegracao'), ('Empoderamento'), ('Capacitacao'), ('Microfinancas'), ('Microempresas'), ('Cooperativas'), ('Associacoes'), ('Fundacoes'), ('Instituto'), ('ONGs Internacionais'), ('ONGs Locais'), ('Movimentos Sociais'), ('Ativismo'), ('Advocacy'), ('Conscientizacao'), ('Mobilizacao'), ('Participacao Cidada'), ('Democracia'), ('Governanca')) as t(sub) WHERE categories.name = 'Filantropia' ON CONFLICT DO NOTHING;

-- Politica
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Partido Politico'), ('Eleicoes'), ('Candidato'), ('Campanha'), ('Voto'), ('Poder Legislativo'), ('Poder Executivo'), ('Poder Judiciario'), ('Constituicao'), ('Lei'), ('Direitos Humanos'), ('Justica Social'), ('Igualdade'), ('Liberdade'), ('Democracia'), ('Republica'), ('Monarquia'), ('Anarquismo'), ('Comunismo'), ('Socialismo'), ('Capitalismo'), ('Liberalismo'), ('Conservadorismo'), ('Progressismo'), ('Ambientalismo'), ('Feminismo'), ('Racismo'), ('Discriminacao'), ('Segregacao'), ('Inclusao')) as t(sub) WHERE categories.name = 'Politica' ON CONFLICT DO NOTHING;

-- Economia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Economia de Mercado'), ('Capitalismo'), ('Socialismo'), ('Comunismo'), ('Keynesianismo'), ('Monetarismo'), ('Austrianismo'), ('Institucionalismo'), ('Marxismo'), ('Comportamental'), ('Financa'), ('Investimento'), ('Bolsa de Valores'), ('Cryptocurrencias'), ('Cambio'), ('Inflacao'), ('Deflacao'), ('Recessao'), ('Depressao'), ('Crescimento'), ('Desenvolvimento'), ('Pobreza'), ('Desigualdade'), ('Renda Minima'), ('Tributacao'), ('Orcamento'), ('Divida Publica'), ('Moeda'), ('Banco Central'), ('Comercio Internacional')) as t(sub) WHERE categories.name = 'Economia' ON CONFLICT DO NOTHING;

-- Negocios
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Startups'), ('PME'), ('Franquia'), ('Cooperativa'), ('Empreendedor'), ('Executivo'), ('Gerente'), ('Analista'), ('Consultor'), ('Coach'), ('Recrutamento'), ('RH'), ('Relacionamento'), ('Comunicacao'), ('Marketing'), ('Vendas'), ('Financas'), ('Operacao'), ('Producao'), ('Qualidade'), ('Seguranca do Trabalho'), ('Meio Ambiente'), ('Compliance'), ('Governanca'), ('Sustentabilidade'), ('Responsabilidade Social'), ('Etica'), ('Codigo de Conduta'), ('Treinamento'), ('Desenvolvimento')) as t(sub) WHERE categories.name = 'Negocios' ON CONFLICT DO NOTHING;

-- Carreira
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Inovacao'), ('Disrupcao'), ('Transformacao Digital'), ('Transformacao Organizacional'), ('Mudanca'), ('Gestao de Mudanca'), ('Agilidade'), ('Scrum'), ('Kanban'), ('Design Thinking'), ('Lean Startup'), ('Prototipagem'), ('MVP'), ('Validacao'), ('Feedback'), ('Iteracao'), ('Escalabilidade'), ('Rentabilidade'), ('Crescimento Exponencial'), ('Unicornio'), ('Acelerador'), ('Incubadora'), ('Venture Capital'), ('Angel Invest'), ('Crowdfunding'), ('Equity Crowdfunding'), ('Pitch'), ('Business Model'), ('Canvas'), ('Plano de Negocios')) as t(sub) WHERE categories.name = 'Carreira' ON CONFLICT DO NOTHING;

-- Empreendedorismo
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Conferencia'), ('Seminario'), ('Workshop'), ('Webinario'), ('Palestra'), ('Forum'), ('Meetup'), ('Coworking'), ('Happy Hour'), ('Almoco de Negocios'), ('Contato Profissional'), ('Troca de Cartoes'), ('LinkedIn'), ('Twitter'), ('WhatsApp'), ('Telegram'), ('Discord'), ('Slack'), ('Zoom'), ('Google Meet'), ('Associacao Profissional'), ('Sindicato'), ('Camara de Comercio'), ('Clube de Negocios'), ('Rede de Empreendedores'), ('Comunidade Startup'), ('Comunidade Tech'), ('Comunidade Criativa'), ('Comunidade Cientifica'), ('Comunidade Academica')) as t(sub) WHERE categories.name = 'Empreendedorismo' ON CONFLICT DO NOTHING;

-- Networking
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Casamento'), ('Noivado'), ('Namoro'), ('Encontro'), ('Casamento Costumeiro'), ('Casamento Civil'), ('Casamento Religioso'), ('Elopement'), ('Casamento no Exterior'), ('Casamento LGBTQ'), ('Casamento Retro'), ('Casamento Rustico'), ('Casamento Tropical'), ('Casamento Minimalista'), ('Casamento de Luxo'), ('Casamento Economico'), ('Casamento Verde'), ('Casamento Virtual'), ('Casamento em Casa'), ('Casamento na Igreja'), ('Casamento na Praia'), ('Casamento na Montanha'), ('Casamento em Jardim'), ('Casamento em Castelo'), ('Casamento em Vinicola'), ('Casamento em Loft'), ('Casamento em Chacara'), ('Casamento em Hotel'), ('Casamento em Resort'), ('Casamento em Sitio')) as t(sub) WHERE categories.name = 'Networking' ON CONFLICT DO NOTHING;

-- Familia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Conjugalidade'), ('Comunicacao'), ('Confianca'), ('Ciumes'), ('Infidelidade'), ('Separacao'), ('Divorcio'), ('Conciliacao'), ('Mediacao'), ('Psicoterapia'), ('Aconselhamento'), ('Coaching'), ('Terapia de Casal'), ('Terapia Individual'), ('Terapia Familiar'), ('Constelacao Familiar'), ('Regressao'), ('Hipnose'), ('PNL'), ('Gestalt'), ('Psicodrama'), ('Sociodrama'), ('Psicanalise'), ('Behaviorismo'), ('Humanismo'), ('Espiritismo'), ('Espiritualidade'), ('Religiosidade'), ('Meditacao de Casal'), ('Retiros Romanticos')) as t(sub) WHERE categories.name = 'Familia' ON CONFLICT DO NOTHING;

-- Relacionamentos
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Casamento'), ('Lua de mel'), ('Aliancas'), ('Alianca'), ('Vestido'), ('Noiva'), ('Noivo'), ('Padrinhos'), ('Daminhas'), ('Pajens'), ('Cerimonia'), ('Recepcao'), ('Buffet'), ('Bebidas'), ('Bolo'), ('Flores'), ('Decoracao'), ('Musica'), ('DJ'), ('Banda'), ('Fotografia'), ('Video'), ('Convites'), ('Lembrancinhas'), ('Presentes'), ('Lista de Casamento'), ('Planejador de Casamento'), ('Agencia de Casamento'), ('Espaco para Casamento'), ('Catering')) as t(sub) WHERE categories.name = 'Relacionamentos' ON CONFLICT DO NOTHING;

-- Casamento
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Gravidez'), ('Pre-Natal'), ('Parto Natural'), ('Parto Cesariana'), ('Parto Humanizado'), ('Doula'), ('Parteira'), ('Obstetra'), ('Neonatologia'), ('Amamentacao'), ('Aleitamento'), ('Desmame'), ('Choro do Bebe'), ('Colica'), ('Refluxo'), ('Sono do Bebe'), ('Higiene do Bebe'), ('Fraldas'), ('Banho do Bebe'), ('Roupas de Bebe'), ('Brinquedos para Bebe'), ('Berco'), ('Carrinho'), ('Cadeira de Refeicao'), ('Cerca de Protecao'), ('Baba'), ('Creche'), ('Escola Infantil'), ('Vacinacao'), ('Saude do Bebe')) as t(sub) WHERE categories.name = 'Casamento' ON CONFLICT DO NOTHING;

-- Paternidade
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Leitura'), ('Contos'), ('Fabulas'), ('Alfabetizacao'), ('Numeros'), ('Cores'), ('Formas'), ('Animais'), ('Plantas'), ('Natureza'), ('Brinquedos Educativos'), ('Jogos Educativos'), ('Atividades'), ('Artes'), ('Musica'), ('Danca'), ('Educacao Fisica'), ('Culinaria'), ('Jardinagem'), ('Ciencias'), ('Historia'), ('Geografia'), ('Socializacao'), ('Inteligencia Emocional'), ('Inteligencia Social'), ('Criatividade'), ('Imaginacao'), ('Fantasia'), ('Sonho'), ('Seguranca')) as t(sub) WHERE categories.name = 'Paternidade' ON CONFLICT DO NOTHING;

-- Educacao Infantil
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Desenvolvimento Cognitivo'), ('Desenvolvimento Motor'), ('Desenvolvimento Emocional'), ('Desenvolvimento Social'), ('Puberdade'), ('Sexualidade'), ('Identidade'), ('Auto-Estima'), ('Autoconfianca'), ('Independencia'), ('Rebeldia'), ('Depressao Adolescente'), ('Ansiedade Adolescente'), ('Transtorno de Conduta'), ('TDAH'), ('Bullying'), ('Cyberbullying'), ('Pressao de Pares'), ('Relacionamentos'), ('Amizade'), ('Acne'), ('Maturacao Fisica'), ('Esportes'), ('Musica'), ('Arte'), ('Tecnologia'), ('Redes Sociais'), ('Influencia Digital'), ('Educacao Sexual'), ('Alcool e Drogas')) as t(sub) WHERE categories.name = 'Educacao Infantil' ON CONFLICT DO NOTHING;

-- Adolescencia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Saude do Idoso'), ('Gerontologia'), ('Demencia'), ('Alzheimer'), ('Parkinson'), ('Incontinencia'), ('Quedas'), ('Fratura'), ('Artrite'), ('Osteoporose'), ('Hipertensao'), ('Diabetes'), ('Colesterol'), ('Doenca Cardiaca'), ('Acidente Vascular Cerebral'), ('Medicacao'), ('Polifarmacia'), ('Reabilitacao'), ('Fisioterapia'), ('Atividades Cognitivas'), ('Atividades Fisicas'), ('Atividades Sociais'), ('Lazer'), ('Viagem'), ('Tecnologia'), ('Seguranca do Lar'), ('Acessibilidade'), ('Cuidador'), ('Cuidado Profissional'), ('Asilo')) as t(sub) WHERE categories.name = 'Adolescencia' ON CONFLICT DO NOTHING;

-- Terceira Idade
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Budismo'), ('Hinduismo'), ('Islamismo'), ('Judaismo'), ('Cristianismo'), ('Taoismo'), ('Confucionismo'), ('Xintouismo'), ('Xamanismo'), ('Espiritismo'), ('Teosofia'), ('Rosacruzes'), ('Maconaria'), ('Ocultismo'), ('Wicca'), ('Druidismo'), ('Religioes Afro-brasileiras'), ('Candomble'), ('Umbanda'), ('Sincretismo'), ('Agnosticismo'), ('Ateismo'), ('Ceticismo'), ('Racionalismo'), ('Naturalismo'), ('Panteismo'), ('Panenteismo'), ('Deismo'), ('Teismo'), ('Monoteismo')) as t(sub) WHERE categories.name = 'Terceira Idade' ON CONFLICT DO NOTHING;

-- Espiritualidade
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Meditacao Mindfulness'), ('Meditacao Transcendental'), ('Meditacao Zen'), ('Meditacao Budista'), ('Meditacao Taoista'), ('Meditacao Vipassana'), ('Meditacao Ashtanga'), ('Meditacao Kundalini'), ('Meditacao Metta'), ('Meditacao Samatha'), ('Visualizacao'), ('Mantras'), ('Chakras'), ('Respiracao'), ('Postura'), ('Concentracao'), ('Atencao Plena'), ('Presenca'), ('Aceitacao'), ('Nao Julgamento'), ('Compaixao'), ('Benevolencia'), ('Perdao'), ('Gratidao'), ('Alegria'), ('Paz Interior'), ('Serenidade'), ('Equanimidade'), ('Liberacao'), ('Iluminacao')) as t(sub) WHERE categories.name = 'Espiritualidade' ON CONFLICT DO NOTHING;

-- Religiao
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Metafisica'), ('Ontologia'), ('Epistemologia'), ('Logica'), ('Etica'), ('Estetica'), ('Fenomenologia'), ('Hermeneutica'), ('Dialetica'), ('Dialogo'), ('Platonismo'), ('Aristotelismo'), ('Estoicismo'), ('Epicurismo'), ('Ceticismo'), ('Empirismo'), ('Racionalismo'), ('Iluminismo'), ('Kant'), ('Hegel'), ('Nietzsche'), ('Sartre'), ('Camus'), ('Wittgenstein'), ('Heidegger'), ('Gadamer'), ('Ricoeur'), ('Habermas'), ('Foucault'), ('Deleuze')) as t(sub) WHERE categories.name = 'Religiao' ON CONFLICT DO NOTHING;

-- Meditacao
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Via Lactea'), ('Galaxias'), ('Nebulosas'), ('Constelacoes'), ('Buracos Negros'), ('Estrelas'), ('Planetas'), ('Satelites'), ('Cometas'), ('Asteroides'), ('Meteoros'), ('Astrofisica'), ('Cosmologia'), ('Gravitacao'), ('Relatividade'), ('Mecanica Quantica'), ('Astroquimica'), ('Astrobiologia'), ('Busca por Vida'), ('Extraterrestres'), ('Observatorio'), ('Telescopio'), ('Planetario'), ('Astrofotografia'), ('Observacao de Ceu Noturno'), ('Eclipses'), ('Eclipses Lunares'), ('Eclipses Solares'), ('Fenomenos Celestes'), ('Supernova')) as t(sub) WHERE categories.name = 'Meditacao' ON CONFLICT DO NOTHING;

-- Filosofia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Fisica'), ('Quimica'), ('Biologia'), ('Geologia'), ('Meteorologia'), ('Oceanografia'), ('Ecologia'), ('Evolucao'), ('Genetica'), ('Microbiologia'), ('Virologia'), ('Bacteriologia'), ('Imunologia'), ('Farmacologia'), ('Toxicologia'), ('Neurofisiologia'), ('Endocrinologia'), ('Nutricao'), ('Bioquimica'), ('Biologia Molecular'), ('Biotecnologia'), ('Engenharia Genetica'), ('Bioinformatica'), ('Astrofisica'), ('Cosmologia'), ('Filosofia da Ciencia'), ('Historia da Ciencia'), ('Divulgacao Cientifica'), ('Educacao Cientifica'), ('Museu de Ciencias')) as t(sub) WHERE categories.name = 'Filosofia' ON CONFLICT DO NOTHING;

-- Astronomia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Pre-Historia'), ('Antiguidade'), ('Idade Media'), ('Renascenca'), ('Idade Moderna'), ('Iluminismo'), ('Revolucao Industrial'), ('Seculo XIX'), ('Seculo XX'), ('Seculo XXI'), ('Historia da America'), ('Historia da Europa'), ('Historia da Asia'), ('Historia da Africa'), ('Historia da Oceania'), ('Historia Politica'), ('Historia Social'), ('Historia Economica'), ('Historia Cultural'), ('Historia Militar'), ('Historia Religiosa'), ('Historia da Arte'), ('Historia da Tecnologia'), ('Historia da Ciencia'), ('Arqueologia'), ('Genealogia'), ('Documentario Historico'), ('Museu'), ('Patrimonio Cultural'), ('Preservacao')) as t(sub) WHERE categories.name = 'Astronomia' ON CONFLICT DO NOTHING;

-- Ciencia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Continentes'), ('Paises'), ('Regioes'), ('Cidades'), ('Vilas'), ('Paisagens'), ('Clima'), ('Vegetacao'), ('Fauna'), ('Populacao'), ('Cultura'), ('Tradicao'), ('Idioma'), ('Culinaria'), ('Economia'), ('Politica'), ('Historia'), ('Turismo'), ('Mapa'), ('Atlas'), ('GPS'), ('Cartografia'), ('Geofisica'), ('Geomorfologia'), ('Geologia'), ('Pedologia'), ('Biogeografia'), ('Antropogeografia'), ('Geopolitica'), ('Planejamento Urbano')) as t(sub) WHERE categories.name = 'Ciencia' ON CONFLICT DO NOTHING;

-- Historia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('America do Norte'), ('America Central'), ('America do Sul'), ('Caribe'), ('Europa'), ('Asia'), ('Oriente Medio'), ('Africa'), ('Oceania'), ('Artico'), ('Antartica'), ('Oceano Atlantico'), ('Oceano Pacifico'), ('Oceano Indico'), ('Mar Mediterraneo'), ('Mar Baltico'), ('Mar do Norte'), ('Mar Negro'), ('Mar Morto'), ('Mar Vermelho'), ('Intercambio Cultural'), ('Relacoes Internacionais'), ('Cooperacao'), ('Conflito'), ('Paz'), ('Desenvolvimento'), ('Cooperacao Tecnica'), ('Ajuda Humanitaria'), ('Globalizacao'), ('Integracao Regional')) as t(sub) WHERE categories.name = 'Historia' ON CONFLICT DO NOTHING;

-- Geografia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Sustentabilidade'), ('Desenvolvimento Sustentavel'), ('ODS'), ('Objetivos de Desenvolvimento Sustentavel'), ('Agenda 2030'), ('ESG'), ('Responsabilidade Social'), ('Responsabilidade Ambiental'), ('Responsabilidade Corporativa'), ('Governanca'), ('Relatorio de Sustentabilidade'), ('Certificacao'), ('Auditoria Ambiental'), ('Auditoria Social'), ('Impacto Social'), ('Impacto Ambiental'), ('Avaliacao de Ciclo de Vida'), ('Pegada de Carbono'), ('Pegada Ecologica'), ('Balanco Hidrico'), ('Mudanca Climatica'), ('Aquecimento Global'), ('Gases do Efeito Estufa'), ('Energia Renovavel'), ('Residuos'), ('Reciclagem'), ('Economia Circular'), ('Consumo Consciente'), ('Moda Sustentavel'), ('Turismo Sustentavel')) as t(sub) WHERE categories.name = 'Geografia' ON CONFLICT DO NOTHING;

-- Mundo
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Energia Solar'), ('Energia Eolica'), ('Energia Hidreletrica'), ('Energia Geothermica'), ('Energia da Biomassa'), ('Energia da Mare'), ('Energia das Ondas'), ('Energia Nuclear'), ('Energia de Fusao'), ('Energia de Fissao'), ('Combustivel Fossil'), ('Petroleo'), ('Gas Natural'), ('Carvao'), ('Aquecimento Global'), ('Mudanca Climatica'), ('Eficiencia Energetica'), ('Economia de Energia'), ('Smart Grid'), ('Bateria'), ('Celula de Combustivel'), ('Hidrogenio'), ('Armazenamento de Energia'), ('Distribuicao de Energia'), ('Rede de Energia'), ('Usina de Energia'), ('Gerador'), ('Transformador'), ('Disjuntor'), ('Medidor')) as t(sub) WHERE categories.name = 'Mundo' ON CONFLICT DO NOTHING;

-- Sustentabilidade
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Direito Civil'), ('Direito Penal'), ('Direito Administrativo'), ('Direito Trabalhista'), ('Direito Processual'), ('Direito Constitucional'), ('Direito Comercial'), ('Direito Tributario'), ('Direito Ambiental'), ('Direito Internacional'), ('Direito do Consumidor'), ('Direito Imobiliario'), ('Direito de Familia'), ('Direito Sucessorio'), ('Direito Autoral'), ('Direito Intelectual'), ('Direito Digital'), ('Direito Corporativo'), ('Justica'), ('Corte'), ('Tribunal'), ('Juiz'), ('Advogado'), ('Promotor'), ('Jurado'), ('Processo Judicial'), ('Acao Judicial'), ('Sentenca'), ('Apelacao'), ('Execucao')) as t(sub) WHERE categories.name = 'Sustentabilidade' ON CONFLICT DO NOTHING;

-- Energia
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Direito Civil'), ('Direito Penal'), ('Direito Administrativo'), ('Direito Trabalhista'), ('Direito Processual'), ('Direito Constitucional'), ('Direito Comercial'), ('Direito Tributario'), ('Direito Ambiental'), ('Direito Internacional'), ('Direito do Consumidor'), ('Direito Imobiliario'), ('Direito de Familia'), ('Direito Sucessorio'), ('Direito Autoral'), ('Direito Intelectual'), ('Direito Digital'), ('Direito Corporativo'), ('Justica'), ('Corte'), ('Tribunal'), ('Juiz'), ('Advogado'), ('Promotor'), ('Jurado'), ('Processo Judicial'), ('Acao Judicial'), ('Sentenca'), ('Apelacao'), ('Execucao')) as t(sub) WHERE categories.name = 'Energia' ON CONFLICT DO NOTHING;

-- Legalidade
INSERT INTO subcategories (category_id, name) SELECT id, sub FROM categories, (VALUES ('Direito Civil'), ('Direito Penal'), ('Direito Administrativo'), ('Direito Trabalhista'), ('Direito Processual'), ('Direito Constitucional'), ('Direito Comercial'), ('Direito Tributario'), ('Direito Ambiental'), ('Direito Internacional'), ('Direito do Consumidor'), ('Direito Imobiliario'), ('Direito de Familia'), ('Direito Sucessorio'), ('Direito Autoral'), ('Direito Intelectual'), ('Direito Digital'), ('Direito Corporativo'), ('Justica'), ('Corte'), ('Tribunal'), ('Juiz'), ('Advogado'), ('Promotor'), ('Jurado'), ('Processo Judicial'), ('Acao Judicial'), ('Sentenca'), ('Apelacao'), ('Execucao')) as t(sub) WHERE categories.name = 'Legalidade' ON CONFLICT DO NOTHING;
