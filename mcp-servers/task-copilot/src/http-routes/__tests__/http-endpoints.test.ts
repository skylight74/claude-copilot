/**
 * HTTP Endpoint Tests
 *
 * Tests for the HTTP REST API endpoints.
 */

import { DatabaseClient } from '../../database.js';
import { createHttpServer } from '../../http-server.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { FastifyInstance } from 'fastify';

describe('HTTP Endpoints', () => {
  let db: DatabaseClient;
  let server: FastifyInstance;
  let tempDir: string;

  beforeAll(async () => {
    // Create temp directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'task-copilot-http-test-'));
    db = new DatabaseClient(tempDir, tempDir, 'test-http');

    // Create test server
    server = await createHttpServer({
      host: '127.0.0.1',
      port: 0, // Use random port for testing
      db
    });
  });

  afterAll(async () => {
    await server.close();
    db.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('GET /api/streams', () => {
    test('returns empty array when no streams exist', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/streams'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.streams).toEqual([]);
      expect(body.totalStreams).toBe(0);
    });

    test('returns streams with progress percentage', async () => {
      // Create initiative
      db.upsertInitiative({
        id: 'INIT-001',
        title: 'Test Initiative',
        description: 'Test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Create PRD
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

      // Create tasks with stream metadata
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
          streamPhase: 'foundation'
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
          streamPhase: 'foundation'
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        archived: 0,
        archived_at: null,
        archived_by_initiative_id: null
      });

      const response = await server.inject({
        method: 'GET',
        url: '/api/streams?initiativeId=INIT-001'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.streams).toHaveLength(1);
      expect(body.streams[0].streamId).toBe('Stream-A');
      expect(body.streams[0].totalTasks).toBe(2);
      expect(body.streams[0].completedTasks).toBe(1);
      expect(body.streams[0].progressPercentage).toBe(50);
    });
  });

  describe('GET /api/streams/:streamId', () => {
    test('returns 404 for non-existent stream', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/streams/Stream-X'
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Stream not found');
    });

    test('returns stream with tasks and progress', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/streams/Stream-A'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.streamId).toBe('Stream-A');
      expect(body.tasks).toHaveLength(2);
      expect(body.progressPercentage).toBe(50);
    });
  });

  describe('GET /api/tasks', () => {
    test('returns tasks with filters', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks?status=in_progress'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tasks.length).toBeGreaterThan(0);
      expect(body.tasks.every((t: any) => t.status === 'in_progress')).toBe(true);
    });

    test('filters by streamId', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks?streamId=Stream-A'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tasks.every((t: any) => t.metadata.streamId === 'Stream-A')).toBe(true);
    });

    test('respects limit parameter', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/tasks?limit=1'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tasks.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/activity', () => {
    test('returns in-progress tasks as activity', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/activity'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.activity).toBeDefined();
      expect(body.totalActive).toBeDefined();
      expect(body.note).toContain('Placeholder implementation');
    });

    test('filters by streamId', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/activity?streamId=Stream-A'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.activity.every((a: any) => a.streamId === 'Stream-A')).toBe(true);
    });
  });

  describe('GET /health', () => {
    test('returns health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });
});
