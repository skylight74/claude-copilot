/**
 * Tests for Activation Mode Validation Rules
 *
 * Tests the validation system that enforces constraints based on task activation modes,
 * particularly the ultrawork mode's 3-subtask limit (GSD atomic work principle).
 *
 * Run with: npm run build && node dist/validation/__tests__/activation-mode-rules.test.js
 */

import Database from 'better-sqlite3';
import { DatabaseClient } from '../../database.js';
import { validateActivationMode, shouldValidateActivationMode } from '../activation-mode-rules.js';
import type { TaskRow, TaskMetadata } from '../../types.js';

// ============================================================================
// TEST HELPERS
// ============================================================================

let testCount = 0;
let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

async function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  testCount++;
  console.log(`\n${testCount}. ${name}`);
  console.log('='.repeat(60));

  try {
    await fn();
    passCount++;
    console.log('✓ PASSED');
  } catch (error) {
    failCount++;
    console.log('✗ FAILED');
    console.error(error);
  }
}

function createTestDatabase(): DatabaseClient {
  const sqliteDb = new Database(':memory:');
  return new DatabaseClient(sqliteDb);
}

function createTaskRow(activationMode: 'ultrawork' | 'analyze' | 'quick' | 'thorough' | null | undefined): TaskRow {
  const metadata: TaskMetadata = {};
  if (activationMode !== undefined) {
    metadata.activationMode = activationMode;
  }

  return {
    id: 'TASK-test',
    prd_id: null,
    parent_id: null,
    title: 'Test Task',
    description: null,
    assigned_agent: null,
    status: 'pending',
    blocked_reason: null,
    notes: null,
    metadata: JSON.stringify(metadata),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived: 0,
    archived_at: null,
    archived_by_initiative_id: null
  };
}

interface InsertTaskOptions {
  title: string;
  activationMode?: 'ultrawork' | 'analyze' | 'quick' | 'thorough' | null;
  parentId?: string;
}

function insertTask(db: DatabaseClient, options: InsertTaskOptions): TaskRow {
  const now = new Date().toISOString();
  const id = `TASK-${Math.random().toString(36).substring(7)}`;

  const metadata: TaskMetadata = {};
  if (options.activationMode !== undefined) {
    metadata.activationMode = options.activationMode;
  }

  const task: TaskRow = {
    id,
    prd_id: null,
    parent_id: options.parentId || null,
    title: options.title,
    description: null,
    assigned_agent: null,
    status: 'pending',
    blocked_reason: null,
    notes: null,
    metadata: JSON.stringify(metadata),
    created_at: now,
    updated_at: now,
    archived: 0,
    archived_at: null,
    archived_by_initiative_id: null
  };

  db.insertTask(task);
  return db.getTask(id)!;
}

// ============================================================================
// TEST SUITE
// ============================================================================

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('ACTIVATION MODE VALIDATION RULES TESTS');
  console.log('='.repeat(60));

  // shouldValidateActivationMode tests
  await runTest('should return true for tasks with activationMode set', () => {
    const task = createTaskRow('ultrawork');
    assert(shouldValidateActivationMode(task) === true, 'Expected true for ultrawork mode');
  });

  await runTest('should return false for tasks with activationMode null', () => {
    const task = createTaskRow(null);
    assert(shouldValidateActivationMode(task) === false, 'Expected false for null mode');
  });

  await runTest('should return false for tasks without activationMode', () => {
    const task = createTaskRow(undefined);
    assert(shouldValidateActivationMode(task) === false, 'Expected false for undefined mode');
  });

  await runTest('should validate each activation mode type', () => {
    assert(shouldValidateActivationMode(createTaskRow('ultrawork')) === true, 'ultrawork');
    assert(shouldValidateActivationMode(createTaskRow('analyze')) === true, 'analyze');
    assert(shouldValidateActivationMode(createTaskRow('quick')) === true, 'quick');
    assert(shouldValidateActivationMode(createTaskRow('thorough')) === true, 'thorough');
  });

  // validateActivationMode - no mode set
  await runTest('should pass validation when activationMode is null', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Parent Task',
      activationMode: null
    });

    const result = validateActivationMode(db, parentTask);

    assert(result.valid === true, 'Expected valid result');
    assert(result.warnings.length === 0, 'Expected no warnings');
    assert(result.actionableFeedback === undefined, 'Expected no feedback');
    db.close();
  });

  await runTest('should pass validation when activationMode is undefined', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Parent Task',
      activationMode: undefined
    });

    const result = validateActivationMode(db, parentTask);

    assert(result.valid === true, 'Expected valid result');
    assert(result.warnings.length === 0, 'Expected no warnings');
    db.close();
  });

  // validateActivationMode - ultrawork mode
  await runTest('should pass when ultrawork task has 0 subtasks', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Simple Task',
      activationMode: 'ultrawork'
    });

    const result = validateActivationMode(db, parentTask);

    assert(result.valid === true, 'Expected valid result');
    assert(result.warnings.length === 0, 'Expected no warnings');
    db.close();
  });

  await runTest('should pass when ultrawork task has exactly 3 subtasks', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Task with 3 subtasks',
      activationMode: 'ultrawork'
    });

    insertTask(db, { title: 'Subtask 1', parentId: parentTask.id });
    insertTask(db, { title: 'Subtask 2', parentId: parentTask.id });
    insertTask(db, { title: 'Subtask 3', parentId: parentTask.id });

    const result = validateActivationMode(db, parentTask);

    assert(result.valid === true, 'Expected valid result');
    assert(result.warnings.length === 0, 'Expected no warnings');
    db.close();
  });

  await runTest('should warn when ultrawork task has 4 subtasks', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Task with too many subtasks',
      activationMode: 'ultrawork'
    });

    insertTask(db, { title: 'Subtask 1', parentId: parentTask.id });
    insertTask(db, { title: 'Subtask 2', parentId: parentTask.id });
    insertTask(db, { title: 'Subtask 3', parentId: parentTask.id });
    insertTask(db, { title: 'Subtask 4', parentId: parentTask.id });

    const result = validateActivationMode(db, parentTask);

    assert(result.valid === true, 'Warning should not block');
    assert(result.warnings.length === 1, 'Expected 1 warning');
    assert(result.warnings[0].includes('ULTRAWORK MODE CONSTRAINT VIOLATED'), 'Warning message check');
    assert(result.warnings[0].includes('Subtasks: 4 (limit: 3)'), 'Subtask count check');
    assert(result.actionableFeedback !== undefined, 'Expected actionable feedback');
    db.close();
  });

  await runTest('should warn when ultrawork task has many subtasks', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Complex task',
      activationMode: 'ultrawork'
    });

    for (let i = 1; i <= 10; i++) {
      insertTask(db, { title: `Subtask ${i}`, parentId: parentTask.id });
    }

    const result = validateActivationMode(db, parentTask);

    assert(result.valid === true, 'Warning should not block');
    assert(result.warnings.length === 1, 'Expected 1 warning');
    assert(result.warnings[0].includes('Subtasks: 10 (limit: 3)'), 'Subtask count check');
    assert(result.warnings[0].includes('Remove 7 subtask(s)'), 'Excess count check');
    db.close();
  });

  await runTest('should include recommendations in warning', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Overloaded task',
      activationMode: 'ultrawork'
    });

    for (let i = 1; i <= 5; i++) {
      insertTask(db, { title: `Subtask ${i}`, parentId: parentTask.id });
    }

    const result = validateActivationMode(db, parentTask);

    assert(result.warnings[0].includes('Recommendations:'), 'Has recommendations');
    assert(result.warnings[0].includes('Break this task'), 'Break task recommendation');
    assert(result.warnings[0].includes('thorough'), 'Thorough mode recommendation');
    assert(result.warnings[0].includes('scope creep'), 'Explains rationale');
    db.close();
  });

  await runTest('should count only direct subtasks, not nested ones', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Parent',
      activationMode: 'ultrawork'
    });

    const subtask1 = insertTask(db, { title: 'Subtask 1', parentId: parentTask.id });
    const subtask2 = insertTask(db, { title: 'Subtask 2', parentId: parentTask.id });

    insertTask(db, { title: 'Nested 1', parentId: subtask1.id });
    insertTask(db, { title: 'Nested 2', parentId: subtask1.id });
    insertTask(db, { title: 'Nested 3', parentId: subtask2.id });

    const result = validateActivationMode(db, parentTask);

    assert(result.valid === true, 'Expected valid result');
    assert(result.warnings.length === 0, 'Expected no warnings (only 2 direct subtasks)');
    db.close();
  });

  // validateActivationMode - other modes
  await runTest('should pass validation for analyze mode with any subtask count', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Analysis task',
      activationMode: 'analyze'
    });

    for (let i = 1; i <= 5; i++) {
      insertTask(db, { title: `Subtask ${i}`, parentId: parentTask.id });
    }

    const result = validateActivationMode(db, parentTask);

    assert(result.valid === true, 'Expected valid result');
    assert(result.warnings.length === 0, 'Expected no warnings');
    db.close();
  });

  await runTest('should pass validation for quick mode with any subtask count', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Quick task',
      activationMode: 'quick'
    });

    for (let i = 1; i <= 4; i++) {
      insertTask(db, { title: `Subtask ${i}`, parentId: parentTask.id });
    }

    const result = validateActivationMode(db, parentTask);

    assert(result.valid === true, 'Expected valid result');
    assert(result.warnings.length === 0, 'Expected no warnings');
    db.close();
  });

  await runTest('should pass validation for thorough mode with many subtasks', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Thorough task',
      activationMode: 'thorough'
    });

    for (let i = 1; i <= 20; i++) {
      insertTask(db, { title: `Subtask ${i}`, parentId: parentTask.id });
    }

    const result = validateActivationMode(db, parentTask);

    assert(result.valid === true, 'Expected valid result');
    assert(result.warnings.length === 0, 'Expected no warnings (thorough mode allows complexity)');
    db.close();
  });

  // warning message format tests
  await runTest('should include emoji indicator in warning', () => {
    const db = createTestDatabase();
    const parentTask = insertTask(db, {
      title: 'Test',
      activationMode: 'ultrawork'
    });

    for (let i = 1; i <= 4; i++) {
      insertTask(db, { title: `Subtask ${i}`, parentId: parentTask.id });
    }

    const result = validateActivationMode(db, parentTask);

    assert(result.warnings[0].includes('⚠️'), 'Expected emoji indicator');
    db.close();
  });

  await runTest('should include task title in warning', () => {
    const db = createTestDatabase();
    const taskTitle = 'Implement complex feature with multiple steps';
    const parentTask = insertTask(db, {
      title: taskTitle,
      activationMode: 'ultrawork'
    });

    for (let i = 1; i <= 4; i++) {
      insertTask(db, { title: `Subtask ${i}`, parentId: parentTask.id });
    }

    const result = validateActivationMode(db, parentTask);

    assert(result.warnings[0].includes(taskTitle), 'Expected task title in warning');
    db.close();
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total:  ${testCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
