#!/usr/bin/env node

/**
 * Quick verification test runner
 * This script builds and runs the verification enforcement tests
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔨 Building test files...');
try {
  execSync('npm run build:test', {
    cwd: __dirname,
    stdio: 'inherit'
  });
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

console.log('\n🧪 Running verification enforcement tests...');
try {
  execSync('node dist/tools/__tests__/verification-enforcement.test.js', {
    cwd: __dirname,
    stdio: 'inherit'
  });
  console.log('\n✅ All tests completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Tests failed');
  process.exit(1);
}
