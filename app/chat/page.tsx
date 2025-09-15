'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChatState,
  ChatHistoryItem,
  Thread,
  defaultState,
  mergeState,
  formatPeriodDisplay,
  generateThreadId,
  generateThreadTitle
} from '@/lib/chat-state';
import { useDarkMode } from '@/lib/use-dark-mode';
import { DarkModeToggle } from '@/components/dark-mode-toggle';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sqlQuery?: string;
  sqlResult?: any;
  timestamp: Date;
}

// Constantes para localStorage
const THREADS_KEY = 'srd:threads';
const THREAD_PREFIX = 'srd:thread:';
const MAX_THREADS = 5;

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { darkMode, toggleDarkMode } = useDarkMode();

  // Estado da conversa
  const [currentThreadId, setCurrentThreadId] = useState<string>('');
  const [state, setState] = useState<ChatState>(defaultState());
  const [threads, setThreads] = useState<Thread[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carregar threads ao montar
  useEffect(() => {
    loadThreads();
    // Criar nova thread se não houver nenhuma
    if (!currentThreadId) {
      createNewThread();
    }
  }, []);

  // Salvar thread atual quando mudar
  useEffect(() => {
    if (currentThreadId && messages.length > 0) {
      saveCurrentThread();
    }
  }, [messages, state, currentThreadId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Funções de persistência
  const loadThreads = () => {
    try {
      const stored = localStorage.getItem(THREADS_KEY);
      if (stored) {
        const loadedThreads = JSON.parse(stored) as Thread[];
        setThreads(loadedThreads.slice(0, MAX_THREADS));
      }
    } catch (e) {
      console.error('Erro ao carregar threads:', e);
    }
  };

  const saveThreads = (updatedThreads: Thread[]) => {
    try {
      localStorage.setItem(THREADS_KEY, JSON.stringify(updatedThreads.slice(0, MAX_THREADS)));
    } catch (e) {
      console.error('Erro ao salvar threads:', e);
    }
  };

  const saveCurrentThread = () => {
    if (!currentThreadId) return;

    const thread: Thread = {
      id: currentThreadId,
      title: messages.length > 0 && messages[0].role === 'user'
        ? generateThreadTitle(messages[0].content)
        : `Análise ${new Date().toLocaleDateString('pt-BR')}`,
      state,
      history: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString()
      })),
      createdAt: threads.find(t => t.id === currentThreadId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Salvar no localStorage
    try {
      localStorage.setItem(THREAD_PREFIX + currentThreadId, JSON.stringify(thread));

      // Atualizar lista de threads
      const updatedThreads = [
        thread,
        ...threads.filter(t => t.id !== currentThreadId)
      ].slice(0, MAX_THREADS);

      setThreads(updatedThreads);
      saveThreads(updatedThreads);
    } catch (e) {
      console.error('Erro ao salvar thread:', e);
    }
  };

  const loadThread = (threadId: string) => {
    try {
      const stored = localStorage.getItem(THREAD_PREFIX + threadId);
      if (stored) {
        const thread = JSON.parse(stored) as Thread;
        setCurrentThreadId(thread.id);
        setState(thread.state);
        setMessages(thread.history.map((h, i) => ({
          id: `${thread.id}-${i}`,
          role: h.role,
          content: h.content,
          timestamp: new Date(h.timestamp)
        })));
      }
    } catch (e) {
      console.error('Erro ao carregar thread:', e);
    }
  };

  const createNewThread = () => {
    const newThreadId = generateThreadId();
    setCurrentThreadId(newThreadId);
    setState(defaultState());
    setMessages([]);
    setShowDetails({});
  };

  // Funções de UI
  const toggleDetails = (messageId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const copySql = (sql: string) => {
    navigator.clipboard.writeText(sql);
  };

  const removeFilter = (type: 'planos' | 'medicos' | 'procedimentos', value: string) => {
    setState(prev => ({
      ...prev,
      [type]: prev[type]?.filter(v => v !== value)
    }));
  };

  const clearState = () => {
    setState(defaultState());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Preparar histórico compacto
      const history: ChatHistoryItem[] = messages.slice(-4).map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString()
      }));

      // Chamar API com estado
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          history,
          state
        })
      });

      const data = await response.json();

      if (data.error && response.status >= 400) {
        throw new Error(data.error);
      }

      // Atualizar estado se houver mudanças
      if (data.updatedState) {
        setState(data.updatedState);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'Desculpe, não consegui processar sua pergunta.',
        sqlQuery: data.sqlQueries?.join('\n\n'),
        sqlResult: data.sqlResults?.length > 0 ? data.sqlResults : undefined,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Erro ao processar consulta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Renderizar chip
  const renderChip = (label: string, value: string | number, onRemove?: () => void) => (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm mr-2 mb-2 ${
      darkMode
        ? 'bg-blue-900 text-blue-200'
        : 'bg-blue-100 text-blue-800'
    }`}>
      <span>{label}: {value}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className={`ml-2 ${
            darkMode ? 'text-blue-300 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
          }`}
          aria-label={`Remover ${label}`}
        >
          ×
        </button>
      )}
    </div>
  );

  return (
    <div className={`flex h-screen transition-colors duration-200 ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden ${
        darkMode
          ? 'bg-gray-800 border-r border-gray-700'
          : 'bg-white border-r border-gray-200'
      }`}>
        <div className="p-4">
          <button
            onClick={createNewThread}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-4"
          >
            Nova Conversa
          </button>

          <h3 className={`text-sm font-semibold mb-2 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>Conversas Recentes</h3>
          <div className="space-y-2">
            {threads.map(thread => (
              <button
                key={thread.id}
                onClick={() => loadThread(thread.id)}
                className={`w-full text-left p-2 rounded-lg transition-colors ${
                  thread.id === currentThreadId
                    ? darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    : ''
                } ${
                  darkMode ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-100'
                }`}
              >
                <div className="text-sm font-medium truncate">{thread.title}</div>
                <div className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {new Date(thread.updatedAt).toLocaleDateString('pt-BR')}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header com chips de estado */}
        <div className={`p-4 transition-colors duration-200 ${
          darkMode
            ? 'bg-gray-800 border-b border-gray-700'
            : 'bg-white border-b border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
            <h1 className={`text-xl font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>Chat Analítico SQL</h1>
            <div className="flex gap-2 items-center">
              <DarkModeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              <button
                onClick={clearState}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Limpar Contexto
              </button>
            </div>
          </div>

          {/* Chips de estado */}
          <div className="flex flex-wrap items-center">
            {/* Período */}
            {state.period.type !== 'none' && (
              renderChip('Período', formatPeriodDisplay(state.period))
            )}

            {/* Métrica */}
            {state.metric && state.metric !== 'total' && (
              renderChip('Métrica', state.metric === 'receita_liquida' ? 'Receita Líquida' : state.metric)
            )}

            {/* Agrupamento */}
            {state.groupBy && (
              renderChip('Agrupado por', state.groupBy)
            )}

            {/* Top N */}
            {state.topN && (
              renderChip('Top', state.topN.toString())
            )}

            {/* Filtros */}
            {state.planos?.map(plano => (
              renderChip('Plano', plano, () => removeFilter('planos', plano))
            ))}
            {state.medicos?.map(medico => (
              renderChip('Médico', medico, () => removeFilter('medicos', medico))
            ))}
            {state.procedimentos?.map(proc => (
              renderChip('Procedimento', proc, () => removeFilter('procedimentos', proc))
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
          darkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : darkMode
                      ? 'bg-gray-800 border border-gray-700 text-gray-100'
                      : 'bg-white border border-gray-200'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>

                {/* SQL Details (collapsed by default) */}
                {message.sqlQuery && (
                  <div className={`mt-3 pt-3 border-t ${
                    message.role === 'user'
                      ? 'border-blue-500'
                      : darkMode ? 'border-gray-600' : 'border-gray-200'
                  }`}>
                    <button
                      onClick={() => toggleDetails(message.id)}
                      className={`text-sm mb-2 ${
                        message.role === 'user'
                          ? 'text-blue-100 hover:text-white'
                          : darkMode
                            ? 'text-gray-400 hover:text-gray-200'
                            : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {showDetails[message.id] ? '▼' : '▶'} Detalhes SQL
                    </button>

                    {showDetails[message.id] && (
                      <div className="mt-2">
                        <div className={`rounded p-3 relative ${
                          darkMode ? 'bg-gray-900' : 'bg-gray-100'
                        }`}>
                          <button
                            onClick={() => copySql(message.sqlQuery!)}
                            className={`absolute top-2 right-2 text-xs px-2 py-1 rounded transition-colors ${
                              darkMode
                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                : 'bg-white hover:bg-gray-200'
                            }`}
                          >
                            📋 Copiar
                          </button>
                          <pre className={`text-xs overflow-x-auto ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            <code>{message.sqlQuery}</code>
                          </pre>
                        </div>

                        {message.sqlResult && (
                          <div className={`mt-2 text-xs ${
                            message.role === 'user'
                              ? 'text-blue-100'
                              : darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <div>✓ {message.sqlResult.length} consulta(s) executada(s)</div>
                            {message.sqlResult.map((result: any, i: number) => (
                              <div key={i} className="mt-1">
                                • Query {i + 1}: {result.rowCount || 0} linhas em {result.elapsedMs || 0}ms
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className={`rounded-lg p-4 ${
                darkMode
                  ? 'bg-gray-800 border border-gray-700 text-gray-100'
                  : 'bg-white border border-gray-200'
              }`}>
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">⚡</div>
                  <span>Analisando dados...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className={`p-4 border-t transition-colors duration-200 ${
          darkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-200'
        }`}>
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta sobre os dados..."
              className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processando...' : 'Enviar'}
            </button>
          </div>
          <div className={`mt-2 text-xs ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Exemplos: "Qual o faturamento de janeiro?", "Top 5 médicos", "Compare com o ano passado"
          </div>
        </form>
      </div>
    </div>
  );
}