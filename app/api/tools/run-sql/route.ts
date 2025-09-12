/**
 * SQL Execution API Route
 * 
 * Secure API endpoint for executing SELECT-only SQL queries against the read-only database.
 * Implements comprehensive guardrails and security measures.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prepareSql, sanitizeForLog } from '@/lib/sql-guard';
import { executeQuery } from '@/lib/db';
import { RunSqlRequest, RunSqlResponse, RunSqlErrorResponse } from '@/types/api';

// Maximum allowed query execution time (30 seconds)
const MAX_QUERY_TIMEOUT = 30000;

// Maximum allowed rows (hard limit)
const MAX_ROWS_HARD_LIMIT = 10000;

// Default row limit
const DEFAULT_ROW_LIMIT = 5000;

// Maximum sample rows to return in response
const MAX_SAMPLE_ROWS = 50;

/**
 * Validates request body structure and types
 */
function validateRequestBody(body: any): { isValid: boolean; error?: string; data?: RunSqlRequest } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be a JSON object' };
  }

  const { sql, max_rows } = body;

  // Validate SQL parameter
  if (!sql || typeof sql !== 'string') {
    return { isValid: false, error: 'sql parameter is required and must be a string' };
  }

  if (sql.trim().length === 0) {
    return { isValid: false, error: 'sql parameter cannot be empty' };
  }

  if (sql.length > 10000) {
    return { isValid: false, error: 'sql parameter exceeds maximum length of 10000 characters' };
  }

  // Validate max_rows parameter
  let maxRows = DEFAULT_ROW_LIMIT;
  
  if (max_rows !== undefined) {
    if (!Number.isInteger(max_rows) || max_rows < 1) {
      return { isValid: false, error: 'max_rows must be a positive integer' };
    }
    
    if (max_rows > MAX_ROWS_HARD_LIMIT) {
      return { isValid: false, error: `max_rows cannot exceed ${MAX_ROWS_HARD_LIMIT}` };
    }
    
    maxRows = max_rows;
  }

  return {
    isValid: true,
    data: { sql: sql.trim(), max_rows: maxRows }
  };
}

/**
 * Limits the number of sample rows returned to client
 */
function limitSampleRows(rows: any[]): any[] {
  return rows.slice(0, MAX_SAMPLE_ROWS);
}

/**
 * Creates error response with proper logging
 */
function createErrorResponse(
  error: string,
  details?: string,
  sql?: string,
  status: number = 400
): NextResponse<RunSqlErrorResponse> {
  const sanitizedSql = sql ? sanitizeForLog(sql) : undefined;
  
  // Log error (with sanitized SQL)
  console.error('[SQL API Error]', {
    error,
    details,
    sql: sanitizedSql,
    timestamp: new Date().toISOString()
  });

  return NextResponse.json(
    {
      success: false,
      error,
      details,
      sql: sanitizedSql
    },
    { status }
  );
}

/**
 * Creates success response with proper logging
 */
function createSuccessResponse(
  result: {
    rows: any[];
    rowCount: number;
    elapsedMs: number;
    sql: string;
  }
): NextResponse<RunSqlResponse> {
  const response: RunSqlResponse = {
    success: true,
    rowCount: result.rowCount,
    sampleRows: limitSampleRows(result.rows),
    elapsedMs: result.elapsedMs,
    sql: result.sql
  };

  // Log successful execution (with sanitized SQL)
  console.info('[SQL API Success]', {
    rowCount: result.rowCount,
    sampleRowCount: response.sampleRows.length,
    elapsedMs: result.elapsedMs,
    sql: sanitizeForLog(result.sql),
    timestamp: new Date().toISOString()
  });

  return NextResponse.json(response);
}

/**
 * POST /api/tools/run-sql
 * 
 * Executes a SELECT-only SQL query with comprehensive security guardrails
 */
export async function POST(request: NextRequest) {
  const requestStart = Date.now();
  
  try {
    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return createErrorResponse(
        'Invalid JSON in request body',
        parseError instanceof Error ? parseError.message : 'JSON parse failed'
      );
    }

    // Validate request structure
    const validation = validateRequestBody(body);
    if (!validation.isValid) {
      return createErrorResponse(validation.error!);
    }

    const { sql, max_rows } = validation.data!;

    // Apply SQL security guardrails
    const preparation = prepareSql(sql, max_rows);
    if (preparation.error) {
      return createErrorResponse(
        'SQL validation failed',
        preparation.error,
        sql,
        400
      );
    }

    const preparedSql = preparation.preparedSql!;

    // Execute query with timeout
    let result;
    try {
      result = await executeQuery(preparedSql, MAX_QUERY_TIMEOUT);
    } catch (dbError) {
      if (dbError instanceof Error) {
        // Handle specific database errors
        if (dbError.message.includes('timeout')) {
          return createErrorResponse(
            'Query timeout',
            `Query execution exceeded ${MAX_QUERY_TIMEOUT}ms timeout`,
            sql,
            408
          );
        }

        if (dbError.message.includes('permission denied')) {
          return createErrorResponse(
            'Database access denied',
            'The query requires privileges not available to the read-only user',
            sql,
            403
          );
        }

        if (dbError.message.includes('syntax error')) {
          return createErrorResponse(
            'SQL syntax error',
            dbError.message,
            sql,
            400
          );
        }

        if (dbError.message.includes('does not exist')) {
          return createErrorResponse(
            'Database object not found',
            'The referenced table, column, or function does not exist',
            sql,
            404
          );
        }

        // Generic database error
        return createErrorResponse(
          'Database error',
          dbError.message,
          sql,
          500
        );
      }

      // Unknown error type
      return createErrorResponse(
        'Unknown database error',
        'An unexpected error occurred during query execution',
        sql,
        500
      );
    }

    // Return successful response
    return createSuccessResponse(result);

  } catch (error) {
    // Handle unexpected server errors
    const totalElapsed = Date.now() - requestStart;
    
    console.error('[SQL API Unexpected Error]', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: totalElapsed,
      timestamp: new Date().toISOString()
    });

    return createErrorResponse(
      'Internal server error',
      'An unexpected error occurred while processing the request',
      undefined,
      500
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    { 
      success: false,
      error: 'Method not allowed',
      details: 'This endpoint only accepts POST requests'
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      success: false,
      error: 'Method not allowed',
      details: 'This endpoint only accepts POST requests'
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false,
      error: 'Method not allowed',
      details: 'This endpoint only accepts POST requests'
    },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { 
      success: false,
      error: 'Method not allowed',
      details: 'This endpoint only accepts POST requests'
    },
    { status: 405 }
  );
}