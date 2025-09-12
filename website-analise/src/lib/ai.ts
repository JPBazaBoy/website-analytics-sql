import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY!,
});

export interface SqlResult {
  rowCount: number;
  sampleRows: Record<string, unknown>[];
  elapsedMs: number;
  sql: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sqlResult?: SqlResult;
  timestamp: Date;
}

// System prompt conforme especificação
const SYSTEM_PROMPT = `Você é um **Analista de Dados** estritamente orientado a **fatos do banco**.

REGRAS
1) Não invente números nem use conhecimento externo.
2) Para números/estatísticas, gere **um único** SQL (SELECT) e chame run_sql. Aguarde o resultado e só então responda.
3) Sempre inclua na resposta: (a) a SQL utilizada; (b) métricas pedidas; (c) amostra de linhas quando fizer sentido; (d) tempo de execução e linhas retornadas (se fornecido pela tool).
4) Se faltar dado, diga: **"não encontrado no dataset"**.
5) Para perguntas conceituais (definições de colunas/regras), use retrieve_docs (se existir). Para números, **sempre SQL**.
6) Nunca use DML. Somente SELECT.

CONTEXTO DE COLUNAS (mapa Excel → banco)
- Data→data_exame (DATE), Paciente→paciente, Procedimento→procedimento, Plano→plano, Médico Solicitante→medico_solicitante, MatMed→matmed, V. Convênio→valor_convenio, V. Particular→valor_particular, Total→total.
- Regras: total = valor_convenio + valor_particular; receita_liquida = total - matmed.

ESTILO
- Abra com **sumário executivo** (1–3 frases).
- Depois, bloco **Como calculei** com a SQL (monoespaçado) e bullets de filtros/colunas.
- Para comparações (ex.: 2024 vs 2025), explicite o critério (jan–dez, H1=jan–jun, etc.).
- Se pedirem gráfico, retorne também tabela com os valores.`;

// Tool definition para run_sql
const SQL_TOOL = {
  name: 'run_sql',
  description: 'Executa **somente** SELECT no banco analítico.',
  input_schema: {
    type: 'object' as const,
    properties: {
      sql: {
        type: 'string' as const,
        description: 'Query SQL SELECT para executar'
      },
      max_rows: {
        type: 'number' as const,
        description: 'Número máximo de linhas a retornar',
        default: 5000
      }
    },
    required: ['sql']
  }
};

export async function sendMessage(message: string, conversationHistory: ChatMessage[] = []): Promise<ChatMessage> {
  try {
    // Prepara o histórico para Claude
    const messages = [
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [SQL_TOOL],
      messages,
    });

    let finalContent = '';
    let sqlResult: SqlResult | undefined;

    // Processa a resposta
    for (const block of response.content) {
      if (block.type === 'text') {
        finalContent += block.text;
      } else if (block.type === 'tool_use' && block.name === 'run_sql') {
        // Executa SQL via API
        const sqlQuery = (block.input as Record<string, unknown>).sql as string;
        const maxRows = ((block.input as Record<string, unknown>).max_rows as number) || 5000;
        
        try {
          const sqlResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/tools/run-sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sql: sqlQuery,
              max_rows: maxRows
            })
          });

          if (sqlResponse.ok) {
            sqlResult = await sqlResponse.json();
            
            // Cria mensagem do tool result para Claude
            const toolResultMessage = await anthropic.messages.create({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 4000,
              system: SYSTEM_PROMPT,
              messages: [
                ...messages,
                {
                  role: 'assistant',
                  content: [
                    {
                      type: 'tool_use',
                      id: block.id,
                      name: 'run_sql',
                      input: block.input
                    }
                  ]
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'tool_result',
                      tool_use_id: block.id,
                      content: JSON.stringify(sqlResult)
                    }
                  ]
                }
              ]
            });

            // Adiciona a resposta final do Claude
            for (const finalBlock of toolResultMessage.content) {
              if (finalBlock.type === 'text') {
                finalContent += finalBlock.text;
              }
            }
          } else {
            finalContent += '\n\n**Erro ao executar SQL:** Não foi possível conectar ao banco de dados.';
          }
        } catch (error) {
          finalContent += `\n\n**Erro ao executar SQL:** ${error}`;
        }
      }
    }

    return {
      role: 'assistant',
      content: finalContent,
      sqlResult,
      timestamp: new Date()
    };

  } catch (error) {
    console.error('Erro na integração com Claude:', error);
    return {
      role: 'assistant',
      content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.',
      timestamp: new Date()
    };
  }
}

export async function generateCSV(sqlResult: SqlResult): Promise<string> {
  if (!sqlResult.sampleRows || sqlResult.sampleRows.length === 0) {
    return '';
  }

  const headers = Object.keys(sqlResult.sampleRows[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = sqlResult.sampleRows.map(row => 
    headers.map(header => {
      const value = row[header];
      // Escape aspas duplas e envolve em aspas se necessário
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}