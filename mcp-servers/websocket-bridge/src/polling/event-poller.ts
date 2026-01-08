/**
 * Polls Task Copilot SQLite database for new activity_log entries
 */

import Database from 'better-sqlite3';
import { enrichEvent } from '../events/mapper.js';
import type { WebSocketEvent } from '../events/types.js';
import { WatermarkTracker } from './watermark-tracker.js';

interface ActivityLogRow {
  id: string;
  initiative_id: string;
  type: string;
  entity_id: string;
  summary: string;
  created_at: string;
}

export class EventPoller {
  private db: Database.Database;
  private watermark: WatermarkTracker;
  private pollInterval: number;
  private timer: NodeJS.Timeout | null = null;
  private onEvents: ((events: WebSocketEvent[]) => void) | null = null;

  constructor(dbPath: string, pollInterval: number = 100) {
    this.db = new Database(dbPath, { readonly: true });
    this.watermark = new WatermarkTracker();
    this.pollInterval = pollInterval;
  }

  /**
   * Start polling for new events
   */
  start(callback: (events: WebSocketEvent[]) => void): void {
    this.onEvents = callback;
    this.poll();
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.onEvents = null;
  }

  /**
   * Single poll cycle
   */
  private poll(): void {
    try {
      const newEvents = this.fetchNewEvents();

      if (newEvents.length > 0 && this.onEvents) {
        this.onEvents(newEvents);
      }
    } catch (error) {
      console.error('Poll error:', error);
    }

    // Schedule next poll
    this.timer = setTimeout(() => this.poll(), this.pollInterval);
  }

  /**
   * Fetch new activity_log entries since last watermark
   */
  private fetchNewEvents(): WebSocketEvent[] {
    const lastSeen = this.watermark.getLastSeen();

    // Query activity_log for new entries
    let sql = 'SELECT * FROM activity_log';
    const params: string[] = [];

    if (lastSeen) {
      sql += ' WHERE id > ? ORDER BY id ASC';
      params.push(lastSeen);
    } else {
      sql += ' ORDER BY id ASC';
    }

    const rows = this.db.prepare(sql).all(...params) as ActivityLogRow[];

    const events: WebSocketEvent[] = [];

    for (const row of rows) {
      // Skip if already seen (duplicate protection)
      if (this.watermark.hasSeen(row.id)) {
        continue;
      }

      // Fetch entity details based on activity type
      const entity = this.fetchEntityDetails(row.type, row.entity_id);

      // Enrich and map to WebSocket event
      const event = enrichEvent(row, entity);

      if (event) {
        events.push(event);
      }

      // Mark as seen
      this.watermark.markSeen(row.id);
    }

    return events;
  }

  /**
   * Fetch entity details from database
   */
  private fetchEntityDetails(activityType: string, entityId: string): any {
    try {
      if (activityType.startsWith('task.')) {
        return this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(entityId);
      }

      if (activityType.startsWith('work_product.')) {
        return this.db.prepare('SELECT * FROM work_products WHERE id = ?').get(entityId);
      }

      if (activityType.startsWith('prd.')) {
        return this.db.prepare('SELECT * FROM prds WHERE id = ?').get(entityId);
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch entity ${entityId} for ${activityType}:`, error);
      return null;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    this.stop();
    this.db.close();
  }
}
