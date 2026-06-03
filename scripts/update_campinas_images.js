require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PLACEHOLDERS = {
  'teatro': 'https://images.unsplash.com/photo-1507676184212-d0330a15183c?q=80&w=800&auto=format&fit=crop',
  'música': 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
  'show': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800&auto=format&fit=crop',
  'festa': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop',
  'exposição': 'https://images.unsplash.com/photo-1518998053401-a4145d30f36e?q=80&w=800&auto=format&fit=crop',
  'oficina': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop',
  'museu': 'https://images.unsplash.com/photo-1518998053401-a4145d30f36e?q=80&w=800&auto=format&fit=crop',
  'cinema': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
  'filme': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
  'default': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop'
};

async function updateImages() {
  console.log('Buscando eventos sem imagem...');
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title')
    .is('image_url', null);

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`Encontrados ${events.length} eventos sem imagem.`);

  for (const evt of events) {
    const title = evt.title.toLowerCase();
    let img = PLACEHOLDERS['default'];

    for (const [key, url] of Object.entries(PLACEHOLDERS)) {
      if (title.includes(key)) {
        img = url;
        break;
      }
    }

    await supabase
      .from('events')
      .update({ image_url: img, image_urls: [img] })
      .eq('id', evt.id);
      
    process.stdout.write('.');
  }
  console.log('\nTodas as imagens foram atualizadas!');
}

updateImages();
