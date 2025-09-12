-- Materialized Views para análises e relatórios

-- Resumo mensal detalhado
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_resumo_mensal AS
SELECT
  date_trunc('month', data_exame)::date AS ref_month,
  EXTRACT(YEAR FROM data_exame)::int AS ano,
  EXTRACT(MONTH FROM data_exame)::int AS mes,
  COUNT(*) AS total_exames,
  COUNT(DISTINCT paciente) AS pacientes_unicos,
  COUNT(DISTINCT procedimento) AS procedimentos_distintos,
  SUM(total) AS receita_bruta,
  SUM(matmed) AS custo_matmed,
  SUM(receita_liquida) AS receita_liquida,
  AVG(total) AS ticket_medio,
  SUM(valor_convenio) AS total_convenio,
  SUM(valor_particular) AS total_particular,
  MIN(data_exame) AS primeira_data,
  MAX(data_exame) AS ultima_data
FROM exames
GROUP BY date_trunc('month', data_exame), EXTRACT(YEAR FROM data_exame), EXTRACT(MONTH FROM data_exame);

-- Resumo anual
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_resumo_anual AS
SELECT
  ano,
  COUNT(*) AS total_exames,
  COUNT(DISTINCT paciente) AS pacientes_unicos,
  COUNT(DISTINCT procedimento) AS procedimentos_distintos,
  SUM(total) AS receita_bruta,
  SUM(matmed) AS custo_matmed,
  SUM(receita_liquida) AS receita_liquida,
  AVG(total) AS ticket_medio,
  SUM(valor_convenio) AS total_convenio,
  SUM(valor_particular) AS total_particular,
  ROUND((SUM(matmed) / NULLIF(SUM(total), 0)) * 100, 2) AS percentual_matmed
FROM exames
GROUP BY ano
ORDER BY ano;

-- Resumo por procedimento
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_procedimentos AS
SELECT
  procedimento,
  COUNT(*) AS total_exames,
  SUM(total) AS receita_total,
  SUM(matmed) AS custo_matmed_total,
  SUM(receita_liquida) AS receita_liquida_total,
  AVG(total) AS valor_medio,
  AVG(matmed) AS matmed_medio,
  MIN(total) AS valor_minimo,
  MAX(total) AS valor_maximo,
  ROUND((SUM(matmed) / NULLIF(SUM(total), 0)) * 100, 2) AS percentual_matmed
FROM exames
GROUP BY procedimento
ORDER BY receita_total DESC;

-- Resumo por plano de saúde
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_planos AS
SELECT
  plano,
  COUNT(*) AS total_exames,
  SUM(total) AS receita_total,
  SUM(matmed) AS custo_matmed_total,
  SUM(receita_liquida) AS receita_liquida_total,
  AVG(total) AS valor_medio,
  SUM(valor_convenio) AS total_convenio,
  SUM(valor_particular) AS total_particular,
  ROUND((COUNT(*) * 100.0) / NULLIF((SELECT COUNT(*) FROM exames), 0), 2) AS percentual_participacao
FROM exames
GROUP BY plano
ORDER BY total_exames DESC;

-- Resumo por médico solicitante
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_medicos AS
SELECT
  medico_solicitante,
  COUNT(*) AS total_exames,
  SUM(total) AS receita_total,
  SUM(receita_liquida) AS receita_liquida_total,
  AVG(total) AS valor_medio,
  COUNT(DISTINCT procedimento) AS procedimentos_distintos,
  COUNT(DISTINCT paciente) AS pacientes_atendidos
FROM exames
WHERE medico_solicitante IS NOT NULL AND TRIM(medico_solicitante) != ''
GROUP BY medico_solicitante
ORDER BY total_exames DESC;

-- Análise temporal (últimos 12 meses)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tendencia_mensal AS
SELECT
  date_trunc('month', data_exame)::date AS ref_month,
  COUNT(*) AS total_exames,
  SUM(total) AS receita_bruta,
  SUM(receita_liquida) AS receita_liquida,
  LAG(SUM(total)) OVER (ORDER BY date_trunc('month', data_exame)) AS receita_mes_anterior,
  LAG(COUNT(*)) OVER (ORDER BY date_trunc('month', data_exame)) AS exames_mes_anterior,
  ROUND(
    ((SUM(total) - LAG(SUM(total)) OVER (ORDER BY date_trunc('month', data_exame))) / 
     NULLIF(LAG(SUM(total)) OVER (ORDER BY date_trunc('month', data_exame)), 0)) * 100, 2
  ) AS crescimento_receita_pct,
  ROUND(
    ((COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY date_trunc('month', data_exame))) / 
     NULLIF(LAG(COUNT(*)) OVER (ORDER BY date_trunc('month', data_exame)), 0)) * 100, 2
  ) AS crescimento_volume_pct
FROM exames
WHERE data_exame >= date_trunc('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY date_trunc('month', data_exame)
ORDER BY ref_month;

-- Índices nas Materialized Views
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_resumo_mensal_ref_month ON mv_resumo_mensal (ref_month);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_resumo_anual_ano ON mv_resumo_anual (ano);
CREATE INDEX IF NOT EXISTS idx_mv_procedimentos_receita ON mv_procedimentos (receita_total DESC);
CREATE INDEX IF NOT EXISTS idx_mv_planos_exames ON mv_planos (total_exames DESC);
CREATE INDEX IF NOT EXISTS idx_mv_medicos_exames ON mv_medicos (total_exames DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_tendencia_ref_month ON mv_tendencia_mensal (ref_month);

-- Comentários para documentação
COMMENT ON MATERIALIZED VIEW mv_resumo_mensal IS 'Resumo mensal de exames com métricas principais';
COMMENT ON MATERIALIZED VIEW mv_resumo_anual IS 'Resumo anual consolidado';
COMMENT ON MATERIALIZED VIEW mv_procedimentos IS 'Análise de performance por tipo de procedimento';
COMMENT ON MATERIALIZED VIEW mv_planos IS 'Análise de performance por plano de saúde';
COMMENT ON MATERIALIZED VIEW mv_medicos IS 'Análise de performance por médico solicitante';
COMMENT ON MATERIALIZED VIEW mv_tendencia_mensal IS 'Análise de tendências mensais com crescimento';