-- Script para criação de usuário somente leitura
-- Execute como superuser (postgres) ou owner do database

-- Criar usuário read-only se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'exames_readonly') THEN
        CREATE ROLE exames_readonly WITH LOGIN PASSWORD 'readonly_secure_2024!';
    END IF;
END
$$;

-- Permissões básicas no database
GRANT CONNECT ON DATABASE postgres TO exames_readonly;
GRANT USAGE ON SCHEMA public TO exames_readonly;

-- Permissões na tabela principal
GRANT SELECT ON exames TO exames_readonly;

-- Permissões nas materialized views
GRANT SELECT ON mv_resumo_mensal TO exames_readonly;
GRANT SELECT ON mv_resumo_anual TO exames_readonly;
GRANT SELECT ON mv_procedimentos TO exames_readonly;
GRANT SELECT ON mv_planos TO exames_readonly;
GRANT SELECT ON mv_medicos TO exames_readonly;
GRANT SELECT ON mv_tendencia_mensal TO exames_readonly;

-- Permissões para futuras tabelas/views (opcional)
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT ON TABLES TO exames_readonly;

-- Permissões para usar sequences (para queries de metadados se necessário)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO exames_readonly;

-- Comentários para documentação
COMMENT ON ROLE exames_readonly IS 'Usuário somente leitura para acesso aos dados de exames médicos';

-- Script de verificação das permissões
-- Descomente para testar:
-- \c postgres exames_readonly
-- SELECT current_user;
-- SELECT * FROM exames LIMIT 1;
-- SELECT * FROM mv_resumo_mensal LIMIT 1;

GRANT USAGE ON SCHEMA information_schema TO exames_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA information_schema TO exames_readonly;