#!/usr/bin/env node

/**
 * End-to-End Test Script
 * Tests the complete workflow:
 * 1. File upload
 * 2. Query execution via chat
 * 3. Response validation
 * 4. CSV download
 * 5. Sample data viewing
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

class E2ETestRunner {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testResults = [];
    this.testData = null;
  }

  /**
   * Log test step with color coding
   */
  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'
    };
    
    const timestamp = new Date().toISOString();
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  /**
   * Create a sample Excel file for testing
   */
  async createTestFile() {
    this.log('Creating test Excel file...', 'info');
    
    // In a real implementation, you would create an actual Excel file
    // For now, we'll create a CSV file to simulate the data
    const testData = [
      ['Data', 'Paciente', 'Procedimento', 'Plano', 'Médico Solicitante', 'MatMed', 'V. Convênio', 'V. Particular', 'Total'],
      ['2024-01-15', 'Paciente Teste 1', 'Exame Sangue', 'Unimed', 'Dr. Silva', '15.50', '85.00', '0.00', '85.00'],
      ['2024-02-20', 'Paciente Teste 2', 'Raio-X', 'Bradesco', 'Dr. Santos', '25.00', '120.00', '30.00', '150.00'],
      ['2024-03-10', 'Paciente Teste 3', 'Ultrassom', 'SulAmérica', 'Dr. Silva', '40.00', '200.00', '0.00', '200.00'],
      ['2024-04-05', 'Paciente Teste 4', 'Tomografia', 'Particular', 'Dr. Costa', '80.00', '0.00', '500.00', '500.00'],
      ['2024-05-12', 'Paciente Teste 5', 'Ressonância', 'Unimed', 'Dr. Santos', '120.00', '800.00', '0.00', '800.00']
    ];
    
    const csvContent = testData.map(row => row.join(',')).join('\n');
    const testFilePath = path.join(__dirname, 'test-data.csv');
    
    fs.writeFileSync(testFilePath, csvContent);
    
    this.log(`✅ Test file created: ${testFilePath}`, 'success');
    this.testData = { filePath: testFilePath, recordCount: testData.length - 1 };
    
    return this.testData;
  }

  /**
   * Test 1: File Upload
   */
  async testFileUpload() {
    this.log('🔄 Testing file upload...', 'info');
    
    try {
      if (!this.testData) {
        await this.createTestFile();
      }

      // Simulate file upload API call
      const form = new FormData();
      form.append('file', fs.createReadStream(this.testData.filePath));
      
      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        body: form
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      this.testResults.push({
        test: 'File Upload',
        status: 'PASS',
        details: {
          recordsInserted: result.inserted || 0,
          warnings: result.warnings || []
        }
      });
      
      this.log(`✅ File upload successful - ${result.inserted || 0} records inserted`, 'success');
      return true;
      
    } catch (error) {
      this.testResults.push({
        test: 'File Upload',
        status: 'FAIL',
        error: error.message
      });
      
      this.log(`❌ File upload failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Test 2: Query Execution via Chat
   */
  async testQueryExecution() {
    this.log('🔄 Testing query execution...', 'info');
    
    const testQueries = [
      {
        name: 'Faturamento Total',
        sql: 'SELECT SUM(total) as faturamento_total FROM exames WHERE ano = 2024'
      },
      {
        name: 'Top Procedimentos',
        sql: 'SELECT procedimento, COUNT(*) as quantidade FROM exames WHERE ano = 2024 GROUP BY procedimento ORDER BY quantidade DESC LIMIT 5'
      },
      {
        name: 'Receita por Plano',
        sql: 'SELECT plano, SUM(total) as receita FROM exames WHERE ano = 2024 GROUP BY plano ORDER BY receita DESC'
      }
    ];

    for (const query of testQueries) {
      try {
        const response = await fetch(`${this.baseUrl}/api/tools/run-sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sql: query.sql,
            max_rows: 50
          })
        });

        if (!response.ok) {
          throw new Error(`Query failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        this.testResults.push({
          test: `Query: ${query.name}`,
          status: 'PASS',
          details: {
            rowCount: result.rowCount,
            elapsedMs: result.elapsedMs,
            sampleRows: result.sampleRows?.length || 0
          }
        });
        
        this.log(`✅ Query "${query.name}" executed - ${result.rowCount} rows returned`, 'success');
        
      } catch (error) {
        this.testResults.push({
          test: `Query: ${query.name}`,
          status: 'FAIL',
          error: error.message
        });
        
        this.log(`❌ Query "${query.name}" failed: ${error.message}`, 'error');
      }
    }
  }

  /**
   * Test 3: Response Validation
   */
  async testResponseValidation() {
    this.log('🔄 Testing response validation...', 'info');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/tools/run-sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: 'SELECT COUNT(*) as total_records, SUM(total) as total_revenue FROM exames',
          max_rows: 1
        })
      });

      const result = await response.json();
      
      // Validate response structure
      const requiredFields = ['rowCount', 'sampleRows', 'elapsedMs', 'sql'];
      const hasAllFields = requiredFields.every(field => result.hasOwnProperty(field));
      
      if (!hasAllFields) {
        throw new Error('Response missing required fields');
      }

      // Validate data integrity
      if (result.sampleRows && result.sampleRows.length > 0) {
        const record = result.sampleRows[0];
        if (!record.total_records || !record.total_revenue) {
          throw new Error('Invalid data structure in response');
        }
      }

      this.testResults.push({
        test: 'Response Validation',
        status: 'PASS',
        details: {
          hasRequiredFields: true,
          dataIntegrityValid: true
        }
      });
      
      this.log('✅ Response validation passed', 'success');
      return true;
      
    } catch (error) {
      this.testResults.push({
        test: 'Response Validation',
        status: 'FAIL',
        error: error.message
      });
      
      this.log(`❌ Response validation failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Test 4: CSV Download
   */
  async testCsvDownload() {
    this.log('🔄 Testing CSV download...', 'info');
    
    try {
      // Simulate CSV download endpoint
      const response = await fetch(`${this.baseUrl}/api/export/csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: 'SELECT * FROM exames LIMIT 10'
        })
      });

      if (response.ok) {
        const csvData = await response.text();
        
        // Validate CSV format
        const lines = csvData.split('\n');
        const hasHeaders = lines.length > 0 && lines[0].includes(',');
        const hasData = lines.length > 1;

        this.testResults.push({
          test: 'CSV Download',
          status: 'PASS',
          details: {
            csvSize: csvData.length,
            lineCount: lines.length,
            hasHeaders,
            hasData
          }
        });
        
        this.log(`✅ CSV download successful - ${lines.length} lines`, 'success');
        return true;
      } else {
        throw new Error(`CSV download failed: ${response.status}`);
      }
      
    } catch (error) {
      this.testResults.push({
        test: 'CSV Download',
        status: 'FAIL',
        error: error.message
      });
      
      this.log(`❌ CSV download failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Test 5: Sample Data View
   */
  async testSampleDataView() {
    this.log('🔄 Testing sample data view...', 'info');
    
    try {
      const response = await fetch(`${this.baseUrl}/api/tools/run-sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: 'SELECT * FROM exames ORDER BY data_exame DESC',
          max_rows: 50
        })
      });

      const result = await response.json();
      
      // Validate sample data structure
      if (!result.sampleRows || result.sampleRows.length === 0) {
        throw new Error('No sample data returned');
      }

      const sampleRecord = result.sampleRows[0];
      const expectedFields = ['data_exame', 'procedimento', 'plano', 'total'];
      const hasExpectedFields = expectedFields.every(field => sampleRecord.hasOwnProperty(field));

      if (!hasExpectedFields) {
        throw new Error('Sample data missing expected fields');
      }

      this.testResults.push({
        test: 'Sample Data View',
        status: 'PASS',
        details: {
          sampleCount: result.sampleRows.length,
          hasExpectedFields,
          firstRecord: sampleRecord
        }
      });
      
      this.log(`✅ Sample data view successful - ${result.sampleRows.length} samples`, 'success');
      return true;
      
    } catch (error) {
      this.testResults.push({
        test: 'Sample Data View',
        status: 'FAIL',
        error: error.message
      });
      
      this.log(`❌ Sample data view failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Run all E2E tests
   */
  async runAllTests() {
    this.log('🚀 Starting End-to-End Tests', 'info');
    this.log('============================', 'info');
    
    const startTime = Date.now();
    
    // Run tests in sequence
    await this.testFileUpload();
    await this.testQueryExecution();
    await this.testResponseValidation();
    await this.testCsvDownload();
    await this.testSampleDataView();
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Generate summary
    this.generateSummary(totalTime);
    
    // Cleanup
    this.cleanup();
    
    return this.testResults;
  }

  /**
   * Generate test summary
   */
  generateSummary(totalTime) {
    this.log('\n📊 E2E TEST SUMMARY', 'info');
    this.log('===================', 'info');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    this.log(`✅ Passed: ${passed}/${total}`, passed === total ? 'success' : 'warning');
    this.log(`❌ Failed: ${failed}/${total}`, failed > 0 ? 'error' : 'success');
    this.log(`⏱️  Total time: ${totalTime}ms`, 'info');
    
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      this.log(`   ${status} ${result.test}`, result.status === 'PASS' ? 'success' : 'error');
      
      if (result.error) {
        this.log(`     Error: ${result.error}`, 'error');
      }
      
      if (result.details) {
        this.log(`     Details: ${JSON.stringify(result.details)}`, 'info');
      }
    });
    
    // Overall result
    const success = failed === 0;
    this.log(`\n🎯 Overall Result: ${success ? 'SUCCESS' : 'FAILURE'}`, success ? 'success' : 'error');
    
    return success;
  }

  /**
   * Cleanup test files
   */
  cleanup() {
    if (this.testData && this.testData.filePath && fs.existsSync(this.testData.filePath)) {
      fs.unlinkSync(this.testData.filePath);
      this.log('🧹 Cleanup completed', 'info');
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  if (require.main === module) {
    const baseUrl = process.argv[2] || 'http://localhost:3000';
    const runner = new E2ETestRunner(baseUrl);
    
    try {
      const results = await runner.runAllTests();
      
      // Exit with appropriate code
      const success = results.every(r => r.status === 'PASS');
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      console.error('❌ E2E test suite failed:', error.message);
      process.exit(1);
    }
  }
}

// Export for use by other modules
module.exports = { E2ETestRunner };

// Run if called directly
main().catch(console.error);