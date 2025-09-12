#!/usr/bin/env node

/**
 * Script para refresh das Materialized Views
 * Atualiza todas as MVs de forma concorrente quando possível
 */

const { Client } = require('pg');

// Configuração do banco de dados
const dbConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Lista das materialized views na ordem correta de dependência
const MATERIALIZED_VIEWS = [
  'mv_resumo_mensal',
  'mv_resumo_anual', 
  'mv_procedimentos',
  'mv_planos',
  'mv_medicos',
  'mv_tendencia_mensal'
];

async function refreshMaterializedViews(concurrent = true) {
  const client = new Client(dbConfig);
  const results = [];
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conexão estabelecida');

    console.log(`🔄 Iniciando refresh das materialized views (concurrent: ${concurrent})...`);
    const startTime = Date.now();

    for (const viewName of MATERIALIZED_VIEWS) {
      try {
        console.log(`  📊 Atualizando ${viewName}...`);
        const viewStartTime = Date.now();
        
        // REFRESH MATERIALIZED VIEW com ou sem CONCURRENTLY
        const refreshSQL = `REFRESH MATERIALIZED VIEW ${concurrent ? 'CONCURRENTLY' : ''} ${viewName}`;
        await client.query(refreshSQL);
        
        const viewEndTime = Date.now();
        const viewDuration = viewEndTime - viewStartTime;
        
        console.log(`  ✅ ${viewName} atualizada (${viewDuration}ms)`);
        
        results.push({
          view: viewName,
          success: true,
          duration: viewDuration,
          concurrent: concurrent
        });
        
      } catch (error) {
        console.error(`  ❌ Erro ao atualizar ${viewName}: ${error.message}`);
        
        // Se falhou com CONCURRENTLY, tentar sem
        if (concurrent && error.message.includes('unique index')) {
          console.log(`  🔄 Tentando ${viewName} sem CONCURRENTLY...`);
          try {
            const fallbackStartTime = Date.now();
            await client.query(`REFRESH MATERIALIZED VIEW ${viewName}`);
            const fallbackDuration = Date.now() - fallbackStartTime;
            
            console.log(`  ✅ ${viewName} atualizada sem concurrent (${fallbackDuration}ms)`);
            
            results.push({
              view: viewName,
              success: true,
              duration: fallbackDuration,
              concurrent: false,
              fallback: true
            });
            
          } catch (fallbackError) {
            console.error(`  ❌ Falha definitiva em ${viewName}: ${fallbackError.message}`);
            results.push({
              view: viewName,
              success: false,
              error: fallbackError.message,
              concurrent: false
            });
          }
        } else {
          results.push({
            view: viewName,
            success: false,
            error: error.message,
            concurrent: concurrent
          });
        }
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Refresh concluído em ${totalTime}ms`);

    // Verificar estatísticas das views atualizadas
    console.log('📊 Verificando estatísticas das views...');
    for (const viewName of MATERIALIZED_VIEWS) {
      try {
        const stats = await client.query(`
          SELECT 
            schemaname, 
            matviewname, 
            hasindexes,
            ispopulated,
            (SELECT reltuples::bigint FROM pg_class WHERE relname = $1) as estimated_rows
          FROM pg_matviews 
          WHERE matviewname = $1
        `, [viewName]);
        
        if (stats.rows.length > 0) {
          const stat = stats.rows[0];
          console.log(`  • ${viewName}: ${stat.estimated_rows} rows, populated: ${stat.ispopulated}, indexed: ${stat.hasindexes}`);
        }
      } catch (error) {
        console.log(`  • ${viewName}: erro ao verificar estatísticas`);
      }
    }

    // Resumo dos resultados
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((acc, r) => acc + (r.duration || 0), 0);
    
    console.log('📋 Resumo do refresh:');
    console.log(`   ✅ Sucesso: ${successful}/${MATERIALIZED_VIEWS.length}`);
    console.log(`   ❌ Falhas: ${failed}`);
    console.log(`   ⏱️  Tempo total: ${totalTime}ms`);
    console.log(`   📊 Tempo de processamento: ${totalDuration}ms`);

    return {
      success: failed === 0,
      totalViews: MATERIALIZED_VIEWS.length,
      successful: successful,
      failed: failed,
      totalTime: totalTime,
      processingTime: totalDuration,
      results: results
    };

  } catch (error) {
    console.error('💥 Erro fatal durante o refresh:', error.message);
    return {
      success: false,
      error: error.message,
      results: results
    };
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada');
  }
}

// Função para refresh de uma view específica
async function refreshSingleView(viewName, concurrent = true) {
  if (!MATERIALIZED_VIEWS.includes(viewName)) {
    throw new Error(`View '${viewName}' não encontrada na lista de views disponíveis: ${MATERIALIZED_VIEWS.join(', ')}`);
  }
  
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log(`🔄 Atualizando view ${viewName}...`);
    
    const startTime = Date.now();
    const refreshSQL = `REFRESH MATERIALIZED VIEW ${concurrent ? 'CONCURRENTLY' : ''} ${viewName}`;
    await client.query(refreshSQL);
    const duration = Date.now() - startTime;
    
    console.log(`✅ ${viewName} atualizada em ${duration}ms`);
    
    return {
      success: true,
      view: viewName,
      duration: duration,
      concurrent: concurrent
    };
    
  } catch (error) {
    console.error(`❌ Erro ao atualizar ${viewName}: ${error.message}`);
    return {
      success: false,
      view: viewName,
      error: error.message,
      concurrent: concurrent
    };
  } finally {
    await client.end();
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const concurrent = !args.includes('--no-concurrent');
  const viewName = args.find(arg => !arg.startsWith('--'));
  
  console.log('🚀 Iniciando refresh das materialized views...');
  
  if (viewName) {
    // Refresh de uma view específica
    refreshSingleView(viewName, concurrent)
      .then(result => {
        console.log('📊 Resultado:', result);
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('💥 Erro:', error.message);
        process.exit(1);
      });
  } else {
    // Refresh de todas as views
    refreshMaterializedViews(concurrent)
      .then(result => {
        console.log('📊 Resultado final:', result);
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('💥 Erro:', error);
        process.exit(1);
      });
  }
}

module.exports = { 
  refreshMaterializedViews, 
  refreshSingleView,
  MATERIALIZED_VIEWS 
};