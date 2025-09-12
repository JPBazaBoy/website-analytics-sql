import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile } from '@/lib/parse-xlsx';
import { 
  insertExamesBatch, 
  refreshMaterializedViews, 
  getDatabaseStats,
  ensureMaterializedViews 
} from '@/lib/batch-insert';

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Envie um arquivo Excel (.xlsx ou .xls)' },
        { status: 400 }
      );
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Processing file: ${file.name} (${file.size} bytes)`);

    // Parse Excel file
    const startParseTime = Date.now();
    const validatedRows = parseExcelFile(buffer);
    const parseTime = Date.now() - startParseTime;

    console.log(`Parsed ${validatedRows.length} rows in ${parseTime}ms`);

    // Collect all warnings from parsing
    const allWarnings: string[] = [];
    const allErrors: string[] = [];
    
    validatedRows.forEach(row => {
      allWarnings.push(...row.validation.warnings);
      allErrors.push(...row.validation.errors);
    });

    // If there are validation errors, return them without inserting
    const validRows = validatedRows.filter(row => row.validation.isValid);
    
    if (validRows.length === 0) {
      return NextResponse.json({
        inserted: 0,
        warnings: allWarnings,
        errors: allErrors,
        message: 'Nenhuma linha válida encontrada para inserção'
      }, { status: 400 });
    }

    // Get database stats before insertion
    const statsBefore = await getDatabaseStats();
    console.log(`Database stats before insertion:`, statsBefore);

    // Ensure materialized views exist
    await ensureMaterializedViews();

    // Insert valid rows into database
    const startInsertTime = Date.now();
    const insertResult = await insertExamesBatch(validatedRows, file.name);
    const insertTime = Date.now() - startInsertTime;

    console.log(`Inserted ${insertResult.inserted} rows in ${insertTime}ms`);

    // Refresh materialized views if data was inserted
    if (insertResult.inserted > 0) {
      const startRefreshTime = Date.now();
      try {
        await refreshMaterializedViews();
        const refreshTime = Date.now() - startRefreshTime;
        console.log(`Refreshed materialized views in ${refreshTime}ms`);
      } catch (refreshError) {
        console.warn('Failed to refresh materialized views:', refreshError);
        insertResult.warnings.push('Aviso: Falha ao atualizar cache de relatórios. Os dados foram inseridos com sucesso.');
      }
    }

    // Get database stats after insertion
    const statsAfter = await getDatabaseStats();
    console.log(`Database stats after insertion:`, statsAfter);

    // Prepare response
    const response = {
      inserted: insertResult.inserted,
      warnings: [...allWarnings, ...insertResult.warnings],
      errors: insertResult.errors,
      processing_time: {
        parse_ms: parseTime,
        insert_ms: insertTime,
        total_ms: Date.now() - startParseTime
      },
      file_info: {
        name: file.name,
        size: file.size,
        rows_processed: validatedRows.length,
        valid_rows: validRows.length,
        invalid_rows: validatedRows.length - validRows.length
      },
      database_stats: {
        before: statsBefore,
        after: statsAfter,
        new_records: statsAfter.totalExames - statsBefore.totalExames
      }
    };

    const statusCode = insertResult.errors.length > 0 ? 207 : 200; // 207 Multi-Status for partial success

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    console.error('Upload error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    
    return NextResponse.json(
      {
        inserted: 0,
        warnings: [],
        errors: [errorMessage],
        message: 'Erro ao processar arquivo'
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}

// GET endpoint for health check and API info
export async function GET() {
  try {
    const stats = await getDatabaseStats();
    
    return NextResponse.json({
      status: 'ok',
      message: 'API de upload ativa',
      database_stats: stats,
      supported_formats: ['.xlsx', '.xls'],
      max_file_size: '10MB',
      column_mapping: {
        'Data': 'data_exame',
        'Paciente': 'paciente',
        'Procedimento': 'procedimento',
        'Plano': 'plano',
        'Médico Solicitante': 'medico_solicitante',
        'MatMed': 'matmed',
        'V. Convênio': 'valor_convenio',
        'V. Particular': 'valor_particular',
        'Total': 'total'
      },
      validation_rules: [
        'total = valor_convenio + valor_particular',
        'Valores não podem ser negativos',
        'Procedimento é obrigatório',
        'Plano é obrigatório',
        'Data deve ser válida'
      ]
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Erro ao conectar com o banco de dados',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}