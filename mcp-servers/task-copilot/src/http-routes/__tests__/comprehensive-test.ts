/**
 * Comprehensive HTTP API Test Suite
 *
 * Tests all HTTP endpoints and activity tracking functionality.
 * Run with: npm run build && node dist/http-routes/__tests__/comprehensive-test.js
 */

import { DatabaseClient } from '../../database.js';
import { createHttpServer } from '../../http-server.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { FastifyInstance } from 'fastify';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  details?: unknown;
}

class TestRunner {
  private results: TestResult[] = [];
  private testNumber = 0;

  async test(
    name: string,
    fn: () => Promise<boolean> | boolean,
    details?: unknown
  ): Promise<void> {
    this.testNumber++;
    const testName = `Test ${this.testNumber}: ${name}`;

    try {
      const passed = await fn();
      this.results.push({
        name: testName,
        passed,
        details
      });

      console.log(`${passed ? '✓' : '✗'} ${testName}`);
      if (details) {
        console.log('  Details:', JSON.stringify(details, null, 2));
      }
    } catch (error) {
      this.results.push({
        name: testName,
        passed: false,
        message: error instanceof Error ? error.message : String(error)
      });
      console.log(`✗ ${testName}`);
      console.log(`  ERROR: ${error}`);
    }
    console.log();
  }

  getSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    return {
      passed,
      failed,
      total,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      results: this.results
    };
  }

  printSummary() {
    const summary = this.getSummary();
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed} (${summary.passRate}%)`);
    console.log(`Failed: ${summary.failed}`);
    console.log('='.repeat(60));

    if (summary.failed > 0) {
      console.log('\nFailed Tests:');
      summary.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.name}`);
          if (r.message) {
            console.log(`    ${r.message}`);
          }
        });
    }

    return summary;
  }
}

async function runComprehensiveTests() {
  console.log('Starting Comprehensive HTTP API Test Suite\n');
  console.log('='.repeat(60));
  console.log();

  // Create temp directory for test database
  const tempDir = mkdtempSync(join(tmpdir(), 'task-copilot-comprehensive-test-'));
  const db = new DatabaseClient(tempDir, tempDir, 'test-comprehensive');
  const runner = new TestRunner();

  let server: FastifyInstance | null = null;

  try {
    // Create test server
    server = await createHttpServer({
      host: '127.0.0.1',
      port: 9092, // Use different port to avoid conflicts
      db
    });

    console.log('✓ HTTP server started on port 9092\n');

    // ========================================
    // 1. ENDPOINT AVAILABILITY TESTS
    // ========================================
    console.log('ENDPOINT AVAILABILITY TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Health endpoint responds', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/health'
      });
      return response.statusCode === 200;
    });

    await runner.test('GET /api/streams responds', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams'
      });
      return response.statusCode === 200;
    });

    await runner.test('GET /api/tasks responds', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks'
      });
      return response.statusCode === 200;
    });

    await runner.test('GET /api/activity responds', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/activity'
      });
      return response.statusCode === 200;
    });

    // ========================================
    // 2. SETUP TEST DATA
    // ========================================
    console.log('SETTING UP TEST DATA');
    console.log('-'.repeat(60) + '\n');

    // Create initiative
    db.upsertInitiative({
      id: 'INIT-TEST',
      title: 'Test Initiative',
      description: 'Comprehensive test initiative',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Create PRD
    db.insertPrd({
      id: 'PRD-TEST',
      initiative_id: 'INIT-TEST',
      title: 'Test PRD',
      description: 'Test PRD for comprehensive testing',
      content: 'Full test content',
      metadata: JSON.stringify({ milestones: [] }),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Create tasks in Stream-A
    const now = new Date().toISOString();

    db.insertTask({
      id: 'TASK-A1',
      prd_id: 'PRD-TEST',
      parent_id: null,
      title: 'Task A1 - Completed',
      description: 'Completed task in Stream-A',
      assigned_agent: 'me',
      status: 'completed',
      blocked_reason: null,
      notes: 'Task completed successfully',
      metadata: JSON.stringify({
        streamId: 'Stream-A',
        streamName: 'Foundation',
        streamPhase: 'foundation',
        files: ['file1.ts']
      }),
      created_at: now,
      updated_at: now,
      archived: 0,
      archived_at: null,
      archived_by_initiative_id: null
    });

    db.insertTask({
      id: 'TASK-A2',
      prd_id: 'PRD-TEST',
      parent_id: null,
      title: 'Task A2 - In Progress',
      description: 'In progress task in Stream-A',
      assigned_agent: 'qa',
      status: 'in_progress',
      blocked_reason: null,
      notes: null,
      metadata: JSON.stringify({
        streamId: 'Stream-A',
        streamName: 'Foundation',
        streamPhase: 'foundation',
        files: ['file2.ts']
      }),
      created_at: now,
      updated_at: now,
      archived: 0,
      archived_at: null,
      archived_by_initiative_id: null
    });

    db.insertTask({
      id: 'TASK-A3',
      prd_id: 'PRD-TEST',
      parent_id: null,
      title: 'Task A3 - Pending',
      description: 'Pending task in Stream-A',
      assigned_agent: 'ta',
      status: 'pending',
      blocked_reason: null,
      notes: null,
      metadata: JSON.stringify({
        streamId: 'Stream-A',
        streamName: 'Foundation',
        streamPhase: 'foundation',
        files: ['file3.ts']
      }),
      created_at: now,
      updated_at: now,
      archived: 0,
      archived_at: null,
      archived_by_initiative_id: null
    });

    // Create tasks in Stream-B
    db.insertTask({
      id: 'TASK-B1',
      prd_id: 'PRD-TEST',
      parent_id: null,
      title: 'Task B1 - Completed',
      description: 'Completed task in Stream-B',
      assigned_agent: 'me',
      status: 'completed',
      blocked_reason: null,
      notes: null,
      metadata: JSON.stringify({
        streamId: 'Stream-B',
        streamName: 'Parallel Work',
        streamPhase: 'parallel',
        files: ['fileB1.ts']
      }),
      created_at: now,
      updated_at: now,
      archived: 0,
      archived_at: null,
      archived_by_initiative_id: null
    });

    db.insertTask({
      id: 'TASK-B2',
      prd_id: 'PRD-TEST',
      parent_id: null,
      title: 'Task B2 - Blocked',
      description: 'Blocked task in Stream-B',
      assigned_agent: 'doc',
      status: 'blocked',
      blocked_reason: 'Waiting for API documentation',
      notes: null,
      metadata: JSON.stringify({
        streamId: 'Stream-B',
        streamName: 'Parallel Work',
        streamPhase: 'parallel',
        files: ['fileB2.ts']
      }),
      created_at: now,
      updated_at: now,
      archived: 0,
      archived_at: null,
      archived_by_initiative_id: null
    });

    // Create agent activity for in-progress task
    db.createAgentActivity({
      streamId: 'Stream-A',
      agentId: 'qa',
      taskId: 'TASK-A2',
      activityDescription: 'Testing login flow',
      phase: 'testing'
    });

    console.log('✓ Created test data:');
    console.log('  - 1 Initiative (INIT-TEST)');
    console.log('  - 1 PRD (PRD-TEST)');
    console.log('  - 5 Tasks across 2 streams');
    console.log('  - 1 Active agent activity\n');

    // ========================================
    // 3. GET /api/streams TESTS
    // ========================================
    console.log('GET /api/streams TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Returns streams array', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams?initiativeId=INIT-TEST'
      });
      const body = JSON.parse(response.body);
      return Array.isArray(body.streams);
    });

    await runner.test('Returns 2 streams', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams?initiativeId=INIT-TEST'
      });
      const body = JSON.parse(response.body);
      return body.totalStreams === 2;
    }, { expectedStreams: 2 });

    await runner.test('Stream has correct structure', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams?initiativeId=INIT-TEST'
      });
      const body = JSON.parse(response.body);
      const stream = body.streams[0];

      return (
        typeof stream.streamId === 'string' &&
        typeof stream.totalTasks === 'number' &&
        typeof stream.completedTasks === 'number' &&
        typeof stream.progressPercentage === 'number'
      );
    });

    await runner.test('Stream-A progress is 33% (1/3 completed)', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams?initiativeId=INIT-TEST'
      });
      const body = JSON.parse(response.body);
      const streamA = body.streams.find((s: any) => s.streamId === 'Stream-A');

      return streamA && streamA.progressPercentage === 33;
    }, { expected: '33%' });

    await runner.test('Stream-B progress is 50% (1/2 completed)', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams?initiativeId=INIT-TEST'
      });
      const body = JSON.parse(response.body);
      const streamB = body.streams.find((s: any) => s.streamId === 'Stream-B');

      return streamB && streamB.progressPercentage === 50;
    }, { expected: '50%' });

    // ========================================
    // 4. GET /api/streams/:streamId TESTS
    // ========================================
    console.log('GET /api/streams/:streamId TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Returns stream detail with tasks', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams/Stream-A'
      });
      const body = JSON.parse(response.body);

      return (
        body.streamId === 'Stream-A' &&
        Array.isArray(body.tasks) &&
        body.tasks.length === 3
      );
    });

    await runner.test('Stream detail includes progress percentage', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams/Stream-A'
      });
      const body = JSON.parse(response.body);

      return body.progressPercentage === 33;
    });

    await runner.test('Returns 404 for non-existent stream', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams/Stream-X'
      });

      return response.statusCode === 404;
    });

    await runner.test('404 response includes error message', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams/Stream-X'
      });
      const body = JSON.parse(response.body);

      return body.error && body.streamId === 'Stream-X';
    });

    await runner.test('includeArchived parameter works', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams/Stream-A?includeArchived=true'
      });

      return response.statusCode === 200;
    });

    // ========================================
    // 5. GET /api/tasks TESTS
    // ========================================
    console.log('GET /api/tasks TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Returns all tasks without filters', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks'
      });
      const body = JSON.parse(response.body);

      return body.totalTasks === 5;
    });

    await runner.test('Filter by status=completed returns 2 tasks', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?status=completed'
      });
      const body = JSON.parse(response.body);

      return body.totalTasks === 2 && body.tasks.every((t: any) => t.status === 'completed');
    });

    await runner.test('Filter by status=in_progress returns 1 task', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?status=in_progress'
      });
      const body = JSON.parse(response.body);

      return body.totalTasks === 1 && body.tasks[0].id === 'TASK-A2';
    });

    await runner.test('Filter by status=blocked returns 1 task', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?status=blocked'
      });
      const body = JSON.parse(response.body);

      return body.totalTasks === 1 && body.tasks[0].blockedReason;
    });

    await runner.test('Filter by streamId=Stream-A returns 3 tasks', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?streamId=Stream-A'
      });
      const body = JSON.parse(response.body);

      return body.totalTasks === 3 && body.tasks.every((t: any) => t.metadata.streamId === 'Stream-A');
    });

    await runner.test('Filter by streamId=Stream-B returns 2 tasks', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?streamId=Stream-B'
      });
      const body = JSON.parse(response.body);

      return body.totalTasks === 2 && body.tasks.every((t: any) => t.metadata.streamId === 'Stream-B');
    });

    await runner.test('Filter by assignedAgent=me returns 2 tasks', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?assignedAgent=me'
      });
      const body = JSON.parse(response.body);

      return body.totalTasks === 2 && body.tasks.every((t: any) => t.assignedAgent === 'me');
    });

    await runner.test('Filter by assignedAgent=qa returns 1 task', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?assignedAgent=qa'
      });
      const body = JSON.parse(response.body);

      return body.totalTasks === 1 && body.tasks[0].assignedAgent === 'qa';
    });

    await runner.test('Limit parameter works (limit=2)', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?limit=2'
      });
      const body = JSON.parse(response.body);

      return body.tasks.length === 2;
    });

    await runner.test('Multiple filters work together', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?streamId=Stream-A&status=completed'
      });
      const body = JSON.parse(response.body);

      return (
        body.totalTasks === 1 &&
        body.tasks[0].metadata.streamId === 'Stream-A' &&
        body.tasks[0].status === 'completed'
      );
    });

    // ========================================
    // 6. GET /api/activity TESTS
    // ========================================
    console.log('GET /api/activity TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Returns activity array', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/activity'
      });
      const body = JSON.parse(response.body);

      return Array.isArray(body.activities);
    });

    await runner.test('Returns 1 active agent', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/activity'
      });
      const body = JSON.parse(response.body);

      return body.totalActive === 1;
    });

    await runner.test('Activity has correct structure', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/activity'
      });
      const body = JSON.parse(response.body);
      const activity = body.activities[0];

      return (
        activity &&
        typeof activity.streamId === 'string' &&
        typeof activity.agentId === 'string' &&
        typeof activity.agentName === 'string' &&
        typeof activity.taskId === 'string' &&
        typeof activity.taskTitle === 'string' &&
        typeof activity.isActive === 'boolean'
      );
    });

    await runner.test('Activity shows correct agent (qa)', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/activity'
      });
      const body = JSON.parse(response.body);

      return body.activities[0].agentId === 'qa' && body.activities[0].agentName === 'QA Engineer';
    });

    await runner.test('Activity shows correct task (TASK-A2)', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/activity'
      });
      const body = JSON.parse(response.body);

      return body.activities[0].taskId === 'TASK-A2';
    });

    await runner.test('isActive is true for recent heartbeat', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/activity'
      });
      const body = JSON.parse(response.body);

      return body.activities[0].isActive === true;
    });

    await runner.test('Filter by streamId works', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/activity?streamId=Stream-A'
      });
      const body = JSON.parse(response.body);

      return body.activities.every((a: any) => a.streamId === 'Stream-A');
    });

    // ========================================
    // 7. ACTIVITY TRACKING INTEGRATION TESTS
    // ========================================
    console.log('ACTIVITY TRACKING INTEGRATION TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Activity created when task goes in_progress', async () => {
      // Update task to in_progress
      db.updateTask({
        id: 'TASK-A3',
        status: 'in_progress',
        notes: 'Started working on this'
      });

      // Create activity for the new in_progress task
      db.createAgentActivity({
        streamId: 'Stream-A',
        agentId: 'ta',
        taskId: 'TASK-A3',
        activityDescription: 'Designing architecture',
        phase: 'design'
      });

      const response = await server!.inject({
        method: 'GET',
        url: '/api/activity'
      });
      const body = JSON.parse(response.body);

      return body.totalActive === 2;
    });

    await runner.test('Activity can be retrieved by streamId', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/activity?streamId=Stream-A'
      });
      const body = JSON.parse(response.body);

      return body.activities.length === 2 && body.activities.every((a: any) => a.streamId === 'Stream-A');
    });

    await runner.test('Completing task can mark activity complete', async () => {
      // Complete the task
      db.updateTask({
        id: 'TASK-A2',
        status: 'completed',
        notes: 'Testing completed'
      });

      // Complete the activity
      db.completeAgentActivity('TASK-A2');

      // Activity should still appear in results but can be filtered
      const response = await server!.inject({
        method: 'GET',
        url: '/api/activity?active=false'
      });
      const body = JSON.parse(response.body);

      // Should include completed activities when active=false
      return body.activities.length >= 2;
    });

    // ========================================
    // 8. EDGE CASES AND ERROR HANDLING
    // ========================================
    console.log('EDGE CASES AND ERROR HANDLING TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Invalid status filter returns empty results', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?status=invalid_status'
      });
      const body = JSON.parse(response.body);

      return body.totalTasks === 0;
    });

    await runner.test('Non-existent streamId returns empty results', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?streamId=Stream-Z'
      });
      const body = JSON.parse(response.body);

      return body.totalTasks === 0;
    });

    await runner.test('Limit=0 returns all results', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?limit=0'
      });
      const body = JSON.parse(response.body);

      return body.totalTasks > 0;
    });

    await runner.test('Invalid limit is ignored', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/tasks?limit=invalid'
      });

      return response.statusCode === 200;
    });

    await runner.test('Empty initiative returns no streams', async () => {
      const response = await server!.inject({
        method: 'GET',
        url: '/api/streams?initiativeId=INIT-EMPTY'
      });
      const body = JSON.parse(response.body);

      return body.totalStreams === 0;
    });

    // ========================================
    // PRINT RESULTS
    // ========================================
    const summary = runner.printSummary();

    // Return exit code based on test results
    return summary.failed === 0 ? 0 : 1;

  } catch (error) {
    console.error('Fatal error during tests:', error);
    return 1;
  } finally {
    // Cleanup
    if (server) {
      await server.close();
      console.log('\n✓ Server closed');
    }
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
    console.log('✓ Test database cleaned up');
  }
}

// Run tests
runComprehensiveTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
