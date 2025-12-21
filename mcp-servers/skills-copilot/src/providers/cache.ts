/**
 * SQLite Cache Provider
 *
 * Local cache for skills to avoid repeated fetches
 */

import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import type { CachedSkill, SkillSource } from '../types.js';

export class CacheProvider {
  private db: Database.Database;
  private ttlDays: number;

  constructor(cachePath: string, ttlDays = 7) {
    // Resolve ~ to home directory
    const resolvedPath = cachePath.startsWith('~')
      ? join(homedir(), cachePath.slice(1))
      : cachePath;

    const dbPath = join(resolvedPath, 'skills-cache.db');

    // Ensure directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.ttlDays = ttlDays;
    this.init();
  }

  /**
   * Initialize cache table
   */
  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skill_cache (
        name TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        source TEXT NOT NULL,
        cached_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cache_expires ON skill_cache(expires_at);
    `);

    // Clean expired entries on init
    this.cleanExpired();
  }

  /**
   * Get skill from cache
   */
  get(name: string): CachedSkill | null {
    const now = Date.now();
    const row = this.db.prepare(
      'SELECT * FROM skill_cache WHERE name = ? AND expires_at > ?'
    ).get(name, now) as CachedSkill | undefined;

    return row || null;
  }

  /**
   * Store skill in cache
   */
  set(name: string, content: string, source: SkillSource): void {
    const now = Date.now();
    const expiresAt = now + (this.ttlDays * 24 * 60 * 60 * 1000);

    this.db.prepare(`
      INSERT OR REPLACE INTO skill_cache (name, content, source, cached_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, content, source, now, expiresAt);
  }

  /**
   * Check if skill is cached and valid
   */
  has(name: string): boolean {
    const now = Date.now();
    const row = this.db.prepare(
      'SELECT 1 FROM skill_cache WHERE name = ? AND expires_at > ?'
    ).get(name, now);

    return !!row;
  }

  /**
   * Invalidate specific skill
   */
  invalidate(name: string): boolean {
    const result = this.db.prepare(
      'DELETE FROM skill_cache WHERE name = ?'
    ).run(name);

    return result.changes > 0;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.db.exec('DELETE FROM skill_cache');
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const now = Date.now();
    const result = this.db.prepare(
      'DELETE FROM skill_cache WHERE expires_at <= ?'
    ).run(now);

    return result.changes;
  }

  /**
   * Get cache statistics
   */
  getStats(): { total: number; expired: number; size: number } {
    const now = Date.now();

    const total = this.db.prepare(
      'SELECT COUNT(*) as count FROM skill_cache'
    ).get() as { count: number };

    const expired = this.db.prepare(
      'SELECT COUNT(*) as count FROM skill_cache WHERE expires_at <= ?'
    ).get(now) as { count: number };

    // Approximate size in bytes
    const size = this.db.prepare(
      'SELECT SUM(LENGTH(content)) as size FROM skill_cache'
    ).get() as { size: number | null };

    return {
      total: total.count,
      expired: expired.count,
      size: size.size || 0
    };
  }

  /**
   * List all cached skills
   */
  list(): Array<{ name: string; source: SkillSource; cachedAt: number; expiresAt: number }> {
    const rows = this.db.prepare(
      'SELECT name, source, cached_at, expires_at FROM skill_cache ORDER BY name'
    ).all() as Array<{ name: string; source: string; cached_at: number; expires_at: number }>;

    return rows.map(row => ({
      name: row.name,
      source: row.source as SkillSource,
      cachedAt: row.cached_at,
      expiresAt: row.expires_at
    }));
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
