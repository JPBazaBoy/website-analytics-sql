# Database Structure - Sistema de Exames Médicos

## Arquivos Criados

### Schema e Estrutura Principal
- **`schema.sql`** - Schema completo com tabela principal `exames` e índices
- **`views.sql`** - Materialized Views para análises e relatórios
- **`create-readonly-user.sql`** - Script para criar usuário somente leitura
- **`seed.sql`** - Dados de teste (3 meses de dados fictícios)

### Scripts de Migração
- **`../scripts/migrate.js`** - Script principal de migração do banco
- **`../scripts/refresh-views.js`** - Script para atualização das Materialized Views

## Estrutura do Banco

### Tabela Principal: `exames`
```sql
- id (BIGSERIAL PRIMARY KEY)
- data_exame (DATE NOT NULL)
- ano (INT GENERATED - extraído da data)
- mes (INT GENERATED - extraído da data) 
- paciente (TEXT)
- procedimento (TEXT NOT NULL)
- plano (TEXT NOT NULL)
- medico_solicitante (TEXT)
- matmed (NUMERIC(12,2))
- valor_convenio (NUMERIC(12,2))
- valor_particular (NUMERIC(12,2))
- total (NUMERIC(12,2) NOT NULL)
- receita_liquida (NUMERIC(12,2) GENERATED)
- fonte (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Materialized Views Criadas
1. **`mv_resumo_mensal`** - Resumo mensal detalhado
2. **`mv_resumo_anual`** - Resumo anual consolidado
3. **`mv_procedimentos`** - Análise por tipo de procedimento
4. **`mv_planos`** - Análise por plano de saúde
5. **`mv_medicos`** - Análise por médico solicitante
6. **`mv_tendencia_mensal`** - Análise de tendências com crescimento

## Como Usar

### 1. Configuração Inicial
```bash
# Definir variável de ambiente
export DATABASE_URL="postgresql://user:password@localhost:5432/database"

# Executar migração completa
npm run db:setup
```

### 2. Scripts Disponíveis
```bash
# Executar apenas a migração (schema + views)
npm run db:migrate

# Inserir dados de teste
npm run db:seed

# Atualizar todas as materialized views
npm run db:refresh

# Atualizar uma view específica
npm run db:refresh-single mv_resumo_mensal

# Setup completo (migrate + seed + refresh)
npm run db:setup
```

### 3. Criar Usuário Read-Only
```bash
psql $DATABASE_URL -f db/create-readonly-user.sql
```

## Constraints e Validações

### Constraints de Integridade
- `chk_total_sum`: total = valor_convenio + valor_particular
- `chk_nonneg`: valores não negativos
- `chk_data_valida`: data não pode ser futura
- `chk_procedimento_not_empty`: procedimento obrigatório
- `chk_plano_not_empty`: plano obrigatório

### Índices para Performance
- `idx_exames_ano_mes`: consultas por período
- `idx_exames_data`: consultas por data específica
- `idx_exames_proc`: consultas por procedimento
- `idx_exames_plano`: consultas por plano
- `idx_exames_medico`: consultas por médico
- `idx_exames_fonte`: auditoria por fonte
- `idx_exames_data_proc_plano`: índice composto para análises

## Dados de Teste

O arquivo `seed.sql` contém:
- **61 registros** de exames fictícios
- **3 meses** de dados (Janeiro a Março 2024)
- **Variedade realista** de procedimentos, planos e valores
- **Distribuição equilibrada** entre diferentes cenários

### Procedimentos Incluídos
- Ultrassom (Abdominal, Pélvico, Obstétrico, Tireoide)
- Raio-X (Tórax, Joelho, Coluna, Abdomen)
- Tomografia (Craniana, Abdominal, Tórax)
- Ressonância Magnética (completa, joelho, coluna)
- Mamografia
- Densitometria Óssea

### Planos de Saúde
- Unimed
- Bradesco Saúde  
- Amil
- Golden Cross
- SUS
- Particular

## Manutenção

### Refresh das Materialized Views
As materialized views devem ser atualizadas regularmente:

```bash
# Refresh automático (recomendado - concorrente)
npm run db:refresh

# Refresh sem concorrência (quando houver conflitos)
node scripts/refresh-views.js --no-concurrent

# Refresh de view específica
node scripts/refresh-views.js mv_resumo_mensal
```

### Monitoramento
- Verificar logs dos scripts para erros
- Monitorar performance das queries
- Atualizar estatísticas: `ANALYZE exames;`

## Troubleshooting

### Erro de Conexão
- Verificar `DATABASE_URL`
- Confirmar se PostgreSQL está rodando
- Verificar permissões de usuário

### Erro nas Materialized Views
- Views dependem da tabela `exames` estar populada
- Executar refresh sem `CONCURRENTLY` se houver conflitos
- Verificar se há dados suficientes para análises

### Performance
- Materialized views melhoram performance de consultas analíticas
- Refresh pode ser demorado em tabelas grandes
- Considerar refresh incremental para produção