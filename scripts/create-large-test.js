const XLSX = require('xlsx');

// Gerar 500 registros de teste
const data = [
  ['Data', 'Paciente', 'Procedimento', 'Plano', 'Médico Solicitante', 'MatMed', 'V. Convênio', 'V. Particular', 'Total']
];

const procedimentos = ['Ressonância', 'Tomografia', 'Ultrassom', 'Raio-X', 'Ecocardiograma', 'Endoscopia', 'Colonoscopia'];
const planos = ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'Particular', 'NotreDame', 'Porto Seguro'];
const medicos = ['Dr. Carlos Santos', 'Dra. Ana Costa', 'Dr. Roberto Lima', 'Dra. Beatriz Souza', 'Dr. Paulo Silva'];
const nomes = ['João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Julia', 'Gabriel', 'Beatriz', 'Rafael', 'Larissa'];
const sobrenomes = ['Silva', 'Santos', 'Oliveira', 'Costa', 'Ferreira', 'Souza', 'Lima', 'Pereira', 'Almeida', 'Rodrigues'];

for (let i = 0; i < 500; i++) {
  const dia = Math.floor(Math.random() * 28) + 1;
  const mes = Math.floor(Math.random() * 12) + 1;
  const data_exame = `2024-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

  const paciente = `${nomes[Math.floor(Math.random() * nomes.length)]} ${sobrenomes[Math.floor(Math.random() * sobrenomes.length)]}`;
  const procedimento = procedimentos[Math.floor(Math.random() * procedimentos.length)];
  const plano = planos[Math.floor(Math.random() * planos.length)];
  const medico = medicos[Math.floor(Math.random() * medicos.length)];

  const matmed = Math.round(Math.random() * 500 * 100) / 100;
  const valor_convenio = plano === 'Particular' ? 0 : Math.round(Math.random() * 2000 * 100) / 100;
  const valor_particular = plano === 'Particular' ? Math.round(Math.random() * 2000 * 100) / 100 : 0;
  const total = valor_convenio + valor_particular;

  data.push([data_exame, paciente, procedimento, plano, medico, matmed, valor_convenio, valor_particular, total]);
}

// Criar workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);

// Adicionar worksheet ao workbook
XLSX.utils.book_append_sheet(wb, ws, 'Exames');

// Salvar arquivo
XLSX.writeFile(wb, 'test-500-rows.xlsx');
console.log('Arquivo test-500-rows.xlsx criado com 500 registros!');