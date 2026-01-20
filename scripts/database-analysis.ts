import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://brcshofygapysytsxhcy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY3Nob2Z5Z2FweXN5dHN4aGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNzk2MTAsImV4cCI6MjA1MDk1NzYxMH0.qj1g1X3dWs0qCBJtIlxvXr4pWpEZ3xw6EkEVqvz3qLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyzeDatabase() {
  console.log('🔍 ANÁLISE DO BANCO DE DADOS\n');

  // 1. Dados na tabela messages
  console.log('📊 MENSAGENS NO BANCO');
  console.log('='.repeat(60));

  const { data: allMessages, count: totalMessages, error: messagesError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at', { count: 'exact' });

  if (messagesError) {
    console.error('❌ Erro ao buscar mensagens:', messagesError);
  } else {
    console.log(`Total de mensagens: ${totalMessages}`);
    
    if (allMessages && allMessages.length > 0) {
      console.log('\n✅ Mensagens por conversa:');
      const byConversation: { [key: string]: { count: number; lastMsg: string } } = {};
      
      allMessages.forEach(msg => {
        const convId = msg.conversation_id;
        if (!byConversation[convId]) {
          byConversation[convId] = { count: 0, lastMsg: '' };
        }
        byConversation[convId].count++;
        byConversation[convId].lastMsg = msg.created_at;
      });
      
      Object.entries(byConversation).forEach(([convId, info]) => {
        console.log(`  📌 Conversa: ${convId}`);
        console.log(`     └─ ${info.count} mensagens`);
        console.log(`     └─ Última: ${info.lastMsg}`);
      });

      console.log('\n📝 Últimas 10 mensagens:');
      allMessages.slice(-10).forEach(msg => {
        const preview = msg.content.substring(0, 50).replace(/\n/g, ' ');
        console.log(`   ${msg.created_at} | Conv: ${msg.conversation_id.substring(0, 8)}... | ${preview}`);
      });
    } else {
      console.log('❌ Nenhuma mensagem encontrada');
    }
  }

  // 2. Dados na tabela conversations
  console.log('\n\n📊 CONVERSAS NO BANCO');
  console.log('='.repeat(60));

  const { data: conversations, count: totalConversations, error: convError } = await supabase
    .from('conversations')
    .select('id, event_id, created_at', { count: 'exact' });

  if (convError) {
    console.error('❌ Erro ao buscar conversas:', convError);
  } else {
    console.log(`Total de conversas: ${totalConversations}`);
    
    if (conversations && conversations.length > 0) {
      conversations.forEach(conv => {
        console.log(`  📌 ID: ${conv.id}`);
        console.log(`     └─ Event: ${conv.event_id || 'N/A'}`);
        console.log(`     └─ Criada: ${conv.created_at}`);
      });
    }
  }

  // 3. Teste de DELETE
  console.log('\n\n🧪 TESTE DE DELETE');
  console.log('='.repeat(60));

  if (conversations && conversations.length > 0) {
    const testConv = conversations[0];
    console.log(`\nConversa de teste: ${testConv.id}`);
    console.log(`Event: ${testConv.event_id}`);
    
    const { data: testMsgs, count: testCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('conversation_id', testConv.id);

    console.log(`Mensagens antes do DELETE: ${testCount}`);

    // Executar DELETE
    const { error: deleteError, count: deleteCount } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', testConv.id);

    if (deleteError) {
      console.log(`❌ Erro no DELETE:`, deleteError);
    } else {
      console.log(`✅ DELETE executado - ${deleteCount || 0} linhas afetadas`);

      // Verificar se deletou mesmo
      const { data: afterDelete, count: countAfter } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('conversation_id', testConv.id);

      console.log(`Mensagens após DELETE: ${countAfter}`);
      
      if (countAfter === 0) {
        console.log('✅ DELETE funcionou corretamente!');
      } else {
        console.log('❌ DELETE não funcionou - mensagens ainda existem!');
      }
    }
  }

  // 4. Comparação - Chat de eventos vs Chat de usuários
  console.log('\n\n⚖️ COMPARAÇÃO: CHAT EVENTOS vs CHAT USUÁRIOS');
  console.log('='.repeat(60));

  if (conversations && conversations.length > 0) {
    const eventChats = conversations.filter(c => c.event_id);
    const userChats = conversations.filter(c => !c.event_id);
    
    console.log(`Chat de Eventos: ${eventChats.length} conversas`);
    console.log(`Chat de Usuários: ${userChats.length} conversas`);
    
    if (eventChats.length > 0 && allMessages) {
      const eventMsgs = allMessages.filter(m => 
        eventChats.some(c => c.id === m.conversation_id)
      );
      console.log(`  Mensagens em chats de eventos: ${eventMsgs.length}`);
    }
    
    if (userChats.length > 0 && allMessages) {
      const userMsgs = allMessages.filter(m => 
        userChats.some(c => c.id === m.conversation_id)
      );
      console.log(`  Mensagens em chats de usuários: ${userMsgs.length}`);
    }
  }

  console.log('\n✅ ANÁLISE CONCLUÍDA');
}

analyzeDatabase().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
