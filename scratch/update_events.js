
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://brcshofygapysytsxhcy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY3Nob2Z5Z2FweXN5dHN4aGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc0MjQ3MCwiZXhwIjoyMDc4MzE4NDcwfQ.iHjoeEsycCS1ogC4uQWU8qJBW4aT9-1UqNWPSwBmd8I';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateEvents() {
  console.log('Iniciando atualização dos eventos...');

  // 1. Taquaral Campinas
  const { error: err1 } = await supabase
    .from('events')
    .update({ latitude: -22.8715, longitude: -47.0501 })
    .eq('id', 'fbba0ebd-b57b-4121-9e1e-224ad738f58c');
  if (!err1) console.log('✅ Evento "Ter" atualizado para Taquaral!');

  // 2. Folks Campinas
  const { error: err2 } = await supabase
    .from('events')
    .update({ latitude: -22.8945, longitude: -47.0545 })
    .eq('id', 'f1011951-6b0b-4fae-ad6a-438bfa2ceb61');
  if (!err2) console.log('✅ Evento "WE LOVE FOLKS" atualizado para Folks Campinas!');

  // 3. Jogar um CS hj (Brasil -> Centro Campinas)
  const { error: err3 } = await supabase
    .from('events')
    .update({ latitude: -22.9064, longitude: -47.0616 })
    .eq('id', 'a09bbe80-defe-4fb1-b281-e658e018ea03');
  if (!err3) console.log('✅ Evento "Jogar um CS hj" atualizado para Centro de Campinas!');

  console.log('Fim da atualização.');
}

updateEvents();
