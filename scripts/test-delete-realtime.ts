import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testRealTimeIssue() {
  console.log('🔍 TESTE DE SINCRONIZAÇÃO REALTIME\n');

  // Simular a conversa do evento
  const TEST_CONV_ID = '5e5f36cb-94a4-4bcb-911d-f85f138a340c';

  console.log('📊 PASSO 1: Contar mensagens ANTES');
  const { count: countBefore } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', TEST_CONV_ID);

  console.log(`   Mensagens: ${countBefore}`);

  console.log('\n🗑️  PASSO 2: Deletar todas as mensagens');
  const { count: deleteCount, error: deleteError } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', TEST_CONV_ID);

  if (deleteError) {
    console.log(`   ❌ ERRO: ${deleteError.message}`);
    return;
  }

  console.log(`   ✅ Deletadas ${deleteCount} linhas`);

  console.log('\n📊 PASSO 3: Contar mensagens DEPOIS (imediato)');
  const { count: countAfter, data: messagesAfter } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('conversation_id', TEST_CONV_ID);

  console.log(`   Mensagens: ${countAfter}`);

  if (countAfter === 0) {
    console.log('   ✅ DELETE funcionou!');
  } else {
    console.log('   ❌ PROBLEMA: Ainda há mensagens!');
    console.log('\n📝 Mensagens encontradas:');
    messagesAfter?.forEach(m => {
      console.log(`      ID: ${m.id} | Content: ${m.content?.substring(0, 30)}`);
    });
  }

  console.log('\n⏳ PASSO 4: Aguardar 2 segundos...');
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n📊 PASSO 5: Contar mensagens DEPOIS (após delay)');
  const { count: countAfterDelay } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', TEST_CONV_ID);

  console.log(`   Mensagens: ${countAfterDelay}`);

  console.log('\n✅ TESTE CONCLUÍDO');

  // Resumo
  console.log('\n📋 RESUMO:');
  console.log(`   Antes:      ${countBefore} mensagens`);
  console.log(`   Deletadas:  ${deleteCount} mensagens`);
  console.log(`   Depois:     ${countAfter} mensagens`);
  console.log(`   Após delay: ${countAfterDelay} mensagens`);

  if (countAfter === 0 && countAfterDelay === 0) {
    console.log('\n✅ SUCESSO: DELETE está funcionando corretamente!');
    console.log('   O problema é no cliente/frontend.');
  } else if ((countAfter || 0) > 0) {
    console.log('\n❌ CRÍTICO: DELETE não está funcionando!');
    console.log('   Possível causa: RLS Policy bloqueando DELETE');
  }
}

testRealTimeIssue().catch(console.error);
