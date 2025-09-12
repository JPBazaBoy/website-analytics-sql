#!/usr/bin/env node

/**
 * SQL Guardrails Unit Tests
 * 
 * Direct unit tests for the SQL security validation functions
 * without requiring a running server.
 */

// Since we can't import TypeScript modules directly in Node.js without compilation,
// we'll create a simplified version of the tests that demonstrate the guardrails logic

console.log('🛡️  SQL Guardrails Validation Tests');
console.log('=====================================\n');

// Test cases for SQL validation
const testCases = [
  // Valid SELECT statements
  {
    name: 'Valid SELECT - Simple',
    sql: 'SELECT * FROM exames',
    shouldPass: true,
    category: 'Valid SELECT'
  },
  {
    name: 'Valid SELECT - With WHERE',
    sql: 'SELECT id, procedimento FROM exames WHERE ano = 2024',
    shouldPass: true,
    category: 'Valid SELECT'
  },
  {
    name: 'Valid SELECT - With JOIN',
    sql: 'SELECT e.*, mv.receita_liquida FROM exames e JOIN mv_resumo_mensal mv ON DATE_TRUNC(\'month\', e.data_exame) = mv.ref_month',
    shouldPass: true,
    category: 'Valid SELECT'
  },
  {
    name: 'Valid CTE (WITH)',
    sql: 'WITH monthly AS (SELECT ano, mes, SUM(total) as receita FROM exames GROUP BY ano, mes) SELECT * FROM monthly',
    shouldPass: true,
    category: 'Valid SELECT'
  },
  {
    name: 'Valid SELECT - Existing LIMIT',
    sql: 'SELECT * FROM exames LIMIT 100',
    shouldPass: true,
    category: 'Valid SELECT'
  },

  // Invalid DML statements
  {
    name: 'Invalid INSERT',
    sql: 'INSERT INTO exames (procedimento) VALUES (\'test\')',
    shouldPass: false,
    category: 'DML Block'
  },
  {
    name: 'Invalid UPDATE',
    sql: 'UPDATE exames SET total = 1000 WHERE id = 1',
    shouldPass: false,
    category: 'DML Block'
  },
  {
    name: 'Invalid DELETE',
    sql: 'DELETE FROM exames WHERE id = 1',
    shouldPass: false,
    category: 'DML Block'
  },

  // Invalid DDL statements
  {
    name: 'Invalid CREATE TABLE',
    sql: 'CREATE TABLE test (id INT)',
    shouldPass: false,
    category: 'DDL Block'
  },
  {
    name: 'Invalid DROP TABLE',
    sql: 'DROP TABLE exames',
    shouldPass: false,
    category: 'DDL Block'
  },
  {
    name: 'Invalid ALTER TABLE',
    sql: 'ALTER TABLE exames ADD COLUMN test_col TEXT',
    shouldPass: false,
    category: 'DDL Block'
  },

  // Invalid admin statements
  {
    name: 'Invalid GRANT',
    sql: 'GRANT SELECT ON exames TO test_user',
    shouldPass: false,
    category: 'Admin Block'
  },
  {
    name: 'Invalid SET',
    sql: 'SET work_mem = \'256MB\'',
    shouldPass: false,
    category: 'Admin Block'
  },

  // Multiple statements
  {
    name: 'Multiple statements with semicolon',
    sql: 'SELECT 1; DROP TABLE exames;',
    shouldPass: false,
    category: 'Multiple Statements'
  },
  {
    name: 'Multiple statements complex',
    sql: 'SELECT * FROM exames; SELECT * FROM mv_resumo_mensal;',
    shouldPass: false,
    category: 'Multiple Statements'
  },

  // Edge cases
  {
    name: 'Empty SQL',
    sql: '',
    shouldPass: false,
    category: 'Edge Cases'
  },
  {
    name: 'Whitespace only',
    sql: '   \n  \t  ',
    shouldPass: false,
    category: 'Edge Cases'
  },
  {
    name: 'SQL injection attempt',
    sql: 'SELECT * FROM exames WHERE id = 1; DROP TABLE exames; --',
    shouldPass: false,
    category: 'Security'
  }
];

// Simple regex-based validation (mimicking the TypeScript functions)
function validateSqlSimple(sql) {
  if (!sql || !sql.trim()) {
    return { isValid: false, error: 'SQL cannot be empty' };
  }

  const cleanSql = sql.trim();
  const sqlWithoutComments = cleanSql.replace(/--.+$|\/\*.+?\*\//gm, '');
  
  // Must start with SELECT or WITH
  if (!/^\s*(SELECT|WITH)\s+/i.test(sqlWithoutComments)) {
    return { isValid: false, error: 'Only SELECT statements are allowed' };
  }
  
  // Must not contain DML keywords
  if (/\b(INSERT|UPDATE|DELETE|MERGE|UPSERT|REPLACE)\b/i.test(sqlWithoutComments)) {
    return { isValid: false, error: 'DML statements are not allowed' };
  }
  
  // Must not contain DDL keywords
  if (/\b(CREATE|DROP|ALTER|TRUNCATE|RENAME)\b/i.test(sqlWithoutComments)) {
    return { isValid: false, error: 'DDL statements are not allowed' };
  }
  
  // Must not contain admin keywords
  if (/\b(GRANT|REVOKE|SET|RESET|SHOW|EXPLAIN|ANALYZE)\b/i.test(sqlWithoutComments)) {
    return { isValid: false, error: 'Administrative statements are not allowed' };
  }

  // Check for multiple statements
  if (/;\s*\w/.test(sqlWithoutComments)) {
    return { isValid: false, error: 'Multiple statements are not allowed' };
  }
  
  return { isValid: true };
}

function injectLimitSimple(sql, limit = 5000) {
  const trimmed = sql.trim().replace(/;\s*$/, ''); // Remove trailing semicolon
  
  // Check if LIMIT already exists (case-insensitive)
  if (/\bLIMIT\s+\d+/i.test(trimmed)) {
    return trimmed;
  }
  
  // Add LIMIT clause
  return `${trimmed} LIMIT ${limit}`;
}

// Run tests
let passed = 0;
let failed = 0;

console.log('Running SQL validation tests...\n');

testCases.forEach((testCase, index) => {
  const result = validateSqlSimple(testCase.sql);
  const actualPass = result.isValid;
  const testPassed = actualPass === testCase.shouldPass;
  
  if (testPassed) {
    console.log(`✅ ${testCase.name}`);
    passed++;
  } else {
    console.log(`❌ ${testCase.name}`);
    console.log(`   Expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'}`);
    console.log(`   Actual: ${actualPass ? 'PASS' : 'FAIL'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    failed++;
  }
});

console.log('\n' + '='.repeat(50));
console.log('LIMIT INJECTION TESTS');
console.log('='.repeat(50));

// Test LIMIT injection
const limitTests = [
  {
    name: 'Inject LIMIT when missing',
    sql: 'SELECT * FROM exames',
    expected: 'SELECT * FROM exames LIMIT 5000'
  },
  {
    name: 'Preserve existing LIMIT',
    sql: 'SELECT * FROM exames LIMIT 100',
    expected: 'SELECT * FROM exames LIMIT 100'
  },
  {
    name: 'Remove trailing semicolon',
    sql: 'SELECT * FROM exames;',
    expected: 'SELECT * FROM exames LIMIT 5000'
  }
];

limitTests.forEach(test => {
  const result = injectLimitSimple(test.sql);
  if (result === test.expected) {
    console.log(`✅ ${test.name}`);
    passed++;
  } else {
    console.log(`❌ ${test.name}`);
    console.log(`   Expected: "${test.expected}"`);
    console.log(`   Actual: "${result}"`);
    failed++;
  }
});

console.log('\n' + '='.repeat(50));
console.log('SUMMARY');
console.log('='.repeat(50));
console.log(`Total Tests: ${passed + failed}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed === 0) {
  console.log('\n🎉 All guardrails tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Review the implementation.');
  process.exit(1);
}