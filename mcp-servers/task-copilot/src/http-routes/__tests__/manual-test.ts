/**
 * Manual HTTP Endpoint Test
 *
 * Simple integration test that doesn't require a test framework.
 * Run with: npm run build && node dist/http-routes/__tests__/manual-test.js
 */

import { DatabaseClient } from '../../database.js';
import { createHttpServer } from '../../http-server.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { FastifyInstance } from 'fastify';

async function runTests() {
  console.log('Starting HTTP endpoint tests...\n');

  // Create temp directory for test database
  const tempDir = mkdtempSync(join(tmpdir(), 'task-copilot-http-test-'));
  const db = new DatabaseClient(tempDir, tempDir, 'test-http');

  let server: FastifyInstance | null = null;

  try {
    // Create test server
    server = await createHttpServer({
      host: '127.0.0.1',
      port: 9091, // Use different port to avoid conflicts
      db
    });

    console.log('✓ HTTP server started\n');

    // Test 1: GET /health
    console.log('Test 1: GET /health');
    const healthResponse = await server.inject({
      method: 'GET',
      url: '/health'
    });
    console.log('  Status:', healthResponse.statusCode);
    console.log('  Body:', healthResponse.body);
    console.log(healthResponse.statusCode === 200 ? '  ✓ PASS\n' : '  ✗ FAIL\n');

    // Test 2: GET /api/streams (empty)
    console.log('Test 2: GET /api/streams (empty)');
    const streamsResponse = await server.inject({
      method: 'GET',
      url: '/api/streams'
    });
    const streamsBody = JSON.parse(streamsResponse.body);
    console.log('  Status:', streamsResponse.statusCode);
    console.log('  Streams count:', streamsBody.totalStreams);
    console.log(streamsBody.totalStreams === 0 ? '  ✓ PASS\n' : '  ✗ FAIL\n');

    // Create test data
    console.log('Setting up test data...');
    db.upsertInitiative({
      id: 'INIT-001',
      title: 'Test Initiative',
      description: 'Test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    db.insertPrd({
      id: 'PRD-001',
      initiative_id: 'INIT-001',
      title: 'Test PRD',
      description: 'Test',
      content: 'Test content',
      metadata: '{}',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    db.insertTask({
      id: 'TASK-001',
      prd_id: 'PRD-001',
      parent_id: null,
      title: 'Task 1',
      description: 'Test',
      assigned_agent: 'me',
      status: 'completed',
      blocked_reason: null,
      notes: null,
      metadata: JSON.stringify({
        streamId: 'Stream-A',
        streamName: 'foundation',
        streamPhase: 'foundation',
        files: ['test.ts']
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: 0,
      archived_at: null,
      archived_by_initiative_id: null
    });

    db.insertTask({
      id: 'TASK-002',
      prd_id: 'PRD-001',
      parent_id: null,
      title: 'Task 2',
      description: 'Test',
      assigned_agent: 'me',
      status: 'in_progress',
      blocked_reason: null,
      notes: null,
      metadata: JSON.stringify({
        streamId: 'Stream-A',
        streamName: 'foundation',
        streamPhase: 'foundation',
        files: ['test2.ts']
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived: 0,
      archived_at: null,
      archived_by_initiative_id: null
    });
    console.log('✓ Test data created\n');

    // Test 3: GET /api/streams (with data)
    console.log('Test 3: GET /api/streams (with data)');
    const streams2Response = await server.inject({
      method: 'GET',
      url: '/api/streams?initiativeId=INIT-001'
    });
    const streams2Body = JSON.parse(streams2Response.body);
    console.log('  Status:', streams2Response.statusCode);
    console.log('  Streams count:', streams2Body.totalStreams);
    console.log('  First stream:', JSON.stringify(streams2Body.streams[0], null, 2));
    console.log(
      streams2Body.totalStreams === 1 &&
      streams2Body.streams[0].streamId === 'Stream-A' &&
      streams2Body.streams[0].progressPercentage === 50
        ? '  ✓ PASS\n'
        : '  ✗ FAIL\n'
    );

    // Test 4: GET /api/streams/:streamId
    console.log('Test 4: GET /api/streams/Stream-A');
    const streamResponse = await server.inject({
      method: 'GET',
      url: '/api/streams/Stream-A'
    });
    const streamBody = JSON.parse(streamResponse.body);
    console.log('  Status:', streamResponse.statusCode);
    console.log('  Stream ID:', streamBody.streamId);
    console.log('  Tasks count:', streamBody.tasks?.length);
    console.log('  Progress:', streamBody.progressPercentage + '%');
    console.log(
      streamBody.streamId === 'Stream-A' &&
      streamBody.tasks.length === 2 &&
      streamBody.progressPercentage === 50
        ? '  ✓ PASS\n'
        : '  ✗ FAIL\n'
    );

    // Test 5: GET /api/tasks
    console.log('Test 5: GET /api/tasks?status=in_progress');
    const tasksResponse = await server.inject({
      method: 'GET',
      url: '/api/tasks?status=in_progress'
    });
    const tasksBody = JSON.parse(tasksResponse.body);
    console.log('  Status:', tasksResponse.statusCode);
    console.log('  Tasks count:', tasksBody.totalTasks);
    console.log(
      tasksBody.totalTasks === 1 &&
      tasksBody.tasks[0].status === 'in_progress'
        ? '  ✓ PASS\n'
        : '  ✗ FAIL\n'
    );

    // Test 6: GET /api/tasks with streamId filter
    console.log('Test 6: GET /api/tasks?streamId=Stream-A');
    const tasks2Response = await server.inject({
      method: 'GET',
      url: '/api/tasks?streamId=Stream-A'
    });
    const tasks2Body = JSON.parse(tasks2Response.body);
    console.log('  Status:', tasks2Response.statusCode);
    console.log('  Tasks count:', tasks2Body.totalTasks);
    console.log(tasks2Body.totalTasks === 2 ? '  ✓ PASS\n' : '  ✗ FAIL\n');

    // Test 7: GET /api/activity
    console.log('Test 7: GET /api/activity');
    const activityResponse = await server.inject({
      method: 'GET',
      url: '/api/activity'
    });
    const activityBody = JSON.parse(activityResponse.body);
    console.log('  Status:', activityResponse.statusCode);
    console.log('  Active count:', activityBody.totalActive);
    console.log('  Note:', activityBody.note);
    console.log(activityBody.totalActive === 1 ? '  ✓ PASS\n' : '  ✗ FAIL\n');

    // Test 8: GET /api/streams/:streamId (not found)
    console.log('Test 8: GET /api/streams/Stream-X (not found)');
    const stream404Response = await server.inject({
      method: 'GET',
      url: '/api/streams/Stream-X'
    });
    console.log('  Status:', stream404Response.statusCode);
    console.log(stream404Response.statusCode === 404 ? '  ✓ PASS\n' : '  ✗ FAIL\n');

    console.log('All tests completed!');

  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
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

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
