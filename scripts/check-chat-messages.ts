import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
  try {
    console.log('🔍 Verificando mensagens no banco...\n');

    // Contar total
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erro ao contar:', countError);
      return;
    }

    console.log(`📊 Total de mensagens: ${count || 0}\n`);

    if (!count) {
      console.log('✅ Banco está limpo (nenhuma mensagem)');
      return;
    }

    // Listar conversas
    console.log('📝 Conversas no banco:');
    const { data: convs, error: convError } = await supabase
      .from('conversations')
      .select('id, event_id, created_at')
      .order('created_at', { ascending: false });

    if (convError) {
      console.error('❌ Erro ao buscar conversas:', convError);
    } else {
      console.log(`   Encontradas: ${convs?.length || 0}`);
      convs?.slice(0, 5).forEach((c: any) => {
        console.log(`   - ID: ${c.id}, Event: ${c.event_id}`);
      });
    }

    // Listar últimas mensagens
    console.log('\n📨 Últimas 5 mensagens:');
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (msgError) {
      console.error('❌ Erro ao buscar mensagens:', msgError);
    } else {
      messages?.forEach((msg: any) => {
        const content = msg.content?.substring(0, 50) || '';
        console.log(`   - ID: ${msg.id}`);
        console.log(`     Content: ${content}...`);
        console.log(`     Created: ${msg.created_at}`);
      });
    }

    // Listar por usuário
    console.log('\n👥 Mensagens por sender:');
    const { data: allMsgs } = await supabase
      .from('messages')
      .select('sender_id');

    if (allMsgs) {
      const senderCounts: { [key: string]: number } = {};
      allMsgs.forEach((msg: any) => {
        senderCounts[msg.sender_id] = (senderCounts[msg.sender_id] || 0) + 1;
      });

      Object.entries(senderCounts).forEach(([senderId, count]) => {
        console.log(`   ${senderId}: ${count} mensagens`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkMessages();
