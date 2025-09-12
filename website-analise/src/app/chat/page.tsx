'use client';

import React, { useState, useRef } from 'react';
import { Send, Menu, X } from 'lucide-react';
import { ChatMessage } from '@/lib/ai';
import MessageList from '@/components/MessageList';

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          history: messages
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const assistantMessage: ChatMessage = await response.json();
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua solicitação. Verifique se a API key do Claude está configurada corretamente no arquivo .env.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setSidebarOpen(false);
  };

  const quickQuestions = [
    "Faturamento total de janeiro de 2024",
    "Top 5 médicos por receita em 2024",
    "Comparar receita de 2023 vs 2024",
    "Procedimentos com maior lucro líquido",
    "Evolução mensal do faturamento em 2024",
    "Principal plano de saúde por participação"
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Chat Analítico
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={clearChat}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Nova Conversa
          </button>
        </div>

        <div className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Perguntas rápidas
          </h2>
          <div className="space-y-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => {
                  setInput(question);
                  setSidebarOpen(false);
                  inputRef.current?.focus();
                }}
                className="w-full text-left p-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Versão 1.0 • Powered by Claude
          </div>
        </div>
      </div>

      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Analista de Dados Médicos
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Análise SQL em tempo real dos dados médicos
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Conectado</span>
              </div>
            </div>
          </div>
        </header>

        {/* Lista de mensagens */}
        <MessageList messages={messages} isLoading={isLoading} />

        {/* Input de mensagem */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={sendMessage} className="flex space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua pergunta sobre os dados médicos..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                  rows={1}
                  disabled={isLoading}
                  style={{
                    minHeight: '50px',
                    maxHeight: '120px',
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
            
            <div className="flex justify-center mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pressione Enter para enviar, Shift+Enter para nova linha
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}