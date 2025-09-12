# <� Website Analytics SQL - Sistema de An�lise de Dados M�dicos

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)](https://www.postgresql.org/)
[![Claude AI](https://img.shields.io/badge/Claude-AI-purple)](https://claude.ai/)

Sistema completo de an�lise de dados m�dicos com chat SQL-first integrado com Claude AI. Permite upload de planilhas Excel, execu��o segura de queries SQL e visualiza��o interativa de resultados.

## =� Funcionalidades

- =� **Chat Anal�tico**: Interface estilo ChatGPT para consultas em linguagem natural
- =� **Upload Excel**: Processamento autom�tico de planilhas m�dicas com valida��es
- = **SQL Seguro**: Guardrails completos (SELECT-only, usu�rio read-only)
- =� **6 Materialized Views**: An�lises otimizadas pr�-computadas
- <� **Queries Pr�-configuradas**: Faturamento, compara��es, top m�dicos, etc.
- =� **Export CSV**: Download dos resultados das an�lises
- <� **Health Check**: Monitoramento do sistema em tempo real

## =� Tecnologias

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Node.js, PostgreSQL, Materialized Views
- **AI**: Claude AI API com System Prompt especializado
- **Seguran�a**: SQL Guardrails, Read-only user, Query timeout

## =� Instala��o

### Pr�-requisitos

- Node.js 18+
- PostgreSQL 14+
- Conta Claude AI com API Key

### 1. Clone o reposit�rio

```bash
git clone https://github.com/JPBazaBoy/website-analytics-sql.git
cd website-analytics-sql
```

### 2. Instale as depend�ncias

```bash
npm install
```

### 3. Configure as vari�veis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
# Banco de dados principal
DATABASE_URL=postgres://user:pass@localhost:5432/medical_db

# Usu�rio read-only (para queries)
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

# Produ��o
npm run build
npm start
```

Acesse: http://localhost:3000

## =� Estrutura do Banco

### Tabela Principal: `exames`

| Coluna | Tipo | Descri��o |
|--------|------|-----------|
| data_exame | DATE | Data do exame |
| paciente | TEXT | Nome do paciente |
| procedimento | TEXT | Tipo de procedimento |
| plano | TEXT | Plano de sa�de |
| medico_solicitante | TEXT | M�dico respons�vel |
| matmed | NUMERIC | Custo de materiais |
| valor_convenio | NUMERIC | Valor do conv�nio |
| valor_particular | NUMERIC | Valor particular |
| total | NUMERIC | Total (convenio + particular) |
| receita_liquida | NUMERIC | Total - matmed (computada) |

### Materialized Views

- `mv_resumo_mensal`: Resumo mensal de receitas
- `mv_resumo_anual`: Resumo anual consolidado
- `mv_procedimentos`: An�lise por procedimento
- `mv_planos`: An�lise por plano de sa�de
- `mv_medicos`: An�lise por m�dico
- `mv_tendencia_mensal`: Tend�ncias e crescimento

## =� Exemplos de Uso

### Chat Anal�tico

Perguntas que voc� pode fazer:

- "Qual o faturamento total de janeiro de 2024?"
- "Compare a receita de 2023 vs 2024"
- "Quais os top 5 m�dicos por receita?"
- "Mostre a evolu��o mensal do faturamento"
- "Qual procedimento tem maior lucro l�quido?"
- "Qual a participa��o de cada plano de sa�de?"

### Upload de Dados

Formato esperado do Excel:

| Data | Paciente | Procedimento | Plano | M�dico Solicitante | MatMed | V. Conv�nio | V. Particular | Total |
|------|----------|--------------|-------|-------------------|---------|-------------|---------------|-------|
| 01/01/2024 | Jo�o Silva | Resson�ncia | Unimed | Dr. Carlos | 150.00 | 800.00 | 0.00 | 800.00 |

## >� Testes

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

## =� Deploy na Vercel

1. Conecte o reposit�rio na [Vercel](https://vercel.com)
2. Configure as vari�veis de ambiente
3. Deploy autom�tico a cada push na `main`

### Vari�veis necess�rias na Vercel:

- `DATABASE_URL`
- `DATABASE_URL_RO`
- `CLAUDE_API_KEY`

## =� Comandos Dispon�veis

| Comando | Descri��o |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Build de produ��o |
| `npm start` | Inicia servidor de produ��o |
| `npm run db:migrate` | Aplica schema do banco |
| `npm run db:seed` | Insere dados de teste |
| `npm run db:refresh` | Atualiza materialized views |

## = Seguran�a

-  Queries SELECT-only
-  Usu�rio read-only no banco
-  Bloqueio de DML/DDL
-  Timeout de 30 segundos
-  Limite de 10.000 linhas
-  Sanitiza��o de logs
-  Valida��o de uploads

## =� Documenta��o

- [Arquitetura do Sistema](./ENTREGA_FINAL.md)
- [Implementa��o Detalhada](./IMPLEMENTATION-REPORT.md)
- [API Documentation](./API_IMPLEMENTATION_REPORT.md)
- [Database Schema](./db/README.md)

## > Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudan�as (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## =� Licen�a

Este projeto est� sob a licen�a MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## =d Autor

**Jo�o Pedro Gast�o**

- GitHub: [@JPBazaBoy](https://github.com/JPBazaBoy)

## =O Agradecimentos

- Desenvolvido com aux�lio do Claude AI
- Next.js team pela excelente framework
- Vercel pela plataforma de deploy

---

P Se este projeto te ajudou, considere dar uma estrela!

= Encontrou um bug? [Abra uma issue](https://github.com/JPBazaBoy/website-analytics-sql/issues)