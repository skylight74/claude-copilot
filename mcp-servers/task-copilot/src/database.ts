/**
 * SQLite database client for Task Copilot
 */

import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

import type {
  InitiativeRow,
  PrdRow,
  TaskRow,
  WorkProductRow,
  ActivityLogRow,
  TaskStatus,
  PrdStatus,
} from './types.js';

// Schema definition
const SCHEMA_SQL = `
-- initiatives table (lightweight link to Memory Copilot)
CREATE TABLE IF NOT EXISTS initiatives (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- prds table
CREATE TABLE IF NOT EXISTS prds (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'cancelled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id)
);

-- tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  prd_id TEXT,
  parent_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  assigned_agent TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'blocked', 'completed', 'cancelled')),
  blocked_reason TEXT,
  notes TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (prd_id) REFERENCES prds(id),
  FOREIGN KEY (parent_id) REFERENCES tasks(id)
);

-- work_products table
CREATE TABLE IF NOT EXISTS work_products (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('technical_design', 'implementation', 'test_plan', 'security_review', 'documentation', 'architecture', 'other')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prds_initiative ON prds(initiative_id);
CREATE INDEX IF NOT EXISTS idx_tasks_prd ON tasks(prd_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_work_products_task ON work_products(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_initiative ON activity_log(initiative_id);
`;

const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`;

const CURRENT_VERSION = 1;

export class DatabaseClient {
  private db: Database.Database;
  private workspaceId: string;

  constructor(projectPath: string, taskBasePath?: string, workspaceId?: string) {
    // Use workspaceId if provided, otherwise hash the project path
    this.workspaceId = workspaceId?.trim() || this.hashProjectPath(projectPath);
    const dbPath = this.getDbPath(this.workspaceId, taskBasePath);

    // Ensure directory exists
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    // Run migrations
    this.migrate();
  }

  private hashProjectPath(projectPath: string): string {
    return createHash('md5').update(projectPath).digest('hex').substring(0, 12);
  }

  private getDbPath(workspaceId: string, taskBasePath?: string): string {
    const basePath = taskBasePath || join(homedir(), '.claude', 'tasks');
    return join(basePath, workspaceId, 'tasks.db');
  }

  private migrate(): void {
    // Create migration table
    this.db.exec(MIGRATION_TABLE_SQL);

    // Check current version
    const row = this.db.prepare('SELECT MAX(version) as version FROM migrations').get() as { version: number | null };
    const currentVersion = row?.version || 0;

    if (currentVersion < CURRENT_VERSION) {
      // Run schema
      this.db.exec(SCHEMA_SQL);

      // Record migration
      this.db.prepare('INSERT INTO migrations (version, applied_at) VALUES (?, ?)').run(
        CURRENT_VERSION,
        new Date().toISOString()
      );
    }
  }

  getWorkspaceId(): string {
    return this.workspaceId;
  }

  // Initiative operations
  upsertInitiative(initiative: InitiativeRow): void {
    this.db.prepare(`
      INSERT INTO initiatives (id, title, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        updated_at = excluded.updated_at
    `).run(
      initiative.id,
      initiative.title,
      initiative.description,
      initiative.created_at,
      initiative.updated_at
    );
  }

  getInitiative(id: string): InitiativeRow | undefined {
    return this.db.prepare('SELECT * FROM initiatives WHERE id = ?').get(id) as InitiativeRow | undefined;
  }

  getCurrentInitiative(): InitiativeRow | undefined {
    return this.db.prepare('SELECT * FROM initiatives ORDER BY updated_at DESC LIMIT 1').get() as InitiativeRow | undefined;
  }

  // PRD operations
  insertPrd(prd: PrdRow): void {
    this.db.prepare(`
      INSERT INTO prds (id, initiative_id, title, description, content, metadata, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      prd.id,
      prd.initiative_id,
      prd.title,
      prd.description,
      prd.content,
      prd.metadata,
      prd.status,
      prd.created_at,
      prd.updated_at
    );
  }

  getPrd(id: string): PrdRow | undefined {
    return this.db.prepare('SELECT * FROM prds WHERE id = ?').get(id) as PrdRow | undefined;
  }

  listPrds(options: { initiativeId?: string; status?: PrdStatus }): PrdRow[] {
    let sql = 'SELECT * FROM prds WHERE 1=1';
    const params: unknown[] = [];

    if (options.initiativeId) {
      sql += ' AND initiative_id = ?';
      params.push(options.initiativeId);
    }

    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    sql += ' ORDER BY created_at DESC';

    return this.db.prepare(sql).all(...params) as PrdRow[];
  }

  getPrdTaskCount(prdId: string): { total: number; completed: number } {
    const result = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM tasks
      WHERE prd_id = ?
    `).get(prdId) as { total: number; completed: number };
    return result;
  }

  // Task operations
  insertTask(task: TaskRow): void {
    this.db.prepare(`
      INSERT INTO tasks (id, prd_id, parent_id, title, description, assigned_agent, status, blocked_reason, notes, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.id,
      task.prd_id,
      task.parent_id,
      task.title,
      task.description,
      task.assigned_agent,
      task.status,
      task.blocked_reason,
      task.notes,
      task.metadata,
      task.created_at,
      task.updated_at
    );
  }

  updateTask(id: string, updates: Partial<TaskRow>): void {
    const sets: string[] = [];
    const values: unknown[] = [];

    if (updates.status !== undefined) {
      sets.push('status = ?');
      values.push(updates.status);
    }
    if (updates.assigned_agent !== undefined) {
      sets.push('assigned_agent = ?');
      values.push(updates.assigned_agent);
    }
    if (updates.notes !== undefined) {
      sets.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.blocked_reason !== undefined) {
      sets.push('blocked_reason = ?');
      values.push(updates.blocked_reason);
    }
    if (updates.metadata !== undefined) {
      sets.push('metadata = ?');
      values.push(updates.metadata);
    }

    if (sets.length === 0) return;

    sets.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    this.db.prepare(`
      UPDATE tasks SET ${sets.join(', ')} WHERE id = ?
    `).run(...values);
  }

  getTask(id: string): TaskRow | undefined {
    return this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  }

  listTasks(options: { prdId?: string; parentId?: string; status?: TaskStatus; assignedAgent?: string }): TaskRow[] {
    let sql = 'SELECT * FROM tasks WHERE 1=1';
    const params: unknown[] = [];

    if (options.prdId) {
      sql += ' AND prd_id = ?';
      params.push(options.prdId);
    }

    if (options.parentId !== undefined) {
      if (options.parentId === null) {
        sql += ' AND parent_id IS NULL';
      } else {
        sql += ' AND parent_id = ?';
        params.push(options.parentId);
      }
    }

    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }

    if (options.assignedAgent) {
      sql += ' AND assigned_agent = ?';
      params.push(options.assignedAgent);
    }

    sql += ' ORDER BY created_at ASC';

    return this.db.prepare(sql).all(...params) as TaskRow[];
  }

  getTaskSubtaskCount(taskId: string): { total: number; completed: number } {
    const result = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM tasks
      WHERE parent_id = ?
    `).get(taskId) as { total: number; completed: number };
    return result;
  }

  // Work Product operations
  insertWorkProduct(wp: WorkProductRow): void {
    this.db.prepare(`
      INSERT INTO work_products (id, task_id, type, title, content, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      wp.id,
      wp.task_id,
      wp.type,
      wp.title,
      wp.content,
      wp.metadata,
      wp.created_at
    );
  }

  getWorkProduct(id: string): WorkProductRow | undefined {
    return this.db.prepare('SELECT * FROM work_products WHERE id = ?').get(id) as WorkProductRow | undefined;
  }

  listWorkProducts(taskId: string): WorkProductRow[] {
    return this.db.prepare('SELECT * FROM work_products WHERE task_id = ? ORDER BY created_at DESC').all(taskId) as WorkProductRow[];
  }

  hasWorkProducts(taskId: string): boolean {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM work_products WHERE task_id = ?').get(taskId) as { count: number };
    return result.count > 0;
  }

  // Activity Log operations
  insertActivity(activity: ActivityLogRow): void {
    this.db.prepare(`
      INSERT INTO activity_log (id, initiative_id, type, entity_id, summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      activity.id,
      activity.initiative_id,
      activity.type,
      activity.entity_id,
      activity.summary,
      activity.created_at
    );
  }

  listActivityLogs(initiativeId: string, limit?: number): ActivityLogRow[] {
    const sql = `SELECT * FROM activity_log WHERE initiative_id = ? ORDER BY created_at DESC ${limit ? `LIMIT ${limit}` : ''}`;
    return this.db.prepare(sql).all(initiativeId) as ActivityLogRow[];
  }

  // Initiative wipe operations
  wipeInitiativeData(initiativeId: string): { prds: number; tasks: number; workProducts: number; activityLogs: number } {
    // Get all PRD IDs for this initiative
    const prds = this.listPrds({ initiativeId });
    const prdIds = prds.map(p => p.id);

    // Get all task IDs related to these PRDs
    const allTasks: string[] = [];
    for (const prdId of prdIds) {
      const tasks = this.listTasks({ prdId });
      allTasks.push(...tasks.map(t => t.id));
    }

    // Count before deletion
    const prdCount = prds.length;
    const taskCount = allTasks.length;

    let workProductCount = 0;
    for (const taskId of allTasks) {
      const wps = this.listWorkProducts(taskId);
      workProductCount += wps.length;
    }

    const activityCount = this.listActivityLogs(initiativeId).length;

    // Delete in order: work_products -> tasks -> prds -> activity_log
    // Work products
    for (const taskId of allTasks) {
      this.db.prepare('DELETE FROM work_products WHERE task_id = ?').run(taskId);
    }

    // Tasks
    for (const prdId of prdIds) {
      this.db.prepare('DELETE FROM tasks WHERE prd_id = ?').run(prdId);
    }

    // PRDs
    this.db.prepare('DELETE FROM prds WHERE initiative_id = ?').run(initiativeId);

    // Activity logs
    this.db.prepare('DELETE FROM activity_log WHERE initiative_id = ?').run(initiativeId);

    return {
      prds: prdCount,
      tasks: taskCount,
      workProducts: workProductCount,
      activityLogs: activityCount
    };
  }

  // Stats
  getStats(): { prdCount: number; taskCount: number; completedTasks: number; workProductCount: number } {
    const prdCount = (this.db.prepare('SELECT COUNT(*) as count FROM prds').get() as { count: number }).count;
    const taskCount = (this.db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number }).count;
    const completedTasks = (this.db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get() as { count: number }).count;
    const workProductCount = (this.db.prepare('SELECT COUNT(*) as count FROM work_products').get() as { count: number }).count;

    return {
      prdCount,
      taskCount,
      completedTasks,
      workProductCount
    };
  }

  close(): void {
    this.db.close();
  }
}
