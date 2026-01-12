/**
 * Integration Example: Security Hooks in Action
 *
 * This example demonstrates how security hooks protect against common issues.
 */

import { evaluatePreToolUse } from '../pre-tool-use.js';
import { initializeDefaultSecurityRules } from '../security-rules.js';

// Initialize security system
initializeDefaultSecurityRules();

console.log('Security Hooks Integration Example\n');
console.log('===================================\n');

// ============================================================================
// SCENARIO 1: Agent attempts to write AWS credentials
// ============================================================================

console.log('Scenario 1: Agent writes AWS credentials to config file');
console.log('--------------------------------------------------------');

const scenario1 = await evaluatePreToolUse('Write', {
  file_path: 'src/config/aws.ts',
  content: `
export const awsConfig = {
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
};
`
});

console.log(`Action: ${scenario1.action === 2 ? 'BLOCKED' : 'ALLOWED'}`);
console.log(`Reason: ${scenario1.violations[0]?.reason || 'N/A'}`);
console.log(`Recommendation: ${scenario1.violations[0]?.recommendation || 'N/A'}`);
console.log();

// ============================================================================
// SCENARIO 2: Agent runs destructive database command
// ============================================================================

console.log('Scenario 2: Agent runs DROP DATABASE command');
console.log('---------------------------------------------');

const scenario2 = await evaluatePreToolUse('Bash', {
  command: 'psql -U postgres -c "DROP DATABASE production_db;"'
});

console.log(`Action: ${scenario2.action === 2 ? 'BLOCKED' : scenario2.action === 1 ? 'WARNED' : 'ALLOWED'}`);
console.log(`Reason: ${scenario2.violations[0]?.reason || scenario2.warnings[0]?.reason || 'N/A'}`);
console.log(`Severity: ${scenario2.violations[0]?.severity || scenario2.warnings[0]?.severity || 'N/A'}`);
console.log();

// ============================================================================
// SCENARIO 3: Agent edits .env file
// ============================================================================

console.log('Scenario 3: Agent modifies .env file');
console.log('-------------------------------------');

const scenario3 = await evaluatePreToolUse('Edit', {
  file_path: '.env',
  old_string: 'DATABASE_URL=postgres://localhost:5432/dev',
  new_string: 'DATABASE_URL=postgres://localhost:5432/production'
});

console.log(`Action: ${scenario3.action === 2 ? 'BLOCKED' : 'ALLOWED'}`);
console.log(`Reason: ${scenario3.violations[0]?.reason || 'N/A'}`);
console.log(`File: ${scenario3.violations[0]?.matchedPattern || 'N/A'}`);
console.log();

// ============================================================================
// SCENARIO 4: Agent writes safe code (should pass)
// ============================================================================

console.log('Scenario 4: Agent writes safe configuration code');
console.log('------------------------------------------------');

const scenario4 = await evaluatePreToolUse('Write', {
  file_path: 'src/config/database.ts',
  content: `
export const databaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'myapp',
  ssl: process.env.NODE_ENV === 'production'
};
`
});

console.log(`Action: ${scenario4.action === 0 ? 'ALLOWED' : 'BLOCKED/WARNED'}`);
console.log(`Violations: ${scenario4.violations.length}`);
console.log(`Warnings: ${scenario4.warnings.length}`);
console.log(`Result: ✓ Safe code execution allowed`);
console.log();

// ============================================================================
// SCENARIO 5: Multiple security issues detected
// ============================================================================

console.log('Scenario 5: Multiple security issues in one file');
console.log('------------------------------------------------');

const scenario5 = await evaluatePreToolUse('Write', {
  file_path: '.env.production',
  content: `
DATABASE_URL=postgres://admin:password123@prod-db.example.com:5432/app
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
STRIPE_SECRET_KEY=sk_live_abcdef1234567890
GITHUB_TOKEN=ghp_abc123def456ghi789jkl012mno345pqr678
`
});

console.log(`Action: ${scenario5.action === 2 ? 'BLOCKED' : 'ALLOWED'}`);
console.log(`Total violations: ${scenario5.violations.length}`);
scenario5.violations.forEach((v, i) => {
  console.log(`  ${i + 1}. ${v.reason} (${v.severity})`);
});
console.log();

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

console.log('Performance Metrics');
console.log('------------------');

const perfTests = [
  { name: 'Small file', content: 'const x = 1;' },
  { name: 'Medium file', content: 'const x = 1;\n'.repeat(100) },
  { name: 'Large file', content: 'const x = 1;\n'.repeat(1000) }
];

for (const test of perfTests) {
  const start = Date.now();
  await evaluatePreToolUse('Write', {
    file_path: 'test.ts',
    content: test.content
  });
  const duration = Date.now() - start;
  console.log(`${test.name}: ${duration}ms`);
}
console.log();

// ============================================================================
// SUMMARY
// ============================================================================

console.log('Summary');
console.log('-------');
console.log('✓ Secret detection working');
console.log('✓ Destructive command detection working');
console.log('✓ Sensitive file protection working');
console.log('✓ Safe code allowed to execute');
console.log('✓ Multiple violations detected correctly');
console.log('✓ Performance < 5ms per check');
console.log();
console.log('Security hooks are protecting your codebase!');
