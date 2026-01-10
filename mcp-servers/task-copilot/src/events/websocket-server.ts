/**
 * WebSocket Server for Task Copilot Real-Time Events
 *
 * Handles WebSocket connections, subscriptions, and event broadcasting.
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { eventBus } from './event-bus.js';
import { SubscriptionManager } from './subscription-manager.js';
import type {
  WebSocketMessage,
  SubscribePayload,
  EventPayload,
  ErrorPayload,
  WebSocketErrorCode,
} from './types.js';

const PING_INTERVAL = 30000; // 30 seconds

export class TaskCopilotWebSocketServer {
  private wss: WebSocketServer;
  private subscriptionManager: SubscriptionManager;
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(httpServer: HttpServer) {
    // Create WebSocket server attached to HTTP server
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws',
    });

    this.subscriptionManager = new SubscriptionManager();

    // Setup event listeners
    this.setupWebSocketServer();
    this.setupEventBusListeners();

    console.error('WebSocket server initialized on /ws');
  }

  /**
   * Setup WebSocket server connection handling
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();

      console.error(`WebSocket client connected: ${clientId}`);

      // Register client
      this.subscriptionManager.registerClient(clientId, ws);

      // Setup ping interval
      this.startPingInterval(clientId, ws);

      // Handle messages from client
      ws.on('message', (data: Buffer) => {
        this.handleMessage(clientId, ws, data);
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.error(`WebSocket client disconnected: ${clientId}`);
        this.cleanupClient(clientId);
      });

      // Handle errors
      ws.on('error', (error: Error) => {
        console.error(`WebSocket error for client ${clientId}:`, error.message);
        this.cleanupClient(clientId);
      });
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error.message);
    });
  }

  /**
   * Setup listeners for event bus events
   */
  private setupEventBusListeners(): void {
    // Listen to all event types and broadcast to subscribed clients
    const eventTypes = [
      'stream.progress',
      'stream.completed',
      'stream.blocked',
      'stream.started',
      'task.created',
      'task.updated',
      'task.status_changed',
      'task.blocked',
      'task.completed',
      'checkpoint.created',
      'checkpoint.resumed',
      'checkpoint.expired',
      'agent.handoff',
      'agent.started',
      'agent.heartbeat',
      'agent.completed',
    ];

    for (const eventType of eventTypes) {
      eventBus.on(eventType, (event: { topic: string; data: unknown }) => {
        this.broadcastEvent(eventType, event.topic, event.data);
      });
    }
  }

  /**
   * Handle incoming WebSocket message from client
   */
  private handleMessage(clientId: string, ws: WebSocket, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, ws, message);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(clientId, ws, message);
          break;

        case 'pong':
          // Client responded to ping, no action needed
          break;

        case 'ping':
          // Client sent ping, respond with pong
          this.sendPong(ws);
          break;

        default:
          this.sendError(ws, 'WS_UNKNOWN_TYPE', `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.sendError(
        ws,
        'WS_INVALID_MESSAGE',
        `Invalid message format: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  /**
   * Handle subscribe message
   */
  private handleSubscribe(clientId: string, ws: WebSocket, message: WebSocketMessage): void {
    const payload = message.payload as SubscribePayload;

    if (!Array.isArray(payload.topics) || payload.topics.length === 0) {
      this.sendError(ws, 'WS_INVALID_TOPIC', 'Topics must be a non-empty array');
      return;
    }

    const result = this.subscriptionManager.subscribe(clientId, payload.topics);

    if (!result.success) {
      this.sendError(ws, 'WS_SUBSCRIPTION_LIMIT', result.error || 'Subscription failed');
      return;
    }

    // Send confirmation
    const subscriptions = this.subscriptionManager.getClientSubscriptions(clientId);
    this.sendMessage(ws, {
      type: 'subscribed',
      id: message.id,
      timestamp: new Date().toISOString(),
      payload: {
        topics: payload.topics,
        activeSubscriptions: subscriptions?.length || 0,
      },
    });
  }

  /**
   * Handle unsubscribe message
   */
  private handleUnsubscribe(clientId: string, ws: WebSocket, message: WebSocketMessage): void {
    const payload = message.payload as SubscribePayload;

    if (!Array.isArray(payload.topics) || payload.topics.length === 0) {
      this.sendError(ws, 'WS_INVALID_TOPIC', 'Topics must be a non-empty array');
      return;
    }

    const result = this.subscriptionManager.unsubscribe(clientId, payload.topics);

    if (!result.success) {
      this.sendError(ws, 'WS_NOT_SUBSCRIBED', result.error || 'Unsubscribe failed');
      return;
    }

    // Send confirmation
    const subscriptions = this.subscriptionManager.getClientSubscriptions(clientId);
    this.sendMessage(ws, {
      type: 'subscribed',
      id: message.id,
      timestamp: new Date().toISOString(),
      payload: {
        topics: [], // Empty since we're unsubscribing
        activeSubscriptions: subscriptions?.length || 0,
      },
    });
  }

  /**
   * Broadcast event to all subscribed clients
   */
  private broadcastEvent(eventType: string, topic: string, data: unknown): void {
    const subscribers = this.subscriptionManager.getSubscribers(topic);

    const eventPayload: EventPayload = {
      topic,
      eventType,
      data: data as EventPayload['data'],
    };

    const message: WebSocketMessage = {
      type: 'event',
      timestamp: new Date().toISOString(),
      payload: eventPayload,
    };

    for (const ws of subscribers) {
      this.sendMessage(ws, message);
    }
  }

  /**
   * Start ping interval for a client
   */
  private startPingInterval(clientId: string, ws: WebSocket): void {
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, {
          type: 'ping',
          timestamp: new Date().toISOString(),
          payload: {},
        });
      } else {
        this.cleanupClient(clientId);
      }
    }, PING_INTERVAL);

    this.pingIntervals.set(clientId, interval);
  }

  /**
   * Send pong response
   */
  private sendPong(ws: WebSocket): void {
    this.sendMessage(ws, {
      type: 'pong',
      timestamp: new Date().toISOString(),
      payload: {},
    });
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, code: string, message: string): void {
    const errorPayload: ErrorPayload = {
      code,
      message,
    };

    this.sendMessage(ws, {
      type: 'error',
      timestamp: new Date().toISOString(),
      payload: errorPayload,
    });
  }

  /**
   * Send message to client
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
      }
    }
  }

  /**
   * Cleanup client resources
   */
  private cleanupClient(clientId: string): void {
    // Clear ping interval
    const interval = this.pingIntervals.get(clientId);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(clientId);
    }

    // Unregister client
    this.subscriptionManager.unregisterClient(clientId);
  }

  /**
   * Shutdown WebSocket server
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear all ping intervals
      for (const interval of this.pingIntervals.values()) {
        clearInterval(interval);
      }
      this.pingIntervals.clear();

      // Close WebSocket server
      this.wss.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.error('WebSocket server closed');
          resolve();
        }
      });
    });
  }

  /**
   * Get server statistics
   */
  getStats(): { clients: number; subscriptions: number } {
    return {
      clients: this.subscriptionManager.getClientCount(),
      subscriptions: 0, // Could add total subscription count if needed
    };
  }
}
