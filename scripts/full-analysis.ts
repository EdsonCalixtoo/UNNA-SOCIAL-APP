import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Credenciais do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deepAnalysis() {
  console.log('🔍 ANÁLISE PROFUNDA DO BANCO DE DADOS\n');

  try {
    // 1. Mensagens
    console.log('1️⃣ MENSAGENS');
    console.log('='.repeat(70));
    const { data: messages, count: msgCount, error: msgError } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at, read', { count: 'exact' });

    if (msgError) {
      console.error('❌ Erro:', msgError.message);
    } else {
      console.log(`✅ Total: ${msgCount} mensagens`);
      
      if (messages && messages.length > 0) {
        const byConv: { [key: string]: number } = {};
        messages.forEach(m => {
          byConv[m.conversation_id] = (byConv[m.conversation_id] || 0) + 1;
        });
        
        console.log('\n📌 Distribuição por conversa:');
        Object.entries(byConv).forEach(([convId, count]) => {
          console.log(`   ${convId.substring(0, 8)}...  →  ${count} msgs`);
        });
      }
    }

    // 2. Conversas
    console.log('\n\n2️⃣ CONVERSAS');
    console.log('='.repeat(70));
    const { data: conversations, count: convCount, error: convError } = await supabase
      .from('conversations')
      .select('id, event_id, created_at', { count: 'exact' });

    if (convError) {
      console.error('❌ Erro:', convError.message);
    } else {
      console.log(`✅ Total: ${convCount} conversas`);
      
      if (conversations) {
        const withEvent = conversations.filter(c => c.event_id).length;
        const withoutEvent = conversations.filter(c => !c.event_id).length;
        
        console.log(`\n   💬 Chat de Eventos: ${withEvent} (com event_id)`);
        console.log(`   👥 Chat de Usuários: ${withoutEvent} (sem event_id)`);
        
        console.log('\n📌 Todas as conversas:');
        conversations.forEach(c => {
          const type = c.event_id ? '💬' : '👥';
          console.log(`   ${type} ${c.id.substring(0, 8)}... | Event: ${c.event_id || 'NULL'}`);
        });
      }
    }

    // 3. Participants
    console.log('\n\n3️⃣ PARTICIPANTES DE CONVERSAS');
    console.log('='.repeat(70));
    const { data: participants, count: partCount } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id', { count: 'exact' });

    if (participants) {
      console.log(`✅ Total: ${partCount} participações`);
      
      const byConv: { [key: string]: number } = {};
      participants.forEach(p => {
        byConv[p.conversation_id] = (byConv[p.conversation_id] || 0) + 1;
      });
      
      console.log('\n📌 Participantes por conversa:');
      Object.entries(byConv).forEach(([convId, count]) => {
        console.log(`   ${convId.substring(0, 8)}...  →  ${count} participantes`);
      });
    }

    // 4. Teste DELETE específico
    console.log('\n\n4️⃣ TESTE DE DELETE - CHAT DE EVENTOS');
    console.log('='.repeat(70));

    if (conversations) {
      const eventChat = conversations.find(c => c.event_id);
      
      if (!eventChat) {
        console.log('❌ Nenhuma conversa de evento encontrada');
      } else {
        console.log(`\nConversa de teste: ${eventChat.id}`);
        console.log(`Event ID: ${eventChat.event_id}`);
        
        const { data: beforeDelete, count: countBefore } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('conversation_id', eventChat.id);

        console.log(`\n📊 ANTES do DELETE: ${countBefore} mensagens`);

        // Executar DELETE
        console.log('\n🗑️ Executando DELETE...');
        const { data: deleteResult, error: deleteError, count: deleteCount } = await supabase
          .from('messages')
          .delete()
          .eq('conversation_id', eventChat.id);

        if (deleteError) {
          console.error(`   ❌ ERRO: ${deleteError.message}`);
        } else {
          console.log(`   ✅ Deletadas ${deleteCount} linhas`);

          // Verificar após delete
          const { data: afterDelete, count: countAfter } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('conversation_id', eventChat.id);

          console.log(`\n📊 DEPOIS do DELETE: ${countAfter} mensagens`);

          if (countAfter === 0) {
            console.log('✅ DELETE FUNCIONOU CORRETAMENTE!');
          } else {
            console.log('❌ PROBLEMA: Mensagens ainda existem após DELETE!');
            console.log('\n⚠️ POSSÍVEIS CAUSAS:');
            console.log('   1. RLS Policy bloqueando o DELETE');
            console.log('   2. Trigger no banco reinsertando dados');
            console.log('   3. Permissões insuficientes');
          }
        }
      }
    }

    // 5. Análise de RLS
    console.log('\n\n5️⃣ VERIFICAÇÃO DE RLS POLICIES');
    console.log('='.repeat(70));
    console.log('⚠️  Para ver as RLS policies, acesse:');
    console.log('   https://app.supabase.com/project/_/auth/policies');
    console.log('\n📋 Verifique se existem policies que BLOQUEIAM DELETE na tabela messages');

  } catch (error: any) {
    console.error('\n❌ ERRO GERAL:', error.message || error);
  }

  console.log('\n✅ ANÁLISE CONCLUÍDA\n');
}

deepAnalysis();
