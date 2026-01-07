#!/usr/bin/env node
/**
 * Simple Node.js WebSocket test client
 *
 * Usage:
 *   node examples/test-client.js <jwt-token> [ws-url]
 */

import WebSocket from 'ws';
import jwt from 'jsonwebtoken';

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node examples/test-client.js <jwt-token> [ws-url]');
  console.log('\nExample:');
  console.log('  node examples/test-client.js "eyJhbGc..." ws://localhost:8765');
  console.log('\nOr generate a test token:');
  console.log('  JWT_SECRET="your-secret" node examples/generate-token.js INIT-123');
  process.exit(1);
}

const token = args[0];
const wsUrl = args[1] || 'ws://localhost:8765';

console.log(`Connecting to ${wsUrl}...`);

const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);

ws.on('open', () => {
  console.log('✓ Connected to Task Copilot stream\n');

  // Start heartbeat
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);
});

ws.on('message', (data) => {
  try {
    const event = JSON.parse(data.toString());

    if (event.type === 'pong') {
      console.log('❤️  Heartbeat:', event.timestamp);
      return;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📨 Event: ${event.type}`);
    console.log(`⏰ Time: ${event.timestamp}`);
    console.log(`🎯 Initiative: ${event.initiativeId}`);
    console.log('📦 Data:', JSON.stringify(event.data, null, 2));
    console.log('='.repeat(60));
  } catch (err) {
    console.error('Failed to parse message:', err);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('\n👋 Disconnected from server');
  process.exit(0);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nClosing connection...');
  ws.close();
});
