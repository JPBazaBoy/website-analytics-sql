import { Pool } from 'pg';
import { ValidatedRow } from './parse-xlsx';

// Database connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 10, // Maximum number of connections in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  
  return pool;
}

export interface BatchInsertResult {
  inserted: number;
  errors: string[];
  warnings: string[];
}

/**
 * Insert validated exam rows into the database in batches
 */
export async function insertExamesBatch(
  rows: ValidatedRow[], 
  fonte?: string
): Promise<BatchInsertResult> {
  const pool = getPool();
  const client = await pool.connect();
  
  const result: BatchInsertResult = {
    inserted: 0,
    errors: [],
    warnings: []
  };

  try {
    await client.query('BEGIN');

    // Filter only valid rows for insertion
    const validRows = rows.filter(row => row.validation.isValid);
    
    // Collect all validation errors and warnings
    for (const row of rows) {
      result.errors.push(...row.validation.errors);
      result.warnings.push(...row.validation.warnings);
    }

    if (validRows.length === 0) {
      await client.query('ROLLBACK');
      result.errors.push('Nenhuma linha válida encontrada para inserção');
      return result;
    }

    // Insert rows in batches - MUITO mais eficiente
    const batchSize = 100; // Tamanho ideal para INSERT em batch
    let insertedCount = 0;

    console.log(`Inserindo ${validRows.length} registros em batches de ${batchSize}...`);

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);

      // Construir INSERT múltiplo em uma única query
      const values: any[] = [];
      const placeholders: string[] = [];

      batch.forEach((row, index) => {
        const offset = index * 10;
        placeholders.push(
          `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
        );

        values.push(
          row.data_exame,
          row.paciente || null,
          row.procedimento,
          row.plano,
          row.medico_solicitante || null,
          row.matmed,
          row.valor_convenio,
          row.valor_particular,
          row.total,
          fonte || null
        );
      });

      // Query única para inserir todo o batch
      const batchInsertQuery = `
        INSERT INTO exames (
          data_exame, paciente, procedimento, plano, medico_solicitante,
          matmed, valor_convenio, valor_particular, total, fonte
        ) VALUES ${placeholders.join(', ')}
      `;

      try {
        await client.query(batchInsertQuery, values);
        insertedCount += batch.length;
        console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} registros inseridos`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`Erro no batch ${Math.floor(i/batchSize) + 1}:`, errorMessage);

        // Se falhar o batch inteiro, tentar inserir linha por linha para identificar problemas
        for (const row of batch) {
          try {
            await client.query(`
              INSERT INTO exames (
                data_exame, paciente, procedimento, plano, medico_solicitante,
                matmed, valor_convenio, valor_particular, total, fonte
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [
              row.data_exame,
              row.paciente || null,
              row.procedimento,
              row.plano,
              row.medico_solicitante || null,
              row.matmed,
              row.valor_convenio,
              row.valor_particular,
              row.total,
              fonte || null
            ]);
            insertedCount++;
          } catch (rowError) {
            const rowErrorMsg = rowError instanceof Error ? rowError.message : 'Erro desconhecido';
            if (rowErrorMsg.includes('chk_total_sum')) {
              result.errors.push(`Erro de validação: Total deve ser igual à soma de convênio + particular`);
            } else if (rowErrorMsg.includes('chk_nonneg')) {
              result.errors.push(`Erro de validação: Valores não podem ser negativos`);
            } else {
              result.errors.push(`Erro na linha: ${rowErrorMsg}`);
            }
          }
        }
      }
    }

    if (insertedCount > 0) {
      await client.query('COMMIT');
      result.inserted = insertedCount;
    } else {
      await client.query('ROLLBACK');
      result.errors.push('Nenhuma linha foi inserida devido a erros de validação');
    }

  } catch (error) {
    await client.query('ROLLBACK');
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    result.errors.push(`Erro na transação: ${errorMessage}`);
  } finally {
    client.release();
  }

  return result;
}

/**
 * Refresh materialized views after data insertion
 */
export async function refreshMaterializedViews(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Refresh materialized views to update cached aggregations
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_resumo_mensal');
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_resumo_anual');
  } catch (error) {
    // If concurrent refresh fails, try regular refresh
    try {
      await client.query('REFRESH MATERIALIZED VIEW mv_resumo_mensal');
      await client.query('REFRESH MATERIALIZED VIEW mv_resumo_anual');
    } catch (fallbackError) {
      throw new Error(`Erro ao atualizar views materializadas: ${fallbackError instanceof Error ? fallbackError.message : 'Erro desconhecido'}`);
    }
  } finally {
    client.release();
  }
}

/**
 * Get database statistics for validation
 */
export async function getDatabaseStats(): Promise<{
  totalExames: number;
  latestDate: string | null;
  earliestDate: string | null;
}> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_exames,
        MAX(data_exame) as latest_date,
        MIN(data_exame) as earliest_date
      FROM exames
    `);

    return {
      totalExames: parseInt(result.rows[0].total_exames) || 0,
      latestDate: result.rows[0].latest_date,
      earliestDate: result.rows[0].earliest_date
    };
  } finally {
    client.release();
  }
}

/**
 * Check if materialized views exist and create them if they don't
 */
export async function ensureMaterializedViews(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Check if materialized views exist
    const viewsQuery = `
      SELECT matviewname
      FROM pg_matviews
      WHERE matviewname IN ('mv_resumo_mensal', 'mv_resumo_anual')
    `;

    const existingViews = await client.query(viewsQuery);
    const existingViewNames = existingViews.rows.map(row => row.matviewname);

    // Create mv_resumo_mensal if it doesn't exist
    if (!existingViewNames.includes('mv_resumo_mensal')) {
      await client.query(`
        CREATE MATERIALIZED VIEW mv_resumo_mensal AS
        SELECT
          date_trunc('month', data_exame)::date AS ref_month,
          COUNT(*)                             AS total_exames,
          SUM(total)                           AS receita_bruta,
          SUM(matmed)                          AS custo_matmed,
          SUM(total - matmed)                  AS receita_liquida
        FROM exames
        GROUP BY 1;
      `);

      // Create index for better performance
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_resumo_mensal_ref_month 
        ON mv_resumo_mensal (ref_month);
      `);
    }

    // Create mv_resumo_anual if it doesn't exist
    if (!existingViewNames.includes('mv_resumo_anual')) {
      await client.query(`
        CREATE MATERIALIZED VIEW mv_resumo_anual AS
        SELECT
          ano,
          COUNT(*)            AS total_exames,
          SUM(total)          AS receita_bruta,
          SUM(matmed)         AS custo_matmed,
          SUM(total - matmed) AS receita_liquida
        FROM exames
        GROUP BY ano;
      `);

      // Create index for better performance
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_resumo_anual_ano 
        ON mv_resumo_anual (ano);
      `);
    }

  } finally {
    client.release();
  }
}

/**
 * Clean up database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}