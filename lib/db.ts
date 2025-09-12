/**
 * Database Connection Pool
 * 
 * Manages PostgreSQL connections using read-only credentials for secure query execution.
 * Includes connection pooling, query timeout, and comprehensive error handling.
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// Global connection pool for read-only operations
let pool: Pool | null = null;

/**
 * Configuration interface for database connections
 */
interface DbConfig {
  connectionString: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Query execution result interface
 */
export interface QueryExecutionResult {
  rows: any[];
  rowCount: number;
  elapsedMs: number;
  sql: string;
}

/**
 * Creates and configures the database connection pool
 * @param config - Database configuration options
 * @returns Pool instance
 */
function createPool(config: DbConfig): Pool {
  return new Pool({
    connectionString: config.connectionString,
    max: config.max || 10, // Maximum number of clients in the pool
    idleTimeoutMillis: config.idleTimeoutMillis || 30000, // Close idle clients after 30s
    connectionTimeoutMillis: config.connectionTimeoutMillis || 5000, // Timeout for acquiring connection
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

/**
 * Gets or creates the singleton database pool using read-only credentials
 * @returns Database pool instance
 */
export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL_RO;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL_RO environment variable is required');
    }
    
    pool = createPool({
      connectionString,
      max: 5, // Limit connections for read-only operations
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
    
    // Handle client connection errors
    pool.on('connect', (client: PoolClient) => {
      client.on('error', (err) => {
        console.error('Database client error:', err);
      });
    });
  }
  
  return pool;
}

/**
 * Executes a SQL query with timeout and error handling
 * @param sql - SQL query to execute
 * @param timeout - Query timeout in milliseconds (default: 30000)
 * @returns Promise with query execution result
 */
export async function executeQuery(
  sql: string, 
  timeout: number = 30000
): Promise<QueryExecutionResult> {
  const startTime = Date.now();
  const dbPool = getDbPool();
  let client: PoolClient | null = null;
  
  try {
    // Acquire client from pool with timeout
    client = await Promise.race([
      dbPool.connect(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]);
    
    // Execute query with timeout
    const result: QueryResult = await Promise.race([
      client.query(sql),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      )
    ]);
    
    const elapsedMs = Date.now() - startTime;
    
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0,
      elapsedMs,
      sql
    };
    
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    
    // Enhanced error handling with context
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        throw new Error(`Query timeout after ${elapsedMs}ms: ${error.message}`);
      }
      
      if (error.message.includes('permission denied')) {
        throw new Error('Database permission denied - ensure read-only user has SELECT privileges');
      }
      
      if (error.message.includes('syntax error')) {
        throw new Error(`SQL syntax error: ${error.message}`);
      }
      
      if (error.message.includes('does not exist')) {
        throw new Error(`Database object not found: ${error.message}`);
      }
      
      // Generic database error
      throw new Error(`Database error: ${error.message}`);
    }
    
    throw new Error('Unknown database error occurred');
    
  } finally {
    // Always release the client back to the pool
    if (client) {
      client.release();
    }
  }
}

/**
 * Tests database connectivity
 * @returns Promise with connection test result
 */
export async function testConnection(): Promise<{ success: boolean; message: string; elapsedMs: number }> {
  const startTime = Date.now();
  
  try {
    const result = await executeQuery('SELECT 1 as test', 5000);
    const elapsedMs = Date.now() - startTime;
    
    if (result.rows[0]?.test === 1) {
      return {
        success: true,
        message: 'Database connection successful',
        elapsedMs
      };
    } else {
      return {
        success: false,
        message: 'Unexpected test query result',
        elapsedMs
      };
    }
    
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
      elapsedMs
    };
  }
}

/**
 * Gracefully closes the database pool
 * @returns Promise that resolves when pool is closed
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Gets current pool statistics for monitoring
 * @returns Pool statistics or null if pool not initialized
 */
export function getPoolStats(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
} | null {
  if (!pool) {
    return null;
  }
  
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
}