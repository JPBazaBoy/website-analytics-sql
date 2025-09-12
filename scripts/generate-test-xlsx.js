const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Sample data for generating test cases
const procedimentos = [
  'Ultrassom Abdominal',
  'Raio X Tórax',
  'Hemograma Completo',
  'Ressonância Magnética',
  'Tomografia Computadorizada',
  'Ecocardiograma',
  'Endoscopia Digestiva',
  'Mamografia',
  'Colonoscopia',
  'Eletrocardiograma'
];

const planos = [
  'Unimed',
  'Bradesco Saúde',
  'SulAmérica',
  'Amil',
  'Particular',
  'NotreDame Intermédica',
  'Hapvida',
  'Prevent Senior'
];

const medicos = [
  'Dr. João Silva',
  'Dra. Maria Santos',
  'Dr. Pedro Oliveira',
  'Dra. Ana Costa',
  'Dr. Carlos Ferreira',
  'Dra. Fernanda Lima',
  'Dr. Roberto Alves',
  'Dra. Juliana Pereira',
  'Dr. Marcos Rodrigues',
  'Dra. Lucia Mendes'
];

const pacientes = [
  'João da Silva',
  'Maria Oliveira',
  'Pedro Santos',
  'Ana Costa',
  'Carlos Lima',
  'Fernanda Alves',
  'Roberto Pereira',
  'Juliana Silva',
  'Marcos Oliveira',
  'Lucia Santos',
  'Paulo Ferreira',
  'Sandra Lima',
  'Ricardo Alves',
  'Camila Santos',
  'Bruno Costa'
];

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(startDate, endDate) {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const timestamp = Math.random() * (end - start) + start;
  return new Date(timestamp);
}

function randomPrice(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateValidRow(date) {
  const valorConvenio = randomPrice(50, 800);
  const valorParticular = randomPrice(0, 200);
  const total = valorConvenio + valorParticular;
  const matmed = randomPrice(10, total * 0.3);

  return {
    'Data': date,
    'Paciente': randomChoice(pacientes),
    'Procedimento': randomChoice(procedimentos),
    'Plano': randomChoice(planos),
    'Médico Solicitante': randomChoice(medicos),
    'MatMed': matmed,
    'V. Convênio': valorConvenio,
    'V. Particular': valorParticular,
    'Total': total
  };
}

function generateInvalidRow(date, errorType) {
  const baseRow = generateValidRow(date);
  
  switch (errorType) {
    case 'invalid_total':
      // Total doesn't match sum of convenio + particular
      baseRow['Total'] = baseRow['V. Convênio'] + baseRow['V. Particular'] + 50;
      break;
      
    case 'negative_values':
      // Negative values
      baseRow['V. Convênio'] = -100;
      break;
      
    case 'missing_procedimento':
      // Missing required field
      baseRow['Procedimento'] = '';
      break;
      
    case 'missing_plano':
      // Missing required field
      baseRow['Plano'] = '';
      break;
      
    case 'invalid_date':
      // Invalid date
      baseRow['Data'] = 'invalid-date';
      break;
      
    default:
      break;
  }
  
  return baseRow;
}

function generateTestData(months = 3) {
  const data = [];
  const today = new Date();
  const errorTypes = ['invalid_total', 'negative_values', 'missing_procedimento', 'missing_plano', 'invalid_date'];
  
  // Generate data for each month
  for (let monthOffset = 0; monthOffset < months; monthOffset++) {
    const currentMonth = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() - monthOffset + 1, 1);
    
    // Generate 20-50 records per month
    const recordsPerMonth = Math.floor(Math.random() * 30) + 20;
    
    for (let i = 0; i < recordsPerMonth; i++) {
      const date = randomDate(currentMonth, nextMonth);
      
      // 80% valid records, 20% invalid records
      if (Math.random() < 0.8) {
        data.push(generateValidRow(date));
      } else {
        const errorType = randomChoice(errorTypes);
        data.push(generateInvalidRow(date, errorType));
      }
    }
  }
  
  // Sort by date
  data.sort((a, b) => new Date(a['Data']) - new Date(b['Data']));
  
  return data;
}

function createExcelFile(data, filename) {
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  worksheet['!cols'] = [
    { width: 12 }, // Data
    { width: 20 }, // Paciente
    { width: 25 }, // Procedimento
    { width: 20 }, // Plano
    { width: 20 }, // Médico Solicitante
    { width: 12 }, // MatMed
    { width: 12 }, // V. Convênio
    { width: 12 }, // V. Particular
    { width: 12 }  // Total
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Exames');
  
  // Write file
  const outputPath = path.join(__dirname, filename);
  XLSX.writeFile(workbook, outputPath);
  
  return outputPath;
}

function main() {
  try {
    console.log('Gerando arquivo de teste Excel...');
    
    // Generate test data for 3 months
    const testData = generateTestData(3);
    
    console.log(`Gerados ${testData.length} registros de teste`);
    
    // Count valid vs invalid records
    let validCount = 0;
    let invalidCount = 0;
    
    testData.forEach(row => {
      // Simple validation check
      const total = row['V. Convênio'] + row['V. Particular'];
      const isValid = (
        Math.abs(row['Total'] - total) < 0.01 &&
        row['V. Convênio'] >= 0 &&
        row['V. Particular'] >= 0 &&
        row['MatMed'] >= 0 &&
        row['Total'] >= 0 &&
        row['Procedimento'] &&
        row['Plano'] &&
        row['Data']
      );
      
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    });
    
    console.log(`Registros válidos: ${validCount}`);
    console.log(`Registros inválidos: ${invalidCount}`);
    
    // Create files
    const allDataFile = createExcelFile(testData, 'test-data-mixed.xlsx');
    console.log(`Arquivo criado: ${allDataFile}`);
    
    // Create a file with only valid data
    const validData = testData.filter(row => {
      const total = row['V. Convênio'] + row['V. Particular'];
      return (
        Math.abs(row['Total'] - total) < 0.01 &&
        row['V. Convênio'] >= 0 &&
        row['V. Particular'] >= 0 &&
        row['MatMed'] >= 0 &&
        row['Total'] >= 0 &&
        row['Procedimento'] &&
        row['Plano'] &&
        row['Data']
      );
    });
    
    const validDataFile = createExcelFile(validData, 'test-data-valid.xlsx');
    console.log(`Arquivo válido criado: ${validDataFile}`);
    
    // Create sample data for manual testing
    const sampleData = [
      {
        'Data': new Date('2024-01-15'),
        'Paciente': 'João da Silva',
        'Procedimento': 'Ultrassom Abdominal',
        'Plano': 'Unimed',
        'Médico Solicitante': 'Dr. João Silva',
        'MatMed': 50.00,
        'V. Convênio': 200.00,
        'V. Particular': 0.00,
        'Total': 200.00
      },
      {
        'Data': new Date('2024-01-16'),
        'Paciente': 'Maria Oliveira',
        'Procedimento': 'Hemograma Completo',
        'Plano': 'Particular',
        'Médico Solicitante': 'Dra. Maria Santos',
        'MatMed': 25.00,
        'V. Convênio': 0.00,
        'V. Particular': 80.00,
        'Total': 80.00
      },
      // Invalid row - total doesn't match
      {
        'Data': new Date('2024-01-17'),
        'Paciente': 'Pedro Santos',
        'Procedimento': 'Raio X Tórax',
        'Plano': 'Bradesco Saúde',
        'Médico Solicitante': 'Dr. Pedro Oliveira',
        'MatMed': 30.00,
        'V. Convênio': 150.00,
        'V. Particular': 0.00,
        'Total': 200.00 // Should be 150.00
      }
    ];
    
    const sampleFile = createExcelFile(sampleData, 'test-sample.xlsx');
    console.log(`Arquivo de exemplo criado: ${sampleFile}`);
    
    console.log('\\nArquivos de teste criados com sucesso!');
    
  } catch (error) {
    console.error('Erro ao gerar arquivo de teste:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateTestData, createExcelFile };