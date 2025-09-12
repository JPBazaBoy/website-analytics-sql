-- Dados de teste para a tabela exames
-- 3 meses de dados fictícios com variedade realista

-- Limpar dados existentes se necessário
-- TRUNCATE exames RESTART IDENTITY;

-- Inserir dados de teste para Janeiro 2024
INSERT INTO exames (data_exame, paciente, procedimento, plano, medico_solicitante, matmed, valor_convenio, valor_particular, total, fonte) VALUES

-- Janeiro 2024
('2024-01-02', 'Maria Silva Santos', 'Ultrassom Abdominal', 'Unimed', 'Dr. João Carlos', 25.50, 180.00, 0.00, 180.00, 'seed_data'),
('2024-01-03', 'José Oliveira', 'Raio-X Tórax', 'SUS', 'Dra. Ana Maria', 15.00, 0.00, 85.00, 85.00, 'seed_data'),
('2024-01-04', 'Ana Paula Costa', 'Mamografia', 'Bradesco Saúde', 'Dr. Ricardo Lima', 35.80, 220.00, 0.00, 220.00, 'seed_data'),
('2024-01-05', 'Carlos Eduardo', 'Tomografia Craniana', 'Particular', 'Dr. Fernando Santos', 45.00, 0.00, 450.00, 450.00, 'seed_data'),
('2024-01-08', 'Luciana Pereira', 'Ultrassom Pélvico', 'Amil', 'Dra. Patricia Silva', 28.90, 195.00, 0.00, 195.00, 'seed_data'),
('2024-01-09', 'Roberto Alves', 'Raio-X Joelho', 'Unimed', 'Dr. Marcos Antonio', 12.30, 95.00, 0.00, 95.00, 'seed_data'),
('2024-01-10', 'Fernanda Lima', 'Ressonância Magnética', 'Golden Cross', 'Dr. Luis Eduardo', 65.20, 850.00, 0.00, 850.00, 'seed_data'),
('2024-01-11', 'Paulo Henrique', 'Ultrassom Abdominal', 'SUS', 'Dra. Carla Mendes', 25.50, 0.00, 180.00, 180.00, 'seed_data'),
('2024-01-12', 'Juliana Rodrigues', 'Mamografia', 'Particular', 'Dr. Ricardo Lima', 35.80, 0.00, 280.00, 280.00, 'seed_data'),
('2024-01-15', 'Marcos Vinicius', 'Tomografia Abdominal', 'Bradesco Saúde', 'Dr. Fernando Santos', 52.40, 380.00, 0.00, 380.00, 'seed_data'),
('2024-01-16', 'Gabriela Santos', 'Ultrassom Obstétrico', 'Amil', 'Dra. Monica Ferreira', 30.15, 210.00, 0.00, 210.00, 'seed_data'),
('2024-01-17', 'André Luiz', 'Raio-X Coluna', 'Unimed', 'Dr. Marcos Antonio', 18.70, 120.00, 0.00, 120.00, 'seed_data'),
('2024-01-18', 'Beatriz Costa', 'Densitometria Óssea', 'Particular', 'Dra. Ana Maria', 42.90, 0.00, 320.00, 320.00, 'seed_data'),
('2024-01-19', 'Ricardo Moreira', 'Ultrassom Abdominal', 'SUS', 'Dr. João Carlos', 25.50, 0.00, 180.00, 180.00, 'seed_data'),
('2024-01-22', 'Camila Barbosa', 'Tomografia Craniana', 'Golden Cross', 'Dr. Fernando Santos', 45.00, 450.00, 0.00, 450.00, 'seed_data'),
('2024-01-23', 'Diego Silva', 'Raio-X Tórax', 'Bradesco Saúde', 'Dra. Ana Maria', 15.00, 85.00, 0.00, 85.00, 'seed_data'),
('2024-01-24', 'Larissa Almeida', 'Ultrassom Tireoide', 'Amil', 'Dra. Patricia Silva', 32.60, 165.00, 0.00, 165.00, 'seed_data'),
('2024-01-25', 'Rafael Santos', 'Ressonância Magnética', 'Particular', 'Dr. Luis Eduardo', 65.20, 0.00, 980.00, 980.00, 'seed_data'),
('2024-01-26', 'Tatiana Oliveira', 'Mamografia', 'Unimed', 'Dr. Ricardo Lima', 35.80, 220.00, 0.00, 220.00, 'seed_data'),
('2024-01-29', 'Gustavo Pereira', 'Ultrassom Abdominal', 'SUS', 'Dr. João Carlos', 25.50, 0.00, 180.00, 180.00, 'seed_data'),

-- Fevereiro 2024
('2024-02-01', 'Isabella Torres', 'Tomografia Tórax', 'Bradesco Saúde', 'Dr. Fernando Santos', 48.30, 420.00, 0.00, 420.00, 'seed_data'),
('2024-02-02', 'Leonardo Dias', 'Raio-X Abdomen', 'Particular', 'Dra. Ana Maria', 16.80, 0.00, 110.00, 110.00, 'seed_data'),
('2024-02-05', 'Mariana Castro', 'Ultrassom Pélvico', 'Amil', 'Dra. Patricia Silva', 28.90, 195.00, 0.00, 195.00, 'seed_data'),
('2024-02-06', 'Felipe Martins', 'Ressonância Joelho', 'Golden Cross', 'Dr. Luis Eduardo', 58.45, 720.00, 0.00, 720.00, 'seed_data'),
('2024-02-07', 'Viviane Lima', 'Mamografia', 'Unimed', 'Dr. Ricardo Lima', 35.80, 220.00, 0.00, 220.00, 'seed_data'),
('2024-02-08', 'Thiago Rocha', 'Ultrassom Abdominal', 'SUS', 'Dr. João Carlos', 25.50, 0.00, 180.00, 180.00, 'seed_data'),
('2024-02-09', 'Amanda Fernandes', 'Tomografia Craniana', 'Bradesco Saúde', 'Dr. Fernando Santos', 45.00, 450.00, 0.00, 450.00, 'seed_data'),
('2024-02-12', 'Bruno Cardoso', 'Raio-X Tórax', 'Particular', 'Dra. Ana Maria', 15.00, 0.00, 95.00, 95.00, 'seed_data'),
('2024-02-13', 'Priscila Gomes', 'Ultrassom Obstétrico', 'Amil', 'Dra. Monica Ferreira', 30.15, 210.00, 0.00, 210.00, 'seed_data'),
('2024-02-14', 'Rodrigo Souza', 'Densitometria Óssea', 'Golden Cross', 'Dra. Ana Maria', 42.90, 320.00, 0.00, 320.00, 'seed_data'),
('2024-02-15', 'Natalia Ribeiro', 'Ultrassom Tireoide', 'Unimed', 'Dra. Patricia Silva', 32.60, 165.00, 0.00, 165.00, 'seed_data'),
('2024-02-16', 'Vinicius Costa', 'Tomografia Abdominal', 'SUS', 'Dr. Fernando Santos', 52.40, 0.00, 380.00, 380.00, 'seed_data'),
('2024-02-19', 'Carolina Machado', 'Ressonância Magnética', 'Particular', 'Dr. Luis Eduardo', 65.20, 0.00, 980.00, 980.00, 'seed_data'),
('2024-02-20', 'Eduardo Nunes', 'Raio-X Coluna', 'Bradesco Saúde', 'Dr. Marcos Antonio', 18.70, 120.00, 0.00, 120.00, 'seed_data'),
('2024-02-21', 'Renata Azevedo', 'Ultrassom Abdominal', 'Amil', 'Dr. João Carlos', 25.50, 180.00, 0.00, 180.00, 'seed_data'),
('2024-02-22', 'Marcelo Tavares', 'Mamografia', 'Golden Cross', 'Dr. Ricardo Lima', 35.80, 220.00, 0.00, 220.00, 'seed_data'),
('2024-02-23', 'Aline Borges', 'Tomografia Craniana', 'Particular', 'Dr. Fernando Santos', 45.00, 0.00, 520.00, 520.00, 'seed_data'),
('2024-02-26', 'Daniel Freitas', 'Ultrassom Pélvico', 'Unimed', 'Dra. Patricia Silva', 28.90, 195.00, 0.00, 195.00, 'seed_data'),
('2024-02-27', 'Patricia Morais', 'Raio-X Tórax', 'SUS', 'Dra. Ana Maria', 15.00, 0.00, 85.00, 85.00, 'seed_data'),
('2024-02-28', 'Lucas Mendes', 'Ressonância Coluna', 'Bradesco Saúde', 'Dr. Luis Eduardo', 62.15, 780.00, 0.00, 780.00, 'seed_data'),

-- Março 2024
('2024-03-01', 'Vanessa Campos', 'Ultrassom Abdominal', 'Amil', 'Dr. João Carlos', 25.50, 180.00, 0.00, 180.00, 'seed_data'),
('2024-03-04', 'Henrique Silva', 'Tomografia Tórax', 'Golden Cross', 'Dr. Fernando Santos', 48.30, 420.00, 0.00, 420.00, 'seed_data'),
('2024-03-05', 'Claudia Nascimento', 'Mamografia', 'Particular', 'Dr. Ricardo Lima', 35.80, 0.00, 280.00, 280.00, 'seed_data'),
('2024-03-06', 'Sergio Ramos', 'Raio-X Joelho', 'Unimed', 'Dr. Marcos Antonio', 12.30, 95.00, 0.00, 95.00, 'seed_data'),
('2024-03-07', 'Monica Lopes', 'Ultrassom Obstétrico', 'Bradesco Saúde', 'Dra. Monica Ferreira', 30.15, 210.00, 0.00, 210.00, 'seed_data'),
('2024-03-08', 'Fabio Araújo', 'Densitometria Óssea', 'SUS', 'Dra. Ana Maria', 42.90, 0.00, 320.00, 320.00, 'seed_data'),
('2024-03-11', 'Simone Batista', 'Ultrassom Tireoide', 'Amil', 'Dra. Patricia Silva', 32.60, 165.00, 0.00, 165.00, 'seed_data'),
('2024-03-12', 'Caio Ferreira', 'Tomografia Craniana', 'Particular', 'Dr. Fernando Santos', 45.00, 0.00, 520.00, 520.00, 'seed_data'),
('2024-03-13', 'Leticia Carvalho', 'Ressonância Magnética', 'Golden Cross', 'Dr. Luis Eduardo', 65.20, 850.00, 0.00, 850.00, 'seed_data'),
('2024-03-14', 'Rogério Pinto', 'Raio-X Tórax', 'Unimed', 'Dra. Ana Maria', 15.00, 85.00, 0.00, 85.00, 'seed_data'),
('2024-03-15', 'Bruna Teixeira', 'Ultrassom Abdominal', 'Bradesco Saúde', 'Dr. João Carlos', 25.50, 180.00, 0.00, 180.00, 'seed_data'),
('2024-03-18', 'César Albuquerque', 'Tomografia Abdominal', 'SUS', 'Dr. Fernando Santos', 52.40, 0.00, 380.00, 380.00, 'seed_data'),
('2024-03-19', 'Débora Moura', 'Ultrassom Pélvico', 'Amil', 'Dra. Patricia Silva', 28.90, 195.00, 0.00, 195.00, 'seed_data'),
('2024-03-20', 'Alex Correia', 'Raio-X Coluna', 'Particular', 'Dr. Marcos Antonio', 18.70, 0.00, 140.00, 140.00, 'seed_data'),
('2024-03-21', 'Silvia Reis', 'Mamografia', 'Golden Cross', 'Dr. Ricardo Lima', 35.80, 220.00, 0.00, 220.00, 'seed_data'),
('2024-03-22', 'Igor Monteiro', 'Ressonância Joelho', 'Unimed', 'Dr. Luis Eduardo', 58.45, 720.00, 0.00, 720.00, 'seed_data'),
('2024-03-25', 'Elaine Duarte', 'Ultrassom Obstétrico', 'Bradesco Saúde', 'Dra. Monica Ferreira', 30.15, 210.00, 0.00, 210.00, 'seed_data'),
('2024-03-26', 'Pedro Henrique', 'Tomografia Craniana', 'Particular', 'Dr. Fernando Santos', 45.00, 0.00, 520.00, 520.00, 'seed_data'),
('2024-03-27', 'Carla Regina', 'Ultrassom Tireoide', 'SUS', 'Dra. Patricia Silva', 32.60, 0.00, 165.00, 165.00, 'seed_data'),
('2024-03-28', 'Jaime Fonseca', 'Densitometria Óssea', 'Amil', 'Dra. Ana Maria', 42.90, 320.00, 0.00, 320.00, 'seed_data'),
('2024-03-29', 'Cristina Vasconcelos', 'Raio-X Tórax', 'Golden Cross', 'Dra. Ana Maria', 15.00, 85.00, 0.00, 85.00, 'seed_data');

-- Atualizar estatísticas das tabelas
ANALYZE exames;

-- Refresh das materialized views com os novos dados
-- Nota: Execute após a criação das views
-- REFRESH MATERIALIZED VIEW mv_resumo_mensal;
-- REFRESH MATERIALIZED VIEW mv_resumo_anual;
-- REFRESH MATERIALIZED VIEW mv_procedimentos;
-- REFRESH MATERIALIZED VIEW mv_planos;
-- REFRESH MATERIALIZED VIEW mv_medicos;
-- REFRESH MATERIALIZED VIEW mv_tendencia_mensal;

-- Verificação dos dados inseridos
SELECT 
  'Total de exames inseridos' as metric,
  COUNT(*) as value
FROM exames 
WHERE fonte = 'seed_data'

UNION ALL

SELECT 
  'Período dos dados',
  CONCAT(MIN(data_exame), ' a ', MAX(data_exame))
FROM exames 
WHERE fonte = 'seed_data'

UNION ALL

SELECT 
  'Total de receita (seed)',
  CONCAT('R$ ', ROUND(SUM(total), 2))
FROM exames 
WHERE fonte = 'seed_data'

UNION ALL

SELECT 
  'Procedimentos únicos',
  COUNT(DISTINCT procedimento)::text
FROM exames 
WHERE fonte = 'seed_data'

UNION ALL

SELECT 
  'Planos únicos',
  COUNT(DISTINCT plano)::text
FROM exames 
WHERE fonte = 'seed_data';