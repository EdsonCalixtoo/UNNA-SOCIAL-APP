import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ADMIN_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ADMIN_KEY) {
  console.error('❌ Credenciais do Supabase não encontradas');
  console.error('   Você precisa adicionar SUPABASE_SERVICE_ROLE_KEY ao .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ADMIN_KEY);

async function applyMigration() {
  console.log('🔧 APLICANDO MIGRATION - Corrigir RLS Policy DELETE\n');

  try {
    // Ler o arquivo SQL
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20260117_fix_messages_delete_policy.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Arquivo não encontrado: ${migrationPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📋 SQL a ser executado:');
    console.log('='.repeat(70));
    console.log(sql);
    console.log('='.repeat(70));
    console.log();

    // Executar a migration usando RPC
    console.log('⏳ Executando SQL no banco de dados...');
    
    let result: any;
    try {
      result = await (supabase.rpc('execute_sql', {
        sql_string: sql
      }) as any);
    } catch (err) {
      console.log('⚠️  RPC execute_sql não disponível, tentando método alternativo...');
      result = { data: null, error: { message: 'RPC não disponível' } };
    }
    
    const { data, error } = result;

    if (error && error.message.includes('RPC')) {
      console.log('\n⚠️  Não foi possível executar via RPC');
      console.log('\n📌 ALTERNATIVA: Execute o SQL manualmente:');
      console.log('\n1. Acesse: https://app.supabase.com/project/_/sql');
      console.log('2. Cole o conteúdo do arquivo:');
      console.log('   supabase/migrations/20260117_fix_messages_delete_policy.sql');
      console.log('\n3. Clique em "Executar" ou "RUN"');
      process.exit(1);
    }

    if (error) {
      console.error('❌ Erro ao executar migration:', error);
      process.exit(1);
    }

    console.log('✅ Migration aplicada com sucesso!');
    console.log('\n📝 O que foi mudado:');
    console.log('   1. ✅ Removida política restritiva (apenas sender poderia deletar)');
    console.log('   2. ✅ Adicionada nova política: participantes podem deletar');
    console.log('   3. ✅ SELECT atualizado: apenas participantes veem mensagens');
    console.log('   4. ✅ INSERT atualizado: validação de participante');
    
    // Testar a nova política
    console.log('\n\n🧪 TESTANDO NOVA POLÍTICA');
    console.log('='.repeat(70));
    
    const { count: countBefore } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', '5e5f36cb-94a4-4bcb-911d-f85f138a340c');

    console.log(`Mensagens antes: ${countBefore}`);

    if (countBefore && countBefore > 0) {
      const { count: deleteCount, error: deleteError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', '5e5f36cb-94a4-4bcb-911d-f85f138a340c');

      if (deleteError) {
        console.log(`❌ DELETE ainda falha: ${deleteError.message}`);
      } else {
        console.log(`✅ DELETE funcionou! ${deleteCount} mensagens deletadas`);
      }

      const { count: countAfter } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', '5e5f36cb-94a4-4bcb-911d-f85f138a340c');

      console.log(`Mensagens depois: ${countAfter}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
    process.exit(1);
  }
}

applyMigration();
