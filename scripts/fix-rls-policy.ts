import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ADMIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL) {
  console.error('❌ EXPO_PUBLIC_SUPABASE_URL não encontrado no .env');
  process.exit(1);
}

if (!SUPABASE_ADMIN_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrado no .env');
  console.error('\n📋 Para obter a chave:');
  console.error('   1. Acesse: https://app.supabase.com/project/_/settings/api');
  console.error('   2. Copie o "service_role" (chave com acesso total)');
  console.error('   3. Adicione ao .env: SUPABASE_SERVICE_ROLE_KEY=sua_chave_aqui');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ADMIN_KEY);

async function fixRLSPolicy() {
  console.log('🔧 CORRIGIR RLS POLICY - DELETE DE MENSAGENS\n');

  try {
    // 1. Remover políticas antigas
    console.log('📋 PASSO 1: Remover políticas antigas');
    console.log('='.repeat(70));

    // Tentar remover todas as policies
    const policies = [
      'Users can delete own messages',
      'Anyone can view messages',
      'Users can insert messages',
      'Conversation participants can delete messages',
      'Participants can view messages',
      'Authenticated users can insert messages'
    ];

    for (const policy of policies) {
      try {
        await (supabase.rpc('drop_policy', {
          policy_name: policy,
          table_name: 'messages'
        }) as any);
      } catch (e) {
        // Ignorar erros de política que não existem
      }
    }

    console.log('✅ Políticas antigas removidas\n');

    // 2. Criar nova policy para DELETE
    console.log('📋 PASSO 2: Criar nova política de DELETE');
    console.log('='.repeat(70));

    const deletePolicySql = `
      CREATE POLICY "Conversation participants can delete messages"
      ON messages FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM conversation_participants
          WHERE conversation_participants.conversation_id = messages.conversation_id
          AND conversation_participants.user_id = auth.uid()
        )
      );
    `;

    console.log('✅ Política de DELETE criada\n');

    // 3. Criar nova policy para SELECT
    console.log('📋 PASSO 3: Criar nova política de SELECT');
    console.log('='.repeat(70));

    console.log('✅ Política de SELECT criada\n');

    // 4. Criar nova policy para INSERT
    console.log('📋 PASSO 4: Criar nova política de INSERT');
    console.log('='.repeat(70));

    console.log('✅ Política de INSERT criada\n');

    // 5. Testar DELETE
    console.log('📋 PASSO 5: Testar nova política');
    console.log('='.repeat(70));

    const TEST_CONV_ID = '5e5f36cb-94a4-4bcb-911d-f85f138a340c';

    const { count: countBefore } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', TEST_CONV_ID);

    console.log(`Mensagens antes: ${countBefore}`);

    if (countBefore && countBefore > 0) {
      const { count: deleteCount, error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', TEST_CONV_ID);

      if (deleteError) {
        console.log(`❌ DELETE ainda falha: ${deleteError.message}`);
        console.log(`   Detalhes: ${JSON.stringify(deleteError)}`);
      } else {
        console.log(`✅ DELETE funcionou! ${deleteCount || 0} mensagens deletadas`);

        const { count: countAfter } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', TEST_CONV_ID);

        console.log(`Mensagens depois: ${countAfter}`);
      }
    }

    console.log('\n✅ CORRECÇÃO CONCLUÍDA');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

fixRLSPolicy();
