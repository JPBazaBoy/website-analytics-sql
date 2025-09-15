import fs from 'fs';
import path from 'path';
import JSON5 from 'json5';

// Configuração
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-5-sonnet-latest';
const MAX_RETRIES = 2;

// Carregar system prompt
const systemPromptPath = path.join(process.cwd(), 'lib', 'system-prompt.md');
const SYSTEM_PROMPT = fs.readFileSync(systemPromptPath, 'utf-8');

// Tipos
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sqlResult?: SqlResult;
  timestamp: Date;
}

export interface SqlResult {
  success: boolean;
  rowCount?: number;
  sampleRows?: any[];
  elapsedMs?: number;
  sql?: string;
  error?: string;
}

interface PlannerResult {
  sql: string[];
  rationale: string;
  final_answer_hint: string;
}

/**
 * Detecta e gera SQL para queries Top-N comuns
 */
function detectTopNQuery(question: string): PlannerResult | null {
  const normalized = question.toLowerCase();

  // Patterns para detectar Top-N
  const topNRegex = /top\s*(\d+)|(\d+)\s*(melhores|maiores|principais)/i;
  const match = question.match(topNRegex);
  const n = match ? parseInt(match[1] || match[2] || '10') : 10;

  // Detectar período
  let dateStart = '2025-01-01';
  let dateEnd = '2026-01-01';

  if (normalized.includes('janeiro') || normalized.includes('jan/2025')) {
    dateStart = '2025-01-01';
    dateEnd = '2025-02-01';
  } else if (normalized.includes('1º semestre') || normalized.includes('primeiro semestre')) {
    dateStart = '2025-01-01';
    dateEnd = '2025-07-01';
  } else if (normalized.includes('2º semestre') || normalized.includes('segundo semestre')) {
    dateStart = '2025-07-01';
    dateEnd = '2026-01-01';
  } else if (normalized.includes('2024')) {
    dateStart = '2024-01-01';
    dateEnd = '2025-01-01';
  }

  // Templates SQL para cada tipo
  if (normalized.includes('médico') || normalized.includes('medico')) {
    console.log('[DETECTOR] Top-N médicos detectado');
    return {
      sql: [`SELECT medico_solicitante,
       SUM(total) AS faturamento,
       SUM(total - matmed) AS receita_liquida,
       COUNT(*) AS qtd_exames
FROM public.exames
WHERE data_exame >= '${dateStart}' AND data_exame < '${dateEnd}'
      AND COALESCE(TRIM(medico_solicitante),'') <> ''
GROUP BY medico_solicitante
ORDER BY faturamento DESC
LIMIT ${n}`],
      rationale: 'Query otimizada para top médicos',
      final_answer_hint: `Top ${n} médicos por faturamento`
    };
  }

  if (normalized.includes('plano') || normalized.includes('convênio') || normalized.includes('convenio')) {
    console.log('[DETECTOR] Top-N planos detectado');
    return {
      sql: [`SELECT plano,
       SUM(total) AS faturamento,
       SUM(total - matmed) AS receita_liquida,
       COUNT(*) AS qtd_exames
FROM public.exames
WHERE data_exame >= '${dateStart}' AND data_exame < '${dateEnd}'
      AND COALESCE(TRIM(plano),'') <> ''
GROUP BY plano
ORDER BY ${normalized.includes('líquida') || normalized.includes('liquida') ? 'receita_liquida' : 'faturamento'} DESC
LIMIT ${n}`],
      rationale: 'Query otimizada para top planos',
      final_answer_hint: `Top ${n} planos por ${normalized.includes('líquida') ? 'receita líquida' : 'faturamento'}`
    };
  }

  if (normalized.includes('procedimento') || normalized.includes('exame')) {
    console.log('[DETECTOR] Top-N procedimentos detectado');
    const orderBy = normalized.includes('quantidade') || normalized.includes('qtd')
      ? 'qtd_exames'
      : 'faturamento';

    return {
      sql: [`SELECT procedimento,
       SUM(total) AS faturamento,
       SUM(total - matmed) AS receita_liquida,
       COUNT(*) AS qtd_exames
FROM public.exames
WHERE data_exame >= '${dateStart}' AND data_exame < '${dateEnd}'
      AND COALESCE(TRIM(procedimento),'') <> ''
GROUP BY procedimento
ORDER BY ${orderBy} DESC
LIMIT ${n}`],
      rationale: 'Query otimizada para top procedimentos',
      final_answer_hint: `Top ${n} procedimentos por ${orderBy === 'qtd_exames' ? 'quantidade' : 'faturamento'}`
    };
  }

  return null;
}

/**
 * Sanitiza e parseia JSON do planner com tolerância a erros
 */
function parsePlannerJson(text: string): PlannerResult | null {
  console.log('[PARSER] Texto bruto:', text.substring(0, 200));

  // 1. Limpar markdown e tags
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/<json>/gi, '')
    .replace(/<\/json>/gi, '')
    .replace(/[\u201C\u201D]/g, '"')  // Smart quotes
    .replace(/[\u2018\u2019]/g, "'")  // Smart apostrophes
    .trim();

  // 2. Tentar JSON5 direto
  try {
    const parsed = JSON5.parse(cleaned);
    if (parsed.sql && Array.isArray(parsed.sql)) {
      console.log('[PARSER] Sucesso com JSON5 direto');
      return {
        sql: parsed.sql,
        rationale: parsed.rationale || 'Auto-gerado',
        final_answer_hint: parsed.final_answer_hint || ''
      };
    }
  } catch (e) {
    console.log('[PARSER] JSON5 direto falhou:', e);
  }

  // 3. Extrair primeiro bloco {...}
  const jsonMatch = cleaned.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
  if (jsonMatch) {
    try {
      // Substituir quebras de linha dentro de strings SQL
      let jsonStr = jsonMatch[0];
      jsonStr = jsonStr.replace(/"sql"\s*:\s*\[([\s\S]*?)\]/g, (match, sqlArray) => {
        const fixed = sqlArray.replace(/\n/g, '\\n');
        return `"sql":[${fixed}]`;
      });

      const parsed = JSON5.parse(jsonStr);
      if (parsed.sql && Array.isArray(parsed.sql)) {
        console.log('[PARSER] Sucesso com extração de bloco');
        return {
          sql: parsed.sql,
          rationale: parsed.rationale || 'Auto-gerado',
          final_answer_hint: parsed.final_answer_hint || ''
        };
      }
    } catch (e) {
      console.log('[PARSER] Extração de bloco falhou:', e);
    }
  }

  // 4. Fallback: extrair SQL diretamente
  const sqlMatches = [
    ...text.matchAll(/```sql\n([\s\S]*?)```/g),
    ...text.matchAll(/"sql"\s*:\s*\[([\s\S]*?)\]/g),
    ...text.matchAll(/SELECT[\s\S]*?(?:;|$)/gi)
  ];

  if (sqlMatches.length > 0) {
    console.log('[PARSER] Fallback: extraindo SQL diretamente');
    const sqls = sqlMatches.map(m => {
      let sql = m[1] || m[0];
      return sql.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
    });

    return {
      sql: sqls,
      rationale: 'Extraído via fallback',
      final_answer_hint: ''
    };
  }

  console.log('[PARSER] Falha total no parsing');
  return null;
}

/**
 * 1. PLANNER - Planeja e gera SQL
 */
async function planner(
  question: string,
  history: ChatMessage[] = [],
  retry: number = 0
): Promise<PlannerResult> {
  // Verificar se é uma query Top-N comum
  const topNResult = detectTopNQuery(question);
  if (topNResult) {
    console.log('[PLANNER] Usando template Top-N otimizado');
    return topNResult;
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('CLAUDE_API_KEY não configurada');

  console.log(`[PLANNER] Tentativa ${retry + 1} - Pergunta: ${question}`);

  const messages = [
    {
      role: 'user',
      content: retry === 0
        ? question
        : `${question}\n\nVocê OBRIGATORIAMENTE deve retornar JSON puro, sem markdown, com o campo sql (array de strings). Não inclua comentários.`
    }
  ];

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        messages,
        max_tokens: 2048,
        temperature: 0.1,
        system: SYSTEM_PROMPT
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API erro: ${response.status}`);
    }

    const data = await response.json();
    const claudeResponse = data.content[0].text;
    console.log('[PLANNER] Resposta bruta:', claudeResponse.substring(0, 300));

    // Usar o parser tolerante
    const plan = parsePlannerJson(claudeResponse);

    if (!plan || !plan.sql || plan.sql.length === 0) {
      if (retry < MAX_RETRIES) {
        console.log('[PLANNER] Sem SQL válida, tentando novamente...');
        return planner(question, history, retry + 1);
      }
      throw new Error('Claude não gerou SQL após múltiplas tentativas');
    }

    // Limpar SQL
    plan.sql = plan.sql.map(s => s.trim().replace(/;+$/, ''));

    console.log('[PLANNER] Plan final:', JSON.stringify(plan, null, 2));
    return plan;

  } catch (error) {
    console.error('[PLANNER] Erro:', error);
    if (retry < MAX_RETRIES) {
      return planner(question, history, retry + 1);
    }
    throw error;
  }
}

/**
 * 2. EXECUTE - Executa SQL no banco
 */
async function execute(sqlQueries: string[]): Promise<SqlResult[]> {
  const results: SqlResult[] = [];

  for (const sql of sqlQueries) {
    console.log('[EXECUTE] Executando SQL:', sql);

    try {
      const response = await fetch('http://localhost:3000/api/tools/run-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, max_rows: 5000 })
      });

      const data = await response.json();

      if (!data.success) {
        // Tentar ajustes automáticos
        let adjustedSql = sql;

        // Ajuste 1: case-insensitive
        adjustedSql = adjustedSql
          .replace(/\bMes\b/gi, 'mes')
          .replace(/\bAno\b/gi, 'ano')
          .replace(/\bTotal\b/gi, 'total')
          .replace(/\bMatMed\b/gi, 'matmed');

        // Ajuste 2: date_trunc
        if (data.error?.includes('function') && sql.includes('month(')) {
          adjustedSql = adjustedSql.replace(
            /month\s*\(\s*(\w+)\s*\)/gi,
            "date_trunc('month', $1)"
          );
        }

        if (adjustedSql !== sql) {
          console.log('[EXECUTE] Tentando SQL ajustada');

          const retryResponse = await fetch('http://localhost:3000/api/tools/run-sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: adjustedSql, max_rows: 5000 })
          });

          const retryData = await retryResponse.json();
          if (retryData.success) {
            console.log(`[EXECUTE] ✓ Sucesso após ajuste. ${retryData.rowCount} linhas, ${retryData.elapsedMs}ms`);
            results.push({
              ...retryData,
              sql: adjustedSql
            });
            continue;
          }
        }

        console.error('[EXECUTE] ✗ Erro SQL:', data.error);
        results.push({
          success: false,
          error: data.error || 'Erro ao executar SQL',
          sql
        });
      } else {
        console.log(`[EXECUTE] ✓ Sucesso. ${data.rowCount} linhas, ${data.elapsedMs}ms`);
        results.push({
          ...data,
          sql
        });
      }
    } catch (error) {
      console.error('[EXECUTE] ✗ Erro de rede:', error);
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Erro de rede',
        sql
      });
    }
  }

  return results;
}

/**
 * 3. SYNTHESIZE - Sintetiza resposta final
 */
async function synthesize(
  question: string,
  sqlResults: SqlResult[]
): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('CLAUDE_API_KEY não configurada');

  console.log('[SYNTHESIZE] Gerando resposta final...');

  // Preparar contexto com resultados
  const resultsContext = sqlResults.map((result, i) => {
    if (!result.success) {
      return `Query ${i + 1}: ERRO - ${result.error}`;
    }
    return `Query ${i + 1} (${result.rowCount} linhas):
SQL: ${result.sql}
Resultados:
${JSON.stringify(result.sampleRows, null, 2)}`;
  }).join('\n\n');

  const messages = [
    {
      role: 'user',
      content: `Pergunta original: ${question}

Resultados das SQL executadas:
${resultsContext}

Formate uma resposta objetiva em português brasileiro:
1. Resposta direta e clara
2. Se for Top-N, mostre em formato de tabela simples
3. Valores monetários em R$ XXX.XXX,XX
4. Não adicione seção "Como calculei" (será mostrada separadamente)
5. Seja conciso e direto ao ponto

IMPORTANTE: Use APENAS os dados dos resultados acima. Não invente números.`
    }
  ];

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      messages,
      max_tokens: 2048,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API erro: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Função principal - Orquestrador
 */
export async function sendMessage(
  message: string,
  history: ChatMessage[] = []
): Promise<{
  response: string;
  sqlQueries: string[];
  sqlResults: SqlResult[];
  error?: string;
  retries: number;
}> {
  let retries = 0;

  try {
    // 1. Planejar e gerar SQL
    const plan = await planner(message, history);
    retries = plan.sql.length === 0 ? 1 : 0;

    if (plan.sql.length === 0) {
      return {
        response: 'Não consegui gerar SQL para sua pergunta. Por favor, reformule de forma mais específica.',
        sqlQueries: [],
        sqlResults: [],
        error: 'Nenhuma SQL gerada',
        retries
      };
    }

    // 2. Executar SQL
    const sqlResults = await execute(plan.sql);

    // Verificar se ao menos uma SQL teve sucesso
    const successfulResults = sqlResults.filter(r => r.success);
    if (successfulResults.length === 0) {
      return {
        response: 'Todas as consultas SQL falharam. Verifique se os dados estão disponíveis.',
        sqlQueries: plan.sql,
        sqlResults,
        error: 'Todas as SQL falharam',
        retries
      };
    }

    // 3. Sintetizar resposta
    const response = await synthesize(message, sqlResults);

    return {
      response,
      sqlQueries: plan.sql,
      sqlResults,
      retries
    };

  } catch (error) {
    console.error('[ORQUESTRADOR] Erro geral:', error);
    return {
      response: 'Erro ao processar sua pergunta. Por favor, tente novamente.',
      sqlQueries: [],
      sqlResults: [],
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      retries
    };
  }
}