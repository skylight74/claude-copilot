/**
 * Git Helper Utilities
 *
 * Provides utilities for git operations, particularly auto-commit on task completion.
 * Designed to be resilient - gracefully degrades when git is unavailable.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitCommitResult {
  success: boolean;
  commitHash?: string;
  message?: string;
  warning?: string;
}

export class GitHelper {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Check if current directory is a git repository
   */
  async isGitRepo(): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.projectRoot });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if git is available in PATH
   */
  async isGitAvailable(): Promise<boolean> {
    try {
      await execAsync('git --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if working directory has unstaged changes (dirty)
   */
  async isWorkingDirectoryDirty(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: this.projectRoot });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Stage specific files for commit
   *
   * @param files - Array of file paths to stage
   * @returns Object with success status and any warnings
   */
  async stageFiles(files: string[]): Promise<{ success: boolean; warning?: string }> {
    if (files.length === 0) {
      return { success: false, warning: 'No files to stage' };
    }

    try {
      // Stage each file individually to handle missing files gracefully
      const results = await Promise.allSettled(
        files.map(file =>
          execAsync(`git add "${file}"`, { cwd: this.projectRoot })
        )
      );

      const failed = results.filter(r => r.status === 'rejected');

      if (failed.length === files.length) {
        return {
          success: false,
          warning: `Failed to stage any files. Files may not exist or may be outside repository.`
        };
      }

      if (failed.length > 0) {
        return {
          success: true,
          warning: `Staged ${files.length - failed.length} of ${files.length} files. Some files may not exist.`
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        warning: `Failed to stage files: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Create a commit with the specified message
   *
   * @param message - Commit message
   * @param body - Optional commit body (additional details)
   * @returns Commit result with hash and any warnings
   */
  async commit(message: string, body?: string): Promise<GitCommitResult> {
    try {
      const fullMessage = body ? `${message}\n\n${body}` : message;
      const { stdout } = await execAsync(
        `git commit -m "${message.replace(/"/g, '\\"')}"` +
        (body ? ` -m "${body.replace(/"/g, '\\"')}"` : ''),
        { cwd: this.projectRoot }
      );

      // Extract commit hash from output
      const hashMatch = stdout.match(/\[[\w-]+ ([a-f0-9]+)\]/);
      const commitHash = hashMatch ? hashMatch[1] : undefined;

      return {
        success: true,
        commitHash,
        message: stdout.trim()
      };
    } catch (error) {
      return {
        success: false,
        warning: `Failed to create commit: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Auto-commit task completion
   *
   * Stages specified files and creates a commit with task metadata.
   * Handles all error cases gracefully - never throws.
   *
   * @param taskId - Task identifier
   * @param taskTitle - Task title for commit message
   * @param filesModified - Array of file paths to stage
   * @param workProductIds - Optional work product IDs to reference
   * @returns Commit result with success status and any warnings
   */
  async autoCommitTask(
    taskId: string,
    taskTitle: string,
    filesModified: string[],
    workProductIds?: string[]
  ): Promise<GitCommitResult> {
    // Check git availability
    if (!(await this.isGitAvailable())) {
      return {
        success: false,
        warning: 'Git not available in PATH. Skipping auto-commit.'
      };
    }

    if (!(await this.isGitRepo())) {
      return {
        success: false,
        warning: 'Not a git repository. Skipping auto-commit.'
      };
    }

    // No files to commit
    if (filesModified.length === 0) {
      return {
        success: false,
        warning: 'No files specified in filesModified. Skipping auto-commit.'
      };
    }

    // Stage files
    const stageResult = await this.stageFiles(filesModified);
    if (!stageResult.success) {
      return {
        success: false,
        warning: stageResult.warning || 'Failed to stage files'
      };
    }

    // Build commit message
    const commitMessage = `feat(${taskId}): ${taskTitle}`;

    // Build commit body with task metadata
    const bodyParts: string[] = [
      `Task ID: ${taskId}`
    ];

    if (workProductIds && workProductIds.length > 0) {
      bodyParts.push(`Work Products: ${workProductIds.join(', ')}`);
    }

    bodyParts.push(`Files Modified: ${filesModified.length} file(s)`);

    const commitBody = bodyParts.join('\n');

    // Create commit
    const commitResult = await this.commit(commitMessage, commitBody);

    // Add staging warning if present
    if (stageResult.warning && commitResult.success) {
      return {
        ...commitResult,
        warning: stageResult.warning
      };
    }

    return commitResult;
  }

  /**
   * Check if there are staged changes ready to commit
   */
  async hasStagedChanges(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git diff --cached --quiet', { cwd: this.projectRoot });
      return false; // No changes if command succeeds
    } catch {
      return true; // Changes exist if command fails
    }
  }
}
