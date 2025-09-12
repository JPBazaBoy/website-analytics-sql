#!/usr/bin/env node

/**
 * Test Queries Script - Implements the 6 validation queries for the analytical system
 * Executes test queries to validate system functionality and data integrity
 */

const testQueries = {
  "9.1_faturamento_periodo": {
    name: "Faturamento de período",
    description: "Calcula soma do faturamento para período específico",
    sql: `
      SELECT SUM(total) AS faturamento
      FROM exames 
      WHERE data_exame BETWEEN '2024-01-01' AND '2024-06-30';
    `,
    expectedType: "sum",
    validation: (result) => {
      return result.length > 0 && 
             result[0].faturamento !== null && 
             typeof result[0].faturamento === 'number' || typeof result[0].faturamento === 'string';
    }
  },

  "9.2_comparacao_anos": {
    name: "Comparação entre anos",  
    description: "Compara receita entre diferentes anos",
    sql: `
      SELECT ano, SUM(total) AS receita
      FROM exames 
      WHERE ano IN (2023, 2024) 
      GROUP BY ano 
      ORDER BY ano;
    `,
    expectedType: "grouped",
    validation: (result) => {
      return result.length > 0 && 
             result.every(row => row.ano && row.receita !== null);
    }
  },

  "9.3_medicos_queda_h1_h2": {
    name: "Médicos com maior queda H1→H2",
    description: "Identifica médicos com maior queda percentual do primeiro para segundo semestre",
    sql: `
      WITH por_sem AS (
        SELECT medico_solicitante,
               CASE WHEN mes BETWEEN 1 AND 6 THEN 'H1' ELSE 'H2' END AS semestre,
               SUM(total) AS receita
        FROM exames
        WHERE ano = 2024
        GROUP BY medico_solicitante, CASE WHEN mes BETWEEN 1 AND 6 THEN 'H1' ELSE 'H2' END
      ),
      pt AS (
        SELECT medico_solicitante,
               SUM(CASE WHEN semestre='H1' THEN receita ELSE 0 END) AS h1,
               SUM(CASE WHEN semestre='H2' THEN receita ELSE 0 END) AS h2
        FROM por_sem
        GROUP BY medico_solicitante
      )
      SELECT medico_solicitante, h1, h2,
             CASE WHEN h1 > 0 THEN ROUND((h2 - h1)/h1::numeric * 100, 2) END AS variacao_pct
      FROM pt
      WHERE h1 >= 5000
      ORDER BY variacao_pct ASC
      LIMIT 10;
    `,
    expectedType: "ranked",
    validation: (result) => {
      return result.length >= 0 && 
             result.every(row => row.medico_solicitante && 
                                row.h1 !== null && 
                                row.h2 !== null);
    }
  },

  "9.4_procedimentos_ganho_liquido": {
    name: "Procedimentos com maior ganho líquido",
    description: "Lista procedimentos ordenados por ganho líquido (total - matmed)",
    sql: `
      SELECT procedimento, SUM(total - matmed) AS ganho_liquido
      FROM exames
      WHERE ano = 2024
      GROUP BY procedimento
      ORDER BY ganho_liquido DESC
      LIMIT 10;
    `,
    expectedType: "ranked",
    validation: (result) => {
      return result.length > 0 && 
             result.every(row => row.procedimento && row.ganho_liquido !== null);
    }
  },

  "9.5_principal_plano_participacao": {
    name: "Principal plano e participação",
    description: "Identifica principal plano de saúde e sua participação no faturamento",
    sql: `
      WITH anoX AS (
        SELECT plano, SUM(total) AS receita_plano
        FROM exames
        WHERE ano = 2024
        GROUP BY plano
      ),
      tot AS (SELECT SUM(receita_plano) AS receita_total FROM anoX)
      SELECT a.plano, 
             a.receita_plano,
             ROUND(a.receita_plano / t.receita_total * 100, 2) AS participacao_pct
      FROM anoX a CROSS JOIN tot t
      ORDER BY a.receita_plano DESC
      LIMIT 5;
    `,
    expectedType: "ranked",
    validation: (result) => {
      return result.length > 0 && 
             result.every(row => row.plano && 
                                row.receita_plano !== null && 
                                row.participacao_pct !== null);
    }
  },

  "9.6_evolucao_mensal": {
    name: "Evolução mensal",
    description: "Mostra evolução da receita mês a mês",
    sql: `
      SELECT mes, SUM(total) AS receita
      FROM exames
      WHERE ano = 2024
      GROUP BY mes
      ORDER BY mes;
    `,
    expectedType: "time_series",
    validation: (result) => {
      return result.length > 0 && 
             result.every(row => row.mes && row.receita !== null);
    }
  }
};

/**
 * Executes a test query via API call
 */
async function executeTestQuery(queryId, query) {
  try {
    console.log(`\n🔍 Executing ${queryId}: ${query.name}`);
    console.log(`📝 Description: ${query.description}`);
    
    const startTime = Date.now();
    
    // Simulate API call (would be actual HTTP request in real implementation)
    const response = await fetch('http://localhost:3000/api/tools/run-sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: query.sql.trim(),
        max_rows: 50
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    const elapsedTime = Date.now() - startTime;

    console.log(`⏱️  Execution time: ${elapsedTime}ms`);
    console.log(`📊 Rows returned: ${result.rowCount || 0}`);
    
    // Validate result
    const isValid = query.validation(result.sampleRows || []);
    
    console.log(`✅ Validation: ${isValid ? 'PASS' : 'FAIL'}`);
    
    if (result.sampleRows && result.sampleRows.length > 0) {
      console.log(`📋 Sample data (first 3 rows):`);
      result.sampleRows.slice(0, 3).forEach((row, i) => {
        console.log(`   ${i + 1}. ${JSON.stringify(row)}`);
      });
    }

    return {
      queryId,
      name: query.name,
      success: true,
      valid: isValid,
      rowCount: result.rowCount,
      elapsedMs: result.elapsedMs,
      executionTime: elapsedTime,
      sampleRows: result.sampleRows,
      sql: query.sql.trim()
    };

  } catch (error) {
    console.error(`❌ Error executing ${queryId}:`, error.message);
    return {
      queryId,
      name: query.name,
      success: false,
      valid: false,
      error: error.message,
      sql: query.sql.trim()
    };
  }
}

/**
 * Runs all test queries in sequence
 */
async function runAllTests() {
  console.log('🚀 Starting Test Queries Execution');
  console.log('=====================================');
  
  const results = [];
  
  for (const [queryId, query] of Object.entries(testQueries)) {
    const result = await executeTestQuery(queryId, query);
    results.push(result);
    
    // Wait between queries to avoid overloading
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  
  const successful = results.filter(r => r.success).length;
  const valid = results.filter(r => r.valid).length;
  
  console.log(`✅ Successful executions: ${successful}/${results.length}`);
  console.log(`✔️  Valid results: ${valid}/${results.length}`);
  
  results.forEach(result => {
    const status = result.success ? (result.valid ? '✅' : '⚠️ ') : '❌';
    console.log(`   ${status} ${result.queryId}: ${result.name}`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  });
  
  return results;
}

/**
 * Standalone execution mode
 */
async function main() {
  if (require.main === module) {
    try {
      const results = await runAllTests();
      
      // Exit with appropriate code
      const allValid = results.every(r => r.success && r.valid);
      process.exit(allValid ? 0 : 1);
      
    } catch (error) {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    }
  }
}

// Export for use by other modules
module.exports = {
  testQueries,
  executeTestQuery,
  runAllTests
};

// Run if called directly
main().catch(console.error);