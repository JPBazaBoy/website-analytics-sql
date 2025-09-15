import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, ChatMessage } from '@/lib/ai';
import { ChatState, defaultState } from '@/lib/chat-state';

export async function POST(request: NextRequest) {
  try {
    const { message, history = [], state } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!process.env.CLAUDE_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      );
    }

    // Converte o histórico para o formato esperado
    const conversationHistory: ChatMessage[] = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      sqlResult: msg.sqlResult,
      timestamp: new Date(msg.timestamp || Date.now())
    }));

    // Usar estado padrão se não foi fornecido
    const currentState: ChatState = state || defaultState();

    // Envia mensagem usando o orquestrador com estado
    const result = await sendMessage(message, conversationHistory, currentState);

    // Validar que houve SQL gerada
    if (result.sqlQueries.length === 0) {
      return NextResponse.json(
        {
          error: 'Não foi possível gerar SQL para sua pergunta. Por favor, seja mais específico.',
          response: '',
          sqlQueries: [],
          sqlResults: [],
          updatedState: currentState,
          retries: result.retries
        },
        { status: 400 }
      );
    }

    // Log para debug
    console.log(`[CHAT API] Pergunta: ${message}`);
    console.log(`[CHAT API] SQL geradas: ${result.sqlQueries.length}`);
    console.log(`[CHAT API] Retries: ${result.retries}`);
    console.log(`[CHAT API] Estado atualizado:`, result.updatedState);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Chat API error:', error);

    let errorMessage = 'Erro interno do servidor';

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = 'Erro de autenticação com Claude API';
      } else if (error.message.includes('quota')) {
        errorMessage = 'Quota da API excedida';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Muitas requisições, tente novamente em alguns segundos';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        response: '',
        sqlQueries: [],
        sqlResults: [],
        updatedState: defaultState(),
        retries: 0
      },
      { status: 500 }
    );
  }
}

// Health check para o endpoint de chat
export async function GET() {
  const hasApiKey = !!process.env.CLAUDE_API_KEY;
  
  return NextResponse.json({
    status: hasApiKey ? 'configured' : 'not_configured',
    timestamp: new Date().toISOString(),
    claude_api: hasApiKey ? 'ready' : 'missing_key'
  });
}