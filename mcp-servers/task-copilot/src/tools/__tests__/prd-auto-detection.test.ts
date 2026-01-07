/**
 * Integration test for PRD type auto-detection and scopeLocked defaults
 */

import { DatabaseClient } from '../../database.js';
import { prdCreate, prdGet } from '../prd.js';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

function setupTestDb(): DatabaseClient {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prd-test-'));
  const dbPath = path.join(testDir, 'test.db');
  return new DatabaseClient(dbPath);
}

async function runTests() {
  console.log('🧪 Testing PRD Auto-Detection and ScopeLocked Defaults\n');

  const db = setupTestDb();
  let passed = 0;
  let failed = 0;

  // Test 1: FEATURE type detection with auto-lock
  {
    const result = await prdCreate(db, {
      title: 'Add dark mode support',
      description: 'Implement dark theme across the app',
      content: 'Full PRD content here...'
    });

    const prd = prdGet(db, { id: result.id, includeContent: true });

    if (prd?.metadata.prdType === 'FEATURE' && prd?.metadata.scopeLocked === true) {
      console.log('✅ Test 1 PASSED: FEATURE type detected and auto-locked');
      passed++;
    } else {
      console.log('❌ Test 1 FAILED: Expected FEATURE with scopeLocked=true, got:', prd?.metadata);
      failed++;
    }
  }

  // Test 2: EXPERIENCE type detection with auto-lock
  {
    const result = await prdCreate(db, {
      title: 'Redesign login modal',
      description: 'UI/UX improvements for login interface',
      content: 'Full PRD content here...'
    });

    const prd = prdGet(db, { id: result.id, includeContent: true });

    if (prd?.metadata.prdType === 'EXPERIENCE' && prd?.metadata.scopeLocked === true) {
      console.log('✅ Test 2 PASSED: EXPERIENCE type detected and auto-locked');
      passed++;
    } else {
      console.log('❌ Test 2 FAILED: Expected EXPERIENCE with scopeLocked=true, got:', prd?.metadata);
      failed++;
    }
  }

  // Test 3: DEFECT type detection without auto-lock
  {
    const result = await prdCreate(db, {
      title: 'Fix login authentication bug',
      description: 'Error occurs when user credentials are invalid',
      content: 'Full PRD content here...'
    });

    const prd = prdGet(db, { id: result.id, includeContent: true });

    if (prd?.metadata.prdType === 'DEFECT' && prd?.metadata.scopeLocked === false) {
      console.log('✅ Test 3 PASSED: DEFECT type detected and NOT auto-locked');
      passed++;
    } else {
      console.log('❌ Test 3 FAILED: Expected DEFECT with scopeLocked=false, got:', prd?.metadata);
      failed++;
    }
  }

  // Test 4: QUESTION type detection without auto-lock
  {
    const result = await prdCreate(db, {
      title: 'How should we handle user sessions?',
      description: 'Investigate best practices for session management',
      content: 'Full PRD content here...'
    });

    const prd = prdGet(db, { id: result.id, includeContent: true });

    if (prd?.metadata.prdType === 'QUESTION' && prd?.metadata.scopeLocked === false) {
      console.log('✅ Test 4 PASSED: QUESTION type detected and NOT auto-locked');
      passed++;
    } else {
      console.log('❌ Test 4 FAILED: Expected QUESTION with scopeLocked=false, got:', prd?.metadata);
      failed++;
    }
  }

  // Test 5: TECHNICAL (default) type detection without auto-lock
  {
    const result = await prdCreate(db, {
      title: 'Database migration',
      description: 'Upgrade database schema',
      content: 'Full PRD content here...'
    });

    const prd = prdGet(db, { id: result.id, includeContent: true });

    if (prd?.metadata.prdType === 'TECHNICAL' && prd?.metadata.scopeLocked === false) {
      console.log('✅ Test 5 PASSED: TECHNICAL type detected and NOT auto-locked');
      passed++;
    } else {
      console.log('❌ Test 5 FAILED: Expected TECHNICAL with scopeLocked=false, got:', prd?.metadata);
      failed++;
    }
  }

  // Test 6: Explicit override of scopeLocked for FEATURE
  {
    const result = await prdCreate(db, {
      title: 'Add dark mode support',
      description: 'Implement dark theme across the app',
      content: 'Full PRD content here...',
      metadata: { scopeLocked: false } // Explicit override
    });

    const prd = prdGet(db, { id: result.id, includeContent: true });

    if (prd?.metadata.prdType === 'FEATURE' && prd?.metadata.scopeLocked === false) {
      console.log('✅ Test 6 PASSED: FEATURE type with explicit scopeLocked=false override');
      passed++;
    } else {
      console.log('❌ Test 6 FAILED: Expected FEATURE with scopeLocked=false (override), got:', prd?.metadata);
      failed++;
    }
  }

  // Test 7: Explicit override of scopeLocked for DEFECT
  {
    const result = await prdCreate(db, {
      title: 'Fix critical security vulnerability',
      description: 'Bug in authentication system',
      content: 'Full PRD content here...',
      metadata: { scopeLocked: true } // Explicit override
    });

    const prd = prdGet(db, { id: result.id, includeContent: true });

    if (prd?.metadata.prdType === 'DEFECT' && prd?.metadata.scopeLocked === true) {
      console.log('✅ Test 7 PASSED: DEFECT type with explicit scopeLocked=true override');
      passed++;
    } else {
      console.log('❌ Test 7 FAILED: Expected DEFECT with scopeLocked=true (override), got:', prd?.metadata);
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Tests Passed: ${passed}`);
  console.log(`Tests Failed: ${failed}`);
  console.log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
