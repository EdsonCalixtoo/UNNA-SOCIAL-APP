require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function importCampinasEvents() {
  console.log('Iniciando importação de eventos de Campinas...');
  
  try {
    const res = await fetch('https://gateway-cidadao.campinas.sp.gov.br/api/v1/lowcode/gateway?servico=portalpmc&recurso=calendarioevento/all&query=count=99999&cache=true');
    const eventos = await res.json();
    
    console.log(`Encontrados ${eventos.length} eventos na API de Campinas.`);
    
    let eventosInseridos = 0;

    for (const evt of eventos) {
      if (!evt.lancamento || !evt.programacoes || !evt.programacoes.programacao || evt.programacoes.programacao.length === 0) continue;
      
      const p = evt.programacoes.programacao[0];
      const title = evt.lancamento.txtTituloEvento || 'Evento sem título';
      const description = evt.lancamento.txtDescricaoEvento || evt.lancamento.txtSubtituloEvento || '';
      const date = p.dtDataProgramacao ? p.dtDataProgramacao.split('T')[0] : null;
      const time = p.hrHoraProgramacao ? `${p.hrHoraProgramacao}:00` : null;
      
      let location_name = '';
      if (evt.logradouro && evt.logradouro.txtEnderecoLogradouro) {
        location_name = `${evt.logradouro.txtEnderecoLogradouro}`;
        if (evt.logradouro.txtNumeroLogradouro) location_name += `, ${evt.logradouro.txtNumeroLogradouro}`;
        if (evt.logradouro.txtBairroLogradouro) location_name += ` - ${evt.logradouro.txtBairroLogradouro}`;
      } else {
        location_name = 'Campinas, SP';
      }

      let lat = null;
      let lng = null;
      if (evt.localizacao && evt.localizacao.pgLocalizacaoLogroudouro) {
        lat = evt.localizacao.pgLocalizacaoLogroudouro.latitude;
        lng = evt.localizacao.pgLocalizacaoLogroudouro.longitude;
      }

      // Pegar o owner (como no ticketmaster)
      const { data: profile } = await supabase.from('profiles').select('id').eq('username', 'unnasocialappoficial').single();
      const creatorId = profile ? profile.id : null;

      const newEvent = {
        creator_id: creatorId,
        type: 'event',
        title,
        description,
        event_date: date,
        event_time: time,
        location_name,
        latitude: lat,
        longitude: lng,
        status: 'ao_vivo',
        is_paid: false,
        price: 0
      };

      if (!date || !creatorId) continue; // Pular se não tiver data

      // Verificar se já existe para não duplicar
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('title', title)
        .eq('event_date', date)
        .single();

      if (!existing) {
        const { error } = await supabase.from('events').insert([newEvent]);
        if (error) {
          console.error(`Erro ao inserir: ${title}`, error.message);
        } else {
          eventosInseridos++;
        }
      }
    }

    console.log(`\nImportação concluída! ${eventosInseridos} novos eventos inseridos no Supabase.`);
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

importCampinasEvents();
