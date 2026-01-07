/**
 * Manages client subscriptions to initiative streams
 */

import type { WebSocket } from 'ws';

export interface Subscription {
  ws: WebSocket;
  initiativeId: string;
}

export class SubscriptionManager {
  private subscriptions: Map<WebSocket, string[]> = new Map();

  /**
   * Subscribe a client to an initiative
   */
  subscribe(ws: WebSocket, initiativeId: string): void {
    const current = this.subscriptions.get(ws) || [];
    if (!current.includes(initiativeId)) {
      current.push(initiativeId);
      this.subscriptions.set(ws, current);
    }
  }

  /**
   * Unsubscribe a client from an initiative
   */
  unsubscribe(ws: WebSocket, initiativeId: string): void {
    const current = this.subscriptions.get(ws);
    if (current) {
      const filtered = current.filter(id => id !== initiativeId);
      if (filtered.length > 0) {
        this.subscriptions.set(ws, filtered);
      } else {
        this.subscriptions.delete(ws);
      }
    }
  }

  /**
   * Remove all subscriptions for a client
   */
  removeAll(ws: WebSocket): void {
    this.subscriptions.delete(ws);
  }

  /**
   * Get all clients subscribed to an initiative
   */
  getSubscribers(initiativeId: string): WebSocket[] {
    const subscribers: WebSocket[] = [];
    for (const [ws, initiatives] of this.subscriptions.entries()) {
      if (initiatives.includes(initiativeId)) {
        subscribers.push(ws);
      }
    }
    return subscribers;
  }

  /**
   * Get all subscriptions for a client
   */
  getSubscriptions(ws: WebSocket): string[] {
    return this.subscriptions.get(ws) || [];
  }

  /**
   * Check if client is subscribed to initiative
   */
  isSubscribed(ws: WebSocket, initiativeId: string): boolean {
    const subs = this.subscriptions.get(ws);
    return subs ? subs.includes(initiativeId) : false;
  }
}
