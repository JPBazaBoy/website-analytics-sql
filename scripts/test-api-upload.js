const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Import test data generator
const { generateTestData, createExcelFile } = require('./generate-test-xlsx');

class UploadTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testResults = [];
  }

  async testHealthCheck() {
    console.log('🔍 Testing API health check...');
    
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'GET'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Health check passed');
        console.log(`   Database has ${data.database_stats.totalExames} exams`);
        return { success: true, data };
      } else {
        console.log('❌ Health check failed');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${data.error || data.message}`);
        return { success: false, error: data };
      }
    } catch (error) {
      console.log('❌ Health check error');
      console.log(`   Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async uploadFile(filePath, testName) {
    console.log(`📤 Testing ${testName}...`);
    console.log(`   File: ${path.basename(filePath)}`);
    
    try {
      const fetch = (await import('node-fetch')).default;
      const fileBuffer = fs.readFileSync(filePath);
      
      const form = new FormData();
      form.append('file', fileBuffer, {
        filename: path.basename(filePath),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });

      const data = await response.json();
      
      const result = {
        testName,
        status: response.status,
        success: response.ok || response.status === 207, // 207 = Multi-Status (partial success)
        data
      };

      if (result.success) {
        console.log('✅ Upload successful');
        console.log(`   Inserted: ${data.inserted} records`);
        console.log(`   Warnings: ${data.warnings?.length || 0}`);
        console.log(`   Errors: ${data.errors?.length || 0}`);
        
        if (data.processing_time) {
          console.log(`   Processing time: ${data.processing_time.total_ms}ms`);
        }
        
        if (data.file_info) {
          console.log(`   Valid rows: ${data.file_info.valid_rows}/${data.file_info.rows_processed}`);
        }
      } else {
        console.log('❌ Upload failed');
        console.log(`   Status: ${response.status}`);
        console.log(`   Errors: ${data.errors?.join(', ') || 'Unknown error'}`);
      }

      // Show warnings and errors details
      if (data.warnings && data.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        data.warnings.slice(0, 5).forEach(warning => {
          console.log(`     ${warning}`);
        });
        if (data.warnings.length > 5) {
          console.log(`     ... and ${data.warnings.length - 5} more warnings`);
        }
      }

      if (data.errors && data.errors.length > 0) {
        console.log('🚨 Errors:');
        data.errors.slice(0, 5).forEach(error => {
          console.log(`     ${error}`);
        });
        if (data.errors.length > 5) {
          console.log(`     ... and ${data.errors.length - 5} more errors`);
        }
      }

      this.testResults.push(result);
      return result;

    } catch (error) {
      console.log('❌ Upload error');
      console.log(`   Error: ${error.message}`);
      
      const result = {
        testName,
        success: false,
        error: error.message
      };
      
      this.testResults.push(result);
      return result;
    }
  }

  async testInvalidFileType() {
    console.log('📤 Testing invalid file type...');
    
    try {
      const fetch = (await import('node-fetch')).default;
      
      // Create a text file instead of Excel
      const textContent = 'This is not an Excel file';
      
      const form = new FormData();
      form.append('file', Buffer.from(textContent), {
        filename: 'test.txt',
        contentType: 'text/plain'
      });

      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });

      const data = await response.json();
      
      if (response.status === 400 && data.error?.includes('Tipo de arquivo inválido')) {
        console.log('✅ Invalid file type correctly rejected');
        return { success: true, data };
      } else {
        console.log('❌ Invalid file type should have been rejected');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(data)}`);
        return { success: false, data };
      }
    } catch (error) {
      console.log('❌ Test error');
      console.log(`   Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testEmptyFile() {
    console.log('📤 Testing empty file...');
    
    try {
      const fetch = (await import('node-fetch')).default;
      
      const form = new FormData();
      // Don't append any file
      
      const response = await fetch(`${this.baseUrl}/api/upload`, {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });

      const data = await response.json();
      
      if (response.status === 400 && data.error?.includes('Nenhum arquivo enviado')) {
        console.log('✅ Empty request correctly rejected');
        return { success: true, data };
      } else {
        console.log('❌ Empty request should have been rejected');
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(data)}`);
        return { success: false, data };
      }
    } catch (error) {
      console.log('❌ Test error');
      console.log(`   Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  printSummary() {
    console.log('\\n📊 Test Summary');
    console.log('='.repeat(50));
    
    const successful = this.testResults.filter(r => r.success).length;
    const total = this.testResults.length;
    
    console.log(`Total tests: ${total}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${total - successful}`);
    console.log('');
    
    this.testResults.forEach(result => {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.testName}`);
      
      if (result.data?.inserted) {
        console.log(`   Inserted ${result.data.inserted} records`);
      }
      
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    return { successful, total, passed: successful === total };
  }
}

async function main() {
  console.log('🚀 Starting API Upload Tests');
  console.log('='.repeat(50));
  
  const tester = new UploadTester();
  
  // Test 1: Health check
  await tester.testHealthCheck();
  console.log('');
  
  // Test 2: Invalid file type
  await tester.testInvalidFileType();
  console.log('');
  
  // Test 3: Empty request
  await tester.testEmptyFile();
  console.log('');
  
  // Generate test files if they don't exist
  const scriptsDir = __dirname;
  const validFile = path.join(scriptsDir, 'test-data-valid.xlsx');
  const mixedFile = path.join(scriptsDir, 'test-data-mixed.xlsx');
  const sampleFile = path.join(scriptsDir, 'test-sample.xlsx');
  
  if (!fs.existsSync(validFile) || !fs.existsSync(mixedFile) || !fs.existsSync(sampleFile)) {
    console.log('📝 Generating test files...');
    try {
      const { spawn } = require('child_process');
      await new Promise((resolve, reject) => {
        const child = spawn('node', [path.join(scriptsDir, 'generate-test-xlsx.js')], {
          stdio: 'inherit'
        });
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Generator exited with code ${code}`));
        });
      });
      console.log('');
    } catch (error) {
      console.log(`❌ Failed to generate test files: ${error.message}`);
      console.log('Please run: node scripts/generate-test-xlsx.js');
      process.exit(1);
    }
  }
  
  // Test 4: Upload valid file
  if (fs.existsSync(validFile)) {
    await tester.uploadFile(validFile, 'Valid Excel file upload');
    console.log('');
  }
  
  // Test 5: Upload mixed file (valid + invalid data)
  if (fs.existsSync(mixedFile)) {
    await tester.uploadFile(mixedFile, 'Mixed valid/invalid Excel file upload');
    console.log('');
  }
  
  // Test 6: Upload sample file
  if (fs.existsSync(sampleFile)) {
    await tester.uploadFile(sampleFile, 'Sample Excel file upload');
    console.log('');
  }
  
  // Print final summary
  const summary = tester.printSummary();
  
  if (summary.passed) {
    console.log('\\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\\n💥 Some tests failed!');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { UploadTester };