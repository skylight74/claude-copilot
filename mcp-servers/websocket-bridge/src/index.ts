#!/usr/bin/env node
/**
 * WebSocket Bridge Service - Entry Point
 *
 * Streams Task Copilot activity_log events to WebSocket clients in real-time.
 */

import { homedir } from 'os';
import { join } from 'path';
import { BridgeServer } from './server.js';

// Load configuration from environment
const config = {
  port: parseInt(process.env.WS_PORT || '8765', 10),
  jwtSecret: process.env.JWT_SECRET || '',
  taskDbPath: process.env.TASK_DB_PATH || join(homedir(), '.claude', 'tasks'),
  pollInterval: parseInt(process.env.POLL_INTERVAL || '100', 10),
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000', 10),
};

// Validate required config
if (!config.jwtSecret) {
  console.error('ERROR: JWT_SECRET environment variable is required');
  process.exit(1);
}

// Determine workspace ID
const workspaceId = process.env.WORKSPACE_ID;
let dbPath: string;

if (workspaceId) {
  // Use explicit workspace ID
  dbPath = join(config.taskDbPath, workspaceId, 'tasks.db');
} else {
  console.error('ERROR: WORKSPACE_ID environment variable is required');
  console.error('Set WORKSPACE_ID to match your Task Copilot workspace');
  process.exit(1);
}

console.log('WebSocket Bridge Configuration:');
console.log(`  Port: ${config.port}`);
console.log(`  Database: ${dbPath}`);
console.log(`  Poll Interval: ${config.pollInterval}ms`);
console.log(`  Heartbeat Interval: ${config.heartbeatInterval}ms`);

// Create and start server
const server = new BridgeServer({
  ...config,
  taskDbPath: dbPath,
});

server.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  server.stop();
  process.exit(0);
});

// Log stats every 60 seconds
setInterval(() => {
  const stats = server.getStats();
  console.log(`Active connections: ${stats.activeConnections}`);
}, 60000);
