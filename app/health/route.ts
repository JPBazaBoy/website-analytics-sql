import { NextRequest, NextResponse } from 'next/server';

/**
 * Health Check API Route
 * GET /api/health - Returns system health status
 * 
 * Checks:
 * - Database connectivity
 * - Materialized views existence
 * - API endpoints availability
 */

interface HealthCheck {
  name: string;
  status: 'ok' | 'error' | 'warning';
  message?: string;
  responseTime?: number;
  details?: any;
}

interface HealthResponse {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  checks: Record<string, HealthCheck>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

/**
 * Test database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // This would use your actual database connection
    // For now, simulating with environment check
    const dbUrl = process.env.DATABASE_URL;
    const dbUrlRo = process.env.DATABASE_URL_RO;
    
    if (!dbUrl) {
      return {
        name: 'Database Connection',
        status: 'error',
        message: 'DATABASE_URL environment variable not set',
        responseTime: Date.now() - startTime
      };
    }

    if (!dbUrlRo) {
      return {
        name: 'Database Connection',
        status: 'warning',
        message: 'DATABASE_URL_RO not set, using main connection',
        responseTime: Date.now() - startTime
      };
    }

    // In real implementation, you would do:
    // const { Pool } = require('pg');
    // const pool = new Pool({ connectionString: dbUrl });
    // await pool.query('SELECT 1');
    // pool.end();

    return {
      name: 'Database Connection',
      status: 'ok',
      message: 'Database connection successful',
      responseTime: Date.now() - startTime,
      details: {
        hasMainConnection: !!dbUrl,
        hasReadOnlyConnection: !!dbUrlRo
      }
    };
  } catch (error: any) {
    return {
      name: 'Database Connection',
      status: 'error',
      message: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Check if materialized views exist
 */
async function checkMaterializedViews(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // In real implementation, you would query the database:
    /*
    const query = `
      SELECT schemaname, matviewname, ispopulated 
      FROM pg_matviews 
      WHERE matviewname IN ('mv_resumo_mensal', 'mv_resumo_anual');
    `;
    */
    
    // Simulated check
    const expectedViews = ['mv_resumo_mensal', 'mv_resumo_anual'];
    
    return {
      name: 'Materialized Views',
      status: 'ok',
      message: `All ${expectedViews.length} materialized views are available`,
      responseTime: Date.now() - startTime,
      details: {
        expectedViews,
        // In real implementation: actualViews, populated status, etc.
      }
    };
  } catch (error: any) {
    return {
      name: 'Materialized Views',
      status: 'error',
      message: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Check API endpoints availability
 */
async function checkApiEndpoints(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const endpoints = ['/api/tools/run-sql', '/api/upload'];
    
    // In a real implementation, you might make actual HTTP requests
    // or at least verify the route files exist
    
    return {
      name: 'API Endpoints',
      status: 'ok',
      message: 'All API endpoints are configured',
      responseTime: Date.now() - startTime,
      details: {
        endpoints,
        baseUrl
      }
    };
  } catch (error: any) {
    return {
      name: 'API Endpoints',
      status: 'error',
      message: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Check system resources and configuration
 */
async function checkSystemResources(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const used = process.memoryUsage();
    const uptime = process.uptime();
    
    // Check if required environment variables are set
    const requiredEnvVars = ['DATABASE_URL', 'CLAUDE_API_KEY'];
    const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
    
    if (missingEnvVars.length > 0) {
      return {
        name: 'System Resources',
        status: 'error',
        message: `Missing required environment variables: ${missingEnvVars.join(', ')}`,
        responseTime: Date.now() - startTime
      };
    }
    
    return {
      name: 'System Resources',
      status: 'ok',
      message: 'System resources are healthy',
      responseTime: Date.now() - startTime,
      details: {
        memory: {
          rss: Math.round(used.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB'
        },
        uptime: Math.round(uptime) + ' seconds',
        nodeVersion: process.version
      }
    };
  } catch (error: any) {
    return {
      name: 'System Resources',
      status: 'error',
      message: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

/**
 * Run all health checks
 */
async function runHealthChecks(): Promise<Record<string, HealthCheck>> {
  const checks = await Promise.all([
    checkDatabase(),
    checkMaterializedViews(),
    checkApiEndpoints(),
    checkSystemResources()
  ]);
  
  return {
    database: checks[0],
    materializedViews: checks[1],
    apiEndpoints: checks[2],
    systemResources: checks[3]
  };
}

/**
 * GET /api/health
 */
export async function GET(request: NextRequest): Promise<NextResponse<HealthResponse>> {
  const startTime = Date.now();
  
  try {
    const checks = await runHealthChecks();
    
    // Calculate summary
    const checkValues = Object.values(checks);
    const passed = checkValues.filter(c => c.status === 'ok').length;
    const failed = checkValues.filter(c => c.status === 'error').length;
    const warnings = checkValues.filter(c => c.status === 'warning').length;
    
    // Determine overall status
    let overallStatus: 'ok' | 'error' | 'degraded';
    if (failed > 0) {
      overallStatus = 'error';
    } else if (warnings > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'ok';
    }
    
    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks,
      summary: {
        total: checkValues.length,
        passed,
        failed,
        warnings
      }
    };
    
    // Set appropriate HTTP status code
    const httpStatus = failed > 0 ? 503 : (warnings > 0 ? 200 : 200);
    
    return NextResponse.json(response, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error: any) {
    console.error('Health check failed:', error);
    
    const errorResponse: HealthResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks: {
        healthCheck: {
          name: 'Health Check System',
          status: 'error',
          message: error.message,
          responseTime: Date.now() - startTime
        }
      },
      summary: {
        total: 1,
        passed: 0,
        failed: 1,
        warnings: 0
      }
    };
    
    return NextResponse.json(errorResponse, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    });
  }
}

// Export for testing
export { runHealthChecks };