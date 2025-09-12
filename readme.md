# <å Website Analytics SQL - Sistema de Análise de Dados Médicos

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)](https://www.postgresql.org/)
[![Claude AI](https://img.shields.io/badge/Claude-AI-purple)](https://claude.ai/)

Sistema completo de análise de dados médicos com chat SQL-first integrado com Claude AI. Permite upload de planilhas Excel, execução segura de queries SQL e visualização interativa de resultados.

## =€ Funcionalidades

- =¬ **Chat Analítico**: Interface estilo ChatGPT para consultas em linguagem natural
- =Ê **Upload Excel**: Processamento automático de planilhas médicas com validações
- = **SQL Seguro**: Guardrails completos (SELECT-only, usuário read-only)
- =È **6 Materialized Views**: Análises otimizadas pré-computadas
- <¯ **Queries Pré-configuradas**: Faturamento, comparações, top médicos, etc.
- =å **Export CSV**: Download dos resultados das análises
- <å **Health Check**: Monitoramento do sistema em tempo real

## =à Tecnologias

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Node.js, PostgreSQL, Materialized Views
- **AI**: Claude AI API com System Prompt especializado
- **Segurança**: SQL Guardrails, Read-only user, Query timeout

## =æ Instalação

### Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- Conta Claude AI com API Key

### 1. Clone o repositório

```bash
git clone https://github.com/JPBazaBoy/website-analytics-sql.git
cd website-analytics-sql
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
# Banco de dados principal
DATABASE_URL=postgres://user:pass@localhost:5432/medical_db

# Usuário read-only (para queries)
DATABASE_URL_RO=postgres://readonly:pass@localhost:5432/medical_db

# Claude AI
CLAUDE_API_KEY=sk-ant-api03-xxxxx
```

### 4. Configure o banco de dados

```bash
# Aplicar schema e views
npm run db:migrate

# (Opcional) Inserir dados de teste
npm run db:seed

# Atualizar materialized views
npm run db:refresh
```

### 5. Inicie o servidor

```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

Acesse: http://localhost:3000

## =Ê Estrutura do Banco

### Tabela Principal: `exames`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| data_exame | DATE | Data do exame |
| paciente | TEXT | Nome do paciente |
| procedimento | TEXT | Tipo de procedimento |
| plano | TEXT | Plano de saúde |
| medico_solicitante | TEXT | Médico responsável |
| matmed | NUMERIC | Custo de materiais |
| valor_convenio | NUMERIC | Valor do convênio |
| valor_particular | NUMERIC | Valor particular |
| total | NUMERIC | Total (convenio + particular) |
| receita_liquida | NUMERIC | Total - matmed (computada) |

### Materialized Views

- `mv_resumo_mensal`: Resumo mensal de receitas
- `mv_resumo_anual`: Resumo anual consolidado
- `mv_procedimentos`: Análise por procedimento
- `mv_planos`: Análise por plano de saúde
- `mv_medicos`: Análise por médico
- `mv_tendencia_mensal`: Tendências e crescimento

## =¬ Exemplos de Uso

### Chat Analítico

Perguntas que você pode fazer:

- "Qual o faturamento total de janeiro de 2024?"
- "Compare a receita de 2023 vs 2024"
- "Quais os top 5 médicos por receita?"
- "Mostre a evolução mensal do faturamento"
- "Qual procedimento tem maior lucro líquido?"
- "Qual a participação de cada plano de saúde?"

### Upload de Dados

Formato esperado do Excel:

| Data | Paciente | Procedimento | Plano | Médico Solicitante | MatMed | V. Convênio | V. Particular | Total |
|------|----------|--------------|-------|-------------------|---------|-------------|---------------|-------|
| 01/01/2024 | João Silva | Ressonância | Unimed | Dr. Carlos | 150.00 | 800.00 | 0.00 | 800.00 |

## >ê Testes

```bash
# Executar suite completa
node scripts/test-runner.js

# Testar queries SQL
node scripts/test-queries.js

# Testar guardrails
node scripts/test-guardrails.js

# Teste E2E
node scripts/e2e-test.js
```

## =€ Deploy na Vercel

1. Conecte o repositório na [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente
3. Deploy automático a cada push na `main`

### Variáveis necessárias na Vercel:

- `DATABASE_URL`
- `DATABASE_URL_RO`
- `CLAUDE_API_KEY`

## =Ý Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Inicia servidor de produção |
| `npm run db:migrate` | Aplica schema do banco |
| `npm run db:seed` | Insere dados de teste |
| `npm run db:refresh` | Atualiza materialized views |

## = Segurança

-  Queries SELECT-only
-  Usuário read-only no banco
-  Bloqueio de DML/DDL
-  Timeout de 30 segundos
-  Limite de 10.000 linhas
-  Sanitização de logs
-  Validação de uploads

## =Ú Documentação

- [Arquitetura do Sistema](./ENTREGA_FINAL.md)
- [Implementação Detalhada](./IMPLEMENTATION-REPORT.md)
- [API Documentation](./API_IMPLEMENTATION_REPORT.md)
- [Database Schema](./db/README.md)

## > Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## =Ä Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## =d Autor

**João Pedro Gastão**

- GitHub: [@JPBazaBoy](https://github.com/JPBazaBoy)

## =O Agradecimentos

- Desenvolvido com auxílio do Claude AI
- Next.js team pela excelente framework
- Vercel pela plataforma de deploy

---

P Se este projeto te ajudou, considere dar uma estrela!

= Encontrou um bug? [Abra uma issue](https://github.com/JPBazaBoy/website-analytics-sql/issues)