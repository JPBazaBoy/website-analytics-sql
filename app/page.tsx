'use client';

import { useState, useEffect } from 'react';

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

    // Timeout de 30 segundos
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

      // Recarregar lista de uploads após sucesso
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
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', backgroundColor: '#1a1a1a', minHeight: '100vh', color: '#e0e0e0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ color: '#ffffff' }}>Sistema de Upload de Exames</h1>
          <p>Faça upload de arquivos Excel (.xlsx) com dados de exames.</p>
        </div>
        <a
          href="/chat"
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          💬 Ir para o Chat
        </a>
      </div>

      <div style={{ marginBottom: '20px', backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
        <h2 style={{ color: '#ffffff' }}>Upload de Arquivo</h2>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ marginBottom: '10px' }}
        />
        <br />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{
            padding: '10px 20px',
            backgroundColor: file && !uploading ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: file && !uploading ? 'pointer' : 'not-allowed'
          }}
        >
          {uploading ? 'Enviando...' : 'Enviar Arquivo'}
        </button>
      </div>

      {/* Seção de Uploads Existentes */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        border: '1px solid #3a3a3a'
      }}>
        <h2 style={{ color: '#ffffff', marginBottom: '20px' }}>Arquivos Enviados</h2>

        {loadingUploads ? (
          <p style={{ color: '#888' }}>Carregando...</p>
        ) : uploads.length === 0 ? (
          <p style={{ color: '#888' }}>Nenhum arquivo enviado ainda.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              color: '#e0e0e0'
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #3a3a3a' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Período</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Registros</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Valor Total</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>MatMed</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Receita Líquida</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map(upload => {
                  const isDeleting = deletingPeriod === `${upload.ano}-${upload.mes}`;
                  return (
                    <tr key={`${upload.ano}-${upload.mes}`} style={{ borderBottom: '1px solid #3a3a3a' }}>
                      <td style={{ padding: '12px' }}>
                        <strong>{String(upload.mes).padStart(2, '0')}/{upload.ano}</strong>
                        <br />
                        <small style={{ color: '#888' }}>
                          {new Date(upload.dataInicio).toLocaleDateString('pt-BR')} -
                          {new Date(upload.dataFim).toLocaleDateString('pt-BR')}
                        </small>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {upload.totalRegistros.toLocaleString('pt-BR')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        R$ {upload.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        R$ {upload.totalMatmed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#4ade80' }}>
                        R$ {upload.receitaLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDelete(upload.ano, upload.mes)}
                          disabled={isDeleting}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: isDeleting ? '#555' : '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            fontSize: '12px'
                          }}
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

      {result && (
        <div style={{ marginTop: '20px' }}>
          <h2>Resultado do Upload</h2>
          <div
            style={{
              padding: '15px',
              backgroundColor: result.status < 300 ? '#d4edda' : '#f8d7da',
              border: `1px solid ${result.status < 300 ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px',
              marginBottom: '10px'
            }}
          >
            <strong>Status:</strong> {result.status} {result.status < 300 ? '(Sucesso)' : '(Erro)'}
          </div>

          {result.data.inserted !== undefined && (
            <div style={{ marginBottom: '10px' }}>
              <strong>Registros inseridos:</strong> {result.data.inserted}
            </div>
          )}

          {result.data.file_info && (
            <div style={{ marginBottom: '10px' }}>
              <strong>Informações do arquivo:</strong>
              <ul>
                <li>Nome: {result.data.file_info.name}</li>
                <li>Tamanho: {Math.round(result.data.file_info.size / 1024)} KB</li>
                <li>Linhas processadas: {result.data.file_info.rows_processed}</li>
                <li>Linhas válidas: {result.data.file_info.valid_rows}</li>
                <li>Linhas inválidas: {result.data.file_info.invalid_rows}</li>
              </ul>
            </div>
          )}

          {result.data.processing_time && (
            <div style={{ marginBottom: '10px' }}>
              <strong>Tempo de processamento:</strong> {result.data.processing_time.total_ms}ms
              <ul>
                <li>Parse: {result.data.processing_time.parse_ms}ms</li>
                <li>Inserção: {result.data.processing_time.insert_ms}ms</li>
              </ul>
            </div>
          )}

          {result.data.warnings && result.data.warnings.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <strong>Avisos ({result.data.warnings.length}):</strong>
              <ul>
                {result.data.warnings.slice(0, 10).map((warning: string, i: number) => (
                  <li key={i} style={{ color: '#856404' }}>{warning}</li>
                ))}
                {result.data.warnings.length > 10 && (
                  <li style={{ color: '#856404' }}>... e mais {result.data.warnings.length - 10} avisos</li>
                )}
              </ul>
            </div>
          )}

          {result.data.errors && result.data.errors.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <strong>Erros ({result.data.errors.length}):</strong>
              <ul>
                {result.data.errors.slice(0, 10).map((error: string, i: number) => (
                  <li key={i} style={{ color: '#721c24' }}>{error}</li>
                ))}
                {result.data.errors.length > 10 && (
                  <li style={{ color: '#721c24' }}>... e mais {result.data.errors.length - 10} erros</li>
                )}
              </ul>
            </div>
          )}

          <details style={{ marginTop: '20px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Resposta completa (JSON)
            </summary>
            <pre style={{
              background: '#1a1a1a',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              color: '#00ff00',
              border: '1px solid #3a3a3a'
            }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#2a2a2a', borderRadius: '8px', border: '1px solid #3a3a3a' }}>
        <h2 style={{ color: '#ffffff' }}>Formato Esperado do Excel</h2>
        <p>O arquivo Excel deve conter as seguintes colunas:</p>
        <ul>
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
        
        <h3 style={{ color: '#ffffff' }}>Regras de Validação</h3>
        <ul>
          <li>Total = V. Convênio + V. Particular</li>
          <li>Todos os valores devem ser não-negativos</li>
          <li>Procedimento e Plano são obrigatórios</li>
          <li>Data deve ser válida</li>
        </ul>
      </div>
    </div>
  );
}
