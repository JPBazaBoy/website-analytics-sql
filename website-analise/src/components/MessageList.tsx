import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/lib/ai';
import MessageItem from './MessageItem';
import LoadingIndicator from './LoadingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export default function MessageList({ messages, isLoading = false }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Analista de Dados Médicos
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Faça perguntas sobre os dados médicos e receba análises detalhadas com SQL e resultados.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  📊 Exemplos de perguntas:
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Faturamento de janeiro de 2024</li>
                  <li>• Top 5 médicos por receita</li>
                  <li>• Comparar 2023 vs 2024</li>
                  <li>• Procedimentos mais lucrativos</li>
                </ul>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  🔍 O que você receberá:
                </h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• SQL utilizada na consulta</li>
                  <li>• Métricas de performance</li>
                  <li>• Dados em tabela interativa</li>
                  <li>• Download em CSV</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageItem key={index} message={message} />
            ))}
            
            {isLoading && (
              <div className="flex justify-start mb-6">
                <div className="flex">
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <LoadingIndicator />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}