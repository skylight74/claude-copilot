/**
 * Subscription Manager for WebSocket Topics
 *
 * Manages client subscriptions with glob pattern matching.
 */

import type { WebSocket } from 'ws';

export interface Subscription {
  clientId: string;
  ws: WebSocket;
  topics: Set<string>;
}

export class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private readonly MAX_SUBSCRIPTIONS_PER_CLIENT = 50;

  /**
   * Register a WebSocket connection
   */
  registerClient(clientId: string, ws: WebSocket): void {
    if (!this.subscriptions.has(clientId)) {
      this.subscriptions.set(clientId, {
        clientId,
        ws,
        topics: new Set(),
      });
    }
  }

  /**
   * Remove a WebSocket connection and all its subscriptions
   */
  unregisterClient(clientId: string): void {
    this.subscriptions.delete(clientId);
  }

  /**
   * Add topic subscriptions for a client
   */
  subscribe(clientId: string, topics: string[]): { success: boolean; error?: string } {
    const sub = this.subscriptions.get(clientId);
    if (!sub) {
      return { success: false, error: 'Client not registered' };
    }

    // Check subscription limit
    const totalAfterAdd = sub.topics.size + topics.filter(t => !sub.topics.has(t)).length;
    if (totalAfterAdd > this.MAX_SUBSCRIPTIONS_PER_CLIENT) {
      return {
        success: false,
        error: `Subscription limit exceeded (max ${this.MAX_SUBSCRIPTIONS_PER_CLIENT})`,
      };
    }

    // Validate and add topics
    for (const topic of topics) {
      if (!this.isValidTopic(topic)) {
        return { success: false, error: `Invalid topic pattern: ${topic}` };
      }
      sub.topics.add(topic);
    }

    return { success: true };
  }

  /**
   * Remove topic subscriptions for a client
   */
  unsubscribe(clientId: string, topics: string[]): { success: boolean; error?: string } {
    const sub = this.subscriptions.get(clientId);
    if (!sub) {
      return { success: false, error: 'Client not registered' };
    }

    for (const topic of topics) {
      sub.topics.delete(topic);
    }

    return { success: true };
  }

  /**
   * Get all clients subscribed to a topic
   */
  getSubscribers(topic: string): WebSocket[] {
    const subscribers: WebSocket[] = [];

    for (const sub of this.subscriptions.values()) {
      // Check if any of the client's topic patterns match this topic
      for (const pattern of sub.topics) {
        if (this.topicMatches(topic, pattern)) {
          subscribers.push(sub.ws);
          break; // Only add once per client
        }
      }
    }

    return subscribers;
  }

  /**
   * Get subscription info for a client
   */
  getClientSubscriptions(clientId: string): string[] | null {
    const sub = this.subscriptions.get(clientId);
    return sub ? Array.from(sub.topics) : null;
  }

  /**
   * Get total number of active clients
   */
  getClientCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Check if a topic pattern is valid
   */
  private isValidTopic(pattern: string): boolean {
    // Valid patterns:
    // - stream:Stream-A
    // - stream:*
    // - task:TASK-123
    // - task:*
    // - checkpoint:*
    // - agent:*
    // - *

    if (pattern === '*') {
      return true;
    }

    const parts = pattern.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const [entity, id] = parts;
    const validEntities = ['stream', 'task', 'checkpoint', 'agent'];

    if (!validEntities.includes(entity)) {
      return false;
    }

    // ID can be * or a specific identifier
    return id === '*' || id.length > 0;
  }

  /**
   * Check if a topic matches a subscription pattern
   */
  private topicMatches(topic: string, pattern: string): boolean {
    // Wildcard matches everything
    if (pattern === '*') {
      return true;
    }

    // Exact match
    if (topic === pattern) {
      return true;
    }

    // Prefix match with wildcard (e.g., "stream:*" matches "stream:Stream-A")
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -1); // Remove '*', keep ':'
      return topic.startsWith(prefix);
    }

    return false;
  }
}
