'use client';

import { useState } from 'react';

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

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

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult({ status: response.status, data });
    } catch (error) {
      setResult({
        status: 500,
        data: { error: `Erro de rede: ${error instanceof Error ? error.message : 'Erro desconhecido'}` }
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Sistema de Upload de Exames</h1>
      <p>Faça upload de arquivos Excel (.xlsx) com dados de exames.</p>

      <div style={{ marginBottom: '20px' }}>
        <h2>Upload de Arquivo</h2>
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
              background: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h2>Formato Esperado do Excel</h2>
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
        
        <h3>Regras de Validação</h3>
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
