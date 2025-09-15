/**
 * Modelo de estado e memória para o chat analítico
 * Gerencia contexto da conversa, filtros ativos e histórico compacto
 */

export type PeriodType = 'month' | 'year' | 'range' | 'semester' | 'none';

export interface Period {
  type: PeriodType;
  start?: string; // 'YYYY-MM-DD'
  end?: string;   // 'YYYY-MM-DD'
  year?: number;  // para year/semester
  semester?: 1 | 2;
  month?: number; // para month
}

export interface ChatState {
  period: Period;                 // default: { type:'none' }
  planos?: string[];              // filtros
  medicos?: string[];
  procedimentos?: string[];
  metric?: 'total' | 'receita_liquida' | 'valor_convenio' | 'valor_particular' | 'matmed';
  groupBy?: 'mes' | 'medico' | 'procedimento' | 'plano' | 'ano' | null;
  topN?: number;                  // ex.: 5,10
  compare?: {                     // comparação opcional
    with: 'previous_period' | 'same_period_last_year' | 'custom';
    custom?: Period;
  } | null;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO
}

export interface Thread {
  id: string;
  title: string;
  state: ChatState;
  history: ChatHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Estado padrão inicial
 */
export function defaultState(): ChatState {
  return {
    period: { type: 'none' },
    metric: 'total',
    groupBy: null,
    topN: undefined,
    planos: undefined,
    medicos: undefined,
    procedimentos: undefined,
    compare: null
  };
}

/**
 * Mescla estado anterior com atualizações, validando valores
 */
export function mergeState(prev: ChatState, updates: Partial<ChatState>): ChatState {
  const merged = { ...prev };

  // Atualizar período
  if (updates.period) {
    merged.period = updates.period;
  }

  // Atualizar métrica
  if (updates.metric) {
    merged.metric = updates.metric;
  }

  // Atualizar agrupamento
  if (updates.groupBy !== undefined) {
    merged.groupBy = updates.groupBy;
  }

  // Validar e atualizar topN
  if (updates.topN !== undefined) {
    if (updates.topN === null || updates.topN === 0) {
      merged.topN = undefined;
    } else {
      merged.topN = Math.min(Math.max(1, updates.topN), 50);
    }
  }

  // Atualizar filtros (remover duplicatas e normalizar)
  if (updates.planos !== undefined) {
    merged.planos = updates.planos ?
      [...new Set(updates.planos.map(p => p.trim()).filter(p => p))] :
      undefined;
  }

  if (updates.medicos !== undefined) {
    merged.medicos = updates.medicos ?
      [...new Set(updates.medicos.map(m => m.trim()).filter(m => m))] :
      undefined;
  }

  if (updates.procedimentos !== undefined) {
    merged.procedimentos = updates.procedimentos ?
      [...new Set(updates.procedimentos.map(p => p.trim()).filter(p => p))] :
      undefined;
  }

  // Atualizar comparação
  if (updates.compare !== undefined) {
    merged.compare = updates.compare;
  }

  return merged;
}

/**
 * Gera resumo do estado para enviar ao LLM
 */
export function summarizeStateForLLM(state: ChatState): string {
  const parts: string[] = [];

  // Período
  if (state.period.type !== 'none') {
    if (state.period.type === 'semester' && state.period.year && state.period.semester) {
      parts.push(`Período: S${state.period.semester}/${state.period.year}`);
    } else if (state.period.type === 'year' && state.period.year) {
      parts.push(`Período: ${state.period.year}`);
    } else if (state.period.type === 'month' && state.period.year && state.period.month) {
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      parts.push(`Período: ${monthNames[state.period.month - 1]}/${state.period.year}`);
    } else if (state.period.type === 'range' && state.period.start && state.period.end) {
      parts.push(`Período: ${state.period.start} até ${state.period.end}`);
    }
  }

  // Filtros
  const filters: string[] = [];
  if (state.planos?.length) {
    filters.push(`plano=${state.planos.join(',')}`);
  }
  if (state.medicos?.length) {
    filters.push(`médico=${state.medicos.join(',')}`);
  }
  if (state.procedimentos?.length) {
    filters.push(`procedimento=${state.procedimentos.join(',')}`);
  }
  if (filters.length > 0) {
    parts.push(`Filtros: ${filters.join('; ')}`);
  }

  // Métrica
  if (state.metric && state.metric !== 'total') {
    const metricNames: Record<string, string> = {
      'receita_liquida': 'receita líquida',
      'valor_convenio': 'valor convênio',
      'valor_particular': 'valor particular',
      'matmed': 'MatMed'
    };
    parts.push(`Métrica: ${metricNames[state.metric] || state.metric}`);
  }

  // Agrupamento
  if (state.groupBy) {
    parts.push(`Agrupado por: ${state.groupBy}`);
  }

  // Top N
  if (state.topN) {
    parts.push(`Top ${state.topN}`);
  }

  // Comparação
  if (state.compare) {
    if (state.compare.with === 'previous_period') {
      parts.push('Comparando com período anterior');
    } else if (state.compare.with === 'same_period_last_year') {
      parts.push('Comparando com mesmo período ano passado');
    }
  }

  return parts.length > 0 ? parts.join('; ') : 'Estado inicial (sem filtros)';
}

/**
 * Compacta histórico mantendo últimas 5 mensagens
 * Se houver mais de 5, gera resumo das anteriores
 */
export function compactHistory(history: ChatHistoryItem[]): ChatHistoryItem[] {
  if (history.length <= 5) {
    return history;
  }

  // Pegar as mensagens mais antigas (além das últimas 5)
  const olderMessages = history.slice(0, -5);
  const recentMessages = history.slice(-5);

  // Criar resumo das mensagens antigas
  const userQuestions = olderMessages
    .filter(m => m.role === 'user')
    .map(m => m.content.substring(0, 50))
    .slice(-3); // Pegar apenas últimas 3 perguntas antigas

  const summary: ChatHistoryItem = {
    role: 'assistant',
    content: `[Resumo do contexto anterior: ${userQuestions.length} perguntas sobre ${userQuestions.join(', ')}...]`,
    timestamp: olderMessages[olderMessages.length - 1]?.timestamp || new Date().toISOString()
  };

  return [summary, ...recentMessages];
}

/**
 * Formata período para exibição na UI
 */
export function formatPeriodDisplay(period: Period): string {
  if (period.type === 'none') {
    return 'Período não definido';
  }

  if (period.type === 'semester' && period.year && period.semester) {
    const semesterName = period.semester === 1 ? 'S1' : 'S2';
    return `${semesterName}/${period.year}`;
  }

  if (period.type === 'year' && period.year) {
    return `${period.year}`;
  }

  if (period.type === 'month' && period.year && period.month) {
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${monthNames[period.month - 1]}/${period.year}`;
  }

  if (period.type === 'range' && period.start && period.end) {
    const startDate = new Date(period.start);
    const endDate = new Date(period.end);
    const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  return 'Período customizado';
}

/**
 * Gera ID único para thread
 */
export function generateThreadId(): string {
  return `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Cria título para thread baseado na primeira pergunta
 */
export function generateThreadTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim().replace(/\?+$/, '');
  if (cleaned.length <= 60) {
    return cleaned;
  }
  return cleaned.substring(0, 57) + '...';
}