/**
 * Test verification enforcement for complex tasks
 *
 * Verifies:
 * 1. task_create defaults verificationRequired for High/Very High complexity
 * 2. task_update blocks completion without proof when verificationRequired is true
 * 3. Error messages are clear and actionable
 */

import { DatabaseClient } from '../../database.js';
import { taskCreate, taskUpdate, taskGet } from '../task.js';
import { workProductStore } from '../work-product.js';
import { initiativeLink } from '../initiative.js';
import { prdCreate } from '../prd.js';
import type { TaskCreateInput, TaskUpdateInput, WorkProductStoreInput } from '../../types.js';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

function createTestDatabase(): DatabaseClient {
  const testDir = join(tmpdir(), `verification-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });

  const db = new DatabaseClient(
    '/test/project',
    testDir,
    `test-${Date.now()}`
  );

  return db;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Testing Verification Enforcement for Complex Tasks\n');

  let testCount = 0;
  let passCount = 0;
  let failCount = 0;

  // Test 1: High complexity defaults verificationRequired to true
  testCount++;
  console.log(`Test ${testCount}: High complexity task defaults verificationRequired=true`);
  try {
    const db = createTestDatabase();
    initiativeLink(db, {
      initiativeId: 'INIT-TEST-001',
      title: 'Test Initiative'
    });

    const prd = await prdCreate(db, {
      title: 'Test PRD',
      content: 'Test content',
      metadata: {}
    });

    const input: TaskCreateInput = {
      prdId: prd.id,
      title: 'Complex Task',
      description: 'High complexity task',
      metadata: {
        complexity: 'High'
      }
    };

    const task = await taskCreate(db, input);
    const retrieved = taskGet(db, { id: task.id });

    assert(retrieved !== null, 'Task should be created');
    assert(retrieved.metadata.verificationRequired === true,
      'verificationRequired should default to true for High complexity');

    console.log('  ✅ PASSED\n');
    passCount++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    failCount++;
  }

  // Test 2: Very High complexity defaults verificationRequired to true
  testCount++;
  console.log(`Test ${testCount}: Very High complexity task defaults verificationRequired=true`);
  try {
    const db = createTestDatabase();
    initiativeLink(db, {
      initiativeId: 'INIT-TEST-002',
      title: 'Test Initiative'
    });

    const prd = await prdCreate(db, {
      title: 'Test PRD',
      content: 'Test content',
      metadata: {}
    });

    const input: TaskCreateInput = {
      prdId: prd.id,
      title: 'Very Complex Task',
      description: 'Very high complexity task',
      metadata: {
        complexity: 'Very High'
      }
    };

    const task = await taskCreate(db, input);
    const retrieved = taskGet(db, { id: task.id });

    assert(retrieved !== null, 'Task should be created');
    assert(retrieved.metadata.verificationRequired === true,
      'verificationRequired should default to true for Very High complexity');

    console.log('  ✅ PASSED\n');
    passCount++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    failCount++;
  }

  // Test 3: Medium complexity does NOT default verificationRequired
  testCount++;
  console.log(`Test ${testCount}: Medium complexity does not default verificationRequired`);
  try {
    const db = createTestDatabase();
    initiativeLink(db, {
      initiativeId: 'INIT-TEST-003',
      title: 'Test Initiative'
    });

    const prd = await prdCreate(db, {
      title: 'Test PRD',
      content: 'Test content',
      metadata: {}
    });

    const input: TaskCreateInput = {
      prdId: prd.id,
      title: 'Medium Task',
      description: 'Medium complexity task',
      metadata: {
        complexity: 'Medium'
      }
    };

    const task = await taskCreate(db, input);
    const retrieved = taskGet(db, { id: task.id });

    assert(retrieved !== null, 'Task should be created');
    assert(retrieved.metadata.verificationRequired !== true,
      'verificationRequired should not default to true for Medium complexity');

    console.log('  ✅ PASSED\n');
    passCount++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    failCount++;
  }

  // Test 4: Explicit verificationRequired=false overrides auto-detection
  testCount++;
  console.log(`Test ${testCount}: Explicit verificationRequired=false overrides default`);
  try {
    const db = createTestDatabase();
    initiativeLink(db, {
      initiativeId: 'INIT-TEST-004',
      title: 'Test Initiative'
    });

    const prd = await prdCreate(db, {
      title: 'Test PRD',
      content: 'Test content',
      metadata: {}
    });

    const input: TaskCreateInput = {
      prdId: prd.id,
      title: 'High Complexity but No Verification',
      metadata: {
        complexity: 'High',
        verificationRequired: false
      }
    };

    const task = await taskCreate(db, input);
    const retrieved = taskGet(db, { id: task.id });

    assert(retrieved !== null, 'Task should be created');
    assert(retrieved.metadata.verificationRequired === false,
      'Explicit verificationRequired should override auto-detection');

    console.log('  ✅ PASSED\n');
    passCount++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    failCount++;
  }

  // Test 5: Completion blocked without acceptance criteria
  testCount++;
  console.log(`Test ${testCount}: Completion blocked without acceptance criteria`);
  try {
    const db = createTestDatabase();
    initiativeLink(db, {
      initiativeId: 'INIT-TEST-005',
      title: 'Test Initiative'
    });

    const prd = await prdCreate(db, {
      title: 'Test PRD',
      content: 'Test content',
      metadata: {}
    });

    const input: TaskCreateInput = {
      prdId: prd.id,
      title: 'Task Without Acceptance Criteria',
      metadata: {
        complexity: 'High'
      }
    };

    const task = await taskCreate(db, input);

    // Try to complete without acceptance criteria - should fail
    let errorThrown = false;
    try {
      await taskUpdate(db, {
        id: task.id,
        status: 'completed'
      });
    } catch (error) {
      errorThrown = true;
      assert(error instanceof Error, 'Error should be Error instance');
      assert(error.message.includes('acceptance criteria'),
        'Error should mention acceptance criteria');
    }

    assert(errorThrown, 'Should throw error when completing without acceptance criteria');

    console.log('  ✅ PASSED\n');
    passCount++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    failCount++;
  }

  // Test 6: Completion blocked without proof (even with acceptance criteria)
  testCount++;
  console.log(`Test ${testCount}: Completion blocked without proof`);
  try {
    const db = createTestDatabase();
    initiativeLink(db, {
      initiativeId: 'INIT-TEST-006',
      title: 'Test Initiative'
    });

    const prd = await prdCreate(db, {
      title: 'Test PRD',
      content: 'Test content',
      metadata: {}
    });

    const input: TaskCreateInput = {
      prdId: prd.id,
      title: 'Task With Acceptance Criteria But No Proof',
      metadata: {
        complexity: 'High',
        acceptanceCriteria: ['Tests pass', 'Code reviewed']
      }
    };

    const task = await taskCreate(db, input);

    // Try to complete without proof - should fail
    let errorThrown = false;
    try {
      await taskUpdate(db, {
        id: task.id,
        status: 'completed'
      });
    } catch (error) {
      errorThrown = true;
      assert(error instanceof Error, 'Error should be Error instance');
      assert(error.message.includes('proof') || error.message.includes('evidence'),
        'Error should mention proof/evidence');
    }

    assert(errorThrown, 'Should throw error when completing without proof');

    console.log('  ✅ PASSED\n');
    passCount++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    failCount++;
  }

  // Test 7: Completion allowed with work product as proof
  testCount++;
  console.log(`Test ${testCount}: Completion allowed with work product as proof`);
  try {
    const db = createTestDatabase();
    initiativeLink(db, {
      initiativeId: 'INIT-TEST-007',
      title: 'Test Initiative'
    });

    const prd = await prdCreate(db, {
      title: 'Test PRD',
      content: 'Test content',
      metadata: {}
    });

    const input: TaskCreateInput = {
      prdId: prd.id,
      title: 'Task With Work Product Proof',
      metadata: {
        complexity: 'High',
        acceptanceCriteria: ['Tests pass', 'Code reviewed']
      }
    };

    const task = await taskCreate(db, input);

    // Add work product as proof
    const wpInput: WorkProductStoreInput = {
      taskId: task.id,
      type: 'implementation',
      title: 'Implementation Proof',
      content: 'Test implementation with passing tests'
    };
    await workProductStore(db, wpInput);

    // Now completion should succeed
    const updated = await taskUpdate(db, {
      id: task.id,
      status: 'completed'
    });

    assert(updated !== null, 'Task should be updated');
    assert(updated.status === 'completed', 'Task should be completed');

    console.log('  ✅ PASSED\n');
    passCount++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    failCount++;
  }

  // Test 8: Completion allowed with substantive notes as proof
  testCount++;
  console.log(`Test ${testCount}: Completion allowed with substantive notes as proof`);
  try {
    const db = createTestDatabase();
    initiativeLink(db, {
      initiativeId: 'INIT-TEST-008',
      title: 'Test Initiative'
    });

    const prd = await prdCreate(db, {
      title: 'Test PRD',
      content: 'Test content',
      metadata: {}
    });

    const input: TaskCreateInput = {
      prdId: prd.id,
      title: 'Task With Notes Proof',
      metadata: {
        complexity: 'High',
        acceptanceCriteria: ['Tests pass', 'Code reviewed']
      }
    };

    const task = await taskCreate(db, input);

    // Add substantive notes as proof (>50 chars)
    const notes = 'All tests passing. Screenshot saved at /tmp/test-results.png. Acceptance criteria met.';

    const updated = await taskUpdate(db, {
      id: task.id,
      status: 'completed',
      notes
    });

    assert(updated !== null, 'Task should be updated');
    assert(updated.status === 'completed', 'Task should be completed');

    console.log('  ✅ PASSED\n');
    passCount++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    failCount++;
  }

  // Test 9: Notes too short should not count as proof
  testCount++;
  console.log(`Test ${testCount}: Notes too short (<50 chars) should not count as proof`);
  try {
    const db = createTestDatabase();
    initiativeLink(db, {
      initiativeId: 'INIT-TEST-009',
      title: 'Test Initiative'
    });

    const prd = await prdCreate(db, {
      title: 'Test PRD',
      content: 'Test content',
      metadata: {}
    });

    const input: TaskCreateInput = {
      prdId: prd.id,
      title: 'Task With Short Notes',
      metadata: {
        complexity: 'High',
        acceptanceCriteria: ['Tests pass']
      }
    };

    const task = await taskCreate(db, input);

    // Try to complete with short notes (<50 chars) - should fail
    let errorThrown = false;
    try {
      await taskUpdate(db, {
        id: task.id,
        status: 'completed',
        notes: 'Done' // Only 4 chars
      });
    } catch (error) {
      errorThrown = true;
      assert(error instanceof Error, 'Error should be Error instance');
      assert(error.message.includes('proof') || error.message.includes('evidence'),
        'Error should mention proof/evidence requirement');
    }

    assert(errorThrown, 'Should throw error when notes are too short');

    console.log('  ✅ PASSED\n');
    passCount++;
  } catch (error) {
    console.log(`  ❌ FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    failCount++;
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testCount}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success Rate: ${((passCount / testCount) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
