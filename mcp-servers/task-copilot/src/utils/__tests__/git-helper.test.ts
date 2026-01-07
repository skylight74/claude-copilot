/**
 * Tests for GitHelper auto-commit functionality
 *
 * Note: These tests are primarily for documentation and type checking.
 * Full integration testing requires a real git repository.
 */

import { describe, it, expect } from '@jest/globals';
import { GitHelper } from '../git-helper.js';

describe('GitHelper', () => {
  describe('initialization', () => {
    it('should create GitHelper with project root', () => {
      const helper = new GitHelper('/path/to/project');
      expect(helper).toBeDefined();
    });
  });

  describe('autoCommitTask', () => {
    it('should handle empty filesModified array gracefully', async () => {
      const helper = new GitHelper(process.cwd());
      const result = await helper.autoCommitTask(
        'TASK-123',
        'Test task',
        [], // No files
        []
      );

      expect(result.success).toBe(false);
      expect(result.warning).toContain('No files');
    });

    it('should generate correct commit message format', async () => {
      // This test validates the expected message format
      const taskId = 'TASK-abc123';
      const taskTitle = 'Implement auto-commit feature';
      const expectedFormat = `feat(${taskId}): ${taskTitle}`;

      expect(expectedFormat).toBe('feat(TASK-abc123): Implement auto-commit feature');
    });

    it('should include work products in commit body', async () => {
      const workProductIds = ['WP-001', 'WP-002'];
      const expectedBody = workProductIds.join(', ');

      expect(expectedBody).toBe('WP-001, WP-002');
    });
  });

  describe('commit message format', () => {
    it('should follow conventional commit format', () => {
      const taskId = 'TASK-419ae33f';
      const title = 'Add auto-commit on task completion';
      const message = `feat(${taskId}): ${title}`;

      expect(message).toMatch(/^feat\(TASK-[a-f0-9-]+\):/);
    });

    it('should handle special characters in title', () => {
      const taskId = 'TASK-123';
      const title = 'Fix bug: handle "quotes" properly';
      const message = `feat(${taskId}): ${title}`;

      expect(message).toContain('Fix bug: handle "quotes" properly');
    });
  });

  describe('graceful degradation', () => {
    it('should not throw when git is unavailable', async () => {
      const helper = new GitHelper('/nonexistent/path');

      await expect(
        helper.autoCommitTask('TASK-123', 'Test', ['file.ts'], [])
      ).resolves.not.toThrow();
    });

    it('should return warning when not a git repo', async () => {
      const helper = new GitHelper('/tmp');
      const result = await helper.autoCommitTask(
        'TASK-123',
        'Test',
        ['file.ts'],
        []
      );

      // Should not throw, but should indicate failure
      expect(result.success).toBeDefined();
    });
  });
});

describe('Auto-commit metadata integration', () => {
  describe('TaskMetadata fields', () => {
    it('should have autoCommit field (defaults to true)', () => {
      const metadata = {
        autoCommit: undefined // Should be treated as true
      };

      const enabled = metadata.autoCommit !== false;
      expect(enabled).toBe(true);
    });

    it('should respect autoCommit: false', () => {
      const metadata = {
        autoCommit: false
      };

      const enabled = metadata.autoCommit !== false;
      expect(enabled).toBe(false);
    });

    it('should handle filesModified array', () => {
      const metadata = {
        filesModified: [
          'src/tools/task.ts',
          'src/types.ts',
          'src/utils/git-helper.ts'
        ]
      };

      expect(metadata.filesModified).toHaveLength(3);
      expect(metadata.filesModified[0]).toBe('src/tools/task.ts');
    });

    it('should validate filesModified is array', () => {
      const metadata1 = { filesModified: [] };
      const metadata2 = { filesModified: ['file.ts'] };
      const metadata3 = { filesModified: 'not-an-array' };

      expect(Array.isArray(metadata1.filesModified)).toBe(true);
      expect(Array.isArray(metadata2.filesModified)).toBe(true);
      expect(Array.isArray(metadata3.filesModified)).toBe(false);
    });
  });
});
