/**
 * Worktree tool implementations for conflict management
 */

import type { DatabaseClient } from '../database.js';
import { WorktreeManager } from '../utils/worktree-manager.js';
import type { TaskMetadata } from '../types.js';

export interface WorktreeConflictStatusInput {
  taskId: string;
}

export interface WorktreeConflictResolveInput {
  taskId: string;
  targetBranch?: string;
}

/**
 * Check conflict status for a task worktree
 *
 * Returns conflict state and list of conflicting files if any exist
 */
export async function worktreeConflictStatus(
  db: DatabaseClient,
  input: WorktreeConflictStatusInput
): Promise<{
  taskId: string;
  hasConflicts: boolean;
  conflicts: string[];
  message: string;
} | null> {
  const task = db.getTask(input.taskId);
  if (!task) return null;

  const metadata = JSON.parse(task.metadata) as TaskMetadata;

  // Check if task uses isolated worktree
  if (!metadata.isolatedWorktree || !metadata.worktreePath) {
    return {
      taskId: input.taskId,
      hasConflicts: false,
      conflicts: [],
      message: 'Task does not use isolated worktree'
    };
  }

  // Check for conflicts in metadata (from previous merge attempt)
  if (metadata.mergeConflicts && Array.isArray(metadata.mergeConflicts)) {
    const projectRoot = process.cwd();
    const worktreeManager = new WorktreeManager(projectRoot);

    // Verify conflicts still exist
    const currentConflicts = await worktreeManager.getConflictingFiles();

    return {
      taskId: input.taskId,
      hasConflicts: currentConflicts.length > 0,
      conflicts: currentConflicts,
      message: currentConflicts.length > 0
        ? `${currentConflicts.length} unresolved conflict(s)`
        : 'All conflicts resolved'
    };
  }

  return {
    taskId: input.taskId,
    hasConflicts: false,
    conflicts: [],
    message: 'No conflicts detected'
  };
}

/**
 * Retry merge after manual conflict resolution
 *
 * Attempts to complete the merge after user has resolved conflicts manually.
 * If successful, updates task status to completed and cleans up worktree.
 */
export async function worktreeConflictResolve(
  db: DatabaseClient,
  input: WorktreeConflictResolveInput
): Promise<{
  success: boolean;
  completed: boolean;
  message: string;
}> {
  const task = db.getTask(input.taskId);
  if (!task) {
    throw new Error(`Task not found: ${input.taskId}`);
  }

  const metadata = JSON.parse(task.metadata) as TaskMetadata;

  // Check if task uses isolated worktree
  if (!metadata.isolatedWorktree || !metadata.worktreePath) {
    throw new Error(`Task ${input.taskId} does not use isolated worktree`);
  }

  // Check if task is blocked by merge conflicts
  if (task.status !== 'blocked' || !metadata.mergeConflicts) {
    throw new Error(
      `Task ${input.taskId} is not blocked by merge conflicts. Status: ${task.status}`
    );
  }

  const projectRoot = process.cwd();
  const worktreeManager = new WorktreeManager(projectRoot);

  // Check if conflicts are resolved
  const hasConflicts = await worktreeManager.hasConflicts();
  if (hasConflicts) {
    const conflicts = await worktreeManager.getConflictingFiles();
    return {
      success: false,
      completed: false,
      message: `Conflicts still exist in ${conflicts.length} file(s): ${conflicts.join(', ')}`
    };
  }

  try {
    // Conflicts resolved, retry merge
    const mergeResult = await worktreeManager.mergeTaskWorktree(
      input.taskId,
      input.targetBranch
    );

    if (mergeResult.merged) {
      // Merge successful, cleanup worktree
      await worktreeManager.cleanupTaskWorktree(input.taskId);

      // Update task to completed
      const cleanupNote = `\n\nConflicts resolved manually. Worktree merged and cleaned up: ${mergeResult.message}`;

      // Remove conflict metadata
      const updatedMetadata = { ...metadata };
      delete updatedMetadata.mergeConflicts;
      delete updatedMetadata.mergeConflictTimestamp;

      db.updateTask(input.taskId, {
        status: 'completed',
        blocked_reason: null,
        notes: task.notes ? `${task.notes}${cleanupNote}` : cleanupNote,
        metadata: JSON.stringify(updatedMetadata)
      });

      return {
        success: true,
        completed: true,
        message: 'Merge successful. Task completed and worktree cleaned up.'
      };
    } else if (mergeResult.conflicts && mergeResult.conflicts.length > 0) {
      // New conflicts appeared
      return {
        success: false,
        completed: false,
        message: `New conflicts detected: ${mergeResult.conflicts.join(', ')}`
      };
    } else {
      // Unexpected state
      return {
        success: false,
        completed: false,
        message: 'Merge failed for unknown reason'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      completed: false,
      message: `Merge failed: ${error.message}`
    };
  }
}
