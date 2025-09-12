/**
 * API Type Definitions
 * 
 * Comprehensive type definitions for the SQL API endpoints including
 * request/response schemas and internal data structures.
 */

// =============================================
// SQL API Types
// =============================================

/**
 * Request body for the run-sql API endpoint
 */
export interface RunSqlRequest {
  /** SQL SELECT statement to execute */
  sql: string;
  /** Maximum number of rows to return (default: 5000) */
  max_rows?: number;
}

/**
 * Response from the run-sql API endpoint
 */
export interface RunSqlResponse {
  /** Total number of rows that match the query (before LIMIT) */
  rowCount: number;
  /** Sample of rows returned (limited by max_rows parameter) */
  sampleRows: Record<string, any>[];
  /** Query execution time in milliseconds */
  elapsedMs: number;
  /** The actual SQL executed (may include injected LIMIT) */
  sql: string;
  /** Success status */
  success: true;
}

/**
 * Error response from the run-sql API endpoint
 */
export interface RunSqlErrorResponse {
  /** Error message */
  error: string;
  /** Error details (optional) */
  details?: string;
  /** The original SQL that caused the error */
  sql?: string;
  /** Success status */
  success: false;
}

/**
 * Union type for all possible run-sql API responses
 */
export type RunSqlApiResponse = RunSqlResponse | RunSqlErrorResponse;

// =============================================
// Upload API Types
// =============================================

/**
 * Response from the upload API endpoint
 */
export interface UploadResponse {
  /** Number of records successfully inserted */
  inserted: number;
  /** Array of validation warnings (non-fatal issues) */
  warnings: string[];
  /** Success status */
  success: true;
}

/**
 * Error response from the upload API endpoint
 */
export interface UploadErrorResponse {
  /** Error message */
  error: string;
  /** Error details (optional) */
  details?: string;
  /** Number of records processed before error */
  processed?: number;
  /** Success status */
  success: false;
}

/**
 * Union type for all possible upload API responses
 */
export type UploadApiResponse = UploadResponse | UploadErrorResponse;

// =============================================
// Database Types
// =============================================

/**
 * Represents a row from the exames table
 */
export interface ExameRow {
  id: number;
  data_exame: string; // DATE as ISO string
  ano: number;
  mes: number;
  paciente: string | null;
  procedimento: string;
  plano: string;
  medico_solicitante: string | null;
  matmed: number;
  valor_convenio: number;
  valor_particular: number;
  total: number;
  receita_liquida: number;
  fonte: string | null;
  created_at: string; // TIMESTAMP as ISO string
}

/**
 * Monthly summary from materialized view
 */
export interface ResumoMensal {
  ref_month: string; // DATE as ISO string
  total_exames: number;
  receita_bruta: number;
  custo_matmed: number;
  receita_liquida: number;
}

/**
 * Annual summary from materialized view
 */
export interface ResumoAnual {
  ano: number;
  total_exames: number;
  receita_bruta: number;
  custo_matmed: number;
  receita_liquida: number;
}

// =============================================
// Internal Types
// =============================================

/**
 * SQL validation result
 */
export interface SqlValidationResult {
  /** Whether the SQL is valid and safe */
  isValid: boolean;
  /** Error message if validation failed */
  error?: string;
}

/**
 * SQL preparation result
 */
export interface SqlPreparationResult {
  /** The prepared SQL ready for execution */
  preparedSql?: string;
  /** Error message if preparation failed */
  error?: string;
  /** The original SQL input */
  originalSql: string;
}

/**
 * Database connection test result
 */
export interface ConnectionTestResult {
  /** Whether the connection test succeeded */
  success: boolean;
  /** Status message */
  message: string;
  /** Test execution time in milliseconds */
  elapsedMs: number;
}

/**
 * Database pool statistics
 */
export interface PoolStats {
  /** Total number of connections in the pool */
  totalCount: number;
  /** Number of idle connections */
  idleCount: number;
  /** Number of requests waiting for a connection */
  waitingCount: number;
}

// =============================================
// Excel Upload Types
// =============================================

/**
 * Raw Excel row before normalization
 */
export interface RawExcelRow {
  [key: string]: any;
}

/**
 * Normalized Excel row ready for database insertion
 */
export interface NormalizedExcelRow {
  data_exame: string; // ISO date string
  paciente?: string;
  procedimento: string;
  plano: string;
  medico_solicitante?: string;
  matmed: number;
  valor_convenio: number;
  valor_particular: number;
  total: number;
  fonte: string;
}

/**
 * Validation warning for Excel processing
 */
export interface ValidationWarning {
  /** Row number (1-based) */
  row: number;
  /** Warning message */
  message: string;
  /** Field that caused the warning */
  field?: string;
  /** Original value that was corrected */
  originalValue?: any;
  /** Corrected value */
  correctedValue?: any;
}

// =============================================
// API Error Types
// =============================================

/**
 * Standard API error response structure
 */
export interface ApiError {
  /** Error message */
  error: string;
  /** HTTP status code */
  status: number;
  /** Error details (optional) */
  details?: string;
  /** Request timestamp */
  timestamp: string;
  /** Request path */
  path?: string;
}

/**
 * Request validation error
 */
export interface ValidationError extends ApiError {
  /** Field-specific validation errors */
  fieldErrors?: Record<string, string[]>;
}

// =============================================
// Utility Types
// =============================================

/**
 * Generic API response wrapper
 */
export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  details?: string;
};

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Number of items per page */
  limit?: number;
  /** Total count of items */
  total?: number;
}

/**
 * Sorting parameters
 */
export interface SortParams {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
}