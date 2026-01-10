/**
 * HTTP REST API Server for Task Copilot
 *
 * Lightweight HTTP API for external tools (e.g., Python orchestration scripts)
 * to query task and stream state. Includes WebSocket support for real-time events.
 */

import Fastify from 'fastify';
import type { DatabaseClient } from './database.js';
import { streamsRoutes } from './http-routes/streams.js';
import { tasksRoutes } from './http-routes/tasks.js';
import { activityRoutes } from './http-routes/activity.js';
import { checkpointsRoutes } from './http-routes/checkpoints.js';
import { TaskCopilotWebSocketServer } from './events/websocket-server.js';

export interface HttpServerConfig {
  host?: string;
  port?: number;
  db: DatabaseClient;
}

export async function createHttpServer(config: HttpServerConfig) {
  const { host = '127.0.0.1', port = 9090, db } = config;

  const fastify = Fastify({
    logger: false,
    disableRequestLogging: true
  });

  // Register routes
  await fastify.register(streamsRoutes, { prefix: '/api/streams', db });
  await fastify.register(tasksRoutes, { prefix: '/api/tasks', db });
  await fastify.register(activityRoutes, { prefix: '/api/activity', db });
  await fastify.register(checkpointsRoutes, { prefix: '/api/checkpoints', db });

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Start server
  try {
    await fastify.listen({ host, port });
    console.error(`HTTP API listening on http://${host}:${port}`);

    // Initialize WebSocket server after HTTP server starts
    const httpServer = fastify.server;
    new TaskCopilotWebSocketServer(httpServer);
    // Note: WebSocket server lifecycle is tied to HTTP server
  } catch (err) {
    fastify.log.error(err);
    throw err;
  }

  return fastify;
}
