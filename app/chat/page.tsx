'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sqlQuery?: string;
  sqlResult?: any;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleDetails = (messageId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const copySql = (sql: string) => {
    navigator.clipboard.writeText(sql);
    // Poderia adicionar um toast de confirmação aqui
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
      // Chamar API do chat com Claude
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            sqlResult: msg.sqlResult,
            timestamp: msg.timestamp.toISOString()
          }))
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
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

  const formatContent = (content: string) => {
    // Converter markdown em HTML simples
    return content
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('## ')) {
          return <h2 key={i} style={{ marginTop: '16px', marginBottom: '8px', color: '#ffffff' }}>{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} style={{ marginTop: '12px', marginBottom: '6px', color: '#e0e0e0' }}>{line.slice(4)}</h3>;
        }

        // Tabelas simples
        if (line.includes('|') && line.trim().startsWith('|')) {
          const cells = line.split('|').filter(cell => cell.trim());
          return (
            <div key={i} style={{ display: 'flex', gap: '8px', padding: '4px 0', borderBottom: '1px solid #3a3a3a' }}>
              {cells.map((cell, j) => (
                <div key={j} style={{ flex: 1, padding: '4px' }}>{cell.trim()}</div>
              ))}
            </div>
          );
        }

        // Bullets
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <li key={i} style={{ marginLeft: '20px', marginBottom: '4px' }}>{line.slice(2)}</li>;
        }

        // Parágrafos normais
        if (line.trim()) {
          return <p key={i} style={{ marginBottom: '8px' }}>{line}</p>;
        }

        return null;
      });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#e0e0e0'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        backgroundColor: '#2a2a2a',
        borderBottom: '1px solid #3a3a3a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, color: '#ffffff' }}>💬 Chat Analítico SRD</h1>
        <a
          href="/"
          style={{
            padding: '8px 16px',
            backgroundColor: '#444',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          ← Voltar ao Upload
        </a>
      </div>

      {/* Messages Area */}
      <div
        id="messages"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#888',
            marginTop: '100px'
          }}>
            <h2>Bem-vindo ao Chat Analítico SRD!</h2>
            <p>Faça perguntas sobre seus dados médicos usando linguagem natural.</p>
            <p style={{ fontSize: '14px', marginTop: '20px' }}>
              <strong>Exemplos de perguntas:</strong>
            </p>
            <ul style={{ fontSize: '13px', textAlign: 'left', maxWidth: '600px', margin: '10px auto' }}>
              <li>"Top 5 médicos solicitantes no 1º semestre de 2025"</li>
              <li>"Top 5 planos por receita líquida em jan/2025"</li>
              <li>"Top 10 procedimentos por quantidade em 2025"</li>
              <li>"Qual o faturamento total de julho?"</li>
              <li>"Compare o primeiro e segundo semestre"</li>
            </ul>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
              🤖 Powered by Claude 3.5 Sonnet
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '70%',
              backgroundColor: message.role === 'user' ? '#007bff' : '#2a2a2a',
              padding: '12px 16px',
              borderRadius: '8px',
              border: message.role === 'assistant' ? '1px solid #3a3a3a' : 'none'
            }}
          >
            <div style={{
              fontSize: '12px',
              opacity: 0.7,
              marginBottom: '4px'
            }}>
              {message.role === 'user' ? 'Você' : 'Assistente'}
            </div>

            {/* Conteúdo principal */}
            <div>
              {message.role === 'user' ? (
                message.content
              ) : (
                <div>{formatContent(message.content)}</div>
              )}
            </div>

            {/* Toggle para detalhes SQL */}
            {message.sqlQuery && message.role === 'assistant' && (
              <div style={{ marginTop: '12px' }}>
                <button
                  onClick={() => toggleDetails(message.id)}
                  style={{
                    background: 'none',
                    border: '1px solid #3a3a3a',
                    color: '#888',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {showDetails[message.id] ? '▼' : '▶'} Ver detalhes técnicos
                </button>

                {showDetails[message.id] && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '4px',
                    border: '1px solid #3a3a3a'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: '#888',
                      marginBottom: '8px',
                      fontWeight: 'bold'
                    }}>
                      📊 SQL Executadas:
                    </div>

                    {message.sqlQuery.split('\n\n').map((sql, idx) => (
                      <div key={idx} style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#666' }}>Query {idx + 1}</span>
                          <button
                            onClick={() => copySql(sql)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#007bff',
                              cursor: 'pointer',
                              fontSize: '11px',
                              padding: '2px 6px'
                            }}
                          >
                            📋 Copiar
                          </button>
                        </div>
                        <pre style={{
                          margin: '4px 0',
                          padding: '8px',
                          backgroundColor: '#0a0a0a',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#00ff00',
                          overflowX: 'auto',
                          fontFamily: 'monospace'
                        }}>
                          {sql}
                        </pre>

                        {message.sqlResult && Array.isArray(message.sqlResult) && message.sqlResult[idx] && (
                          <div style={{
                            fontSize: '11px',
                            color: '#888',
                            marginLeft: '8px'
                          }}>
                            {message.sqlResult[idx].success ? (
                              <>
                                ✓ {message.sqlResult[idx].rowCount} linhas em {message.sqlResult[idx].elapsedMs}ms
                                {message.sqlResult[idx].sampleRows && message.sqlResult[idx].sampleRows.length > 0 && (
                                  <details style={{ marginTop: '4px' }}>
                                    <summary style={{ cursor: 'pointer', color: '#cyan' }}>
                                      Ver primeiras linhas
                                    </summary>
                                    <pre style={{
                                      margin: '4px 0',
                                      padding: '8px',
                                      backgroundColor: '#0a0a0a',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      color: '#cyan',
                                      overflowX: 'auto'
                                    }}>
                                      {JSON.stringify(message.sqlResult[idx].sampleRows.slice(0, 3), null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </>
                            ) : (
                              <span style={{ color: '#ff6b6b' }}>
                                ✗ Erro: {message.sqlResult[idx].error}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '20px',
          backgroundColor: '#2a2a2a',
          borderTop: '1px solid #3a3a3a',
          display: 'flex',
          gap: '12px'
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ex: Top 5 médicos do 1º semestre, faturamento de julho..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #3a3a3a',
            borderRadius: '4px',
            color: '#e0e0e0',
            fontSize: '14px',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#007bff';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#3a3a3a';
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 24px',
            backgroundColor: loading || !input.trim() ? '#555' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? 'Processando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}