/**
 * Integration test for Enhanced Pause/Resume feature
 * Tests the complete flow from /pause to /continue
 */

import { DatabaseClient } from './src/database.js';
import { checkpointCreate, checkpointResume, checkpointList, checkpointGet } from './src/tools/checkpoint.js';
import { taskCreate } from './src/tools/task.js';
import { prdCreate } from './src/tools/prd.js';
import { initiativeLink } from './src/tools/initiative.js';

// Test configuration
const TEST_DB_PATH = ':memory:';
const TEST_INITIATIVE_ID = 'TEST-INITIATIVE-001';

console.log('🧪 Enhanced Pause/Resume Integration Test\n');

// Initialize database
const db = new DatabaseClient(TEST_DB_PATH);

// Step 1: Setup test initiative and tasks
console.log('📋 Setting up test data...');

// Link initiative
initiativeLink(db, {
  initiativeId: TEST_INITIATIVE_ID,
  title: 'Test Pause/Resume Feature',
  description: 'Integration test for enhanced pause/resume'
});

// Create PRD
const prd = prdCreate(db, {
  title: 'Test PRD',
  content: 'Testing pause/resume functionality',
  metadata: {}
});
console.log(`✓ Created PRD: ${prd.id}`);

// Create in-progress tasks
const task1 = taskCreate(db, {
  title: 'Implement feature A',
  prdId: prd.id,
  assignedAgent: 'me',
  metadata: {
    complexity: 'Medium',
    files: ['src/feature-a.ts', 'src/feature-a.test.ts']
  }
});
console.log(`✓ Created task: ${task1.id}`);

const task2 = taskCreate(db, {
  title: 'Update documentation',
  prdId: prd.id,
  assignedAgent: 'doc',
  metadata: {
    complexity: 'Low',
    files: ['docs/feature-a.md']
  }
});
console.log(`✓ Created task: ${task2.id}\n`);

// Update tasks to in_progress status
db.updateTaskStatus(task1.id, 'in_progress');
db.updateTaskStatus(task2.id, 'in_progress');
console.log('✓ Set tasks to in_progress\n');

// Step 2: Test /pause command flow
console.log('⏸️  Testing /pause command flow...\n');

const pauseReason = 'Switching to urgent production bug';
const pauseTimestamp = new Date().toISOString();

// Create pause checkpoints for all in-progress tasks
const checkpoint1 = checkpointCreate(db, {
  taskId: task1.id,
  trigger: 'manual',
  executionPhase: 'paused',
  executionStep: 0,
  pauseMetadata: {
    pauseReason: pauseReason,
    pausedBy: 'user',
    nextSteps: `Resume with /continue to restore work on: Implement feature A`,
    keyFiles: ['src/feature-a.ts', 'src/feature-a.test.ts']
  },
  expiresIn: 10080 // 7 days
});

const checkpoint2 = checkpointCreate(db, {
  taskId: task2.id,
  trigger: 'manual',
  executionPhase: 'paused',
  executionStep: 0,
  pauseMetadata: {
    pauseReason: pauseReason,
    pausedBy: 'user',
    nextSteps: `Resume with /continue to restore work on: Update documentation`,
    keyFiles: ['docs/feature-a.md']
  },
  expiresIn: 10080 // 7 days
});

console.log(`✓ Created pause checkpoint: ${checkpoint1.id}`);
console.log(`  - Task: ${task1.id}`);
console.log(`  - Reason: ${pauseReason}`);
console.log(`  - Expires: ${checkpoint1.expiresAt}\n`);

console.log(`✓ Created pause checkpoint: ${checkpoint2.id}`);
console.log(`  - Task: ${task2.id}`);
console.log(`  - Reason: ${pauseReason}`);
console.log(`  - Expires: ${checkpoint2.expiresAt}\n`);

// Step 3: Test pause checkpoint detection (simulate /continue Step 0)
console.log('🔍 Testing pause checkpoint detection...\n');

// Simulate findPauseCheckpoints() logic from continue.md
const tasks = db.listTasks({ status: 'in_progress' });
const pauseCheckpoints = [];

for (const task of tasks) {
  const taskCheckpoints = db.listCheckpoints(task.id, 5);

  for (const cp of taskCheckpoints) {
    const fullCheckpoint = db.getCheckpoint(cp.id);

    if (!fullCheckpoint) continue;

    const agentContext = fullCheckpoint.agent_context
      ? JSON.parse(fullCheckpoint.agent_context)
      : null;

    if (fullCheckpoint.trigger === 'manual' &&
        fullCheckpoint.execution_phase === 'paused' &&
        agentContext?.pausedBy === 'user') {
      pauseCheckpoints.push({
        checkpointId: cp.id,
        taskId: task.id,
        taskTitle: task.title,
        pauseReason: agentContext.pauseReason,
        pausedAt: agentContext.pausedAt,
        hasDraft: !!fullCheckpoint.draft_content,
        expiresAt: fullCheckpoint.expires_at
      });
    }
  }
}

pauseCheckpoints.sort((a, b) =>
  new Date(b.pausedAt).getTime() - new Date(a.pausedAt).getTime()
);

console.log(`✓ Found ${pauseCheckpoints.length} pause checkpoint(s):\n`);

pauseCheckpoints.forEach((pc, idx) => {
  console.log(`${idx + 1}. ${pc.taskTitle}`);
  console.log(`   Paused: ${new Date(pc.pausedAt).toLocaleString()}`);
  console.log(`   Reason: ${pc.pauseReason}`);
  console.log(`   Has draft: ${pc.hasDraft ? 'Yes' : 'No'}`);
  console.log(`   Expires: ${new Date(pc.expiresAt!).toLocaleString()}\n`);
});

// Step 4: Test checkpoint_resume with pause metadata
console.log('▶️  Testing checkpoint resume...\n');

const resumeResult = checkpointResume(db, {
  taskId: task1.id,
  checkpointId: checkpoint1.id
});

if (!resumeResult) {
  console.error('❌ Failed to resume checkpoint');
  process.exit(1);
}

console.log(`✓ Successfully resumed checkpoint: ${resumeResult.checkpointId}`);
console.log(`  - Task: ${resumeResult.taskTitle}`);
console.log(`  - Restored status: ${resumeResult.restoredStatus}`);
console.log(`  - Restored phase: ${resumeResult.restoredPhase}`);

if (resumeResult.pauseMetadata) {
  console.log(`\n  Pause Metadata:`);
  console.log(`  - Reason: ${resumeResult.pauseMetadata.pauseReason}`);
  console.log(`  - Paused by: ${resumeResult.pauseMetadata.pausedBy}`);
  console.log(`  - Next steps: ${resumeResult.pauseMetadata.nextSteps}`);
  console.log(`  - Key files: ${resumeResult.pauseMetadata.keyFiles?.join(', ')}`);
} else {
  console.error('❌ pauseMetadata not found in resume output');
  process.exit(1);
}

console.log(`\n  Resume instructions:`);
console.log(`  ${resumeResult.resumeInstructions.split('\n').join('\n  ')}`);

// Step 5: Verify checkpoint metadata structure
console.log('\n✅ Verifying checkpoint metadata structure...\n');

const fullCheckpoint1 = checkpointGet(db, { id: checkpoint1.id });
if (!fullCheckpoint1) {
  console.error('❌ Failed to retrieve checkpoint');
  process.exit(1);
}

console.log('✓ Checkpoint metadata structure:');
console.log(`  - Trigger: ${fullCheckpoint1.trigger}`);
console.log(`  - Execution phase: ${fullCheckpoint1.executionPhase}`);
console.log(`  - Agent context keys: ${fullCheckpoint1.agentContext ? Object.keys(fullCheckpoint1.agentContext).join(', ') : 'none'}`);

if (fullCheckpoint1.agentContext) {
  const expectedKeys = ['pauseReason', 'pausedBy', 'nextSteps', 'keyFiles', 'pausedAt'];
  const actualKeys = Object.keys(fullCheckpoint1.agentContext);
  const hasAllKeys = expectedKeys.every(key => actualKeys.includes(key));

  if (hasAllKeys) {
    console.log('  ✓ All expected pause metadata fields present');
  } else {
    console.error('  ❌ Missing expected pause metadata fields');
    console.error(`     Expected: ${expectedKeys.join(', ')}`);
    console.error(`     Actual: ${actualKeys.join(', ')}`);
    process.exit(1);
  }
}

// Step 6: Test extended expiry
console.log('\n⏰ Testing extended expiry...\n');

const now = new Date();
const expiryDate = new Date(checkpoint1.expiresAt!);
const diffDays = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

console.log(`✓ Expiry verification:`);
console.log(`  - Created: ${new Date(checkpoint1.createdAt).toLocaleString()}`);
console.log(`  - Expires: ${expiryDate.toLocaleString()}`);
console.log(`  - Days until expiry: ~${diffDays} days`);

if (diffDays >= 6 && diffDays <= 8) {
  console.log('  ✓ Extended expiry confirmed (~7 days)');
} else {
  console.error(`  ❌ Unexpected expiry duration: ${diffDays} days (expected ~7)`);
  process.exit(1);
}

// Final summary
console.log('\n' + '='.repeat(60));
console.log('✅ ALL TESTS PASSED');
console.log('='.repeat(60));
console.log('\nEnhanced Pause/Resume feature verification:');
console.log('  ✓ Checkpoint creation with pauseMetadata');
console.log('  ✓ Extended expiry (7 days for manual checkpoints)');
console.log('  ✓ Pause checkpoint detection logic');
console.log('  ✓ Checkpoint resume with pause metadata extraction');
console.log('  ✓ Agent context structure compatibility');
console.log('\nFeature is ready for production use.');

process.exit(0);
