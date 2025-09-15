#!/usr/bin/env node

/**
 * Script de migração do banco de dados
 * Executa o schema principal e as materialized views
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

// Configuração do banco de dados
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres',
  ssl: { rejectUnauthorized: false }
};

async function runMigration() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conexão estabelecida');

    // Caminhos dos arquivos SQL
    const dbDir = path.join(__dirname, '..', 'db');
    const schemaFile = path.join(dbDir, 'schema.sql');
    const viewsFile = path.join(dbDir, 'views.sql');

    console.log('📄 Verificando arquivos SQL...');
    
    if (!fs.existsSync(schemaFile)) {
      throw new Error(`Arquivo schema.sql não encontrado em: ${schemaFile}`);
    }
    
    if (!fs.existsSync(viewsFile)) {
      throw new Error(`Arquivo views.sql não encontrado em: ${viewsFile}`);
    }

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
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('exames')
    `);
    
    const viewCheck = await client.query(`
      SELECT matviewname 
      FROM pg_matviews 
      WHERE schemaname = 'public'
    `);

    console.log('📋 Estrutura criada:');
    console.log(`   - Tabelas: ${tableCheck.rows.length}`);
    tableCheck.rows.forEach(row => {
      console.log(`     • ${row.table_name} (${row.table_type})`);
    });
    
    console.log(`   - Materialized Views: ${viewCheck.rows.length}`);
    viewCheck.rows.forEach(row => {
      console.log(`     • ${row.matviewname}`);
    });

    // Verificar índices
    const indexCheck = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'exames'
    `);
    
    console.log(`   - Índices na tabela exames: ${indexCheck.rows.length}`);
    indexCheck.rows.forEach(row => {
      console.log(`     • ${row.indexname}`);
    });

    console.log('🎉 Migração concluída com sucesso!');
    
    return {
      success: true,
      tablesCreated: tableCheck.rows.length,
      viewsCreated: viewCheck.rows.length,
      indexesCreated: indexCheck.rows.length,
      message: 'Database migration completed successfully'
    };

  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    console.error('Stack trace:', error.stack);
    
    return {
      success: false,
      error: error.message,
      message: 'Database migration failed'
    };
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigration()
    .then(result => {
      console.log('📊 Resultado final:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };