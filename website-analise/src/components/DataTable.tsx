import React, { useState } from 'react';
import { Download, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { SqlResult, generateCSV } from '@/lib/ai';

interface DataTableProps {
  sqlResult: SqlResult;
  title?: string;
}

export default function DataTable({ sqlResult, title = "Resultado da consulta" }: DataTableProps) {
  const [showSample, setShowSample] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  if (!sqlResult.sampleRows || sqlResult.sampleRows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Nenhum dado encontrado
      </div>
    );
  }

  const headers = Object.keys(sqlResult.sampleRows[0]);
  const totalPages = Math.ceil(sqlResult.sampleRows.length / itemsPerPage);
  const currentData = sqlResult.sampleRows.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handleDownloadCSV = async () => {
    try {
      const csvData = await generateCSV(sqlResult);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `dados-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
    }
  };

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      // Formatar números com vírgula para valores monetários
      if (value % 1 !== 0) {
        return value.toLocaleString('pt-BR', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        });
      }
      return value.toLocaleString('pt-BR');
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      // Formatar datas
      return new Date(value).toLocaleDateString('pt-BR');
    }
    return String(value);
  };

  return (
    <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {title}
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSample(!showSample)}
              className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-3 h-3" />
              <span>{showSample ? 'Ocultar' : 'Ver amostra'}</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center space-x-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Baixar CSV</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
          <span>{sqlResult.rowCount?.toLocaleString()} registros encontrados</span>
          {sqlResult.rowCount > 50 && (
            <span>• Mostrando primeiros 50 registros</span>
          )}
        </div>
      </div>

      {/* Tabela */}
      {showSample && (
        <div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {headers.map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                    >
                      {header.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {currentData.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {headers.map((header) => (
                      <td
                        key={header}
                        className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                      >
                        {formatValue(row[header])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-xs text-gray-700 dark:text-gray-300">
                Mostrando {currentPage * itemsPerPage + 1} a{' '}
                {Math.min((currentPage + 1) * itemsPerPage, sqlResult.sampleRows.length)} de{' '}
                {sqlResult.sampleRows.length} registros
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {currentPage + 1} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}