import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Pool de conexão read-only
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_RO || process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function POST(request: NextRequest) {
  try {
    const { sql, max_rows = 5000 } = await request.json();

    // Validações de segurança
    if (!sql || typeof sql !== 'string') {
      return NextResponse.json(
        { error: 'SQL query is required' },
        { status: 400 }
      );
    }

    // Remove espaços e quebras de linha extras
    const cleanSql = sql.trim();

    // Verifica se é apenas SELECT
    if (!cleanSql.toLowerCase().startsWith('select')) {
      return NextResponse.json(
        { error: 'Only SELECT statements are allowed' },
        { status: 400 }
      );
    }

    // Verifica múltiplos statements (básico)
    const statements = cleanSql.split(';').filter(s => s.trim());
    if (statements.length > 1) {
      return NextResponse.json(
        { error: 'Multiple statements are not allowed' },
        { status: 400 }
      );
    }

    // Bloqueia comandos perigosos
    const dangerousKeywords = [
      'insert', 'update', 'delete', 'drop', 'create', 'alter', 
      'truncate', 'grant', 'revoke', 'exec', 'execute'
    ];
    
    const lowerSql = cleanSql.toLowerCase();
    for (const keyword of dangerousKeywords) {
      if (lowerSql.includes(keyword)) {
        return NextResponse.json(
          { error: `Command '${keyword}' is not allowed` },
          { status: 400 }
        );
      }
    }

    // Adiciona LIMIT se não existir
    let finalSql = cleanSql;
    if (!lowerSql.includes('limit')) {
      finalSql += ` LIMIT ${max_rows}`;
    }

    // Executa a query
    const startTime = Date.now();
    const result = await pool.query(finalSql);
    const elapsedMs = Date.now() - startTime;

    // Log da query (sem dados sensíveis)
    console.log(`SQL executed in ${elapsedMs}ms, returned ${result.rowCount} rows`);
    console.log(`Query: ${finalSql.substring(0, 200)}${finalSql.length > 200 ? '...' : ''}`);

    return NextResponse.json({
      rowCount: result.rowCount,
      sampleRows: result.rows,
      elapsedMs,
      sql: finalSql
    });

  } catch (error) {
    console.error('Database error:', error);
    
    // Retorna erro mais amigável para o usuário
    let errorMessage = 'Erro interno do servidor';
    
    if (error instanceof Error) {
      // Erros comuns de SQL
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        errorMessage = 'Tabela ou coluna não encontrada';
      } else if (error.message.includes('syntax error')) {
        errorMessage = 'Erro de sintaxe SQL';
      } else if (error.message.includes('column') && error.message.includes('must appear in the GROUP BY')) {
        errorMessage = 'Erro de agrupamento: todas as colunas devem estar no GROUP BY';
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Endpoint de health check
export async function GET() {
  try {
    const result = await pool.query('SELECT 1 as health_check');
    return NextResponse.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      connection: result.rowCount === 1 ? 'ok' : 'error'
    });
  } catch {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      },
      { status: 500 }
    );
  }
}