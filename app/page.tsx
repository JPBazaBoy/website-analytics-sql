'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '@/lib/use-dark-mode';
import { DarkModeToggle } from '@/components/dark-mode-toggle';

interface Upload {
  ano: number;
  mes: number;
  periodo: string;
  totalRegistros: number;
  dataInicio: string;
  dataFim: string;
  dataUpload: string;
  valorTotal: number;
  totalMatmed: number;
  receitaLiquida: number;
}

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [deletingPeriod, setDeletingPeriod] = useState<string | null>(null);
  const { darkMode, toggleDarkMode } = useDarkMode();

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    setLoadingUploads(true);
    try {
      const response = await fetch('/api/uploads');
      const data = await response.json();
      if (data.success) {
        setUploads(data.uploads);
      }
    } catch (error) {
      console.error('Erro ao carregar uploads:', error);
    } finally {
      setLoadingUploads(false);
    }
  };

  const handleDelete = async (ano: number, mes: number) => {
    if (!confirm(`Deseja realmente deletar os dados de ${mes}/${ano}?`)) {
      return;
    }

    setDeletingPeriod(`${ano}-${mes}`);
    try {
      const response = await fetch(`/api/uploads?ano=${ano}&mes=${mes}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        alert(`${data.deletedCount} registros deletados com sucesso`);
        await loadUploads();
      } else {
        alert(`Erro ao deletar: ${data.error}`);
      }
    } catch (error) {
      alert('Erro ao deletar registros');
    } finally {
      setDeletingPeriod(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log(`Iniciando upload de ${file.name} (${(file.size / 1024).toFixed(2)} KB)...`);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      setResult({ status: response.status, data });

      if (response.status < 300) {
        await loadUploads();
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setResult({
            status: 408,
            data: {
              error: 'Upload cancelado: tempo limite de 30 segundos excedido',
              message: 'O arquivo é muito grande ou a conexão está lenta. Tente novamente.'
            }
          });
        } else {
          setResult({
            status: 500,
            data: { error: `Erro de rede: ${error.message}` }
          });
        }
      } else {
        setResult({
          status: 500,
          data: { error: 'Erro desconhecido durante o upload' }
        });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-3xl font-bold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Sistema de Upload de Exames
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Faça upload de arquivos Excel (.xlsx) com dados de exames.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <DarkModeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
            <a
              href="/chat"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2"
            >
              💬 Ir para o Chat
            </a>
          </div>
        </div>

        {/* Upload Section */}
        <div className={`rounded-lg p-6 mb-8 ${
          darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Upload de Arquivo
          </h2>
          <div className="space-y-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className={`block w-full text-sm ${
                darkMode ? 'text-gray-300' : 'text-gray-900'
              } file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold ${
                darkMode
                  ? 'file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600'
                  : 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
              } file:cursor-pointer file:transition-colors`}
            />
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                file && !uploading
                  ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {uploading ? 'Enviando...' : 'Enviar Arquivo'}
            </button>
          </div>
        </div>

        {/* Uploads List */}
        <div className={`rounded-lg p-6 ${
          darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Arquivos Enviados
          </h2>

          {loadingUploads ? (
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              Carregando...
            </p>
          ) : uploads.length === 0 ? (
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
              Nenhum arquivo enviado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${
                    darkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <th className="text-left py-3 px-4">Período</th>
                    <th className="text-right py-3 px-4">Registros</th>
                    <th className="text-right py-3 px-4">Valor Total</th>
                    <th className="text-right py-3 px-4">MatMed</th>
                    <th className="text-right py-3 px-4">Receita Líquida</th>
                    <th className="text-center py-3 px-4">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map(upload => {
                    const isDeleting = deletingPeriod === `${upload.ano}-${upload.mes}`;
                    return (
                      <tr key={`${upload.ano}-${upload.mes}`} className={`border-b ${
                        darkMode ? 'border-gray-700' : 'border-gray-200'
                      }`}>
                        <td className="py-3 px-4">
                          <div className="font-semibold">
                            {String(upload.mes).padStart(2, '0')}/{upload.ano}
                          </div>
                          <div className={`text-xs ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {new Date(upload.dataInicio).toLocaleDateString('pt-BR')} -
                            {' '}{new Date(upload.dataFim).toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {upload.totalRegistros.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          R$ {upload.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          R$ {upload.totalMatmed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right text-green-500">
                          R$ {upload.receitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDelete(upload.ano, upload.mes)}
                            disabled={isDeleting}
                            className={`px-3 py-1 rounded text-white text-sm font-medium transition-colors ${
                              isDeleting
                                ? 'bg-gray-500 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 cursor-pointer'
                            }`}
                          >
                            {isDeleting ? 'Deletando...' : '🗑️ Deletar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Result Section */}
        {result && (
          <div className={`mt-8 rounded-lg p-6 ${
            darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Resultado do Upload
            </h2>

            <div className={`p-4 rounded-lg mb-4 ${
              result.status < 300
                ? darkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'
                : darkMode ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800'
            }`}>
              <strong>Status:</strong> {result.status} {result.status < 300 ? '(Sucesso)' : '(Erro)'}
            </div>

            {result.data.inserted !== undefined && (
              <div className="mb-4">
                <strong>Registros inseridos:</strong> {result.data.inserted}
              </div>
            )}

            {result.data.file_info && (
              <div className="mb-4">
                <strong>Informações do arquivo:</strong>
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• Nome: {result.data.file_info.name}</li>
                  <li>• Tamanho: {Math.round(result.data.file_info.size / 1024)} KB</li>
                  <li>• Linhas processadas: {result.data.file_info.rows_processed}</li>
                  <li>• Linhas válidas: {result.data.file_info.valid_rows}</li>
                  <li>• Linhas inválidas: {result.data.file_info.invalid_rows}</li>
                </ul>
              </div>
            )}

            {result.data.processing_time && (
              <div className="mb-4">
                <strong>Tempo de processamento:</strong> {result.data.processing_time.total_ms}ms
                <ul className="ml-4 mt-2 space-y-1">
                  <li>• Parse: {result.data.processing_time.parse_ms}ms</li>
                  <li>• Inserção: {result.data.processing_time.insert_ms}ms</li>
                </ul>
              </div>
            )}

            {result.data.warnings && result.data.warnings.length > 0 && (
              <div className="mb-4">
                <strong className="text-yellow-600">Avisos ({result.data.warnings.length}):</strong>
                <ul className="ml-4 mt-2 space-y-1">
                  {result.data.warnings.slice(0, 10).map((warning: string, i: number) => (
                    <li key={i} className="text-yellow-600">• {warning}</li>
                  ))}
                  {result.data.warnings.length > 10 && (
                    <li className="text-yellow-600">... e mais {result.data.warnings.length - 10} avisos</li>
                  )}
                </ul>
              </div>
            )}

            {result.data.errors && result.data.errors.length > 0 && (
              <div className="mb-4">
                <strong className="text-red-600">Erros ({result.data.errors.length}):</strong>
                <ul className="ml-4 mt-2 space-y-1">
                  {result.data.errors.slice(0, 10).map((error: string, i: number) => (
                    <li key={i} className="text-red-600">• {error}</li>
                  ))}
                  {result.data.errors.length > 10 && (
                    <li className="text-red-600">... e mais {result.data.errors.length - 10} erros</li>
                  )}
                </ul>
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer font-semibold hover:text-blue-600">
                Resposta completa (JSON)
              </summary>
              <pre className={`mt-2 p-4 rounded-lg overflow-auto text-xs ${
                darkMode ? 'bg-gray-900 text-green-400' : 'bg-gray-100 text-gray-800'
              }`}>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Instructions */}
        <div className={`mt-8 rounded-lg p-6 ${
          darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Formato Esperado do Excel
          </h2>
          <p className="mb-4">O arquivo Excel deve conter as seguintes colunas:</p>
          <ul className="space-y-2 ml-4">
            <li><strong>Data</strong> - Data do exame (formato: DD/MM/AAAA ou AAAA-MM-DD)</li>
            <li><strong>Paciente</strong> - Nome do paciente</li>
            <li><strong>Procedimento</strong> - Nome do procedimento (obrigatório)</li>
            <li><strong>Plano</strong> - Plano de saúde (obrigatório)</li>
            <li><strong>Médico Solicitante</strong> - Nome do médico</li>
            <li><strong>MatMed</strong> - Valor do material médico</li>
            <li><strong>V. Convênio</strong> - Valor do convênio</li>
            <li><strong>V. Particular</strong> - Valor particular</li>
            <li><strong>Total</strong> - Valor total (deve ser igual a Convênio + Particular)</li>
          </ul>

          <h3 className={`text-lg font-semibold mt-6 mb-3 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Regras de Validação
          </h3>
          <ul className="space-y-1 ml-4">
            <li>• Total = V. Convênio + V. Particular</li>
            <li>• Todos os valores devem ser não-negativos</li>
            <li>• Procedimento e Plano são obrigatórios</li>
            <li>• Data deve ser válida</li>
          </ul>
        </div>
      </div>
    </div>
  );
}