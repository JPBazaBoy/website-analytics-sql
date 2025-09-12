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
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

    // Prepare batch insert statement
    const insertQuery = `
      INSERT INTO exames (
        data_exame, 
        paciente, 
        procedimento, 
        plano, 
        medico_solicitante, 
        matmed, 
        valor_convenio, 
        valor_particular, 
        total,
        fonte
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    // Insert rows in batches to avoid overwhelming the database
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize);
      
      for (const row of batch) {
        try {
          await client.query(insertQuery, [
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
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          
          // Check for constraint violations
          if (errorMessage.includes('chk_total_sum')) {
            result.errors.push(`Erro de validação: Total deve ser igual à soma de convênio + particular`);
          } else if (errorMessage.includes('chk_nonneg')) {
            result.errors.push(`Erro de validação: Valores não podem ser negativos`);
          } else if (errorMessage.includes('not null')) {
            result.errors.push(`Erro de validação: Campos obrigatórios não podem ser vazios`);
          } else {
            result.errors.push(`Erro na inserção: ${errorMessage}`);
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
      SELECT viewname 
      FROM pg_matviews 
      WHERE viewname IN ('mv_resumo_mensal', 'mv_resumo_anual')
    `;
    
    const existingViews = await client.query(viewsQuery);
    const existingViewNames = existingViews.rows.map(row => row.viewname);

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