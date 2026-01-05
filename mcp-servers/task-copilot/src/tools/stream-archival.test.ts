/**
 * Stream Archival Integration Tests
 * Tests auto-archive on initiative change
 */

import { DatabaseClient } from '../database.js';
import { streamList, streamGet, streamUnarchive, streamArchiveAll } from './stream.js';
import { initiativeLink } from './initiative.js';
import { taskCreate } from './task.js';
import { prdCreate } from './prd.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Test helpers
function createTestDb(): DatabaseClient {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stream-archival-test-'));
  return new DatabaseClient(tempDir);
}

function log(msg: string) {
  console.log('  ' + msg);
}

function pass(name: string) {
  console.log('✅ PASS: ' + name + '\n');
}

function fail(name: string, error: any) {
  console.log('❌ FAIL: ' + name);
  console.log('  Error: ' + error + '\n');
  process.exit(1);
}

// Tests
async function testAutoArchiveOnInitiativeSwitch() {
  console.log('1. Auto-Archive on Initiative Switch');
  console.log('============================================================');

  const db = createTestDb();

  try {
    // Setup: Create initiative 1 with PRD and stream tasks
    initiativeLink(db, { initiativeId: 'INIT-001', title: 'First Initiative' });

    // prdCreate uses getCurrentInitiative() internally
    const prd1 = await prdCreate(db, {
      title: 'Feature A',
      content: 'Build feature A'
    });
    log('✓ Created PRD: ' + prd1.id);

    // Create tasks with streamId
    taskCreate(db, {
      title: 'Stream A Task 1',
      prdId: prd1.id,
      metadata: { streamId: 'Stream-A', phase: 'foundation' }
    });
    taskCreate(db, {
      title: 'Stream A Task 2',
      prdId: prd1.id,
      metadata: { streamId: 'Stream-A', phase: 'foundation' }
    });
    taskCreate(db, {
      title: 'Stream B Task 1',
      prdId: prd1.id,
      metadata: { streamId: 'Stream-B', phase: 'parallel' }
    });
    log('✓ Created 3 stream tasks (2 in Stream-A, 1 in Stream-B)');

    // Verify streams exist
    const beforeSwitch = streamList(db, { initiativeId: 'INIT-001' });
    if (beforeSwitch.streams.length !== 2) {
      throw new Error('Expected 2 streams, got ' + beforeSwitch.streams.length);
    }
    log('✓ Verified ' + beforeSwitch.streams.length + ' streams before switch');

    // Switch to new initiative
    initiativeLink(db, { initiativeId: 'INIT-002', title: 'Second Initiative' });
    log('✓ Switched to INIT-002');

    // Verify streams are archived (not visible by default)
    const afterSwitch = streamList(db, { initiativeId: 'INIT-001' });
    if (afterSwitch.streams.length !== 0) {
      throw new Error('Expected 0 active streams after switch, got ' + afterSwitch.streams.length);
    }
    log('✓ Streams no longer visible after initiative switch');

    // Verify archived streams can be retrieved with includeArchived
    const archivedStreams = streamList(db, { initiativeId: 'INIT-001', includeArchived: true });
    if (archivedStreams.streams.length !== 2) {
      throw new Error('Expected 2 archived streams, got ' + archivedStreams.streams.length);
    }
    log('✓ Retrieved ' + archivedStreams.streams.length + ' archived streams with includeArchived=true');

    pass('Auto-Archive on Initiative Switch');
  } catch (error) {
    fail('Auto-Archive on Initiative Switch', error);
  }
}

async function testStreamGetArchived() {
  console.log('2. Stream Get with Archived Filter');
  console.log('============================================================');

  const db = createTestDb();

  try {
    // Setup
    initiativeLink(db, { initiativeId: 'INIT-001', title: 'First Initiative' });
    const prd = await prdCreate(db, { title: 'Test', content: 'Test' });
    taskCreate(db, {
      title: 'Stream A Task',
      prdId: prd.id,
      metadata: { streamId: 'Stream-A' }
    });

    // Verify stream exists
    const beforeArchive = streamGet(db, { streamId: 'Stream-A' });
    if (!beforeArchive) {
      throw new Error('Stream-A should exist before archive');
    }
    log('✓ Stream-A exists before archive');

    // Archive by switching initiative
    initiativeLink(db, { initiativeId: 'INIT-002', title: 'Second Initiative' });

    // Stream should return null by default
    const afterArchive = streamGet(db, { streamId: 'Stream-A' });
    if (afterArchive !== null) {
      throw new Error('Stream-A should return null after archive');
    }
    log('✓ Stream-A returns null after archive (default behavior)');

    // Stream should be retrievable with includeArchived
    const withArchived = streamGet(db, { streamId: 'Stream-A', includeArchived: true });
    if (!withArchived) {
      throw new Error('Stream-A should be retrievable with includeArchived=true');
    }
    if (!withArchived.archived) {
      throw new Error('Stream should have archived=true');
    }
    log('✓ Stream-A retrievable with includeArchived=true');
    log('✓ Archived metadata: archived=' + withArchived.archived + ', archivedAt=' + (withArchived.archivedAt ? withArchived.archivedAt.substring(0, 10) : 'null'));

    pass('Stream Get with Archived Filter');
  } catch (error) {
    fail('Stream Get with Archived Filter', error);
  }
}

async function testStreamUnarchive() {
  console.log('3. Stream Unarchive');
  console.log('============================================================');

  const db = createTestDb();

  try {
    // Setup and archive
    initiativeLink(db, { initiativeId: 'INIT-001', title: 'First Initiative' });
    const prd = await prdCreate(db, { title: 'Test', content: 'Test' });
    taskCreate(db, { title: 'Task 1', prdId: prd.id, metadata: { streamId: 'Stream-A' } });
    taskCreate(db, { title: 'Task 2', prdId: prd.id, metadata: { streamId: 'Stream-A' } });

    initiativeLink(db, { initiativeId: 'INIT-002', title: 'Second Initiative' });
    log('✓ Setup complete, streams archived');

    // Verify archived
    const archived = streamGet(db, { streamId: 'Stream-A' });
    if (archived !== null) {
      throw new Error('Stream should be archived');
    }
    log('✓ Stream-A is archived');

    // Unarchive
    const result = streamUnarchive(db, { streamId: 'Stream-A' });
    log('✓ Unarchived ' + result.tasksUnarchived + ' tasks');

    if (result.tasksUnarchived !== 2) {
      throw new Error('Expected 2 tasks unarchived, got ' + result.tasksUnarchived);
    }

    // Verify stream is now accessible
    const afterUnarchive = streamGet(db, { streamId: 'Stream-A' });
    if (!afterUnarchive) {
      throw new Error('Stream-A should be accessible after unarchive');
    }
    if (afterUnarchive.archived) {
      throw new Error('Stream should not be marked archived after unarchive');
    }
    log('✓ Stream-A accessible after unarchive');

    pass('Stream Unarchive');
  } catch (error) {
    fail('Stream Unarchive', error);
  }
}

async function testSameInitiativeNoArchive() {
  console.log('4. Same Initiative Re-link (No Archive)');
  console.log('============================================================');

  const db = createTestDb();

  try {
    // Setup
    initiativeLink(db, { initiativeId: 'INIT-001', title: 'First Initiative' });
    const prd = await prdCreate(db, { title: 'Test', content: 'Test' });
    taskCreate(db, { title: 'Task', prdId: prd.id, metadata: { streamId: 'Stream-A' } });

    const before = streamList(db, { initiativeId: 'INIT-001' });
    log('✓ ' + before.streams.length + ' stream(s) before re-link');

    // Re-link same initiative (should NOT archive)
    initiativeLink(db, { initiativeId: 'INIT-001', title: 'First Initiative Updated' });

    const after = streamList(db, { initiativeId: 'INIT-001' });
    if (after.streams.length !== before.streams.length) {
      throw new Error('Streams should not be archived when re-linking same initiative');
    }
    log('✓ ' + after.streams.length + ' stream(s) after re-link (unchanged)');

    pass('Same Initiative Re-link (No Archive)');
  } catch (error) {
    fail('Same Initiative Re-link (No Archive)', error);
  }
}

async function testOrphanedTasksArchived() {
  console.log('5. Orphaned Stream Tasks Archived');
  console.log('============================================================');

  const db = createTestDb();

  try {
    // Setup: Create initiative and orphaned task (no PRD)
    initiativeLink(db, { initiativeId: 'INIT-001', title: 'First Initiative' });

    // Create orphaned task with streamId but no prdId
    taskCreate(db, {
      title: 'Orphaned Stream Task',
      metadata: { streamId: 'Stream-Orphan' }
    });
    log('✓ Created orphaned stream task (no PRD)');

    // Verify it shows in stream list
    const before = streamGet(db, { streamId: 'Stream-Orphan' });
    if (!before) {
      throw new Error('Orphaned stream should exist before switch');
    }
    log('✓ Orphaned stream exists before switch');

    // Switch initiative
    initiativeLink(db, { initiativeId: 'INIT-002', title: 'Second Initiative' });

    // Orphaned stream should be archived
    const after = streamGet(db, { streamId: 'Stream-Orphan' });
    if (after !== null) {
      throw new Error('Orphaned stream should be archived after switch');
    }
    log('✓ Orphaned stream archived after switch');

    // Should be retrievable with includeArchived
    const withArchived = streamGet(db, { streamId: 'Stream-Orphan', includeArchived: true });
    if (!withArchived) {
      throw new Error('Orphaned stream should be retrievable with includeArchived');
    }
    log('✓ Orphaned stream retrievable with includeArchived=true');

    pass('Orphaned Stream Tasks Archived');
  } catch (error) {
    fail('Orphaned Stream Tasks Archived', error);
  }
}

async function testStreamArchiveAll() {
  console.log('6. Stream Archive All (Manual Cleanup)');
  console.log('============================================================');

  const db = createTestDb();

  try {
    // Setup: Create initiative with multiple streams
    initiativeLink(db, { initiativeId: 'INIT-001', title: 'First Initiative' });
    const prd = await prdCreate(db, { title: 'Test', content: 'Test' });
    taskCreate(db, { title: 'Task 1', prdId: prd.id, metadata: { streamId: 'Stream-A' } });
    taskCreate(db, { title: 'Task 2', prdId: prd.id, metadata: { streamId: 'Stream-A' } });
    taskCreate(db, { title: 'Task 3', prdId: prd.id, metadata: { streamId: 'Stream-B' } });
    taskCreate(db, { title: 'Task 4', prdId: prd.id, metadata: { streamId: 'Stream-C' } });
    log('✓ Created 4 tasks across 3 streams');

    // Verify streams exist
    const before = streamList(db, { initiativeId: 'INIT-001' });
    if (before.streams.length !== 3) {
      throw new Error('Expected 3 streams, got ' + before.streams.length);
    }
    log('✓ Verified ' + before.streams.length + ' streams before archive');

    // Test safety check - should throw without confirm
    try {
      streamArchiveAll(db, { confirm: false });
      throw new Error('Should have thrown without confirm=true');
    } catch (e: any) {
      if (!e.message.includes('confirm')) {
        throw e;
      }
      log('✓ Safety check works - requires confirm: true');
    }

    // Archive all streams
    const result = streamArchiveAll(db, { confirm: true });
    log('✓ Archived ' + result.streamsArchived + ' streams (' + result.tasksArchived + ' tasks)');

    if (result.tasksArchived !== 4) {
      throw new Error('Expected 4 tasks archived, got ' + result.tasksArchived);
    }

    // Verify all streams are archived
    const after = streamList(db, { initiativeId: 'INIT-001' });
    if (after.streams.length !== 0) {
      throw new Error('Expected 0 active streams after archive all, got ' + after.streams.length);
    }
    log('✓ All streams archived (0 active)');

    // Verify can still retrieve with includeArchived
    const archived = streamList(db, { initiativeId: 'INIT-001', includeArchived: true });
    if (archived.streams.length !== 3) {
      throw new Error('Expected 3 archived streams, got ' + archived.streams.length);
    }
    log('✓ Archived streams retrievable with includeArchived=true');

    pass('Stream Archive All (Manual Cleanup)');
  } catch (error) {
    fail('Stream Archive All (Manual Cleanup)', error);
  }
}

// Run all tests
async function runTests() {
  console.log('======================================================================');
  console.log('STREAM ARCHIVAL INTEGRATION TESTS');
  console.log('======================================================================\n');

  await testAutoArchiveOnInitiativeSwitch();
  await testStreamGetArchived();
  await testStreamUnarchive();
  await testSameInitiativeNoArchive();
  await testOrphanedTasksArchived();
  await testStreamArchiveAll();

  console.log('======================================================================');
  console.log('TEST SUMMARY');
  console.log('======================================================================');
  console.log('Total tests: 6');
  console.log('Passed: 6 ✅');
  console.log('Failed: 0 ❌');
  console.log('======================================================================\n');
  console.log('🎉 ALL STREAM ARCHIVAL TESTS PASSED! 🎉');
}

runTests().catch(console.error);
