/**
 * Manages WebSocket connections, authentication, and heartbeats
 */

import type { WebSocket } from 'ws';
import { JwtManager } from '../auth/jwt-manager.js';
import type { ClientMessage, ServerMessage } from '../events/types.js';

interface ConnectionInfo {
  ws: WebSocket;
  initiativeId: string;
  authenticated: boolean;
  lastPing: number;
}

export class ConnectionManager {
  private connections: Map<WebSocket, ConnectionInfo> = new Map();
  private jwtManager: JwtManager;
  private heartbeatInterval: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(jwtManager: JwtManager, heartbeatInterval: number = 30000) {
    this.jwtManager = jwtManager;
    this.heartbeatInterval = heartbeatInterval;
  }

  /**
   * Authenticate a WebSocket connection with JWT token
   */
  authenticate(ws: WebSocket, token: string): { success: boolean; initiativeId?: string; error?: string } {
    try {
      const payload = this.jwtManager.verify(token);

      this.connections.set(ws, {
        ws,
        initiativeId: payload.initiativeId,
        authenticated: true,
        lastPing: Date.now(),
      });

      return { success: true, initiativeId: payload.initiativeId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  /**
   * Get connection info for a WebSocket
   */
  getConnection(ws: WebSocket): ConnectionInfo | undefined {
    return this.connections.get(ws);
  }

  /**
   * Check if WebSocket is authenticated
   */
  isAuthenticated(ws: WebSocket): boolean {
    const conn = this.connections.get(ws);
    return conn?.authenticated || false;
  }

  /**
   * Get initiative ID for authenticated connection
   */
  getInitiativeId(ws: WebSocket): string | undefined {
    return this.connections.get(ws)?.initiativeId;
  }

  /**
   * Remove connection
   */
  remove(ws: WebSocket): void {
    this.connections.delete(ws);
  }

  /**
   * Update last ping time
   */
  updatePing(ws: WebSocket): void {
    const conn = this.connections.get(ws);
    if (conn) {
      conn.lastPing = Date.now();
    }
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.checkHeartbeats();
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Check for stale connections and close them
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const timeout = this.heartbeatInterval * 2; // 2x interval = timeout

    for (const [ws, conn] of this.connections.entries()) {
      if (now - conn.lastPing > timeout) {
        console.log(`Closing stale connection for initiative ${conn.initiativeId}`);
        ws.close(1000, 'Heartbeat timeout');
        this.connections.delete(ws);
      }
    }
  }

  /**
   * Send message to WebSocket client
   */
  send(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === 1) { // OPEN
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  }

  /**
   * Send error message to client
   */
  sendError(ws: WebSocket, message: string, code?: string): void {
    this.send(ws, {
      type: 'error',
      message,
      code,
    });
  }

  /**
   * Parse client message
   */
  parseMessage(data: string): ClientMessage | null {
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed.type !== 'string') {
        return null;
      }
      return parsed as ClientMessage;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): number {
    return this.connections.size;
  }
}
