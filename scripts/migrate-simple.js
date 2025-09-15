#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  // Parse da URL para extrair os componentes
  const url = new URL(process.env.DATABASE_URL);

  const client = new Client({
    host: url.hostname,
    port: url.port || 5432,
    database: url.pathname.slice(1),
    user: url.username,
    password: decodeURIComponent(url.password),
    ssl: {
      rejectUnauthorized: false,
      require: true
    }
  });

  try {
    console.log('🔌 Conectando ao banco de dados Supabase...');
    await client.connect();
    console.log('✅ Conexão estabelecida');

    // Caminhos dos arquivos SQL
    const dbDir = path.join(__dirname, '..', 'db');
    const schemaFile = path.join(dbDir, 'schema.sql');
    const viewsFile = path.join(dbDir, 'views.sql');

    // Executar schema
    console.log('🏗️  Executando schema.sql...');
    const schemaSQL = fs.readFileSync(schemaFile, 'utf8');
    await client.query(schemaSQL);
    console.log('✅ Schema criado com sucesso');

    // Executar views
    console.log('📊 Criando materialized views...');
    const viewsSQL = fs.readFileSync(viewsFile, 'utf8');
    await client.query(viewsSQL);
    console.log('✅ Materialized views criadas com sucesso');

    // Verificar estrutura criada
    console.log('🔍 Verificando estrutura do banco...');

    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'exames'
    `);

    const viewCheck = await client.query(`
      SELECT matviewname
      FROM pg_matviews
      WHERE schemaname = 'public'
    `);

    console.log('📋 Estrutura criada:');
    console.log(`   - Tabela exames: ${tableCheck.rows.length > 0 ? '✅' : '❌'}`);
    console.log(`   - Materialized Views: ${viewCheck.rows.length}`);
    viewCheck.rows.forEach(row => {
      console.log(`     • ${row.matviewname}`);
    });

    console.log('🎉 Migração concluída com sucesso!');

    return {
      success: true,
      tablesCreated: tableCheck.rows.length,
      viewsCreated: viewCheck.rows.length
    };

  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada');
  }
}

// Executar
runMigration()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
  });