/**
 * Script de teste para memória e estado do chat
 * Testa o fluxo completo de perguntas encadeadas com estado
 */

const API_URL = 'http://localhost:3000/api/chat';

// Estado inicial
let currentState = {
  period: { type: 'none' },
  metric: 'total',
  groupBy: null
};

let history = [];

async function sendMessage(message) {
  console.log(`\n📤 Enviando: "${message}"`);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: history.slice(-4), // Últimas 4 mensagens
        state: currentState
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('❌ Erro:', data.error);
      return null;
    }

    // Atualizar estado se houver mudanças
    if (data.updatedState) {
      console.log('📊 Estado atualizado:', JSON.stringify(data.updatedState, null, 2));
      currentState = data.updatedState;
    }

    // Adicionar ao histórico
    history.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    history.push({
      role: 'assistant',
      content: data.response.substring(0, 100) + '...',
      timestamp: new Date().toISOString()
    });

    console.log('✅ Resposta recebida');
    console.log('📝 SQL geradas:', data.sqlQueries?.length || 0);

    return data;
  } catch (error) {
    console.error('❌ Erro de rede:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Iniciando testes de memória e estado do chat\n');
  console.log('=' .repeat(50));

  // Teste 1: Pergunta inicial sobre janeiro
  console.log('\n📌 TESTE 1: Pergunta inicial sobre período');
  const test1 = await sendMessage('Qual o faturamento de janeiro de 2025?');
  if (test1) {
    console.log('✓ Período detectado:', currentState.period);
  }

  // Aguardar um pouco entre requisições
  await new Promise(r => setTimeout(r, 1000));

  // Teste 2: Pergunta de continuação (deve manter contexto)
  console.log('\n📌 TESTE 2: Pergunta de continuação');
  const test2 = await sendMessage('E de fevereiro?');
  if (test2) {
    console.log('✓ Novo período:', currentState.period);
  }

  await new Promise(r => setTimeout(r, 1000));

  // Teste 3: Adicionar filtro
  console.log('\n📌 TESTE 3: Adicionar filtro de plano');
  const test3 = await sendMessage('Agora só Unimed');
  if (test3) {
    console.log('✓ Filtros aplicados:', currentState.planos);
  }

  await new Promise(r => setTimeout(r, 1000));

  // Teste 4: Top N com agrupamento
  console.log('\n📌 TESTE 4: Top N médicos');
  const test4 = await sendMessage('Top 5 médicos do primeiro semestre de 2025');
  if (test4) {
    console.log('✓ TopN:', currentState.topN);
    console.log('✓ GroupBy:', currentState.groupBy);
    console.log('✓ Período:', currentState.period);
  }

  await new Promise(r => setTimeout(r, 1000));

  // Teste 5: Mudança de métrica
  console.log('\n📌 TESTE 5: Mudança de métrica');
  const test5 = await sendMessage('Mostre a receita líquida');
  if (test5) {
    console.log('✓ Métrica:', currentState.metric);
  }

  // Resumo final
  console.log('\n' + '=' .repeat(50));
  console.log('📊 ESTADO FINAL:');
  console.log(JSON.stringify(currentState, null, 2));

  console.log('\n📜 HISTÓRICO FINAL:');
  console.log(`Total de mensagens: ${history.length}`);

  console.log('\n✅ Testes concluídos!');
}

// Executar testes
runTests().catch(console.error);