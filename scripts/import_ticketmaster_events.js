const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
require('dotenv').config();

// 1. Configurações Iniciais
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;

// Nome de usuário que será o "dono" dos eventos
const TARGET_USERNAME = 'unnasocialappoficial';

// ==========================================
// 🎯 FILTROS DE BUSCA (Altere como quiser!)
// ==========================================
const CIDADE = '';   // Ex: 'São Paulo', 'Campinas' (vazio '' para o Brasil todo)
const PALAVRA_CHAVE = '';    // Ex: 'Rock', 'Festival' (vazio para qualquer um)
const QUANTIDADE = 20;       // Eventos por categoria
// ==========================================

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Erro: Chaves do Supabase não encontradas no arquivo .env");
  process.exit(1);
}

if (!TICKETMASTER_API_KEY) {
  console.error("❌ Erro: TICKETMASTER_API_KEY não encontrada no arquivo .env");
  console.log("👉 Crie uma conta em https://developer.ticketmaster.com, pegue sua chave e adicione no .env:");
  console.log("TICKETMASTER_API_KEY=sua_chave_aqui");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importEvents() {
  console.log("🚀 Iniciando importação de eventos da Ticketmaster...");

  try {
    // 2. Encontrar o usuário que será o dono dos eventos
    console.log(`Buscando usuário @${TARGET_USERNAME}...`);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', TARGET_USERNAME)
      .single();

    if (profileError || !profile) {
      console.error(`❌ Usuário @${TARGET_USERNAME} não encontrado no banco de dados.`);
      return;
    }
    const creatorId = profile.id;
    console.log(`✅ Usuário encontrado! ID: ${creatorId}`);

    // 3. Buscar todas as categorias e subcategorias
    const { data: categories } = await supabase.from('categories').select('id, name');
    const { data: subcategories } = await supabase.from('subcategories').select('id, name, category_id');

    // 4. Buscar Eventos da Ticketmaster: Mix de Música, Esportes e Arte
    console.log("📡 Buscando eventos na Ticketmaster...");
    const segmentos = [''];
    let allEvents = [];

    for (const seg of segmentos) {
      if (seg === '') {
        console.log(`Buscando todas as categorias (tudo misturado)...`);
      } else {
        console.log(`Buscando a categoria: ${seg}...`);
      }
      
      let apiUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${TICKETMASTER_API_KEY}&countryCode=BR&size=${QUANTIDADE}`;
      if (seg) apiUrl += `&classificationName=${encodeURIComponent(seg)}`;
      if (CIDADE) apiUrl += `&city=${encodeURIComponent(CIDADE)}`;
      if (PALAVRA_CHAVE) apiUrl += `&keyword=${encodeURIComponent(PALAVRA_CHAVE)}`;

      const response = await fetch(apiUrl);
      const data = await response.json();
      if (data._embedded && data._embedded.events) {
        allEvents = allEvents.concat(data._embedded.events);
      }
    }

    if (allEvents.length === 0) {
      console.log("Nenhum evento encontrado ou erro na API.");
      return;
    }

    console.log(`✅ ${allEvents.length} eventos encontrados na Ticketmaster. Processando...`);

    let eventosImportados = 0;

    for (const tmEvent of allEvents) {
      // Identificar categoria e subcategoria
      let catName = "Rolês e Festas";
      let subCatName = "Festas e Eventos";
      
      if (tmEvent.classifications && tmEvent.classifications.length > 0) {
        const segment = tmEvent.classifications[0].segment?.name;
        const genre = tmEvent.classifications[0].genre?.name;
        
        if (segment === "Music") {
          catName = "Música";
          subCatName = "Shows"; 
        } else if (segment === "Sports") {
          catName = "Esportes";
          subCatName = "Eventos Esportivos"; 
        } else if (segment === "Arts & Theatre") {
          catName = "Arte e Criatividade";
          subCatName = "Vídeos";
        }
      }

      const category = categories?.find(c => c.name === catName) || categories?.[0];
      const categoryId = category?.id;

      let subcategoryId = null;
      if (categoryId) {
        // Tenta achar a subcategoria, ou pega a primeira daquela categoria
        const subsInCat = subcategories?.filter(s => s.category_id === categoryId);
        const exactSub = subsInCat?.find(s => s.name === subCatName);
        subcategoryId = exactSub ? exactSub.id : (subsInCat && subsInCat.length > 0 ? subsInCat[0].id : null);
      }
      // Extrair os melhores dados do evento
      const title = tmEvent.name;
      // Descrição Inteligente
      let description = tmEvent.description || tmEvent.info || tmEvent.pleaseNote;
      if (!description) {
        const genre = tmEvent.classifications?.[0]?.genre?.name || '';
        const subGenre = tmEvent.classifications?.[0]?.subGenre?.name || '';
        const generoTexto = genre ? (subGenre ? `${genre} (${subGenre})` : genre) : '';
        description = `Não perca o incrível evento de ${title}!\n\nUm evento espetacular ${generoTexto ? `do gênero ${generoTexto} ` : ''}que vai acontecer na sua região.\n\n🎟️ Mais detalhes e ingressos no link oficial da Ticketmaster abaixo!`;
      }
      const eventDate = tmEvent.dates?.start?.localDate || new Date().toISOString().split('T')[0];
      const eventTime = tmEvent.dates?.start?.localTime || "20:00";
      
      // Pegar a melhor imagem (maior resolução e preferencialmente 16_9)
      let bestImage = null;
      if (tmEvent.images && tmEvent.images.length > 0) {
        const sortedImages = tmEvent.images.sort((a, b) => (b.width || 0) - (a.width || 0));
        bestImage = sortedImages.find(img => img.ratio === '16_9' || img.ratio === '3_2') || sortedImages[0];
      }
      const imageUrl = bestImage ? bestImage.url : null;
      
      // Extrair local
      let locationName = "Local não informado";
      let latitude = null;
      let longitude = null;

      if (tmEvent._embedded?.venues && tmEvent._embedded.venues.length > 0) {
        const venue = tmEvent._embedded.venues[0];
        const city = venue.city?.name || '';
        const state = venue.state?.name || venue.state?.stateCode || '';
        const separator = city && state ? ', ' : '';
        locationName = `${venue.name} - ${city}${separator}${state}`.trim();
        if (locationName.endsWith('-')) locationName = locationName.slice(0, -1).trim();
        
        if (venue.location) {
          latitude = parseFloat(venue.location.latitude);
          longitude = parseFloat(venue.location.longitude);
        }
      }

      // Ingressos
      const ticketUrl = tmEvent.url || null;
      const isPaid = true; // Assumimos pago para ticketmaster
      const price = tmEvent.priceRanges ? tmEvent.priceRanges[0].min : 0;

      const newEvent = {
        creator_id: creatorId,
        title,
        description,
        type: 'event',
        image_url: imageUrl,
        image_urls: imageUrl ? [imageUrl] : [],
        event_date: eventDate,
        event_time: eventTime,
        location_name: locationName,
        latitude,
        longitude,
        is_paid: isPaid,
        price,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        ticket_url: ticketUrl,
        status: 'ao_vivo'
      };

      // 5. Inserir no Supabase
      const { error } = await supabase.from('events').insert([newEvent]);
      
      if (error) {
        console.error(`❌ Erro ao importar: ${title}`, error.message);
      } else {
        console.log(`✔️ Importado: ${title}`);
        eventosImportados++;
      }
    }

    console.log(`\n🎉 Finalizado! ${eventosImportados} eventos foram adicionados ao seu aplicativo.`);
  } catch (error) {
    console.error("❌ Erro inesperado:", error);
  }
}

importEvents();
