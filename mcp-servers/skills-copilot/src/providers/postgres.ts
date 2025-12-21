/**
 * PostgreSQL Provider
 *
 * Stores and retrieves private/proprietary skills from Postgres
 */

import pg from 'pg';
import type { Skill, SkillMeta, SkillMatch, SkillSaveParams, ProviderResult } from '../types.js';

const { Pool } = pg;

export class PostgresProvider {
  private pool: pg.Pool | null = null;
  private connectionUrl: string;

  constructor(connectionUrl: string) {
    this.connectionUrl = connectionUrl;
  }

  /**
   * Initialize connection pool
   */
  async connect(): Promise<boolean> {
    try {
      // Check if SSL is required (supports self-signed certs)
      const useSSL = this.connectionUrl.includes('sslmode=require') ||
                     this.connectionUrl.includes('sslmode=verify');

      this.pool = new Pool({
        connectionString: this.connectionUrl,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        // Allow self-signed certificates when SSL is enabled
        ssl: useSSL ? { rejectUnauthorized: false } : false
      });

      // Test connection
      const client = await this.pool.connect();
      client.release();
      return true;
    } catch (error) {
      console.error('Postgres connection failed:', error);
      return false;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.pool !== null;
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Get skill by name
   */
  async getSkill(name: string): Promise<ProviderResult<Skill>> {
    if (!this.pool) {
      return { success: false, error: 'Not connected', source: 'private' };
    }

    try {
      const result = await this.pool.query(
        `SELECT id, name, description, content, category, keywords, tags,
                is_proprietary, version, created_at, updated_at
         FROM skills
         WHERE name = $1`,
        [name]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Skill not found', source: 'private' };
      }

      const row = result.rows[0];
      return {
        success: true,
        data: {
          id: row.id,
          name: row.name,
          description: row.description,
          content: row.content,
          category: row.category,
          keywords: row.keywords || [],
          tags: row.tags || [],
          source: 'private',
          version: row.version,
          isProprietary: row.is_proprietary
        },
        source: 'private'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
        source: 'private'
      };
    }
  }

  /**
   * Search skills by query
   */
  async searchSkills(query: string, limit = 10): Promise<ProviderResult<SkillMatch[]>> {
    if (!this.pool) {
      return { success: false, error: 'Not connected', source: 'private' };
    }

    try {
      // Search using keywords array and full-text on description
      const result = await this.pool.query(
        `SELECT id, name, description, category, keywords,
                ts_rank(to_tsvector('english', description), plainto_tsquery('english', $1)) as rank
         FROM skills
         WHERE to_tsvector('english', description) @@ plainto_tsquery('english', $1)
            OR $1 = ANY(keywords)
            OR name ILIKE '%' || $1 || '%'
         ORDER BY rank DESC
         LIMIT $2`,
        [query, limit]
      );

      const matches: SkillMatch[] = result.rows.map((row, index) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        keywords: row.keywords || [],
        source: 'private' as const,
        relevance: row.rank || (1 - index * 0.1)
      }));

      return {
        success: true,
        data: matches,
        source: 'private'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
        source: 'private'
      };
    }
  }

  /**
   * List all skills
   */
  async listSkills(): Promise<ProviderResult<SkillMeta[]>> {
    if (!this.pool) {
      return { success: false, error: 'Not connected', source: 'private' };
    }

    try {
      const result = await this.pool.query(
        `SELECT id, name, description, category, keywords
         FROM skills
         ORDER BY name`
      );

      const skills: SkillMeta[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        keywords: row.keywords || [],
        source: 'private'
      }));

      return {
        success: true,
        data: skills,
        source: 'private'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
        source: 'private'
      };
    }
  }

  /**
   * Save or update a skill
   */
  async saveSkill(params: SkillSaveParams): Promise<ProviderResult<Skill>> {
    if (!this.pool) {
      return { success: false, error: 'Not connected', source: 'private' };
    }

    try {
      const result = await this.pool.query(
        `INSERT INTO skills (name, description, content, category, keywords, tags, is_proprietary, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, '1.0.0')
         ON CONFLICT (name) DO UPDATE SET
           description = EXCLUDED.description,
           content = EXCLUDED.content,
           category = EXCLUDED.category,
           keywords = EXCLUDED.keywords,
           tags = EXCLUDED.tags,
           is_proprietary = EXCLUDED.is_proprietary,
           updated_at = NOW()
         RETURNING id, name, description, content, category, keywords, tags, is_proprietary, version`,
        [
          params.name,
          params.description,
          params.content,
          params.category || null,
          params.keywords,
          params.tags || [],
          params.isProprietary ?? true
        ]
      );

      const row = result.rows[0];
      return {
        success: true,
        data: {
          id: row.id,
          name: row.name,
          description: row.description,
          content: row.content,
          category: row.category,
          keywords: row.keywords,
          tags: row.tags,
          source: 'private',
          version: row.version,
          isProprietary: row.is_proprietary
        },
        source: 'private'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
        source: 'private'
      };
    }
  }

  /**
   * Delete a skill
   */
  async deleteSkill(name: string): Promise<ProviderResult<boolean>> {
    if (!this.pool) {
      return { success: false, error: 'Not connected', source: 'private' };
    }

    try {
      const result = await this.pool.query(
        'DELETE FROM skills WHERE name = $1 RETURNING id',
        [name]
      );

      return {
        success: true,
        data: result.rowCount !== null && result.rowCount > 0,
        source: 'private'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database error',
        source: 'private'
      };
    }
  }

  /**
   * Track skill usage
   */
  async trackUsage(skillName: string, projectHash?: string): Promise<void> {
    if (!this.pool) return;

    try {
      await this.pool.query(
        `INSERT INTO skill_usage (skill_name, source, project_hash)
         VALUES ($1, 'private', $2)`,
        [skillName, projectHash || null]
      );
    } catch {
      // Silently fail - usage tracking is non-critical
    }
  }
}
