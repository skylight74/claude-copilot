#!/usr/bin/env node
/**
 * Quick database verification script
 */

import { DatabaseClient } from './dist/database.js';
import { v4 as uuidv4 } from 'uuid';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync } from 'fs';

const testDir = join(tmpdir(), `task-copilot-test-${Date.now()}`);
const workspaceId = 'test-workspace';

console.log('Starting Task Copilot database test...\n');

try {
  // Create database
  console.log('1. Creating database...');
  const db = new DatabaseClient(process.cwd(), testDir, workspaceId);
  console.log(`   ✓ Database created at ${testDir}/${workspaceId}/tasks.db\n`);

  // Create initiative
  console.log('2. Creating initiative...');
  const initiativeId = `INIT-${uuidv4()}`;
  db.upsertInitiative({
    id: initiativeId,
    title: 'Test Initiative',
    description: 'Testing database functionality',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  console.log(`   ✓ Initiative created: ${initiativeId}\n`);

  // Create PRD
  console.log('3. Creating PRD...');
  const prdId = `PRD-${uuidv4()}`;
  db.insertPrd({
    id: prdId,
    initiative_id: initiativeId,
    title: 'Test PRD',
    description: 'A test PRD',
    content: 'This is test PRD content',
    metadata: JSON.stringify({ priority: 'P0' }),
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  console.log(`   ✓ PRD created: ${prdId}\n`);

  // Create task
  console.log('4. Creating task...');
  const taskId = `TASK-${uuidv4()}`;
  db.insertTask({
    id: taskId,
    prd_id: prdId,
    parent_id: null,
    title: 'Test Task',
    description: 'A test task',
    assigned_agent: 'me',
    status: 'pending',
    blocked_reason: null,
    notes: null,
    metadata: JSON.stringify({ complexity: 'Medium' }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  console.log(`   ✓ Task created: ${taskId}\n`);

  // Create work product
  console.log('5. Creating work product...');
  const wpId = `WP-${uuidv4()}`;
  db.insertWorkProduct({
    id: wpId,
    task_id: taskId,
    type: 'technical_design',
    title: 'Test Design',
    content: 'This is a test design document',
    metadata: JSON.stringify({}),
    created_at: new Date().toISOString()
  });
  console.log(`   ✓ Work product created: ${wpId}\n`);

  // Query data
  console.log('6. Querying data...');
  const prd = db.getPrd(prdId);
  const task = db.getTask(taskId);
  const wp = db.getWorkProduct(wpId);
  console.log(`   ✓ PRD: ${prd.title}`);
  console.log(`   ✓ Task: ${task.title}`);
  console.log(`   ✓ Work Product: ${wp.title}\n`);

  // Get stats
  console.log('7. Getting stats...');
  const stats = db.getStats();
  console.log(`   ✓ PRDs: ${stats.prdCount}`);
  console.log(`   ✓ Tasks: ${stats.taskCount}`);
  console.log(`   ✓ Completed Tasks: ${stats.completedTasks}`);
  console.log(`   ✓ Work Products: ${stats.workProductCount}\n`);

  // Close database
  db.close();
  console.log('8. Cleaning up...');
  rmSync(testDir, { recursive: true, force: true });
  console.log('   ✓ Test directory cleaned up\n');

  console.log('✅ All tests passed!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error(error.stack);

  // Cleanup on error
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup errors
  }

  process.exit(1);
}
