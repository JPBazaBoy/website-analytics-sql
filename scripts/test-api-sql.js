#!/usr/bin/env node

/**
 * SQL API Security Test Suite
 * 
 * Comprehensive test suite to validate all guardrails and security measures
 * of the run-sql API endpoint.
 */

const https = require('https');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_ENDPOINT = '/api/tools/run-sql';

// Test configuration
const TIMEOUT = 10000; // 10 seconds per test

/**
 * Makes HTTP request to API endpoint
 */
async function makeRequest(body, options = {}) {
  const url = `${API_BASE_URL}${API_ENDPOINT}`;
  
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: options.timeout || TIMEOUT
    };

    const httpModule = isHttps ? https : require('http');
    
    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: parsedData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * Test case runner
 */
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  addTest(name, description, testFn) {
    this.tests.push({ name, description, testFn });
  }

  async runTest(test) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`   ${test.description}`);
    
    const startTime = Date.now();
    
    try {
      const result = await test.testFn();
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log(`   ✅ PASS (${duration}ms)`);
        if (result.details) {
          console.log(`   📝 ${result.details}`);
        }
        
        this.results.push({ 
          name: test.name, 
          status: 'PASS', 
          duration, 
          details: result.details 
        });
      } else {
        console.log(`   ❌ FAIL (${duration}ms)`);
        console.log(`   💬 ${result.reason}`);
        
        this.results.push({ 
          name: test.name, 
          status: 'FAIL', 
          duration, 
          reason: result.reason 
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   💥 ERROR (${duration}ms)`);
      console.log(`   💬 ${error.message}`);
      
      this.results.push({ 
        name: test.name, 
        status: 'ERROR', 
        duration, 
        error: error.message 
      });
    }
  }

  async runAll() {
    console.log('🚀 Starting SQL API Security Test Suite');
    console.log(`📡 Target: ${API_BASE_URL}${API_ENDPOINT}\n`);

    for (const test of this.tests) {
      await this.runTest(test);
    }

    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`💥 Errors: ${errors}`);

    if (failed > 0 || errors > 0) {
      console.log('\n🔍 Failed/Error Details:');
      this.results
        .filter(r => r.status !== 'PASS')
        .forEach(result => {
          console.log(`\n   ${result.name}: ${result.status}`);
          if (result.reason) console.log(`   Reason: ${result.reason}`);
          if (result.error) console.log(`   Error: ${result.error}`);
        });
    }

    const overallStatus = (failed === 0 && errors === 0) ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED';
    console.log(`\n${overallStatus}\n`);
  }
}

// Initialize test runner
const runner = new TestRunner();

// =============================================
// SECURITY GUARDRAILS TESTS
// =============================================

runner.addTest(
  'Valid SELECT Query',
  'Should execute a simple SELECT statement successfully',
  async () => {
    const response = await makeRequest({
      sql: 'SELECT 1 as test_value, NOW() as current_time'
    });

    if (response.status !== 200) {
      return { success: false, reason: `Expected status 200, got ${response.status}` };
    }

    if (!response.data.success) {
      return { success: false, reason: `API returned success: false - ${response.data.error}` };
    }

    if (!response.data.sampleRows || response.data.sampleRows.length === 0) {
      return { success: false, reason: 'No sample rows returned' };
    }

    return { 
      success: true, 
      details: `Returned ${response.data.rowCount} rows in ${response.data.elapsedMs}ms` 
    };
  }
);

runner.addTest(
  'Block INSERT Statement',
  'Should reject INSERT statements with appropriate error',
  async () => {
    const response = await makeRequest({
      sql: "INSERT INTO exames (procedimento, plano, total) VALUES ('test', 'test', 100)"
    });

    if (response.status === 200 && response.data.success) {
      return { success: false, reason: 'INSERT statement was allowed - security breach!' };
    }

    if (response.status === 400 && response.data.error && 
        response.data.error.includes('Only SELECT statements are allowed')) {
      return { success: true, details: 'INSERT properly blocked' };
    }

    return { 
      success: false, 
      reason: `Unexpected response: ${response.status} - ${JSON.stringify(response.data)}` 
    };
  }
);

runner.addTest(
  'Block UPDATE Statement',
  'Should reject UPDATE statements with appropriate error',
  async () => {
    const response = await makeRequest({
      sql: "UPDATE exames SET total = 999 WHERE id = 1"
    });

    if (response.status === 200 && response.data.success) {
      return { success: false, reason: 'UPDATE statement was allowed - security breach!' };
    }

    if (response.status === 400 && response.data.error && 
        response.data.error.includes('Only SELECT statements are allowed')) {
      return { success: true, details: 'UPDATE properly blocked' };
    }

    return { 
      success: false, 
      reason: `Unexpected response: ${response.status} - ${JSON.stringify(response.data)}` 
    };
  }
);

runner.addTest(
  'Block DELETE Statement',
  'Should reject DELETE statements with appropriate error',
  async () => {
    const response = await makeRequest({
      sql: "DELETE FROM exames WHERE id = 1"
    });

    if (response.status === 200 && response.data.success) {
      return { success: false, reason: 'DELETE statement was allowed - security breach!' };
    }

    if (response.status === 400 && response.data.error && 
        response.data.error.includes('Only SELECT statements are allowed')) {
      return { success: true, details: 'DELETE properly blocked' };
    }

    return { 
      success: false, 
      reason: `Unexpected response: ${response.status} - ${JSON.stringify(response.data)}` 
    };
  }
);

runner.addTest(
  'Block DROP Statement',
  'Should reject DROP statements with appropriate error',
  async () => {
    const response = await makeRequest({
      sql: "DROP TABLE exames"
    });

    if (response.status === 200 && response.data.success) {
      return { success: false, reason: 'DROP statement was allowed - security breach!' };
    }

    if (response.status === 400 && response.data.error && 
        response.data.error.includes('Only SELECT statements are allowed')) {
      return { success: true, details: 'DROP properly blocked' };
    }

    return { 
      success: false, 
      reason: `Unexpected response: ${response.status} - ${JSON.stringify(response.data)}` 
    };
  }
);

runner.addTest(
  'Block CREATE Statement',
  'Should reject CREATE statements with appropriate error',
  async () => {
    const response = await makeRequest({
      sql: "CREATE TABLE test_table (id INT)"
    });

    if (response.status === 200 && response.data.success) {
      return { success: false, reason: 'CREATE statement was allowed - security breach!' };
    }

    if (response.status === 400 && response.data.error && 
        response.data.error.includes('Only SELECT statements are allowed')) {
      return { success: true, details: 'CREATE properly blocked' };
    }

    return { 
      success: false, 
      reason: `Unexpected response: ${response.status} - ${JSON.stringify(response.data)}` 
    };
  }
);

runner.addTest(
  'Block Multiple Statements',
  'Should reject multiple statements separated by semicolons',
  async () => {
    const response = await makeRequest({
      sql: "SELECT 1; DROP TABLE exames;"
    });

    if (response.status === 200 && response.data.success) {
      return { success: false, reason: 'Multiple statements were allowed - security breach!' };
    }

    if (response.status === 400 && response.data.error && 
        response.data.error.includes('Multiple statements are not allowed')) {
      return { success: true, details: 'Multiple statements properly blocked' };
    }

    return { 
      success: false, 
      reason: `Unexpected response: ${response.status} - ${JSON.stringify(response.data)}` 
    };
  }
);

runner.addTest(
  'Automatic LIMIT Injection',
  'Should automatically inject LIMIT when not present',
  async () => {
    const response = await makeRequest({
      sql: "SELECT generate_series(1, 10000) as number",
      max_rows: 100
    });

    if (response.status !== 200 || !response.data.success) {
      return { 
        success: false, 
        reason: `Query failed: ${response.data?.error || 'Unknown error'}` 
      };
    }

    if (!response.data.sql.toUpperCase().includes('LIMIT')) {
      return { success: false, reason: 'LIMIT was not injected into the SQL' };
    }

    if (response.data.sampleRows.length > 100) {
      return { success: false, reason: `Too many rows returned: ${response.data.sampleRows.length}` };
    }

    return { 
      success: true, 
      details: `LIMIT properly injected, returned ${response.data.sampleRows.length} rows` 
    };
  }
);

runner.addTest(
  'Respect Existing LIMIT',
  'Should not modify SQL that already has LIMIT clause',
  async () => {
    const response = await makeRequest({
      sql: "SELECT generate_series(1, 1000) as number LIMIT 5",
      max_rows: 100
    });

    if (response.status !== 200 || !response.data.success) {
      return { 
        success: false, 
        reason: `Query failed: ${response.data?.error || 'Unknown error'}` 
      };
    }

    if (response.data.sampleRows.length !== 5) {
      return { 
        success: false, 
        reason: `Expected 5 rows, got ${response.data.sampleRows.length}` 
      };
    }

    return { 
      success: true, 
      details: 'Existing LIMIT clause was respected' 
    };
  }
);

// =============================================
// VALIDATION TESTS
// =============================================

runner.addTest(
  'Empty SQL Rejection',
  'Should reject empty or whitespace-only SQL',
  async () => {
    const response = await makeRequest({
      sql: "   \n  \t  "
    });

    if (response.status === 200 && response.data.success) {
      return { success: false, reason: 'Empty SQL was accepted' };
    }

    if (response.status === 400 && response.data.error) {
      return { success: true, details: 'Empty SQL properly rejected' };
    }

    return { 
      success: false, 
      reason: `Unexpected response: ${response.status}` 
    };
  }
);

runner.addTest(
  'Invalid max_rows Parameter',
  'Should reject invalid max_rows values',
  async () => {
    const response = await makeRequest({
      sql: "SELECT 1",
      max_rows: -5
    });

    if (response.status === 200 && response.data.success) {
      return { success: false, reason: 'Negative max_rows was accepted' };
    }

    if (response.status === 400 && response.data.error && 
        response.data.error.includes('must be a positive integer')) {
      return { success: true, details: 'Invalid max_rows properly rejected' };
    }

    return { 
      success: false, 
      reason: `Unexpected response: ${response.status} - ${JSON.stringify(response.data)}` 
    };
  }
);

runner.addTest(
  'Missing SQL Parameter',
  'Should reject requests without sql parameter',
  async () => {
    const response = await makeRequest({
      max_rows: 100
    });

    if (response.status === 200 && response.data.success) {
      return { success: false, reason: 'Request without SQL was accepted' };
    }

    if (response.status === 400 && response.data.error && 
        response.data.error.includes('sql parameter is required')) {
      return { success: true, details: 'Missing SQL parameter properly rejected' };
    }

    return { 
      success: false, 
      reason: `Unexpected response: ${response.status} - ${JSON.stringify(response.data)}` 
    };
  }
);

runner.addTest(
  'Invalid JSON Body',
  'Should reject malformed JSON requests',
  async () => {
    try {
      const url = `${API_BASE_URL}${API_ENDPOINT}`;
      const urlObj = new URL(url);
      
      const response = await new Promise((resolve, reject) => {
        const requestOptions = {
          hostname: urlObj.hostname,
          port: urlObj.port || 80,
          path: urlObj.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        };

        const req = require('http').request(requestOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode,
                data: JSON.parse(data)
              });
            } catch {
              resolve({
                status: res.statusCode,
                data: data
              });
            }
          });
        });

        req.on('error', reject);
        req.write('{ invalid json }');
        req.end();
      });

      if (response.status === 200) {
        return { success: false, reason: 'Invalid JSON was accepted' };
      }

      if (response.status === 400) {
        return { success: true, details: 'Invalid JSON properly rejected' };
      }

      return { 
        success: false, 
        reason: `Unexpected status: ${response.status}` 
      };
    } catch (error) {
      return { 
        success: false, 
        reason: `Test error: ${error.message}` 
      };
    }
  }
);

// =============================================
// METHOD VALIDATION TESTS
// =============================================

runner.addTest(
  'GET Method Rejection',
  'Should reject GET requests with 405 Method Not Allowed',
  async () => {
    try {
      const url = `${API_BASE_URL}${API_ENDPOINT}`;
      const urlObj = new URL(url);
      
      const response = await new Promise((resolve, reject) => {
        const requestOptions = {
          hostname: urlObj.hostname,
          port: urlObj.port || 80,
          path: urlObj.pathname,
          method: 'GET'
        };

        const req = require('http').request(requestOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode,
                data: JSON.parse(data)
              });
            } catch {
              resolve({
                status: res.statusCode,
                data: data
              });
            }
          });
        });

        req.on('error', reject);
        req.end();
      });

      if (response.status === 405) {
        return { success: true, details: 'GET method properly rejected with 405' };
      }

      return { 
        success: false, 
        reason: `Expected 405, got ${response.status}` 
      };
    } catch (error) {
      return { 
        success: false, 
        reason: `Test error: ${error.message}` 
      };
    }
  }
);

// =============================================
// RUN TESTS
// =============================================

if (require.main === module) {
  runner.runAll().catch(error => {
    console.error('💥 Test runner error:', error);
    process.exit(1);
  });
}

module.exports = { TestRunner, makeRequest };