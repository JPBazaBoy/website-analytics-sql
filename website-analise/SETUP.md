# Chat Analítico - Setup e Configuração

## 📋 Visão Geral

Sistema de chat analítico estilo ChatGPT para análise de dados médicos. Utiliza Claude AI para processar perguntas em linguagem natural e gerar consultas SQL automaticamente.

## 🏗️ Arquitetura

```
website-analise/
├── src/
│   ├── app/
│   │   ├── chat/page.tsx          # Interface principal do chat
│   │   ├── api/
│   │   │   ├── chat/route.ts      # Endpoint para comunicação com Claude
│   │   │   └── tools/run-sql/     # Endpoint para execução SQL
│   │   └── page.tsx               # Redirecionamento para /chat
│   ├── components/
│   │   ├── MessageList.tsx        # Lista de mensagens do chat
│   │   ├── MessageItem.tsx        # Item individual de mensagem
│   │   ├── SqlBlock.tsx           # Bloco "Como calculei" com SQL
│   │   ├── DataTable.tsx          # Tabela de resultados com paginação
│   │   └── LoadingIndicator.tsx   # Indicador de carregamento
│   └── lib/
│       └── ai.ts                  # Integração com Claude AI
├── .env                           # Variáveis de ambiente
└── package.json
```

## 🚀 Instalação e Setup

### 1. Clonar e instalar dependências

```bash
cd /Users/joaopedrogastao/Desktop/Website/website-analise
npm install
```

### 2. Configurar variáveis de ambiente

Edite o arquivo `.env` com suas credenciais:

```bash
# Banco de dados
DATABASE_URL=postgres://user:pass@host:5432/db
DATABASE_URL_RO=postgres://app_readonly:pass@host:5432/db

# Claude API (obrigatório)
CLAUDE_API_KEY=sk-ant-api03-your-key-here

# Opcional - URL da aplicação para desenvolvimento
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Configurar banco de dados

Execute o schema SQL do arquivo `readme.md` seção 3:

```sql
-- Criar tabela principal e usuário read-only
-- Ver readme.md seções 3-4 para schema completo
```

### 4. Executar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000 (redireciona para /chat)

### 5. Build para produção

```bash
npm run build
npm start
```

## 🔧 Componentes Criados

### 1. **MessageList.tsx**
- Lista todas as mensagens do chat
- Auto-scroll para novas mensagens
- Tela de boas-vindas com exemplos
- Interface responsiva

### 2. **MessageItem.tsx** 
- Renderiza mensagem individual (usuário/assistente)
- Avatares diferenciados
- Timestamps
- Integra SqlBlock e DataTable para respostas do assistente

### 3. **SqlBlock.tsx** - Bloco "Como calculei"
- Exibe SQL formatada
- Botão de copiar SQL
- Métricas de performance (tempo, linhas)
- Lista de filtros aplicados

### 4. **DataTable.tsx**
- Tabela paginada dos resultados
- Formatação automática (datas, números)
- Botões "Ver amostra" e "Baixar CSV"
- Responsiva

### 5. **LoadingIndicator.tsx**
- Animação durante processamento
- Feedback visual de "analisando dados"

## 🤖 Integração Claude AI

### System Prompt Configurado
Localizado em `/src/lib/ai.ts`:

- Analista orientado a fatos
- Execução apenas de SELECT
- Sempre inclui SQL utilizada
- Formato "Como calculei" obrigatório
- Métricas de performance

### Tool: run_sql
- Executa consultas SELECT-only
- Validação de segurança
- Limita resultados automaticamente
- Retorna métricas de performance

## 📊 Interface do Chat

### Layout Estilo ChatGPT
- ✅ Sidebar com perguntas rápidas
- ✅ Chat principal com histórico
- ✅ Input fixo no bottom
- ✅ Avatares user/assistant
- ✅ Estados de loading
- ✅ Responsivo mobile

### Para Cada Resposta do Assistente
- ✅ Texto da resposta
- ✅ Bloco "Como calculei" com:
  - SQL formatada (monoespaçada)
  - Tempo de execução
  - Número de linhas
  - Filtros aplicados
- ✅ Botões "Baixar CSV" e "Ver amostra"
- ✅ Tabela paginada quando aplicável

### Perguntas Rápidas Pré-configuradas
1. "Faturamento total de janeiro de 2024"
2. "Top 5 médicos por receita em 2024"
3. "Comparar receita de 2023 vs 2024"
4. "Procedimentos com maior lucro líquido"
5. "Evolução mensal do faturamento em 2024"
6. "Principal plano de saúde por participação"

## 🛡️ Segurança SQL

### Validações no Endpoint /api/tools/run-sql
- ✅ Apenas SELECT permitido
- ✅ Bloqueio de DML/DDL
- ✅ Proteção contra múltiplos statements
- ✅ Limite automático de linhas
- ✅ Usuário read-only no banco
- ✅ Logging de queries (sem dados sensíveis)

### Keywords Bloqueadas
`insert`, `update`, `delete`, `drop`, `create`, `alter`, `truncate`, `grant`, `revoke`, `exec`, `execute`

## 🎨 Estilização

### Tailwind CSS
- ✅ Tema claro/escuro (suporte)
- ✅ Design responsivo
- ✅ Componentes acessíveis
- ✅ Animações suaves

### Cores e Tema
- Azul primário: `blue-600`
- Verde para ações positivas: `green-600` 
- Cinzas para backgrounds: `gray-50/100/800/900`
- Feedback visual em todos os estados

## 📝 Funcionalidades Implementadas

### Chat Core
- [x] Interface estilo ChatGPT
- [x] Histórico de mensagens
- [x] Estados de loading
- [x] Error handling

### Análise SQL
- [x] System prompt especializado
- [x] Tool run_sql configurada
- [x] Validações de segurança
- [x] Métricas de performance

### UI/UX
- [x] Bloco "Como calculei"
- [x] Tabela de resultados
- [x] Download CSV
- [x] Paginação
- [x] Responsive design
- [x] Perguntas rápidas

### APIs
- [x] `/api/chat` - Integração Claude
- [x] `/api/tools/run-sql` - Execução SQL
- [x] Health checks em ambos endpoints

## 🔗 Screenshots/Demo

### Chat Principal
A interface apresenta:
- Sidebar esquerda com perguntas rápidas
- Chat principal com mensagens
- Input de texto na parte inferior
- Redirecionamento automático de / para /chat

### Resposta do Assistente
Cada resposta inclui:
1. **Sumário executivo** (1-3 frases)
2. **Bloco "Como calculei"** com SQL formatada
3. **Tabela interativa** com dados
4. **Botões de ação** (CSV, amostra)

## 🚨 Próximos Passos

### Para usar em produção:
1. Configurar `CLAUDE_API_KEY` válida
2. Configurar `DATABASE_URL_RO` com usuário read-only
3. Carregar dados no schema definido (readme.md)
4. Testar queries de exemplo (seção 9 do readme)

### Para desenvolvimento:
1. Testar com dados de exemplo
2. Verificar todas as funcionalidades
3. Customizar perguntas rápidas conforme necessário

---

✅ **Chat analítico estilo ChatGPT implementado com sucesso!**

- Interface moderna e responsiva
- Integração completa com Claude AI
- Bloco "Como calculei" em todas as respostas
- Download CSV e visualização de dados
- Segurança SQL implementada
- System prompt especializado para dados médicos