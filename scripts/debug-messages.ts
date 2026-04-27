import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMessages() {
  try {
    console.log('🔍 Verificando estado do banco...\n');

    // 1. Contar mensagens
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erro ao contar:', countError);
      return;
    }

    console.log(`📊 Total de mensagens: ${count || 0}\n`);

    if (!count) {
      console.log('✅ Banco está vazio - não há mensagens!');
      return;
    }

    // 2. Listar conversas
    console.log('📝 Conversas:');
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, event_id, created_at')
      .order('created_at', { ascending: false });

    console.log(`   Encontradas: ${convs?.length || 0}`);
    convs?.forEach((c: any) => {
      console.log(`   - ID: ${c.id}`);
      console.log(`     Event: ${c.event_id}`);
    });

    // 3. Se houver conversas, verificar mensagens por conversa
    if (convs && convs.length > 0) {
      console.log('\n📨 Mensagens por conversa:');
      for (const conv of convs) {
        const { count: convCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);
        
        console.log(`   Conversa ${conv.id.substring(0, 8)}...: ${convCount || 0} mensagens`);
      }
    }

    // 4. Listar últimas mensagens
    console.log('\n📨 Últimas 3 mensagens:');
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, conversation_id, content, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    msgs?.forEach((msg: any) => {
      console.log(`   ${msg.created_at}: "${msg.content.substring(0, 40)}..."`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

debugMessages();
