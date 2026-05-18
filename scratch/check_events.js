
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://brcshofygapysytsxhcy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY3Nob2Z5Z2FweXN5dHN4aGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc0MjQ3MCwiZXhwIjoyMDc4MzE4NDcwfQ.iHjoeEsycCS1ogC4uQWU8qJBW4aT9-1UqNWPSwBmd8I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, location_name, latitude, longitude')
    .eq('latitude', -23.5505); // Filtra os que eu coloquei em SP

  if (error) {
    console.error('Erro ao buscar eventos:', error);
    return;
  }

  console.log('--- EVENTOS EM SÃO PAULO (TESTE) ---');
  data.forEach(event => {
    console.log(`ID: ${event.id}`);
    console.log(`Título: ${event.title}`);
    console.log(`Endereço Salvo: ${event.location_name}`);
    console.log('-----------------------------------');
  });
}

checkEvents();
