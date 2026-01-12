#!/usr/bin/env node
/**
 * Standalone HTTP API server starter for testing.
 *
 * Usage: node start-http-server.mjs
 */

import { createHttpServer } from './dist/http-server.js';
import { DatabaseClient } from './dist/database.js';
import path from 'path';
import os from 'os';

const TASK_DB_PATH = process.env.TASK_DB_PATH || path.join(os.homedir(), '.claude', 'tasks');

async function main() {
  console.log('Starting Task Copilot HTTP API with WebSocket support...');
  console.log(`Database path: ${TASK_DB_PATH}`);

  // Initialize database
  const db = new DatabaseClient(TASK_DB_PATH);

  // Start HTTP server
  const server = await createHttpServer({
    host: '127.0.0.1',
    port: 9090,
    db
  });

  console.log('Server started. Press Ctrl+C to stop.');

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down...');
    await server.close();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
