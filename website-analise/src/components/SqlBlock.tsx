import React, { useState } from 'react';
import { Copy, Check, Code, Clock, Database } from 'lucide-react';
import { SqlResult } from '@/lib/ai';

interface SqlBlockProps {
  sqlResult: SqlResult;
}

export default function SqlBlock({ sqlResult }: SqlBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sqlResult.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar SQL:', error);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Como calculei
          </h3>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-600" />
              <span className="text-green-600">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-gray-500" />
              <span className="text-gray-500">Copiar SQL</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-3">
        {/* SQL Query */}
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">SQL utilizada:</div>
          <pre className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded p-3 text-xs overflow-x-auto">
            <code className="text-gray-800 dark:text-gray-200 font-mono">
              {sqlResult.sql}
            </code>
          </pre>
        </div>

        {/* Métricas */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Tempo: {sqlResult.elapsedMs}ms</span>
          </div>
          <div className="flex items-center space-x-1">
            <Database className="w-3 h-3" />
            <span>Linhas: {sqlResult.rowCount?.toLocaleString()}</span>
          </div>
        </div>

        {/* Filtros aplicados */}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <div className="mb-1">Filtros aplicados:</div>
          <ul className="list-disc list-inside space-y-1 text-gray-500 dark:text-gray-500">
            {sqlResult.sql.toLowerCase().includes('where') && (
              <li>Filtros de condição aplicados na cláusula WHERE</li>
            )}
            {sqlResult.sql.toLowerCase().includes('group by') && (
              <li>Agrupamento de dados por critérios específicos</li>
            )}
            {sqlResult.sql.toLowerCase().includes('order by') && (
              <li>Ordenação dos resultados</li>
            )}
            {sqlResult.sql.toLowerCase().includes('limit') && (
              <li>Limitação de resultados para performance</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}