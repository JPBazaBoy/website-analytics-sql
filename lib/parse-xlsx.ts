import * as XLSX from 'xlsx';

export interface ParsedRow {
  data_exame: string;
  paciente: string;
  procedimento: string;
  plano: string;
  medico_solicitante: string;
  matmed: number;
  valor_convenio: number;
  valor_particular: number;
  total: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidatedRow extends ParsedRow {
  validation: ValidationResult;
}

/**
 * Normalize date value to ISO string (YYYY-MM-DD)
 */
export function normalizeDate(value: any): string {
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

/**
 * Normalize decimal value (handle comma as decimal separator)
 */
export function normalizeDecimal(value: any): number {
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

/**
 * Validate a parsed row according to business rules
 */
export function validateRow(row: ParsedRow, rowIndex: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

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

  // Date validation
  try {
    const date = new Date(row.data_exame);
    if (isNaN(date.getTime())) {
      errors.push(`Linha ${rowIndex}: Data inválida: ${row.data_exame}`);
    }
  } catch (error) {
    errors.push(`Linha ${rowIndex}: Erro ao validar data: ${error}`);
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

/**
 * Parse Excel file buffer and return array of parsed rows
 */
export function parseExcelFile(buffer: Buffer): ValidatedRow[] {
  try {
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

    const headers = data[0] as string[];
    const rows = data.slice(1) as any[][];

    // Column mapping from Excel to database
    const columnMapping: Record<string, string> = {
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
    const columnIndices: Record<string, number> = {};
    for (const [excelCol, dbCol] of Object.entries(columnMapping)) {
      const index = headers.findIndex(h => h && h.toString().trim() === excelCol);
      if (index === -1) {
        throw new Error(`Coluna obrigatória não encontrada: ${excelCol}`);
      }
      columnIndices[dbCol] = index;
    }

    const validatedRows: ValidatedRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // Excel row number (1-indexed + header)

      try {
        // Skip empty rows
        if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
          continue;
        }

        const parsedRow: ParsedRow = {
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
        
        validatedRows.push({
          ...parsedRow,
          validation
        });

      } catch (error) {
        validatedRows.push({
          data_exame: '',
          paciente: '',
          procedimento: '',
          plano: '',
          medico_solicitante: '',
          matmed: 0,
          valor_convenio: 0,
          valor_particular: 0,
          total: 0,
          validation: {
            isValid: false,
            errors: [`Linha ${rowIndex}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
            warnings: []
          }
        });
      }
    }

    return validatedRows;

  } catch (error) {
    throw new Error(`Erro ao processar planilha: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}