const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

// Configurações extraídas do seu .env
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Você precisará desta chave para editar dados de outros usuários
const R2_ACCOUNT_ID = process.env.EXPO_PUBLIC_R2_ACCOUNT_ID;
const R2_ACCESS_KEY = process.env.EXPO_PUBLIC_R2_ACCESS_KEY;
const R2_SECRET_KEY = process.env.EXPO_PUBLIC_R2_SECRET_KEY;
const R2_BUCKET_NAME = process.env.EXPO_PUBLIC_R2_BUCKET_NAME;
const R2_PUBLIC_DOMAIN = process.env.EXPO_PUBLIC_R2_PUBLIC_DOMAIN;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERRO: Você precisa adicionar a SUPABASE_SERVICE_ROLE_KEY no seu .env para migrar os perfis.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

async function migrateTable(tableName, columnName) {
  console.log(`\n--- Iniciando migração da tabela [${tableName}.${columnName}] ---`);
  
  const { data: rows, error } = await supabase
    .from(tableName)
    .select(`id, ${columnName}`)
    .not(columnName, 'is', null);

  if (error) {
    console.error(`Erro ao buscar dados da tabela ${tableName}:`, error);
    return;
  }

  console.log(`Encontrados ${rows.length} registros para verificar.`);

  for (const row of rows) {
    const url = row[columnName];
    
    // Verifica se a URL é do Supabase (contém supabase.co)
    if (url.includes('supabase.co')) {
      console.log(`Migrando: ${url}`);
      
      try {
        // 1. Download do Supabase
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        // 2. Definir novo caminho no R2
        const fileName = url.split('/').pop().split('?')[0]; // Pega o nome do arquivo da URL
        const r2Path = `${tableName}/${row.id}/${fileName}`;
        
        // 3. Upload para o R2
        const uploadCommand = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: r2Path,
          Body: Buffer.from(buffer),
          ContentType: contentType,
        });
        
        await s3Client.send(uploadCommand);
        const newUrl = `${R2_PUBLIC_DOMAIN}/${r2Path}`;
        
        // 4. Atualizar o Supabase com a nova URL do R2
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ [columnName]: newUrl })
          .eq('id', row.id);
          
        if (updateError) {
          console.error(`Erro ao atualizar linha ${row.id}:`, updateError);
        } else {
          console.log(`✅ Sucesso! Nova URL: ${newUrl}`);
        }
      } catch (err) {
        console.error(`Falha ao migrar arquivo da linha ${row.id}:`, err);
      }
    }
  }
}

async function migrateMessages() {
  console.log(`\n--- Iniciando migração da tabela [messages.content] ---`);
  
  const { data: rows, error } = await supabase
    .from('messages')
    .select('id, content')
    .ilike('content', '%supabase.co%'); // Filtra apenas o que tem link do Supabase

  if (error) {
    console.error(`Erro ao buscar mensagens:`, error);
    return;
  }

  console.log(`Encontradas ${rows.length} mensagens com mídia para migrar.`);

  for (const row of rows) {
    try {
      let content = row.content;
      let isJson = false;
      let parsed = null;

      try {
        parsed = JSON.parse(content);
        isJson = true;
      } catch (e) {
        // Se não for JSON, pode ser um link direto (casos antigos)
      }

      const url = isJson ? parsed.url : content;

      if (url && url.includes('supabase.co')) {
        console.log(`Migrando mídia de chat: ${url}`);
        
        // 1. Download
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        // 2. Novo caminho
        const fileName = url.split('/').pop().split('?')[0];
        const r2Path = `chats/media/${fileName}`;
        
        // 3. Upload R2
        const uploadCommand = new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: r2Path,
          Body: Buffer.from(buffer),
          ContentType: contentType,
        });
        
        await s3Client.send(uploadCommand);
        const newUrl = `${R2_PUBLIC_DOMAIN}/${r2Path}`;
        
        // 4. Atualizar JSON ou String
        let newContent;
        if (isJson) {
          parsed.url = newUrl;
          newContent = JSON.stringify(parsed);
        } else {
          newContent = newUrl;
        }

        const { error: updateError } = await supabase
          .from('messages')
          .update({ content: newContent })
          .eq('id', row.id);
          
        if (updateError) {
          console.error(`Erro ao atualizar mensagem ${row.id}:`, updateError);
        } else {
          console.log(`✅ Sucesso!`);
        }
      }
    } catch (err) {
      console.error(`Falha na mensagem ${row.id}:`, err);
    }
  }
}

async function run() {
  try {
    // Migrar Perfis
    await migrateTable('profiles', 'avatar_url');
    
    // Migrar Eventos
    await migrateTable('events', 'image_url');
    
    // Migrar Conversas (Grupos)
    await migrateTable('conversations', 'avatar_url');

    // Migrar Stories (NOVO)
    await migrateTable('stories', 'media_url');

    // Migrar Mensagens de Chat (NOVO)
    await migrateMessages();

    console.log('\n--- MIGRACAO CONCLUIDA COM SUCESSO! ---');
  } catch (err) {
    console.error('Erro crítico na migração:', err);
  }
}

run();
