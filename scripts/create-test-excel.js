const XLSX = require('xlsx');

// Dados de teste
const data = [
  ['Data', 'Paciente', 'Procedimento', 'Plano', 'Médico Solicitante', 'MatMed', 'V. Convênio', 'V. Particular', 'Total'],
  ['2024-01-15', 'João Silva', 'Ressonância Magnética', 'Unimed', 'Dr. Carlos Santos', 150.00, 850.00, 0.00, 850.00],
  ['2024-01-16', 'Maria Oliveira', 'Tomografia', 'Bradesco Saúde', 'Dra. Ana Costa', 200.00, 1200.00, 0.00, 1200.00],
  ['2024-01-17', 'Pedro Santos', 'Ultrassom', 'SulAmérica', 'Dr. Roberto Lima', 50.00, 450.00, 0.00, 450.00],
  ['2024-01-18', 'Ana Costa', 'Raio-X', 'Unimed', 'Dr. Carlos Santos', 30.00, 250.00, 0.00, 250.00],
  ['2024-01-19', 'Lucas Ferreira', 'Ecocardiograma', 'Particular', 'Dra. Beatriz Souza', 100.00, 0.00, 600.00, 600.00]
];

// Criar workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);

// Adicionar worksheet ao workbook
XLSX.utils.book_append_sheet(wb, ws, 'Exames');

// Salvar arquivo
XLSX.writeFile(wb, 'test-data.xlsx');
console.log('Arquivo test-data.xlsx criado com sucesso!');