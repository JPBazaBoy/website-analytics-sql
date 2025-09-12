#!/usr/bin/env node

/**
 * SQL API Demo Script
 * 
 * Demonstrates the API request/response format with examples
 */

console.log('🚀 SQL API Demo - Request/Response Examples');
console.log('='.repeat(50));

// Example valid request
console.log('\n📤 EXAMPLE VALID REQUEST:');
console.log('POST /api/tools/run-sql');
console.log('Content-Type: application/json');
console.log();
console.log(JSON.stringify({
  sql: "SELECT procedimento, plano, SUM(total) as receita FROM exames WHERE ano = 2024 GROUP BY procedimento, plano ORDER BY receita DESC",
  max_rows: 100
}, null, 2));

// Example successful response
console.log('\n📥 EXAMPLE SUCCESSFUL RESPONSE:');
console.log('Status: 200 OK');
console.log('Content-Type: application/json');
console.log();
console.log(JSON.stringify({
  success: true,
  rowCount: 245,
  sampleRows: [
    {
      procedimento: "Ressonância Magnética",
      plano: "Particular",
      receita: 125000.50
    },
    {
      procedimento: "Tomografia Computadorizada",
      plano: "Unimed",
      receita: 98750.25
    },
    {
      procedimento: "Ultrassom",
      plano: "Particular", 
      receita: 75200.00
    }
  ],
  elapsedMs: 245,
  sql: "SELECT procedimento, plano, SUM(total) as receita FROM exames WHERE ano = 2024 GROUP BY procedimento, plano ORDER BY receita DESC LIMIT 100"
}, null, 2));

// Example blocked request
console.log('\n📤 EXAMPLE BLOCKED REQUEST (INSERT):');
console.log('POST /api/tools/run-sql');
console.log('Content-Type: application/json');
console.log();
console.log(JSON.stringify({
  sql: "INSERT INTO exames (procedimento, total) VALUES ('Test', 1000)",
  max_rows: 100
}, null, 2));

// Example error response
console.log('\n📥 EXAMPLE ERROR RESPONSE (Security Block):');
console.log('Status: 400 Bad Request');
console.log('Content-Type: application/json');
console.log();
console.log(JSON.stringify({
  success: false,
  error: "SQL validation failed",
  details: "Only SELECT statements are allowed",
  sql: "INSERT INTO exames ***"
}, null, 2));

// Example blocked request - multiple statements
console.log('\n📤 EXAMPLE BLOCKED REQUEST (Multiple Statements):');
console.log('POST /api/tools/run-sql');
console.log('Content-Type: application/json');
console.log();
console.log(JSON.stringify({
  sql: "SELECT COUNT(*) FROM exames; DROP TABLE exames;",
  max_rows: 100
}, null, 2));

// Example error response for multiple statements
console.log('\n📥 EXAMPLE ERROR RESPONSE (Multiple Statements):');
console.log('Status: 400 Bad Request');
console.log('Content-Type: application/json');
console.log();
console.log(JSON.stringify({
  success: false,
  error: "SQL validation failed",
  details: "Multiple statements are not allowed",
  sql: "SELECT COUNT(*) FROM exames; DROP TABLE ***;"
}, null, 2));

// CURL examples
console.log('\n🌐 CURL EXAMPLES:');
console.log('-'.repeat(30));

console.log('\n# Valid SELECT query:');
console.log(`curl -X POST http://localhost:3000/api/tools/run-sql \\
  -H "Content-Type: application/json" \\
  -d '{
    "sql": "SELECT ano, COUNT(*) as total_exames, SUM(total) as receita FROM exames GROUP BY ano ORDER BY ano DESC",
    "max_rows": 50
  }'`);

console.log('\n# Query with automatic LIMIT injection:');
console.log(`curl -X POST http://localhost:3000/api/tools/run-sql \\
  -H "Content-Type: application/json" \\
  -d '{
    "sql": "SELECT * FROM exames WHERE total > 1000 ORDER BY total DESC"
  }'`);

console.log('\n# Blocked INSERT attempt:');
console.log(`curl -X POST http://localhost:3000/api/tools/run-sql \\
  -H "Content-Type: application/json" \\
  -d '{
    "sql": "INSERT INTO exames (procedimento) VALUES (\\'Test\\')"
  }'`);

console.log('\n📋 TESTING COMMANDS:');
console.log('-'.repeat(30));
console.log('# Run unit tests:');
console.log('node scripts/test-guardrails.js');
console.log();
console.log('# Run API integration tests (requires running server):');
console.log('node scripts/test-api-sql.js');
console.log();
console.log('# Start development server:');
console.log('npm run dev');

console.log('\n✅ Demo complete! The API is ready for secure SQL execution.');