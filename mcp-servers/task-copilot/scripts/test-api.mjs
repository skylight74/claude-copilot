/**
 * HTTP API Test Runner
 * Tests against localhost:9090 (or a test server)
 */

import { DatabaseClient } from './dist/database.js';
import { createHttpServer } from './dist/http-server.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

class TestRunner {
  constructor() {
    this.results = [];
    this.testNumber = 0;
  }

  async test(name, fn, details) {
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
        message: error.message
      });
      console.log(`✗ ${testName}`);
      console.log(`  ERROR: ${error.message}`);
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

async function runTests() {
  console.log('HTTP API Comprehensive Test Suite\n');
  console.log('='.repeat(60) + '\n');

  // Create temp directory for test database
  const tempDir = mkdtempSync(join(tmpdir(), 'task-copilot-test-'));
  const db = new DatabaseClient(tempDir, tempDir, 'test-http');
  const runner = new TestRunner();

  let server = null;

  try {
    // Create test server
    server = await createHttpServer({
      host: '127.0.0.1',
      port: 9092,
      db
    });

    console.log('✓ HTTP server started on port 9092\n');

    // Setup test data
    console.log('Setting up test data...');
    const now = new Date().toISOString();

    db.upsertInitiative({
      id: 'INIT-TEST',
      title: 'Test Initiative',
      description: 'Test initiative',
      created_at: now,
      updated_at: now
    });

    db.insertPrd({
      id: 'PRD-TEST',
      initiative_id: 'INIT-TEST',
      title: 'Test PRD',
      description: 'Test',
      content: 'Test content',
      metadata: JSON.stringify({ milestones: [] }),
      status: 'active',
      created_at: now,
      updated_at: now
    });

    // Create tasks in Stream-A
    db.insertTask({
      id: 'TASK-A1',
      prd_id: 'PRD-TEST',
      parent_id: null,
      title: 'Task A1 - Completed',
      description: 'Completed task',
      assigned_agent: 'me',
      status: 'completed',
      blocked_reason: null,
      notes: null,
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
      description: 'In progress task',
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
      description: 'Pending task',
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
      description: 'Completed task',
      assigned_agent: 'me',
      status: 'completed',
      blocked_reason: null,
      notes: null,
      metadata: JSON.stringify({
        streamId: 'Stream-B',
        streamName: 'Parallel',
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
      description: 'Blocked task',
      assigned_agent: 'doc',
      status: 'blocked',
      blocked_reason: 'Waiting for docs',
      notes: null,
      metadata: JSON.stringify({
        streamId: 'Stream-B',
        streamName: 'Parallel',
        streamPhase: 'parallel',
        files: ['fileB2.ts']
      }),
      created_at: now,
      updated_at: now,
      archived: 0,
      archived_at: null,
      archived_by_initiative_id: null
    });

    // Create agent activity
    db.createAgentActivity({
      streamId: 'Stream-A',
      agentId: 'qa',
      taskId: 'TASK-A2',
      activityDescription: 'Testing login flow',
      phase: 'testing'
    });

    console.log('✓ Test data created\n');

    // ========================================
    // TESTS
    // ========================================
    console.log('ENDPOINT AVAILABILITY TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Health endpoint responds', async () => {
      const response = await server.inject({ method: 'GET', url: '/health' });
      return response.statusCode === 200;
    });

    await runner.test('GET /api/streams responds', async () => {
      const response = await server.inject({ method: 'GET', url: '/api/streams' });
      return response.statusCode === 200;
    });

    await runner.test('GET /api/tasks responds', async () => {
      const response = await server.inject({ method: 'GET', url: '/api/tasks' });
      return response.statusCode === 200;
    });

    await runner.test('GET /api/activity responds', async () => {
      const response = await server.inject({ method: 'GET', url: '/api/activity' });
      return response.statusCode === 200;
    });

    console.log('GET /api/streams TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Returns 2 streams', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/streams?initiativeId=INIT-TEST'
      });
      const body = JSON.parse(response.body);
      return body.totalStreams === 2;
    });

    await runner.test('Stream-A progress is 33%', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/streams?initiativeId=INIT-TEST'
      });
      const body = JSON.parse(response.body);
      const streamA = body.streams.find(s => s.streamId === 'Stream-A');
      return streamA && streamA.progressPercentage === 33;
    });

    await runner.test('Stream-B progress is 50%', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/streams?initiativeId=INIT-TEST'
      });
      const body = JSON.parse(response.body);
      const streamB = body.streams.find(s => s.streamId === 'Stream-B');
      return streamB && streamB.progressPercentage === 50;
    });

    console.log('GET /api/streams/:streamId TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Returns stream detail with 3 tasks', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/streams/Stream-A'
      });
      const body = JSON.parse(response.body);
      return body.streamId === 'Stream-A' && body.tasks.length === 3;
    });

    await runner.test('Returns 404 for non-existent stream', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/streams/Stream-X'
      });
      return response.statusCode === 404;
    });

    console.log('GET /api/tasks TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Returns all 5 tasks', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks'
      });
      const body = JSON.parse(response.body);
      return body.totalTasks === 5;
    });

    await runner.test('Filter by status=completed returns 2', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks?status=completed'
      });
      const body = JSON.parse(response.body);
      return body.totalTasks === 2;
    });

    await runner.test('Filter by status=in_progress returns 1', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks?status=in_progress'
      });
      const body = JSON.parse(response.body);
      return body.totalTasks === 1 && body.tasks[0].id === 'TASK-A2';
    });

    await runner.test('Filter by streamId=Stream-A returns 3', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks?streamId=Stream-A'
      });
      const body = JSON.parse(response.body);
      return body.totalTasks === 3;
    });

    await runner.test('Filter by assignedAgent=me returns 2', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks?assignedAgent=me'
      });
      const body = JSON.parse(response.body);
      return body.totalTasks === 2;
    });

    await runner.test('Limit parameter works', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks?limit=2'
      });
      const body = JSON.parse(response.body);
      return body.tasks.length === 2;
    });

    await runner.test('Multiple filters work', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks?streamId=Stream-A&status=completed'
      });
      const body = JSON.parse(response.body);
      return body.totalTasks === 1 && body.tasks[0].id === 'TASK-A1';
    });

    console.log('GET /api/activity TESTS');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Returns 1 active agent', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/activity'
      });
      const body = JSON.parse(response.body);
      return body.totalActive === 1;
    });

    await runner.test('Activity shows correct agent (qa)', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/activity'
      });
      const body = JSON.parse(response.body);
      return body.activities[0].agentId === 'qa';
    });

    await runner.test('Activity shows correct task', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/activity'
      });
      const body = JSON.parse(response.body);
      return body.activities[0].taskId === 'TASK-A2';
    });

    await runner.test('isActive is true', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/activity'
      });
      const body = JSON.parse(response.body);
      return body.activities[0].isActive === true;
    });

    console.log('EDGE CASES');
    console.log('-'.repeat(60) + '\n');

    await runner.test('Invalid status returns empty', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks?status=invalid_status'
      });
      const body = JSON.parse(response.body);
      return body.totalTasks === 0;
    });

    await runner.test('Non-existent streamId returns empty', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks?streamId=Stream-Z'
      });
      const body = JSON.parse(response.body);
      return body.totalTasks === 0;
    });

    // Print summary
    const summary = runner.printSummary();
    return summary.failed === 0 ? 0 : 1;

  } catch (error) {
    console.error('Fatal error:', error);
    return 1;
  } finally {
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
runTests()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
