/**
 * SQL Security Guardrails
 * 
 * This module provides comprehensive SQL validation to ensure only safe SELECT statements
 * are executed against the read-only database connection.
 */

// Regular expressions for SQL validation
const SELECT_ONLY_REGEX = /^\s*(SELECT|WITH)\s+/i;
const DML_KEYWORDS = /\b(INSERT|UPDATE|DELETE|MERGE|UPSERT|REPLACE)\b/i;
const DDL_KEYWORDS = /\b(CREATE|DROP|ALTER|TRUNCATE|RENAME)\b/i;
const ADMIN_KEYWORDS = /\b(GRANT|REVOKE|SET|RESET|SHOW|EXPLAIN|ANALYZE)\b/i;
const MULTIPLE_STATEMENTS = /;\s*\w/;
const COMMENTS_REGEX = /--.+$|\/\*.+?\*\//gm;

/**
 * Validates that SQL contains only SELECT statements
 * @param sql - The SQL string to validate
 * @returns boolean indicating if SQL is SELECT-only
 */
export function isSelectOnly(sql: string): boolean {
  const cleanSql = sql.trim();
  
  if (!cleanSql) {
    return false;
  }

  // Remove comments for validation
  const sqlWithoutComments = cleanSql.replace(COMMENTS_REGEX, '');
  
  // Must start with SELECT or WITH
  if (!SELECT_ONLY_REGEX.test(sqlWithoutComments)) {
    return false;
  }
  
  // Must not contain DML keywords
  if (DML_KEYWORDS.test(sqlWithoutComments)) {
    return false;
  }
  
  // Must not contain DDL keywords
  if (DDL_KEYWORDS.test(sqlWithoutComments)) {
    return false;
  }
  
  // Must not contain admin keywords
  if (ADMIN_KEYWORDS.test(sqlWithoutComments)) {
    return false;
  }
  
  return true;
}

/**
 * Validates that SQL contains only a single statement (no multiple statements separated by ;)
 * @param sql - The SQL string to validate
 * @returns boolean indicating if SQL has only one statement
 */
export function hasSingleStatement(sql: string): boolean {
  const trimmed = sql.trim();
  
  // Remove comments
  const sqlWithoutComments = trimmed.replace(COMMENTS_REGEX, '');
  
  // Check for multiple statements
  if (MULTIPLE_STATEMENTS.test(sqlWithoutComments)) {
    return false;
  }
  
  // Allow trailing semicolon but not additional statements
  const cleanSql = sqlWithoutComments.replace(/;\s*$/, '');
  
  return !cleanSql.includes(';');
}

/**
 * Injects LIMIT clause if not present in the SQL
 * @param sql - The SQL string to modify
 * @param limit - The maximum number of rows to return
 * @returns SQL string with LIMIT clause
 */
export function injectLimit(sql: string, limit: number = 5000): string {
  const trimmed = sql.trim().replace(/;\s*$/, ''); // Remove trailing semicolon
  
  // Check if LIMIT already exists (case-insensitive)
  if (/\bLIMIT\s+\d+/i.test(trimmed)) {
    return trimmed;
  }
  
  // Add LIMIT clause
  return `${trimmed} LIMIT ${limit}`;
}

/**
 * Sanitizes SQL for logging purposes (removes potential sensitive data patterns)
 * @param sql - The SQL string to sanitize
 * @returns Sanitized SQL string safe for logging
 */
export function sanitizeForLog(sql: string): string {
  // Replace potential sensitive patterns with placeholders
  let sanitized = sql
    // Replace quoted strings with placeholders
    .replace(/'[^']*'/g, "'***'")
    .replace(/"[^"]*"/g, '"***"')
    // Replace potential email patterns
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***')
    // Replace potential phone patterns
    .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '***-***-****')
    .replace(/\b\(\d{3}\)\s*\d{3}-\d{4}\b/g, '(***) ***-****');
  
  return sanitized;
}

/**
 * Comprehensive SQL validation combining all security checks
 * @param sql - The SQL string to validate
 * @returns Object with validation result and error message if invalid
 */
export function validateSql(sql: string): { isValid: boolean; error?: string } {
  if (!sql || !sql.trim()) {
    return { isValid: false, error: 'SQL cannot be empty' };
  }
  
  if (!isSelectOnly(sql)) {
    return { isValid: false, error: 'Only SELECT statements are allowed' };
  }
  
  if (!hasSingleStatement(sql)) {
    return { isValid: false, error: 'Multiple statements are not allowed' };
  }
  
  return { isValid: true };
}

/**
 * Validates and prepares SQL for execution
 * @param sql - Raw SQL input
 * @param maxRows - Maximum rows to return (default: 5000)
 * @returns Object with prepared SQL or error
 */
export function prepareSql(sql: string, maxRows: number = 5000): { 
  preparedSql?: string; 
  error?: string; 
  originalSql: string;
} {
  const validation = validateSql(sql);
  
  if (!validation.isValid) {
    return { 
      error: validation.error,
      originalSql: sql 
    };
  }
  
  const sqlWithLimit = injectLimit(sql, maxRows);
  
  return {
    preparedSql: sqlWithLimit,
    originalSql: sql
  };
}