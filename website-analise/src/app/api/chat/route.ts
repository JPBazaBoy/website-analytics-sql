import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, ChatMessage, SqlResult } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

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
    const conversationHistory: ChatMessage[] = history.map((msg: {
      role: 'user' | 'assistant';
      content: string;
      sqlResult?: SqlResult;
      timestamp: string;
    }) => ({
      role: msg.role,
      content: msg.content,
      sqlResult: msg.sqlResult,
      timestamp: new Date(msg.timestamp)
    }));

    // Envia mensagem para Claude
    const response = await sendMessage(message, conversationHistory);

    return NextResponse.json(response);

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
      }
    }

    return NextResponse.json(
      { error: errorMessage },
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