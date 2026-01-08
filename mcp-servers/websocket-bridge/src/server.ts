/**
 * WebSocket server setup and event routing
 */

import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { ConnectionManager } from './websocket/connection-manager.js';
import { SubscriptionManager } from './websocket/subscription-manager.js';
import { EventPoller } from './polling/event-poller.js';
import { JwtManager } from './auth/jwt-manager.js';
import type { WebSocketEvent, ClientMessage } from './events/types.js';

export interface ServerConfig {
  port: number;
  jwtSecret: string;
  taskDbPath: string;
  pollInterval?: number;
  heartbeatInterval?: number;
}

export class BridgeServer {
  private wss: WebSocketServer;
  private connectionManager: ConnectionManager;
  private subscriptionManager: SubscriptionManager;
  private eventPoller: EventPoller;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;

    // Initialize managers
    const jwtManager = new JwtManager(config.jwtSecret);
    this.connectionManager = new ConnectionManager(jwtManager, config.heartbeatInterval);
    this.subscriptionManager = new SubscriptionManager();

    // Initialize event poller
    this.eventPoller = new EventPoller(config.taskDbPath, config.pollInterval || 100);

    // Create WebSocket server
    this.wss = new WebSocketServer({ port: config.port });

    this.setupWebSocketHandlers();
    this.setupEventPoller();
  }

  /**
   * Setup WebSocket connection handlers
   */
  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('New WebSocket connection attempt');

      // Extract JWT token from query string
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        this.connectionManager.sendError(ws, 'Missing authentication token', 'AUTH_REQUIRED');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Authenticate
      const authResult = this.connectionManager.authenticate(ws, token);
      if (!authResult.success) {
        this.connectionManager.sendError(ws, authResult.error || 'Authentication failed', 'AUTH_FAILED');
        ws.close(1008, 'Authentication failed');
        return;
      }

      console.log(`Client authenticated for initiative: ${authResult.initiativeId}`);

      // Auto-subscribe to their initiative
      if (authResult.initiativeId) {
        this.subscriptionManager.subscribe(ws, authResult.initiativeId);
      }

      // Handle messages
      ws.on('message', (data: Buffer) => {
        this.handleClientMessage(ws, data.toString());
      });

      // Handle close
      ws.on('close', () => {
        console.log('Client disconnected');
        this.subscriptionManager.removeAll(ws);
        this.connectionManager.remove(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.subscriptionManager.removeAll(ws);
        this.connectionManager.remove(ws);
      });
    });

    console.log(`WebSocket server listening on port ${this.config.port}`);
  }

  /**
   * Setup event poller to broadcast events to subscribed clients
   */
  private setupEventPoller(): void {
    this.eventPoller.start((events: WebSocketEvent[]) => {
      for (const event of events) {
        this.broadcastEvent(event);
      }
    });

    console.log('Event poller started');
  }

  /**
   * Broadcast event to all subscribed clients
   */
  private broadcastEvent(event: WebSocketEvent): void {
    const subscribers = this.subscriptionManager.getSubscribers(event.initiativeId);

    console.log(`Broadcasting ${event.type} to ${subscribers.length} subscribers`);

    for (const ws of subscribers) {
      this.connectionManager.send(ws, event);
    }
  }

  /**
   * Handle incoming client messages
   */
  private handleClientMessage(ws: WebSocket, data: string): void {
    const message = this.connectionManager.parseMessage(data);

    if (!message) {
      this.connectionManager.sendError(ws, 'Invalid message format', 'INVALID_MESSAGE');
      return;
    }

    switch (message.type) {
      case 'ping':
        this.connectionManager.updatePing(ws);
        this.connectionManager.send(ws, {
          type: 'pong',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'subscribe':
        if (message.initiativeId) {
          this.subscriptionManager.subscribe(ws, message.initiativeId);
          console.log(`Client subscribed to ${message.initiativeId}`);
        } else {
          this.connectionManager.sendError(ws, 'Missing initiativeId', 'INVALID_SUBSCRIBE');
        }
        break;

      case 'unsubscribe':
        if (message.initiativeId) {
          this.subscriptionManager.unsubscribe(ws, message.initiativeId);
          console.log(`Client unsubscribed from ${message.initiativeId}`);
        } else {
          this.connectionManager.sendError(ws, 'Missing initiativeId', 'INVALID_UNSUBSCRIBE');
        }
        break;

      default:
        this.connectionManager.sendError(ws, `Unknown message type: ${message.type}`, 'UNKNOWN_TYPE');
    }
  }

  /**
   * Start heartbeat monitoring
   */
  start(): void {
    this.connectionManager.startHeartbeat();
    console.log('Bridge server started');
  }

  /**
   * Stop server and cleanup
   */
  stop(): void {
    console.log('Stopping bridge server...');

    this.connectionManager.stopHeartbeat();
    this.eventPoller.close();

    this.wss.close(() => {
      console.log('Bridge server stopped');
    });
  }

  /**
   * Get server stats
   */
  getStats(): { activeConnections: number; port: number } {
    return {
      activeConnections: this.connectionManager.getActiveConnections(),
      port: this.config.port,
    };
  }
}
