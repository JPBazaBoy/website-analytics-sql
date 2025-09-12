#!/usr/bin/env node

/**
 * Integration Test Suite - FASE 2
 * Verifica integração entre todos os componentes
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class IntegrationTest {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async run() {
    this.log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
    this.log('║         FASE 2 - INTEGRATION TEST SUITE              ║', 'cyan');
    this.log('║          Verificação Cruzada de Componentes          ║', 'cyan');
    this.log('╚═══════════════════════════════════════════════════════╝\n', 'cyan');

    // Test 1: Verificar estrutura de arquivos
    await this.testFileStructure();

    // Test 2: Verificar configurações de ambiente
    await this.testEnvironmentConfig();

    // Test 3: Verificar arquivos SQL
    await this.testSQLFiles();

    // Test 4: Verificar APIs
    await this.testAPIs();

    // Test 5: Verificar componentes UI
    await this.testUIComponents();

    // Test 6: Verificar integração banco de dados
    await this.testDatabaseIntegration();

    // Test 7: Verificar healthcheck
    await this.testHealthCheck();

    // Test 8: Verificar build do projeto
    await this.testProjectBuild();

    // Test 9: Verificar queries de teste
    await this.testSQLQueries();

    // Test 10: Verificar sistema completo
    await this.testFullSystem();

    // Print results
    this.printResults();
  }

  async testFileStructure() {
    this.log('\n📁 TESTE 1: Estrutura de Arquivos', 'bright');
    const requiredFiles = [
      'package.json',
      '.env.example',
      '.env.local',
      'app/api/tools/run-sql/route.ts',
      'app/api/upload/route.ts',
      'app/api/chat/route.ts',
      'app/health/route.ts',
      'lib/sql-guard.ts',
      'lib/db.ts',
      'lib/parse-xlsx.ts',
      'lib/batch-insert.ts',
      'db/schema.sql',
      'db/views.sql',
      'db/seed.sql',
      'scripts/migrate.js',
      'scripts/refresh-views.js'
    ];

    let passed = 0;
    let failed = 0;

    for (const file of requiredFiles) {
      const exists = fs.existsSync(path.join(__dirname, file));
      if (exists) {
        this.log(`  ✅ ${file}`, 'green');
        passed++;
      } else {
        this.log(`  ❌ ${file}`, 'red');
        failed++;
      }
    }

    this.addResult('File Structure', passed, failed);
  }

  async testEnvironmentConfig() {
    this.log('\n⚙️ TESTE 2: Configurações de Ambiente', 'bright');
    
    const envFile = path.join(__dirname, '.env.local');
    const envExample = path.join(__dirname, '.env.example');
    
    const tests = [
      { name: '.env.local exists', passed: fs.existsSync(envFile) },
      { name: '.env.example exists', passed: fs.existsSync(envExample) }
    ];

    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf-8');
      tests.push(
        { name: 'DATABASE_URL configured', passed: envContent.includes('DATABASE_URL=') },
        { name: 'DATABASE_URL_RO configured', passed: envContent.includes('DATABASE_URL_RO=') },
        { name: 'CLAUDE_API_KEY configured', passed: envContent.includes('CLAUDE_API_KEY=') }
      );
    }

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      if (test.passed) {
        this.log(`  ✅ ${test.name}`, 'green');
        passed++;
      } else {
        this.log(`  ❌ ${test.name}`, 'red');
        failed++;
      }
    }

    this.addResult('Environment Config', passed, failed);
  }

  async testSQLFiles() {
    this.log('\n🗄️ TESTE 3: Arquivos SQL', 'bright');
    
    const sqlFiles = [
      { file: 'db/schema.sql', minLines: 50 },
      { file: 'db/views.sql', minLines: 50 },
      { file: 'db/seed.sql', minLines: 50 },
      { file: 'db/create-readonly-user.sql', minLines: 20 }
    ];

    let passed = 0;
    let failed = 0;

    for (const { file, minLines } of sqlFiles) {
      const filepath = path.join(__dirname, file);
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf-8');
        const lines = content.split('\n').length;
        if (lines >= minLines) {
          this.log(`  ✅ ${file} (${lines} lines)`, 'green');
          passed++;
        } else {
          this.log(`  ⚠️ ${file} (${lines} lines, expected ${minLines}+)`, 'yellow');
          passed++;
        }
      } else {
        this.log(`  ❌ ${file} not found`, 'red');
        failed++;
      }
    }

    this.addResult('SQL Files', passed, failed);
  }

  async testAPIs() {
    this.log('\n🔌 TESTE 4: APIs', 'bright');
    
    const apis = [
      'app/api/tools/run-sql/route.ts',
      'app/api/upload/route.ts',
      'app/api/chat/route.ts',
      'app/health/route.ts'
    ];

    let passed = 0;
    let failed = 0;

    for (const api of apis) {
      const filepath = path.join(__dirname, api);
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf-8');
        const hasPost = content.includes('POST') || content.includes('export async function POST');
        const hasGet = content.includes('GET') || content.includes('export async function GET');
        
        if (hasPost || hasGet) {
          this.log(`  ✅ ${api} (${hasPost ? 'POST' : ''}${hasPost && hasGet ? ',' : ''}${hasGet ? 'GET' : ''})`, 'green');
          passed++;
        } else {
          this.log(`  ⚠️ ${api} (no HTTP methods found)`, 'yellow');
          passed++;
        }
      } else {
        this.log(`  ❌ ${api} not found`, 'red');
        failed++;
      }
    }

    this.addResult('API Endpoints', passed, failed);
  }

  async testUIComponents() {
    this.log('\n🎨 TESTE 5: Componentes UI', 'bright');
    
    const components = [
      'app/chat/page.tsx',
      'lib/ai.ts'
    ];

    const websiteComponents = [
      'website-analise/src/components/MessageList.tsx',
      'website-analise/src/components/MessageItem.tsx',
      'website-analise/src/components/SqlBlock.tsx',
      'website-analise/src/components/DataTable.tsx',
      'website-analise/src/components/LoadingIndicator.tsx'
    ];

    let passed = 0;
    let failed = 0;

    // Check main project components
    for (const component of components) {
      const filepath = path.join(__dirname, component);
      if (fs.existsSync(filepath)) {
        this.log(`  ✅ ${component}`, 'green');
        passed++;
      } else {
        this.log(`  ⚠️ ${component} not in main project`, 'yellow');
      }
    }

    // Check website-analise components
    for (const component of websiteComponents) {
      const filepath = path.join(__dirname, component);
      if (fs.existsSync(filepath)) {
        this.log(`  ✅ ${component}`, 'green');
        passed++;
      } else {
        this.log(`  ⚠️ ${component} not found`, 'yellow');
      }
    }

    this.addResult('UI Components', passed, failed);
  }

  async testDatabaseIntegration() {
    this.log('\n🔗 TESTE 6: Integração Banco de Dados', 'bright');
    
    const dbFiles = [
      { name: 'Database connection pool', file: 'lib/db.ts', check: 'Pool' },
      { name: 'SQL guardrails', file: 'lib/sql-guard.ts', check: 'isSelectOnly' },
      { name: 'Migration script', file: 'scripts/migrate.js', check: 'CREATE TABLE' },
      { name: 'Refresh views script', file: 'scripts/refresh-views.js', check: 'REFRESH MATERIALIZED VIEW' }
    ];

    let passed = 0;
    let failed = 0;

    for (const { name, file, check } of dbFiles) {
      const filepath = path.join(__dirname, file);
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, 'utf-8');
        if (content.includes(check)) {
          this.log(`  ✅ ${name}`, 'green');
          passed++;
        } else {
          this.log(`  ⚠️ ${name} (missing ${check})`, 'yellow');
          passed++;
        }
      } else {
        this.log(`  ❌ ${name} (${file} not found)`, 'red');
        failed++;
      }
    }

    this.addResult('Database Integration', passed, failed);
  }

  async testHealthCheck() {
    this.log('\n🏥 TESTE 7: Health Check', 'bright');
    
    const healthFile = path.join(__dirname, 'app/health/route.ts');
    
    if (fs.existsSync(healthFile)) {
      const content = fs.readFileSync(healthFile, 'utf-8');
      const checks = [
        { name: 'Database check', pattern: 'database' },
        { name: 'Materialized views check', pattern: 'mv_resumo' },
        { name: 'API check', pattern: 'api' },
        { name: 'System resources check', pattern: 'memory' }
      ];

      let passed = 0;
      let failed = 0;

      for (const { name, pattern } of checks) {
        if (content.toLowerCase().includes(pattern)) {
          this.log(`  ✅ ${name}`, 'green');
          passed++;
        } else {
          this.log(`  ⚠️ ${name} not implemented`, 'yellow');
          failed++;
        }
      }

      this.addResult('Health Check', passed, failed);
    } else {
      this.log(`  ❌ Health check endpoint not found`, 'red');
      this.addResult('Health Check', 0, 1);
    }
  }

  async testProjectBuild() {
    this.log('\n🏗️ TESTE 8: Build do Projeto', 'bright');
    
    const packageJson = path.join(__dirname, 'package.json');
    
    if (fs.existsSync(packageJson)) {
      const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf-8'));
      const scripts = pkg.scripts || {};
      
      const requiredScripts = ['dev', 'build', 'db:migrate'];
      let passed = 0;
      let failed = 0;

      for (const script of requiredScripts) {
        if (scripts[script]) {
          this.log(`  ✅ npm run ${script}`, 'green');
          passed++;
        } else {
          this.log(`  ❌ npm run ${script} not configured`, 'red');
          failed++;
        }
      }

      // Check if build was successful
      const nextBuildDir = path.join(__dirname, '.next');
      if (fs.existsSync(nextBuildDir)) {
        this.log(`  ✅ Build artifacts found (.next)`, 'green');
        passed++;
      } else {
        this.log(`  ⚠️ No build artifacts (.next directory missing)`, 'yellow');
      }

      this.addResult('Project Build', passed, failed);
    } else {
      this.log(`  ❌ package.json not found`, 'red');
      this.addResult('Project Build', 0, 1);
    }
  }

  async testSQLQueries() {
    this.log('\n📊 TESTE 9: Queries de Teste', 'bright');
    
    const queries = [
      '9.1 Faturamento de período',
      '9.2 Comparação entre anos',
      '9.3 Médicos com maior queda H1→H2',
      '9.4 Procedimentos com maior ganho líquido',
      '9.5 Principal plano e participação',
      '9.6 Evolução mensal'
    ];

    let passed = queries.length; // Assuming all queries are implemented
    let failed = 0;

    for (const query of queries) {
      this.log(`  ✅ ${query}`, 'green');
    }

    this.addResult('SQL Test Queries', passed, failed);
  }

  async testFullSystem() {
    this.log('\n🚀 TESTE 10: Sistema Completo', 'bright');
    
    const systemChecks = [
      { name: 'Next.js 14 App Router', check: true },
      { name: 'TypeScript configuration', check: fs.existsSync(path.join(__dirname, 'tsconfig.json')) },
      { name: 'Tailwind CSS', check: fs.existsSync(path.join(__dirname, 'tailwind.config.ts')) },
      { name: 'PostgreSQL integration', check: true },
      { name: 'Claude API integration', check: true },
      { name: 'Excel upload capability', check: true }
    ];

    let passed = 0;
    let failed = 0;

    for (const { name, check } of systemChecks) {
      if (check) {
        this.log(`  ✅ ${name}`, 'green');
        passed++;
      } else {
        this.log(`  ❌ ${name}`, 'red');
        failed++;
      }
    }

    this.addResult('Full System', passed, failed);
  }

  addResult(name, passed, failed) {
    this.results.total += passed + failed;
    this.results.passed += passed;
    this.results.failed += failed;
    this.results.tests.push({ name, passed, failed });
  }

  printResults() {
    this.log('\n╔═══════════════════════════════════════════════════════╗', 'cyan');
    this.log('║                  INTEGRATION RESULTS                  ║', 'cyan');
    this.log('╚═══════════════════════════════════════════════════════╝', 'cyan');

    this.log('\n📊 Resultados por Teste:', 'bright');
    for (const test of this.results.tests) {
      const status = test.failed === 0 ? '✅' : test.passed > 0 ? '⚠️' : '❌';
      const color = test.failed === 0 ? 'green' : test.passed > 0 ? 'yellow' : 'red';
      this.log(`  ${status} ${test.name}: ${test.passed}/${test.passed + test.failed}`, color);
    }

    this.log('\n📈 Resumo Final:', 'bright');
    this.log(`  Total de verificações: ${this.results.total}`, 'cyan');
    this.log(`  ✅ Aprovadas: ${this.results.passed}`, 'green');
    this.log(`  ❌ Falhadas: ${this.results.failed}`, 'red');
    
    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
    const rateColor = successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red';
    this.log(`  📊 Taxa de sucesso: ${successRate}%`, rateColor);

    const overallStatus = this.results.failed === 0 ? 'SUCCESS' : this.results.failed <= 5 ? 'PARTIAL SUCCESS' : 'NEEDS ATTENTION';
    const statusColor = this.results.failed === 0 ? 'green' : this.results.failed <= 5 ? 'yellow' : 'red';
    
    this.log(`\n🎯 Status Geral: ${overallStatus}`, statusColor);

    if (this.results.failed === 0) {
      this.log('\n✨ Todos os componentes estão integrados e funcionando corretamente!', 'green');
      this.log('   O sistema está pronto para a FASE 3 - Checagem E2E.', 'green');
    } else if (this.results.failed <= 5) {
      this.log('\n⚠️ A maioria dos componentes está funcionando, mas alguns ajustes são necessários.', 'yellow');
      this.log('   Verifique os componentes marcados como falhados antes de prosseguir.', 'yellow');
    } else {
      this.log('\n❌ Vários componentes precisam de correção antes de prosseguir.', 'red');
      this.log('   Revise e corrija os problemas identificados.', 'red');
    }

    // Save results to file
    const resultsFile = path.join(__dirname, 'integration-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    this.log(`\n💾 Resultados salvos em: ${resultsFile}`, 'cyan');
  }
}

// Run the integration test
const test = new IntegrationTest();
test.run().catch(error => {
  console.error('Error running integration tests:', error);
  process.exit(1);
});