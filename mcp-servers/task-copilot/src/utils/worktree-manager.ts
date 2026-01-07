/**
 * Git Worktree Manager
 *
 * Provides utilities for managing git worktrees for parallel stream isolation.
 * Each parallel stream gets its own worktree with a dedicated branch to eliminate file conflicts.
 *
 * ## Key Features
 *
 * - **Isolation**: Each stream works in a separate worktree
 * - **Auto-branching**: Branches created as `stream-{streamId}` (lowercase)
 * - **Cleanup**: Automatic cleanup on stream completion or manual command
 * - **Safe operations**: Validates git repository before worktree operations
 *
 * ## Example Usage
 *
 * ```typescript
 * const manager = new WorktreeManager('/project/root');
 *
 * // Create worktree for Stream-B
 * const worktree = await manager.createWorktree('Stream-B');
 * // Returns: { path: '.claude/worktrees/Stream-B', branch: 'stream-b' }
 *
 * // List all worktrees
 * const worktrees = await manager.listWorktrees();
 *
 * // Remove worktree
 * await manager.removeWorktree('Stream-B');
 * ```
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

const execAsync = promisify(exec);

export interface WorktreeInfo {
  path: string;
  branch: string;
  streamId: string;
}

export class WorktreeManager {
  private projectRoot: string;
  private worktreeBaseDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = resolve(projectRoot);
    this.worktreeBaseDir = join(this.projectRoot, '.claude', 'worktrees');
  }

  /**
   * Check if current directory is a git repository
   */
  private async isGitRepo(): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.projectRoot });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current branch name
   */
  private async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: this.projectRoot });
      return stdout.trim();
    } catch (error) {
      throw new Error(`Failed to get current branch: ${error}`);
    }
  }

  /**
   * Convert streamId to branch name (lowercase)
   * Stream-A → stream-a
   * Stream-B → stream-b
   */
  private streamIdToBranch(streamId: string): string {
    return streamId.toLowerCase();
  }

  /**
   * Get worktree path for a stream
   */
  private getWorktreePath(streamId: string): string {
    return join(this.worktreeBaseDir, streamId);
  }

  /**
   * Ensure worktree base directory exists
   */
  private ensureWorktreeBaseDir(): void {
    if (!existsSync(this.worktreeBaseDir)) {
      mkdirSync(this.worktreeBaseDir, { recursive: true });
    }
  }

  /**
   * Create a worktree for a stream
   *
   * @param streamId - Stream identifier (e.g., "Stream-B")
   * @param baseBranch - Optional base branch to branch from (defaults to current branch)
   * @returns WorktreeInfo with path and branch name
   */
  async createWorktree(streamId: string, baseBranch?: string): Promise<WorktreeInfo> {
    // Validate git repo
    if (!(await this.isGitRepo())) {
      throw new Error('Not a git repository');
    }

    const branchName = this.streamIdToBranch(streamId);
    const worktreePath = this.getWorktreePath(streamId);

    // Check if worktree already exists
    if (existsSync(worktreePath)) {
      // Worktree already exists, return existing info
      return {
        path: worktreePath,
        branch: branchName,
        streamId
      };
    }

    // Ensure base directory exists
    this.ensureWorktreeBaseDir();

    // Get base branch if not provided
    const base = baseBranch || (await this.getCurrentBranch());

    try {
      // Create worktree with new branch
      await execAsync(
        `git worktree add "${worktreePath}" -b ${branchName} ${base}`,
        { cwd: this.projectRoot }
      );

      return {
        path: worktreePath,
        branch: branchName,
        streamId
      };
    } catch (error) {
      throw new Error(`Failed to create worktree for ${streamId}: ${error}`);
    }
  }

  /**
   * Remove a worktree for a stream
   *
   * @param streamId - Stream identifier
   * @param force - Force removal even if dirty
   */
  async removeWorktree(streamId: string, force: boolean = false): Promise<void> {
    const worktreePath = this.getWorktreePath(streamId);

    if (!existsSync(worktreePath)) {
      // Worktree doesn't exist, nothing to do
      return;
    }

    try {
      const forceFlag = force ? '--force' : '';
      await execAsync(
        `git worktree remove ${forceFlag} "${worktreePath}"`,
        { cwd: this.projectRoot }
      );
    } catch (error) {
      throw new Error(`Failed to remove worktree for ${streamId}: ${error}`);
    }
  }

  /**
   * List all worktrees managed by Task Copilot
   */
  async listWorktrees(): Promise<WorktreeInfo[]> {
    if (!(await this.isGitRepo())) {
      return [];
    }

    try {
      const { stdout } = await execAsync('git worktree list --porcelain', { cwd: this.projectRoot });

      const worktrees: WorktreeInfo[] = [];
      const lines = stdout.split('\n');

      let currentWorktree: Partial<WorktreeInfo> = {};

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          const path = line.substring('worktree '.length);

          // Only include worktrees in our managed directory
          if (path.includes('.claude/worktrees/')) {
            currentWorktree.path = path;

            // Extract streamId from path
            const parts = path.split('/');
            const streamId = parts[parts.length - 1];
            currentWorktree.streamId = streamId;
          } else {
            currentWorktree = {};
          }
        } else if (line.startsWith('branch ') && currentWorktree.path) {
          const branch = line.substring('branch refs/heads/'.length);
          currentWorktree.branch = branch;

          // Complete worktree info
          if (currentWorktree.path && currentWorktree.branch && currentWorktree.streamId) {
            worktrees.push(currentWorktree as WorktreeInfo);
          }
          currentWorktree = {};
        }
      }

      return worktrees;
    } catch (error) {
      throw new Error(`Failed to list worktrees: ${error}`);
    }
  }

  /**
   * Prune stale worktree references
   */
  async pruneWorktrees(): Promise<void> {
    if (!(await this.isGitRepo())) {
      return;
    }

    try {
      await execAsync('git worktree prune', { cwd: this.projectRoot });
    } catch (error) {
      throw new Error(`Failed to prune worktrees: ${error}`);
    }
  }

  /**
   * Check if a worktree exists for a stream
   */
  async hasWorktree(streamId: string): Promise<boolean> {
    const worktreePath = this.getWorktreePath(streamId);
    return existsSync(worktreePath);
  }

  /**
   * Get worktree info for a stream
   */
  async getWorktreeInfo(streamId: string): Promise<WorktreeInfo | null> {
    const worktreePath = this.getWorktreePath(streamId);

    if (!existsSync(worktreePath)) {
      return null;
    }

    return {
      path: worktreePath,
      branch: this.streamIdToBranch(streamId),
      streamId
    };
  }

  /**
   * Merge a stream branch into target branch
   *
   * @param streamId - Stream identifier
   * @param targetBranch - Target branch to merge into (defaults to main/master)
   * @returns Merge result message
   */
  async mergeStreamBranch(streamId: string, targetBranch?: string): Promise<string> {
    if (!(await this.isGitRepo())) {
      throw new Error('Not a git repository');
    }

    const branchName = this.streamIdToBranch(streamId);
    const target = targetBranch || 'main';

    try {
      // Checkout target branch
      await execAsync(`git checkout ${target}`, { cwd: this.projectRoot });

      // Merge stream branch
      const { stdout } = await execAsync(
        `git merge ${branchName} --no-ff -m "Merge ${streamId} (${branchName})"`,
        { cwd: this.projectRoot }
      );

      return stdout;
    } catch (error) {
      throw new Error(`Failed to merge ${streamId} into ${target}: ${error}`);
    }
  }

  /**
   * Create a worktree for a task
   *
   * @param taskId - Task identifier (e.g., "TASK-xxx")
   * @param baseBranch - Optional base branch to branch from (defaults to current branch)
   * @returns WorktreeInfo with path and branch name
   */
  async createTaskWorktree(taskId: string, baseBranch?: string): Promise<WorktreeInfo> {
    // Validate git repo
    if (!(await this.isGitRepo())) {
      throw new Error('Not a git repository');
    }

    const branchName = `task/${taskId.toLowerCase()}`;
    const worktreePath = join(this.projectRoot, '.worktrees', taskId);

    // Check if worktree already exists
    if (existsSync(worktreePath)) {
      return {
        path: worktreePath,
        branch: branchName,
        streamId: taskId
      };
    }

    // Ensure base directory exists
    const worktreeBaseDir = join(this.projectRoot, '.worktrees');
    if (!existsSync(worktreeBaseDir)) {
      mkdirSync(worktreeBaseDir, { recursive: true });
    }

    // Get base branch if not provided
    const base = baseBranch || (await this.getCurrentBranch());

    try {
      // Create worktree with new branch
      await execAsync(
        `git worktree add "${worktreePath}" -b ${branchName} ${base}`,
        { cwd: this.projectRoot }
      );

      return {
        path: worktreePath,
        branch: branchName,
        streamId: taskId
      };
    } catch (error) {
      throw new Error(`Failed to create worktree for ${taskId}: ${error}`);
    }
  }

  /**
   * Merge a task worktree branch into target branch
   *
   * @param taskId - Task identifier
   * @param targetBranch - Target branch to merge into (defaults to current branch)
   * @returns Merge result with success status, merged flag, conflicts list, and message
   */
  async mergeTaskWorktree(
    taskId: string,
    targetBranch?: string
  ): Promise<{ success: boolean; merged: boolean; conflicts?: string[]; message: string }> {
    if (!(await this.isGitRepo())) {
      throw new Error('Not a git repository');
    }

    const branchName = `task/${taskId.toLowerCase()}`;

    // Determine target branch
    let target: string;
    if (targetBranch) {
      target = targetBranch;
    } else {
      // Use current branch as target
      target = await this.getCurrentBranch();
    }

    try {
      // Ensure we're on the target branch
      await execAsync(`git checkout ${target}`, { cwd: this.projectRoot });

      // Merge task branch
      const { stdout } = await execAsync(
        `git merge ${branchName} --no-ff -m "Merge task ${taskId}"`,
        { cwd: this.projectRoot }
      );

      return {
        success: true,
        merged: true,
        message: `Merged ${taskId} into ${target}: ${stdout.trim()}`
      };
    } catch (error: any) {
      // Check if merge conflict
      if (error.message?.includes('CONFLICT') || error.message?.includes('conflict')) {
        // Get list of conflicting files
        const conflicts = await this.getConflictingFiles();

        return {
          success: false,
          merged: false,
          conflicts,
          message: `Merge conflicts detected in ${conflicts.length} file(s). Manual resolution required.`
        };
      }

      throw new Error(`Failed to merge ${taskId} into ${target}: ${error}`);
    }
  }

  /**
   * Get list of files with merge conflicts
   *
   * @returns Array of file paths with conflicts
   */
  async getConflictingFiles(): Promise<string[]> {
    if (!(await this.isGitRepo())) {
      return [];
    }

    try {
      // Get unmerged files (files with conflicts)
      const { stdout } = await execAsync(
        'git diff --name-only --diff-filter=U',
        { cwd: this.projectRoot }
      );

      return stdout.trim() ? stdout.trim().split('\n') : [];
    } catch (error) {
      // If command fails, return empty array
      return [];
    }
  }

  /**
   * Check if repository has unresolved merge conflicts
   *
   * @returns True if conflicts exist
   */
  async hasConflicts(): Promise<boolean> {
    const conflicts = await this.getConflictingFiles();
    return conflicts.length > 0;
  }

  /**
   * Abort an in-progress merge
   */
  async abortMerge(): Promise<void> {
    if (!(await this.isGitRepo())) {
      throw new Error('Not a git repository');
    }

    try {
      await execAsync('git merge --abort', { cwd: this.projectRoot });
    } catch (error) {
      throw new Error(`Failed to abort merge: ${error}`);
    }
  }

  /**
   * Clean up a task worktree (remove worktree and delete branch)
   *
   * @param taskId - Task identifier
   * @param force - Force removal even if dirty
   * @returns Cleanup result
   */
  async cleanupTaskWorktree(
    taskId: string,
    force: boolean = false
  ): Promise<{ worktreeRemoved: boolean; branchDeleted: boolean }> {
    const worktreePath = join(this.projectRoot, '.worktrees', taskId);
    const branchName = `task/${taskId.toLowerCase()}`;

    let worktreeRemoved = false;
    let branchDeleted = false;

    // Remove worktree if exists
    if (existsSync(worktreePath)) {
      try {
        const forceFlag = force ? '--force' : '';
        await execAsync(
          `git worktree remove ${forceFlag} "${worktreePath}"`,
          { cwd: this.projectRoot }
        );
        worktreeRemoved = true;
      } catch (error) {
        if (!force) {
          throw new Error(`Failed to remove worktree for ${taskId}: ${error}`);
        }
        // If force flag is set, continue even if removal failed
      }
    }

    // Delete branch if exists
    try {
      // Check if branch exists
      const { stdout } = await execAsync(
        `git branch --list ${branchName}`,
        { cwd: this.projectRoot }
      );

      if (stdout.trim()) {
        // Branch exists, try to delete it
        try {
          await execAsync(`git branch -d ${branchName}`, { cwd: this.projectRoot });
          branchDeleted = true;
        } catch (deleteError) {
          // If normal delete fails, try force delete if force flag is set
          if (force) {
            await execAsync(`git branch -D ${branchName}`, { cwd: this.projectRoot });
            branchDeleted = true;
          } else {
            throw deleteError;
          }
        }
      }
    } catch (error) {
      // Branch may not exist or deletion failed
      // Only throw if worktree was successfully removed (inconsistent state)
      if (worktreeRemoved) {
        console.warn(`Warning: Worktree removed but branch deletion failed for ${taskId}: ${error}`);
      }
    }

    return { worktreeRemoved, branchDeleted };
  }

  /**
   * List all task worktrees
   *
   * @returns Array of worktree info for tasks
   */
  async listTaskWorktrees(): Promise<WorktreeInfo[]> {
    if (!(await this.isGitRepo())) {
      return [];
    }

    try {
      const { stdout } = await execAsync('git worktree list --porcelain', { cwd: this.projectRoot });

      const worktrees: WorktreeInfo[] = [];
      const lines = stdout.split('\n');

      let currentWorktree: Partial<WorktreeInfo> = {};

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          const path = line.substring('worktree '.length);

          // Only include task worktrees (in .worktrees directory)
          if (path.includes('/.worktrees/')) {
            currentWorktree.path = path;

            // Extract taskId from path
            const parts = path.split('/');
            const taskId = parts[parts.length - 1];
            currentWorktree.streamId = taskId;
          } else {
            currentWorktree = {};
          }
        } else if (line.startsWith('branch ') && currentWorktree.path) {
          const branch = line.substring('branch refs/heads/'.length);
          currentWorktree.branch = branch;

          // Complete worktree info
          if (currentWorktree.path && currentWorktree.branch && currentWorktree.streamId) {
            worktrees.push(currentWorktree as WorktreeInfo);
          }
          currentWorktree = {};
        }
      }

      return worktrees;
    } catch (error) {
      throw new Error(`Failed to list task worktrees: ${error}`);
    }
  }
}
