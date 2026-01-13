/**
 * Tests for worktree conflict handling
 *
 * These tests verify:
 * - Conflict detection and classification
 * - Conflict marker detection
 * - Resolution strategies (ours/theirs/manual)
 * - Validation of resolved conflicts
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WorktreeManager } from '../src/utils/worktree-manager.js';
import { worktreeConflictStatus, worktreeConflictResolve } from '../src/tools/worktree.js';
import type { DatabaseClient } from '../src/database.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

describe('Worktree Conflict Handling', () => {
  let testDir: string;
  let worktreeManager: WorktreeManager;
  let mockDb: DatabaseClient;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(process.cwd(), '.test-worktree-conflicts');
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Initialize git repo
    await execAsync('git init', { cwd: testDir });
    await execAsync('git config user.email "test@example.com"', { cwd: testDir });
    await execAsync('git config user.name "Test User"', { cwd: testDir });

    // Create initial commit
    writeFileSync(join(testDir, 'file1.txt'), 'original content\n');
    await execAsync('git add .', { cwd: testDir });
    await execAsync('git commit -m "Initial commit"', { cwd: testDir });

    worktreeManager = new WorktreeManager(testDir);

    // Create mock database
    mockDb = createMockDatabase();
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('WorktreeManager.analyzeConflict', () => {
    it('should detect content conflicts', async () => {
      // Create a content conflict
      await createContentConflict(testDir);

      const analysis = await worktreeManager.analyzeConflict('file1.txt');

      expect(analysis.file).toBe('file1.txt');
      expect(analysis.type).toBe('content');
      expect(analysis.hasConflictMarkers).toBe(true);
      expect(analysis.suggestedStrategy).toBe('manual');
    });

    it('should detect delete conflicts', async () => {
      // Create a delete conflict
      await createDeleteConflict(testDir);

      const conflicts = await worktreeManager.getConflictingFiles();
      expect(conflicts.length).toBeGreaterThan(0);

      const analysis = await worktreeManager.analyzeConflict(conflicts[0]);
      expect(analysis.type).toBe('delete');
    });

    it('should detect add-add conflicts', async () => {
      // Create an add-add conflict
      await createAddAddConflict(testDir);

      const conflicts = await worktreeManager.getConflictingFiles();
      expect(conflicts.length).toBeGreaterThan(0);

      const analysis = await worktreeManager.analyzeConflict(conflicts[0]);
      expect(analysis.type).toBe('add-add');
    });
  });

  describe('WorktreeManager.hasConflictMarkers', () => {
    it('should detect files with conflict markers', async () => {
      await createContentConflict(testDir);

      const filesWithMarkers = await worktreeManager.hasConflictMarkers(['file1.txt']);

      expect(filesWithMarkers).toContain('file1.txt');
    });

    it('should return empty array for resolved files', async () => {
      await createContentConflict(testDir);

      // Manually resolve by choosing ours
      await execAsync('git checkout --ours file1.txt', { cwd: testDir });

      const filesWithMarkers = await worktreeManager.hasConflictMarkers(['file1.txt']);

      expect(filesWithMarkers).toHaveLength(0);
    });
  });

  describe('WorktreeManager.resolveConflictWithStrategy', () => {
    it('should resolve conflict with "ours" strategy', async () => {
      await createContentConflict(testDir);

      await worktreeManager.resolveConflictWithStrategy('file1.txt', 'ours');

      // Verify conflict is resolved
      const conflicts = await worktreeManager.getConflictingFiles();
      expect(conflicts).not.toContain('file1.txt');

      // Verify file content is from "ours"
      const { stdout } = await execAsync('cat file1.txt', { cwd: testDir });
      expect(stdout).toContain('main branch content');
    });

    it('should resolve conflict with "theirs" strategy', async () => {
      await createContentConflict(testDir);

      await worktreeManager.resolveConflictWithStrategy('file1.txt', 'theirs');

      // Verify conflict is resolved
      const conflicts = await worktreeManager.getConflictingFiles();
      expect(conflicts).not.toContain('file1.txt');

      // Verify file content is from "theirs"
      const { stdout } = await execAsync('cat file1.txt', { cwd: testDir });
      expect(stdout).toContain('feature branch content');
    });
  });

  describe('worktreeConflictStatus', () => {
    it('should return detailed conflict status', async () => {
      // Setup task with worktree
      const taskId = 'TASK-001';
      await setupTaskWithConflict(testDir, taskId, mockDb);

      const status = await worktreeConflictStatus(mockDb, { taskId });

      expect(status).not.toBeNull();
      expect(status!.hasConflicts).toBe(true);
      expect(status!.conflicts.length).toBeGreaterThan(0);
      expect(status!.summary).toContain('conflict');
      expect(status!.suggestedAction).toBeTruthy();
    });

    it('should classify conflict types correctly', async () => {
      const taskId = 'TASK-002';
      await setupTaskWithConflict(testDir, taskId, mockDb);

      const status = await worktreeConflictStatus(mockDb, { taskId });

      expect(status).not.toBeNull();
      expect(status!.conflicts[0].type).toBe('content');
      expect(status!.conflicts[0].hasConflictMarkers).toBe(true);
    });

    it('should suggest action based on conflict analysis', async () => {
      const taskId = 'TASK-003';
      await setupTaskWithConflict(testDir, taskId, mockDb);

      const status = await worktreeConflictStatus(mockDb, { taskId });

      expect(status).not.toBeNull();
      expect(status!.suggestedAction).toMatch(/manual resolution|auto-resolved/i);
    });
  });

  describe('worktreeConflictResolve', () => {
    it('should resolve conflicts with manual strategy', async () => {
      const taskId = 'TASK-004';
      await setupTaskWithConflict(testDir, taskId, mockDb);

      // Manually remove conflict markers
      writeFileSync(join(testDir, 'file1.txt'), 'manually resolved content\n');

      const result = await worktreeConflictResolve(mockDb, {
        taskId,
        strategy: 'manual'
      });

      expect(result.success).toBe(true);
      expect(result.completed).toBe(true);
      expect(result.resolvedFiles.length).toBeGreaterThan(0);
    });

    it('should resolve conflicts with ours strategy', async () => {
      const taskId = 'TASK-005';
      await setupTaskWithConflict(testDir, taskId, mockDb);

      const result = await worktreeConflictResolve(mockDb, {
        taskId,
        strategy: 'ours'
      });

      expect(result.success).toBe(true);
      expect(result.completed).toBe(true);
      expect(result.resolvedFiles).toContain('file1.txt');
    });

    it('should resolve conflicts with theirs strategy', async () => {
      const taskId = 'TASK-006';
      await setupTaskWithConflict(testDir, taskId, mockDb);

      const result = await worktreeConflictResolve(mockDb, {
        taskId,
        strategy: 'theirs'
      });

      expect(result.success).toBe(true);
      expect(result.completed).toBe(true);
      expect(result.resolvedFiles).toContain('file1.txt');
    });

    it('should fail if conflict markers still exist with manual strategy', async () => {
      const taskId = 'TASK-007';
      await setupTaskWithConflict(testDir, taskId, mockDb);

      // Don't resolve - conflict markers still exist

      const result = await worktreeConflictResolve(mockDb, {
        taskId,
        strategy: 'manual'
      });

      expect(result.success).toBe(false);
      expect(result.completed).toBe(false);
      expect(result.message).toContain('conflict markers');
    });

    it('should update task status to completed after resolution', async () => {
      const taskId = 'TASK-008';
      await setupTaskWithConflict(testDir, taskId, mockDb);

      await worktreeConflictResolve(mockDb, {
        taskId,
        strategy: 'ours'
      });

      const task = mockDb.getTask(taskId);
      expect(task!.status).toBe('completed');
      expect(task!.blocked_reason).toBeNull();
    });

    it('should clean up conflict metadata after resolution', async () => {
      const taskId = 'TASK-009';
      await setupTaskWithConflict(testDir, taskId, mockDb);

      await worktreeConflictResolve(mockDb, {
        taskId,
        strategy: 'ours'
      });

      const task = mockDb.getTask(taskId);
      const metadata = JSON.parse(task!.metadata);
      expect(metadata.mergeConflicts).toBeUndefined();
      expect(metadata.mergeConflictTimestamp).toBeUndefined();
    });
  });
});

// Helper functions

async function createContentConflict(dir: string): Promise<void> {
  // Create diverging branches
  await execAsync('git checkout -b feature', { cwd: dir });
  writeFileSync(join(dir, 'file1.txt'), 'feature branch content\n');
  await execAsync('git add .', { cwd: dir });
  await execAsync('git commit -m "Feature change"', { cwd: dir });

  await execAsync('git checkout main', { cwd: dir });
  writeFileSync(join(dir, 'file1.txt'), 'main branch content\n');
  await execAsync('git add .', { cwd: dir });
  await execAsync('git commit -m "Main change"', { cwd: dir });

  // Attempt merge to create conflict
  try {
    await execAsync('git merge feature', { cwd: dir });
  } catch {
    // Expected to fail with conflict
  }
}

async function createDeleteConflict(dir: string): Promise<void> {
  await execAsync('git checkout -b feature', { cwd: dir });
  rmSync(join(dir, 'file1.txt'));
  await execAsync('git add .', { cwd: dir });
  await execAsync('git commit -m "Delete file"', { cwd: dir });

  await execAsync('git checkout main', { cwd: dir });
  writeFileSync(join(dir, 'file1.txt'), 'modified content\n');
  await execAsync('git add .', { cwd: dir });
  await execAsync('git commit -m "Modify file"', { cwd: dir });

  try {
    await execAsync('git merge feature', { cwd: dir });
  } catch {
    // Expected conflict
  }
}

async function createAddAddConflict(dir: string): Promise<void> {
  await execAsync('git checkout -b feature', { cwd: dir });
  writeFileSync(join(dir, 'newfile.txt'), 'feature version\n');
  await execAsync('git add .', { cwd: dir });
  await execAsync('git commit -m "Add file in feature"', { cwd: dir });

  await execAsync('git checkout main', { cwd: dir });
  writeFileSync(join(dir, 'newfile.txt'), 'main version\n');
  await execAsync('git add .', { cwd: dir });
  await execAsync('git commit -m "Add file in main"', { cwd: dir });

  try {
    await execAsync('git merge feature', { cwd: dir });
  } catch {
    // Expected conflict
  }
}

async function setupTaskWithConflict(
  dir: string,
  taskId: string,
  db: DatabaseClient
): Promise<void> {
  await createContentConflict(dir);

  // Create task in database with conflict metadata
  const task = {
    id: taskId,
    title: 'Test task with conflict',
    status: 'blocked' as const,
    blocked_reason: 'Merge conflicts',
    metadata: JSON.stringify({
      isolatedWorktree: true,
      worktreePath: dir,
      mergeConflicts: ['file1.txt'],
      mergeConflictTimestamp: new Date().toISOString()
    }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  (db as any).tasks.set(taskId, task);
}

function createMockDatabase(): DatabaseClient {
  const tasks = new Map<string, any>();

  return {
    getTask: (id: string) => tasks.get(id) || null,
    updateTask: (id: string, updates: any) => {
      const task = tasks.get(id);
      if (task) {
        Object.assign(task, updates);
        task.updated_at = new Date().toISOString();
      }
    },
    tasks
  } as any;
}
