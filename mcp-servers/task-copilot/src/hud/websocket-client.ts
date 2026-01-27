/**
 * WebSocket Client for Progress HUD
 *
 * Connects to Claude Code's status events or polls Task Copilot for updates.
 * Emits progress events for statusline consumption.
 *
 * @see PRD-omc-learnings (Stream C: Progress HUD)
 * @module hud/websocket-client
 */

import type { ProgressEvent, StatuslineState } from '../types/omc-features.js';
import { EventEmitter } from 'events';

/**
 * Connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'polling';

/**
 * WebSocket client options
 */
export interface WebSocketClientOptions {
  /** WebSocket URL (default: ws://localhost:3100) */
  url?: string;

  /** Polling interval in ms (default: 1000) */
  pollingInterval?: number;

  /** Maximum reconnect attempts (default: 5) */
  maxReconnectAttempts?: number;

  /** Reconnect delay in ms (default: 2000) */
  reconnectDelay?: number;

  /** Enable fallback to polling (default: true) */
  enablePollingFallback?: boolean;

  /** Task Copilot HTTP URL for polling (default: http://localhost:3100) */
  taskCopilotUrl?: string;
}

/**
 * Progress data fetcher (for polling mode)
 */
export interface ProgressDataFetcher {
  /** Fetch current task/stream state */
  fetchProgress(taskId: string): Promise<StatuslineState | null>;

  /** Fetch recent events */
  fetchEvents(since?: string): Promise<ProgressEvent[]>;
}

/**
 * Default HTTP-based progress fetcher
 */
export class HttpProgressFetcher implements ProgressDataFetcher {
  constructor(private baseUrl: string = 'http://localhost:3100') {}

  async fetchProgress(taskId: string): Promise<StatuslineState | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}`);
      if (!response.ok) return null;

      const task = await response.json() as any;

      return {
        taskId: task.id,
        taskTitle: task.title,
        status: task.status,
        progressPercent: this.calculateProgress(task),
        streamId: task.streamId,
        activeFiles: task.metadata?.activeFiles || [],
        lastUpdate: task.updatedAt || new Date().toISOString(),
      };
    } catch (error) {
      return null;
    }
  }

  async fetchEvents(since?: string): Promise<ProgressEvent[]> {
    try {
      const url = since
        ? `${this.baseUrl}/api/events?since=${encodeURIComponent(since)}`
        : `${this.baseUrl}/api/events?limit=10`;

      const response = await fetch(url);
      if (!response.ok) return [];

      const events = await response.json() as any[];
      return this.transformEvents(events);
    } catch (error) {
      return [];
    }
  }

  private calculateProgress(task: any): number {
    // Simple progress calculation based on status
    switch (task.status) {
      case 'completed':
        return 100;
      case 'in_progress':
        return 50;
      case 'blocked':
        return task.metadata?.progress || 0;
      default:
        return 0;
    }
  }

  private transformEvents(rawEvents: any[]): ProgressEvent[] {
    // Transform API events to ProgressEvent format
    return rawEvents.map(event => ({
      type: this.mapEventType(event.type),
      taskId: event.taskId,
      timestamp: event.timestamp,
      payload: event.data || {},
      streamId: event.streamId,
    }));
  }

  private mapEventType(type: string): ProgressEvent['type'] {
    switch (type) {
      case 'task.started':
        return 'task_started';
      case 'task.updated':
        return 'task_updated';
      case 'task.completed':
        return 'task_completed';
      case 'file.modified':
        return 'file_modified';
      case 'agent.switched':
        return 'agent_switched';
      default:
        return 'task_updated';
    }
  }
}

/**
 * WebSocket client with polling fallback
 */
export class ProgressWebSocketClient extends EventEmitter {
  private state: ConnectionState = 'disconnected';
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private pollingTimer: NodeJS.Timeout | null = null;
  private options: Required<WebSocketClientOptions>;
  private fetcher: ProgressDataFetcher;
  private lastEventTimestamp: string | null = null;

  constructor(options: WebSocketClientOptions = {}) {
    super();

    this.options = {
      url: options.url || 'ws://localhost:3100',
      pollingInterval: options.pollingInterval || 1000,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      reconnectDelay: options.reconnectDelay || 2000,
      enablePollingFallback: options.enablePollingFallback !== false,
      taskCopilotUrl: options.taskCopilotUrl || 'http://localhost:3100',
    };

    this.fetcher = new HttpProgressFetcher(this.options.taskCopilotUrl);
  }

  /**
   * Connect to WebSocket or start polling
   */
  async connect(): Promise<void> {
    // Try WebSocket first
    try {
      await this.connectWebSocket();
    } catch (error) {
      // Fall back to polling if enabled
      if (this.options.enablePollingFallback) {
        this.startPolling();
      } else {
        throw error;
      }
    }
  }

  /**
   * Attempt WebSocket connection
   */
  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.state = 'connecting';
      this.emit('stateChange', this.state);

      try {
        this.ws = new WebSocket(this.options.url);

        this.ws.onopen = () => {
          this.state = 'connected';
          this.reconnectAttempts = 0;
          this.emit('stateChange', this.state);
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const progressEvent: ProgressEvent = JSON.parse(event.data);
            this.lastEventTimestamp = progressEvent.timestamp;
            this.emit('progress', progressEvent);
          } catch (error) {
            this.emit('error', new Error('Failed to parse WebSocket message'));
          }
        };

        this.ws.onerror = (error) => {
          this.state = 'error';
          this.emit('stateChange', this.state);
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = () => {
          this.handleDisconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start polling mode
   */
  private startPolling(): void {
    this.state = 'polling';
    this.emit('stateChange', this.state);
    this.emit('pollingStarted');

    this.pollingTimer = setInterval(async () => {
      try {
        const events = await this.fetcher.fetchEvents(this.lastEventTimestamp || undefined);

        events.forEach(event => {
          this.lastEventTimestamp = event.timestamp;
          this.emit('progress', event);
        });
      } catch (error) {
        this.emit('error', new Error('Polling fetch failed'));
      }
    }, this.options.pollingInterval);
  }

  /**
   * Handle disconnection and attempt reconnect
   */
  private handleDisconnect(): void {
    this.ws = null;
    this.state = 'disconnected';
    this.emit('stateChange', this.state);
    this.emit('disconnected');

    // Attempt reconnect if within limits
    if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect().catch(() => {
          // If reconnect fails, fall back to polling
          if (this.options.enablePollingFallback && this.state !== 'polling') {
            this.startPolling();
          }
        });
      }, this.options.reconnectDelay);
    } else if (this.options.enablePollingFallback) {
      // Max attempts reached, fall back to polling
      this.startPolling();
    }
  }

  /**
   * Subscribe to a specific task's progress
   */
  subscribeTask(taskId: string): void {
    if (this.ws && this.state === 'connected') {
      this.ws.send(JSON.stringify({ type: 'subscribe', taskId }));
    }
    // In polling mode, subscription is handled automatically
  }

  /**
   * Unsubscribe from a task
   */
  unsubscribeTask(taskId: string): void {
    if (this.ws && this.state === 'connected') {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', taskId }));
    }
  }

  /**
   * Fetch current progress for a task (on-demand)
   */
  async fetchTaskProgress(taskId: string): Promise<StatuslineState | null> {
    return this.fetcher.fetchProgress(taskId);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    this.state = 'disconnected';
    this.emit('stateChange', this.state);
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected (either WebSocket or polling)
   */
  isConnected(): boolean {
    return this.state === 'connected' || this.state === 'polling';
  }
}

/**
 * Create and connect a progress client
 */
export async function createProgressClient(
  options: WebSocketClientOptions = {}
): Promise<ProgressWebSocketClient> {
  const client = new ProgressWebSocketClient(options);
  await client.connect();
  return client;
}

/**
 * Create a progress client with custom fetcher (for testing)
 */
export function createProgressClientWithFetcher(
  fetcher: ProgressDataFetcher,
  options: WebSocketClientOptions = {}
): ProgressWebSocketClient {
  const client = new ProgressWebSocketClient(options);
  (client as any).fetcher = fetcher;
  return client;
}
