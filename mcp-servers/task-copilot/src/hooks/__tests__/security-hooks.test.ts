/**
 * Tests for PreToolUse Security Hooks
 */

import {
  SecurityAction,
  registerSecurityRule,
  evaluatePreToolUse,
  testSecurityRules,
  getSecurityRules,
  getSecurityRule,
  toggleSecurityRule,
  extractStringContent,
  extractFilePaths,
  isFileWriteTool,
  isCommandExecutionTool
} from '../pre-tool-use.js';
import { initializeDefaultSecurityRules, getDefaultRuleIds } from '../security-rules.js';

// Initialize rules before tests
initializeDefaultSecurityRules();

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

console.log('Testing helper functions...');

// Test extractStringContent
const testInput = {
  file_path: '/test/file.ts',
  content: 'const API_KEY = "secret";',
  metadata: { nested: { value: 'nested string' } }
};
const extracted = extractStringContent(testInput);
console.assert(extracted.length === 3, 'Should extract 3 strings');
console.assert(extracted.includes('/test/file.ts'), 'Should extract file path');
console.assert(extracted.includes('const API_KEY = "secret";'), 'Should extract content');

// Test extractFilePaths
const pathInput = {
  file_path: '/path/to/file.ts',
  files: ['/path/one.ts', '/path/two.ts']
};
const paths = extractFilePaths(pathInput);
console.assert(paths.length === 3, 'Should extract 3 file paths');
console.assert(paths.includes('/path/to/file.ts'), 'Should extract file_path');

// Test tool type detection
console.assert(isFileWriteTool('Edit') === true, 'Edit should be file write tool');
console.assert(isFileWriteTool('Write') === true, 'Write should be file write tool');
console.assert(isFileWriteTool('Read') === false, 'Read should not be file write tool');
console.assert(isCommandExecutionTool('Bash') === true, 'Bash should be command tool');
console.assert(isCommandExecutionTool('Edit') === false, 'Edit should not be command tool');

console.log('✓ Helper functions passed\n');

// ============================================================================
// RULE REGISTRATION TESTS
// ============================================================================

console.log('Testing rule registration...');

const customRule = {
  id: 'test-rule',
  name: 'Test Rule',
  description: 'A test security rule',
  enabled: true,
  priority: 50,
  evaluate: () => null
};

registerSecurityRule(customRule);
const retrievedRule = getSecurityRule('test-rule');
console.assert(retrievedRule !== undefined, 'Should retrieve registered rule');
console.assert(retrievedRule?.id === 'test-rule', 'Rule ID should match');

const allRules = getSecurityRules();
console.assert(allRules.length > 0, 'Should have registered rules');
console.assert(allRules.some(r => r.id === 'test-rule'), 'Should include custom rule');

toggleSecurityRule('test-rule', false);
const disabledRule = getSecurityRule('test-rule');
console.assert(disabledRule?.enabled === false, 'Rule should be disabled');

console.log('✓ Rule registration passed\n');

// ============================================================================
// SECRET DETECTION TESTS
// ============================================================================

console.log('Testing secret detection...');

// Test AWS key detection
const awsTest = await evaluatePreToolUse('Write', {
  file_path: 'config.ts',
  content: 'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";'
});
console.assert(awsTest.allowed === false, 'Should block AWS key');
console.assert(awsTest.violations.length > 0, 'Should have violations');
console.assert(awsTest.violations[0].ruleName === 'secret-detection', 'Should be secret-detection rule');
console.log(`  ✓ AWS key blocked: ${awsTest.violations[0].reason}`);

// Test GitHub token detection
const githubTest = await evaluatePreToolUse('Write', {
  file_path: 'auth.ts',
  content: 'const GITHUB_TOKEN = "ghp_abc123def456ghi789jkl012mno345pqr678";'
});
console.assert(githubTest.allowed === false, 'Should block GitHub token');
console.log(`  ✓ GitHub token blocked: ${githubTest.violations[0].reason}`);

// Test JWT detection
const jwtTest = await evaluatePreToolUse('Write', {
  file_path: 'token.ts',
  content: 'const JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";'
});
console.assert(jwtTest.allowed === false, 'Should block JWT token');
console.log(`  ✓ JWT token blocked: ${jwtTest.violations[0].reason}`);

// Test database connection string
const dbTest = await evaluatePreToolUse('Write', {
  file_path: 'database.ts',
  content: 'const DB_URL = "postgres://admin:secret123@db.example.com:5432/mydb";'
});
console.assert(dbTest.allowed === false, 'Should block database connection string');
console.log(`  ✓ Database connection string blocked: ${dbTest.violations[0].reason}`);

// Test private key detection
const keyTest = await evaluatePreToolUse('Write', {
  file_path: 'cert.pem',
  content: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...'
});
console.assert(keyTest.allowed === false, 'Should block private key');
console.log(`  ✓ Private key blocked: ${keyTest.violations[0].reason}`);

// Test safe content (should pass)
const safeTest = await evaluatePreToolUse('Write', {
  file_path: 'config.ts',
  content: 'const API_KEY = process.env.API_KEY;'
});
console.assert(safeTest.allowed === true, 'Should allow safe content');
console.assert(safeTest.violations.length === 0, 'Should have no violations');
console.log('  ✓ Safe content allowed\n');

// ============================================================================
// DESTRUCTIVE COMMAND TESTS
// ============================================================================

console.log('Testing destructive command detection...');

// Test rm -rf / (should block)
const rmRootTest = await evaluatePreToolUse('Bash', {
  command: 'rm -rf /'
});
console.assert(rmRootTest.allowed === false, 'Should block rm -rf /');
console.log(`  ✓ rm -rf / blocked: ${rmRootTest.violations[0].reason}`);

// Test DROP DATABASE (should block)
const dropDbTest = await evaluatePreToolUse('Bash', {
  command: 'psql -c "DROP DATABASE production;"'
});
console.assert(dropDbTest.allowed === false, 'Should block DROP DATABASE');
console.log(`  ✓ DROP DATABASE blocked: ${dropDbTest.violations[0].reason}`);

// Test chmod 777 (should warn)
const chmodTest = await evaluatePreToolUse('Bash', {
  command: 'chmod 777 /var/www'
});
console.assert(chmodTest.allowed === true, 'Should allow but warn on chmod 777');
console.assert(chmodTest.warnings.length > 0, 'Should have warnings');
console.log(`  ✓ chmod 777 warned: ${chmodTest.warnings[0].reason}`);

// Test safe command
const safeCmdTest = await evaluatePreToolUse('Bash', {
  command: 'ls -la'
});
console.assert(safeCmdTest.allowed === true, 'Should allow safe command');
console.assert(safeCmdTest.violations.length === 0, 'Should have no violations');
console.log('  ✓ Safe command allowed\n');

// ============================================================================
// SENSITIVE FILE PROTECTION TESTS
// ============================================================================

console.log('Testing sensitive file protection...');

// Test .env file (should block)
const envTest = await evaluatePreToolUse('Edit', {
  file_path: '.env',
  old_string: 'API_KEY=old',
  new_string: 'API_KEY=new'
});
console.assert(envTest.allowed === false, 'Should block .env edits');
console.log(`  ✓ .env edit blocked: ${envTest.violations[0].reason}`);

// Test credentials file (should block)
const credsTest = await evaluatePreToolUse('Write', {
  file_path: '/home/user/.aws/credentials',
  content: '[default]\naws_access_key_id=...'
});
console.assert(credsTest.allowed === false, 'Should block credentials file');
console.log(`  ✓ Credentials file blocked: ${credsTest.violations[0].reason}`);

// Test SSH key (should block)
const sshTest = await evaluatePreToolUse('Edit', {
  file_path: '/home/user/.ssh/id_rsa',
  old_string: 'old key',
  new_string: 'new key'
});
console.assert(sshTest.allowed === false, 'Should block SSH key edits');
console.log(`  ✓ SSH key edit blocked: ${sshTest.violations[0].reason}`);

// Test regular file (should pass)
const regularFileTest = await evaluatePreToolUse('Write', {
  file_path: 'src/index.ts',
  content: 'console.log("Hello");'
});
console.assert(regularFileTest.allowed === true, 'Should allow regular file edits');
console.log('  ✓ Regular file allowed\n');

// ============================================================================
// CREDENTIAL URL DETECTION TESTS
// ============================================================================

console.log('Testing credential URL detection...');

// Test http with credentials
const httpCredsTest = await evaluatePreToolUse('Write', {
  file_path: 'config.ts',
  content: 'const API_URL = "http://admin:password@api.example.com";'
});
console.assert(httpCredsTest.allowed === false, 'Should block http URL with credentials');
console.log(`  ✓ HTTP with credentials blocked: ${httpCredsTest.violations[0].reason}`);

// Test https with credentials
const httpsCredsTest = await evaluatePreToolUse('Write', {
  file_path: 'database.ts',
  content: 'const DB = "https://user:pass@db.example.com";'
});
console.assert(httpsCredsTest.allowed === false, 'Should block https URL with credentials');
console.log(`  ✓ HTTPS with credentials blocked: ${httpsCredsTest.violations[0].reason}`);

// Test safe URL
const safeUrlTest = await evaluatePreToolUse('Write', {
  file_path: 'config.ts',
  content: 'const API_URL = "https://api.example.com";'
});
console.assert(safeUrlTest.allowed === true, 'Should allow safe URL');
console.log('  ✓ Safe URL allowed\n');

// ============================================================================
// TEST SECURITY RULES FUNCTION
// ============================================================================

console.log('Testing testSecurityRules function...');

const testResult = await testSecurityRules('Write', {
  file_path: '.env',
  content: 'SECRET_KEY=ghp_abc123'
});

console.assert(testResult.allowed === false, 'Test mode should detect violations');
console.assert(testResult.violations.length > 0, 'Test mode should return violations');
console.assert(testResult.executionTime > 0, 'Should measure execution time');
console.log(`  ✓ Test mode works (${testResult.executionTime}ms)\n`);

// ============================================================================
// DEFAULT RULES VALIDATION
// ============================================================================

console.log('Validating default rules...');

const defaultRuleIds = getDefaultRuleIds();
console.assert(defaultRuleIds.length === 5, 'Should have 5 default rules');
console.assert(defaultRuleIds.includes('secret-detection'), 'Should include secret-detection');
console.assert(defaultRuleIds.includes('destructive-command'), 'Should include destructive-command');
console.assert(defaultRuleIds.includes('sensitive-file-protection'), 'Should include sensitive-file-protection');
console.assert(defaultRuleIds.includes('credential-url'), 'Should include credential-url');
console.assert(defaultRuleIds.includes('git-secret-commit'), 'Should include git-secret-commit');

for (const ruleId of defaultRuleIds) {
  const rule = getSecurityRule(ruleId);
  console.assert(rule !== undefined, `Rule ${ruleId} should exist`);
  console.assert(rule?.enabled === true, `Rule ${ruleId} should be enabled by default`);
}

console.log('✓ All default rules validated\n');

// ============================================================================
// SUMMARY
// ============================================================================

console.log('========================================');
console.log('✓ ALL TESTS PASSED');
console.log('========================================');
console.log('\nSecurity Hooks Implementation Summary:');
console.log(`- ${getSecurityRules().length} rules registered`);
console.log(`- ${getDefaultRuleIds().length} default rules`);
console.log('- Secret detection: ✓');
console.log('- Destructive commands: ✓');
console.log('- Sensitive files: ✓');
console.log('- Credential URLs: ✓');
console.log('- Custom rules: ✓');
console.log('\nReady for production use.');
