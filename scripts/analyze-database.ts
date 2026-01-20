import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://brcshofygapysytsxhcy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJyY3Nob2Z5Z2FweXN5dHN4aGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNzk2MTAsImV4cCI6MjA1MDk1NzYxMH0.qj1g1X3dWs0qCBJtIlxvXr4pWpEZ3xw6EkEVqvz3qLo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyzeDatabase() {
  console.log('🔍 ANÁLISE COMPLETA DO BANCO DE DADOS\n');

  // 1. Verificar tabelas
  console.log('📋 1. ESTRUTURA DAS TABELAS');
  console.log('=' .repeat(50));

  const { data: tables } = await supabase.from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_type', ['BASE TABLE']);

  if (tables) {
    console.log(`Tabelas encontradas: ${tables.map(t => t.table_name).join(', ')}`);
  }

  // 2. Verificar estrutura da tabela messages
  console.log('\n📋 2. ESTRUTURA DA TABELA MESSAGES');
  console.log('=' .repeat(50));

  const { data: messagesSchema } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_name', 'messages')
    .eq('table_schema', 'public');

  if (messagesSchema) {
    console.log('Colunas:');
    messagesSchema.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
  }

  // 3. Dados na tabela messages
  console.log('\n📊 3. DADOS NA TABELA MESSAGES');
  console.log('=' .repeat(50));

  const { data: allMessages, count: totalMessages } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at', { count: 'exact' });

  console.log(`Total de mensagens: ${totalMessages}`);
  
  if (allMessages && allMessages.length > 0) {
    console.log('\nMensagens por conversa:');
    const byConversation: { [key: string]: number } = {};
    allMessages.forEach(msg => {
      byConversation[msg.conversation_id] = (byConversation[msg.conversation_id] || 0) + 1;
    });
    
    Object.entries(byConversation).forEach(([convId, count]) => {
      console.log(`  Conversa ${convId}: ${count} mensagens`);
    });

    console.log('\nÚltimas 5 mensagens:');
    allMessages.slice(-5).forEach(msg => {
      console.log(`  ${msg.created_at} | Conv: ${msg.conversation_id.substring(0, 8)}... | Conteúdo: ${msg.content.substring(0, 30)}...`);
    });
  }

  // 4. Dados na tabela conversations
  console.log('\n📊 4. DADOS NA TABELA CONVERSATIONS');
  console.log('=' .repeat(50));

  const { data: conversations, count: totalConversations } = await supabase
    .from('conversations')
    .select('id, event_id, created_at', { count: 'exact' });

  console.log(`Total de conversas: ${totalConversations}`);
  
  if (conversations && conversations.length > 0) {
    console.log('\nConversas:');
    conversations.forEach(conv => {
      console.log(`  ID: ${conv.id.substring(0, 8)}... | Event: ${conv.event_id || 'N/A'} | Criada: ${conv.created_at}`);
    });
  }

  // 5. Verificar RLS policies
  console.log('\n🔐 5. RLS POLICIES NA TABELA MESSAGES');
  console.log('=' .repeat(50));

  try {
    console.log('⚠️  Não foi possível recuperar policies via RPC');
    console.log('   Verifique manualmente no dashboard do Supabase em:');
    console.log('   Authentication > Policies > messages');
  } catch (err) {
    console.log('⚠️  RPC get_policies não disponível');
  }

  // 6. Teste de DELETE
  console.log('\n🧪 6. TESTE DE DELETE (SEM EXECUTAR)');
  console.log('=' .repeat(50));

  if (conversations && conversations.length > 0) {
    const testConvId = conversations[0].id;
    console.log(`Conversa de teste: ${testConvId}`);
    
    const { data: testMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', testConvId);

    console.log(`Mensagens nesta conversa: ${testMessages?.length || 0}`);
    console.log(`Query que será executada: DELETE FROM messages WHERE conversation_id = '${testConvId}'`);
  }

  // 7. Verificar se há triggers
  console.log('\n🔧 7. TRIGGERS E FUNCTIONS');
  console.log('=' .repeat(50));

  try {
    const { data: functions } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public');

    if (functions && functions.length > 0) {
      console.log('Functions encontradas:');
      functions.forEach(fn => {
        console.log(`  - ${fn.routine_name} (${fn.routine_type})`);
      });
    } else {
      console.log('Nenhuma function encontrada');
    }
  } catch (err) {
    console.log('⚠️  Não foi possível recuperar functions');
  }

  console.log('\n✅ ANÁLISE CONCLUÍDA');
}

analyzeDatabase().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
