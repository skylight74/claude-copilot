#!/usr/bin/env node
/**
 * Generate a JWT token for testing
 *
 * Usage:
 *   JWT_SECRET="your-secret" node examples/generate-token.js <initiativeId>
 */

import jwt from 'jsonwebtoken';

const args = process.argv.slice(2);
const secret = process.env.JWT_SECRET;

if (!secret) {
  console.error('ERROR: JWT_SECRET environment variable required');
  console.error('\nUsage:');
  console.error('  JWT_SECRET="your-secret" node examples/generate-token.js <initiativeId>');
  process.exit(1);
}

if (args.length < 1) {
  console.error('ERROR: initiativeId argument required');
  console.error('\nUsage:');
  console.error('  JWT_SECRET="your-secret" node examples/generate-token.js <initiativeId>');
  console.error('\nExample:');
  console.error('  JWT_SECRET="my-secret" node examples/generate-token.js INIT-abc123');
  process.exit(1);
}

const initiativeId = args[0];
const expiresIn = args[1] || '24h';

const token = jwt.sign(
  { initiativeId },
  secret,
  { expiresIn }
);

console.log('\n✓ JWT Token generated');
console.log('─'.repeat(60));
console.log(`Initiative: ${initiativeId}`);
console.log(`Expires: ${expiresIn}`);
console.log('─'.repeat(60));
console.log(`\n${token}\n`);
console.log('─'.repeat(60));
console.log('\nUse this token with the test client:');
console.log(`  node examples/test-client.js "${token}"\n`);
