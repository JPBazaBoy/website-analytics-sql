const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Simple validation functions (JavaScript version)
function normalizeDate(value) {
  if (!value) {
    throw new Error('Data é obrigatória');
  }

  // Handle Excel date serial number
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  // Handle date string
  if (typeof value === 'string') {
    // Try different date formats
    const dateFormats = [
      /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
      /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
    ];

    for (const format of dateFormats) {
      const match = value.match(format);
      if (match) {
        if (format.source.startsWith('^(\\d{4})')) {
          // YYYY-MM-DD format
          return `${match[1]}-${match[2]}-${match[3]}`;
        } else {
          // DD/MM/YYYY or DD-MM-YYYY format
          return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
        }
      }
    }
  }

  // Handle Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  throw new Error(`Formato de data inválido: ${value}`);
}

function normalizeDecimal(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // Replace comma with dot and remove spaces
    const normalized = value.replace(',', '.').replace(/\s/g, '');
    const parsed = parseFloat(normalized);
    
    if (isNaN(parsed)) {
      throw new Error(`Valor decimal inválido: ${value}`);
    }
    
    return parsed;
  }

  throw new Error(`Tipo de valor inválido: ${value}`);
}

function validateRow(row, rowIndex) {
  const errors = [];
  const warnings = [];

  // Required fields validation
  if (!row.procedimento || row.procedimento.trim() === '') {
    errors.push(`Linha ${rowIndex}: Procedimento é obrigatório`);
  }

  if (!row.plano || row.plano.trim() === '') {
    errors.push(`Linha ${rowIndex}: Plano é obrigatório`);
  }

  // Numeric validations
  if (row.total < 0) {
    errors.push(`Linha ${rowIndex}: Total não pode ser negativo`);
  }

  if (row.matmed < 0) {
    errors.push(`Linha ${rowIndex}: MatMed não pode ser negativo`);
  }

  if (row.valor_convenio < 0) {
    errors.push(`Linha ${rowIndex}: Valor Convênio não pode ser negativo`);
  }

  if (row.valor_particular < 0) {
    errors.push(`Linha ${rowIndex}: Valor Particular não pode ser negativo`);
  }

  // Business rule: total = valor_convenio + valor_particular
  const expectedTotal = row.valor_convenio + row.valor_particular;
  const tolerance = 0.01; // Allow 1 cent tolerance for floating point precision
  
  if (Math.abs(row.total - expectedTotal) > tolerance) {
    errors.push(`Linha ${rowIndex}: Total (${row.total}) deve ser igual à soma de Convênio (${row.valor_convenio}) + Particular (${row.valor_particular}) = ${expectedTotal}`);
  }

  // Warnings
  if (!row.paciente || row.paciente.trim() === '') {
    warnings.push(`Linha ${rowIndex}: Paciente não informado`);
  }

  if (!row.medico_solicitante || row.medico_solicitante.trim() === '') {
    warnings.push(`Linha ${rowIndex}: Médico solicitante não informado`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function parseExcelFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      throw new Error('Planilha não encontrada');
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length < 2) {
      throw new Error('Planilha deve conter pelo menos cabeçalho e uma linha de dados');
    }

    const headers = data[0];
    const rows = data.slice(1);

    console.log(`Headers found: ${headers.join(', ')}`);
    console.log(`Total rows: ${rows.length}`);

    // Column mapping from Excel to database
    const columnMapping = {
      'Data': 'data_exame',
      'Paciente': 'paciente', 
      'Procedimento': 'procedimento',
      'Plano': 'plano',
      'Médico Solicitante': 'medico_solicitante',
      'MatMed': 'matmed',
      'V. Convênio': 'valor_convenio',
      'V. Particular': 'valor_particular',
      'Total': 'total'
    };

    // Find column indices
    const columnIndices = {};
    for (const [excelCol, dbCol] of Object.entries(columnMapping)) {
      const index = headers.findIndex(h => h && h.toString().trim() === excelCol);
      if (index === -1) {
        throw new Error(`Coluna obrigatória não encontrada: ${excelCol}`);
      }
      columnIndices[dbCol] = index;
    }

    console.log('Column mapping:', columnIndices);

    const validatedRows = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < Math.min(rows.length, 10); i++) { // Test first 10 rows
      const row = rows[i];
      const rowIndex = i + 2; // Excel row number (1-indexed + header)

      try {
        // Skip empty rows
        if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
          continue;
        }

        const parsedRow = {
          data_exame: normalizeDate(row[columnIndices.data_exame]),
          paciente: (row[columnIndices.paciente] || '').toString().trim(),
          procedimento: (row[columnIndices.procedimento] || '').toString().trim(),
          plano: (row[columnIndices.plano] || '').toString().trim(),
          medico_solicitante: (row[columnIndices.medico_solicitante] || '').toString().trim(),
          matmed: normalizeDecimal(row[columnIndices.matmed]),
          valor_convenio: normalizeDecimal(row[columnIndices.valor_convenio]),
          valor_particular: normalizeDecimal(row[columnIndices.valor_particular]),
          total: normalizeDecimal(row[columnIndices.total])
        };

        const validation = validateRow(parsedRow, rowIndex);
        
        const validatedRow = {
          ...parsedRow,
          validation
        };

        validatedRows.push(validatedRow);

        if (validation.isValid) {
          validCount++;
          console.log(`✅ Row ${rowIndex}: Valid - ${parsedRow.procedimento} (${parsedRow.total})`);
        } else {
          invalidCount++;
          console.log(`❌ Row ${rowIndex}: Invalid - ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
          console.log(`⚠️  Row ${rowIndex}: Warnings - ${validation.warnings.join(', ')}`);
        }

      } catch (error) {
        console.log(`❌ Row ${rowIndex}: Parse error - ${error.message}`);
        invalidCount++;
      }
    }

    console.log(`\nSummary: ${validCount} valid, ${invalidCount} invalid rows (from first 10 tested)`);
    return validatedRows;

  } catch (error) {
    throw new Error(`Erro ao processar planilha: ${error.message}`);
  }
}

function main() {
  console.log('🧪 Testing Excel parsing...\n');
  
  const testFiles = [
    path.join(__dirname, 'test-sample.xlsx'),
    path.join(__dirname, 'test-data-valid.xlsx'),
    path.join(__dirname, 'test-data-mixed.xlsx')
  ];

  for (const filePath of testFiles) {
    if (fs.existsSync(filePath)) {
      console.log(`📄 Testing file: ${path.basename(filePath)}`);
      console.log('='.repeat(50));
      
      try {
        const results = parseExcelFile(filePath);
        console.log(`Successfully parsed ${results.length} rows\n`);
      } catch (error) {
        console.log(`❌ Error: ${error.message}\n`);
      }
    } else {
      console.log(`⚠️  File not found: ${filePath}\n`);
    }
  }

  // Test individual functions
  console.log('🔧 Testing utility functions...');
  console.log('='.repeat(50));
  
  // Test date normalization
  console.log('Date normalization tests:');
  try {
    console.log(`normalizeDate('15/01/2024') = ${normalizeDate('15/01/2024')}`);
    console.log(`normalizeDate('2024-01-15') = ${normalizeDate('2024-01-15')}`);
    console.log(`normalizeDate(new Date('2024-01-15')) = ${normalizeDate(new Date('2024-01-15'))}`);
  } catch (error) {
    console.log(`Date test error: ${error.message}`);
  }

  // Test decimal normalization
  console.log('\nDecimal normalization tests:');
  try {
    console.log(`normalizeDecimal('123.45') = ${normalizeDecimal('123.45')}`);
    console.log(`normalizeDecimal('123,45') = ${normalizeDecimal('123,45')}`);
    console.log(`normalizeDecimal(123.45) = ${normalizeDecimal(123.45)}`);
    console.log(`normalizeDecimal('') = ${normalizeDecimal('')}`);
  } catch (error) {
    console.log(`Decimal test error: ${error.message}`);
  }

  console.log('\n✅ Testing complete!');
}

if (require.main === module) {
  main();
}

module.exports = { parseExcelFile, normalizeDate, normalizeDecimal, validateRow };