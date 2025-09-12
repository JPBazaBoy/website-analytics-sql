-- Schema completo para o sistema de exames médicos
-- Tabela canônica principal

CREATE TABLE IF NOT EXISTS exames (
  id BIGSERIAL PRIMARY KEY,
  data_exame DATE NOT NULL,
  ano INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM data_exame)::int) STORED,
  mes INT GENERATED ALWAYS AS (EXTRACT(MONTH FROM data_exame)::int) STORED,
  paciente TEXT,
  procedimento TEXT NOT NULL,
  plano TEXT NOT NULL,
  medico_solicitante TEXT,
  matmed NUMERIC(12,2) DEFAULT 0,
  valor_convenio NUMERIC(12,2) DEFAULT 0,
  valor_particular NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  receita_liquida NUMERIC(12,2) GENERATED ALWAYS AS (total - matmed) STORED,
  fonte TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Constraints para integridade dos dados
  CONSTRAINT chk_total_sum CHECK (total = COALESCE(valor_convenio,0) + COALESCE(valor_particular,0)),
  CONSTRAINT chk_nonneg CHECK (total >= 0 AND matmed >= 0 AND valor_convenio >= 0 AND valor_particular >= 0),
  CONSTRAINT chk_data_valida CHECK (data_exame <= CURRENT_DATE),
  CONSTRAINT chk_procedimento_not_empty CHECK (LENGTH(TRIM(procedimento)) > 0),
  CONSTRAINT chk_plano_not_empty CHECK (LENGTH(TRIM(plano)) > 0)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_exames_ano_mes ON exames (ano, mes);
CREATE INDEX IF NOT EXISTS idx_exames_data ON exames (data_exame);
CREATE INDEX IF NOT EXISTS idx_exames_proc ON exames (procedimento);
CREATE INDEX IF NOT EXISTS idx_exames_plano ON exames (plano);
CREATE INDEX IF NOT EXISTS idx_exames_medico ON exames (medico_solicitante);
CREATE INDEX IF NOT EXISTS idx_exames_fonte ON exames (fonte);
CREATE INDEX IF NOT EXISTS idx_exames_created_at ON exames (created_at);

-- Índice composto para análises temporais
CREATE INDEX IF NOT EXISTS idx_exames_data_proc_plano ON exames (data_exame, procedimento, plano);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_exames_updated_at 
    BEFORE UPDATE ON exames 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE exames IS 'Tabela principal para armazenamento de dados de exames médicos';
COMMENT ON COLUMN exames.id IS 'Identificador único do exame';
COMMENT ON COLUMN exames.data_exame IS 'Data de realização do exame';
COMMENT ON COLUMN exames.ano IS 'Ano extraído automaticamente da data do exame';
COMMENT ON COLUMN exames.mes IS 'Mês extraído automaticamente da data do exame';
COMMENT ON COLUMN exames.paciente IS 'Nome do paciente';
COMMENT ON COLUMN exames.procedimento IS 'Tipo de procedimento/exame realizado';
COMMENT ON COLUMN exames.plano IS 'Plano de saúde ou forma de pagamento';
COMMENT ON COLUMN exames.medico_solicitante IS 'Médico que solicitou o exame';
COMMENT ON COLUMN exames.matmed IS 'Custo de material médico';
COMMENT ON COLUMN exames.valor_convenio IS 'Valor pago pelo convênio';
COMMENT ON COLUMN exames.valor_particular IS 'Valor pago pelo paciente';
COMMENT ON COLUMN exames.total IS 'Valor total do exame';
COMMENT ON COLUMN exames.receita_liquida IS 'Receita líquida (total - matmed)';
COMMENT ON COLUMN exames.fonte IS 'Fonte dos dados (para auditoria)';