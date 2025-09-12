import React from 'react';
import { User, Bot } from 'lucide-react';
import { ChatMessage } from '@/lib/ai';
import SqlBlock from './SqlBlock';
import DataTable from './DataTable';

interface MessageItemProps {
  message: ChatMessage;
}

export default function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
          </div>
        </div>

        {/* Conteúdo */}
        <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {/* Bolha da mensagem */}
          <div className={`inline-block max-w-full px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'
          }`}>
            {/* Conteúdo da mensagem */}
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>

          {/* Timestamp */}
          <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${
            isUser ? 'text-right' : 'text-left'
          }`}>
            {message.timestamp.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>

          {/* Bloco SQL e dados (apenas para assistant) */}
          {!isUser && message.sqlResult && (
            <div className="mt-4">
              <SqlBlock sqlResult={message.sqlResult} />
              <DataTable sqlResult={message.sqlResult} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}