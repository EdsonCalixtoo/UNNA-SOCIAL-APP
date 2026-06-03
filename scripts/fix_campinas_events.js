require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixCategories() {
  console.log('Buscando categorias do Supabase...');
  const { data: categories } = await supabase.from('categories').select('id, name');
  const { data: subcategories } = await supabase.from('subcategories').select('id, name, category_id');

  if (!categories || categories.length === 0) {
    console.error('Nenhuma categoria encontrada!');
    return;
  }

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, description')
    .is('category_id', null);

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`Encontrados ${events.length} eventos sem categoria.`);

  let updated = 0;
  for (const evt of events) {
    const text = (evt.title + ' ' + evt.description).toLowerCase();
    
    let catName = 'Rolês e Festas'; // Default
    let subCatName = 'Festas e Eventos';

    if (text.includes('teatro') || text.includes('espetáculo') || text.includes('comédia') || text.includes('peça')) {
      catName = 'Arte e Cultura';
      subCatName = 'Teatro e Espetáculos';
    } else if (text.includes('show') || text.includes('música') || text.includes('concerto') || text.includes('rock') || text.includes('samba')) {
      catName = 'Música';
      subCatName = 'Shows';
    } else if (text.includes('festa') || text.includes('balada') || text.includes('dj')) {
      catName = 'Rolês e Festas';
      subCatName = 'Festas e Eventos';
    } else if (text.includes('exposição') || text.includes('museu') || text.includes('arte')) {
      catName = 'Arte e Cultura';
      subCatName = 'Exposições';
    } else if (text.includes('oficina') || text.includes('curso') || text.includes('palestra')) {
      catName = 'Educação';
      subCatName = 'Cursos e Oficinas';
    } else if (text.includes('filme') || text.includes('cinema') || text.includes('documentário')) {
      catName = 'Arte e Cultura';
      subCatName = 'Cinema';
    }

    // fallback to Arte e Cultura if Rolês doesn't exist
    let category = categories.find(c => c.name === catName) || categories[0];
    
    let subcategoryId = null;
    if (category) {
      const subsInCat = subcategories.filter(s => s.category_id === category.id);
      const exactSub = subsInCat.find(s => s.name === subCatName);
      subcategoryId = exactSub ? exactSub.id : (subsInCat.length > 0 ? subsInCat[0].id : null);
    }

    if (category) {
      await supabase
        .from('events')
        .update({ category_id: category.id, subcategory_id: subcategoryId })
        .eq('id', evt.id);
      updated++;
      process.stdout.write('.');
    }
  }
  console.log(`\nFinalizado! Categorias corrigidas em ${updated} eventos.`);
}

fixCategories();
