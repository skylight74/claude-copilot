# Auto-Commit on Task Completion

## Overview

The auto-commit feature automatically creates git commits when tasks are completed, using git as a checkpoint system. Every completed task can have a corresponding commit, making it easy to track progress and revert changes if needed.

## How It Works

When `task_update` marks a task as `completed`:

1. **Check if enabled**: Verify `metadata.autoCommit !== false` (default: true)
2. **Check files**: Verify `metadata.filesModified` exists and has files
3. **Stage files**: Stage each file from `filesModified` array
4. **Create commit**: Generate commit with conventional format
5. **Log result**: Add commit hash or warning to task notes

## Configuration

### Task Metadata Fields

```typescript
interface TaskMetadata {
  // Enable/disable auto-commit (default: true)
  autoCommit?: boolean;

  // Files to stage and commit (required for auto-commit)
  filesModified?: string[];
}
```

### Default Behavior

- `autoCommit` defaults to `true` if not specified
- Auto-commit only happens if `filesModified` has files
- All errors are handled gracefully (never fails task completion)

## Usage Examples

### Enable Auto-Commit (Default)

```typescript
await task_update({
  id: 'TASK-123',
  status: 'completed',
  metadata: {
    filesModified: [
      'src/tools/task.ts',
      'src/types.ts',
      'src/utils/git-helper.ts'
    ]
    // autoCommit: true (implied)
  }
});
```

**Result:**
```
feat(TASK-123): Implement auto-commit feature

Task ID: TASK-123
Work Products: WP-001, WP-002
Files Modified: 3 file(s)
```

### Disable Auto-Commit

```typescript
await task_update({
  id: 'TASK-456',
  status: 'completed',
  metadata: {
    autoCommit: false,
    filesModified: ['README.md']
  }
});
```

**Result:** No commit created (escape hatch)

### No Files Modified

```typescript
await task_update({
  id: 'TASK-789',
  status: 'completed',
  metadata: {
    // No filesModified field
  }
});
```

**Result:** No commit created (nothing to commit)

## Commit Message Format

### Commit Subject

```
feat(TASK-{id}): {task title}
```

**Example:**
```
feat(TASK-419ae33f): Implement auto-commit on task completion
```

### Commit Body

```
Task ID: {taskId}
Work Products: {workProductIds...}
Files Modified: {count} file(s)
```

**Example:**
```
Task ID: TASK-419ae33f
Work Products: WP-abc123, WP-def456
Files Modified: 3 file(s)
```

## Edge Cases & Error Handling

### Dirty Working Directory

**Scenario:** Uncommitted changes exist outside `filesModified`

**Behavior:**
- Stages only files in `filesModified`
- Creates commit with those files
- Other changes remain unstaged
- Warning logged to task notes

### Git Not Available

**Scenario:** Git not in PATH or not installed

**Behavior:**
- Auto-commit skipped silently
- Warning logged: "Git not available in PATH"
- Task completion proceeds normally

### Not a Git Repository

**Scenario:** Project directory is not a git repository

**Behavior:**
- Auto-commit skipped silently
- Warning logged: "Not a git repository"
- Task completion proceeds normally

### File Not Found

**Scenario:** File in `filesModified` doesn't exist or is outside repo

**Behavior:**
- Stages files that exist
- Partial commit created if some files succeed
- Warning logged: "Staged X of Y files"

### No Staged Changes

**Scenario:** All files in `filesModified` are unchanged

**Behavior:**
- Commit creation attempted
- Git returns "nothing to commit" error
- Warning logged to task notes
- Task completion proceeds normally

## Integration with Task Copilot

### Task Update Flow

```
task_update(status: 'completed')
  ↓
Check verification requirements
  ↓
Check quality gates
  ↓
Record performance
  ↓
→ Auto-commit (NEW)
  ↓
Create auto-checkpoint
  ↓
Return success
```

### Task Notes Logging

Auto-commit results are appended to task notes:

**Success:**
```
Auto-commit: a1b2c3d
```

**Success with warning:**
```
Auto-commit: a1b2c3d (Staged 2 of 3 files. Some files may not exist.)
```

**Skipped:**
```
Auto-commit skipped: Not a git repository. Skipping auto-commit.
```

## Best Practices

### When to Use

✅ **Good use cases:**
- Feature implementations with clear file changes
- Bug fixes modifying specific files
- Refactoring with known scope
- Documentation updates

❌ **Not recommended:**
- Exploratory work (scope unclear)
- Multi-stage tasks (commit per stage instead)
- Tasks with no file changes (analysis, planning)

### Setting filesModified

**Recommended approach:**
```typescript
// Track files as you work
const filesModified = [];

// After editing files
filesModified.push('src/feature.ts');
filesModified.push('src/feature.test.ts');

// On completion
await task_update({
  id: taskId,
  status: 'completed',
  metadata: { filesModified }
});
```

**Automatic tracking (future enhancement):**
```typescript
// Could auto-detect from work products, git diff, or file watchers
```

### Escape Hatch Usage

Use `autoCommit: false` when:
- You want to manually craft the commit message
- Multiple tasks contribute to one logical commit
- Working in a shared branch (need to coordinate commits)
- Task is part of larger PR scope

## Implementation Details

### GitHelper Class

Located: `src/utils/git-helper.ts`

**Key methods:**
- `isGitAvailable()`: Check if git command exists
- `isGitRepo()`: Check if directory is a git repository
- `stageFiles(files[])`: Stage specific files
- `commit(message, body)`: Create commit with message
- `autoCommitTask(...)`: Orchestrate full auto-commit flow

**Design principles:**
- Never throws errors (all failures return `{ success: false, warning: string }`)
- Graceful degradation (missing git = skip commit)
- Detailed warnings for debugging

### Task Update Integration

Located: `src/tools/task.ts`

**Function:** `handleAutoCommit(db, task, taskId)`

**Flow:**
1. Parse task metadata
2. Check `autoCommit !== false`
3. Validate `filesModified` exists and is non-empty
4. Get work product IDs for commit body
5. Call `GitHelper.autoCommitTask()`
6. Log result to task notes

## Testing

### Unit Tests

Located: `src/utils/__tests__/git-helper.test.ts`

**Coverage:**
- Commit message format validation
- Metadata field handling
- Graceful degradation scenarios
- Edge case handling

### Integration Testing

**Manual test procedure:**

1. Create task with metadata:
   ```typescript
   const task = await task_create({
     title: 'Test auto-commit',
     metadata: {
       filesModified: ['test.txt']
     }
   });
   ```

2. Create test file:
   ```bash
   echo "test content" > test.txt
   ```

3. Complete task:
   ```typescript
   await task_update({
     id: task.id,
     status: 'completed'
   });
   ```

4. Verify commit:
   ```bash
   git log -1 --pretty=format:"%s%n%b"
   ```

   Expected output:
   ```
   feat(TASK-xxx): Test auto-commit

   Task ID: TASK-xxx
   Work Products: (if any)
   Files Modified: 1 file(s)
   ```

## Future Enhancements

### Potential Improvements

1. **Automatic file detection**: Track files modified during task execution
2. **Commit templates**: Customize commit format per project
3. **Branch integration**: Auto-create branch per task/stream
4. **PR automation**: Auto-create PR when task completed
5. **Rollback support**: `/rollback TASK-123` to revert task commit
6. **Commit hooks**: Run pre-commit hooks before auto-commit
7. **Multi-commit support**: Multiple commits per task for large changes

### Configuration Options (Future)

```typescript
interface AutoCommitConfig {
  enabled: boolean;
  commitFormat: 'conventional' | 'custom';
  customTemplate?: string;
  runHooks: boolean;
  signCommits: boolean;
  pushOnCommit: boolean;
}
```

## Troubleshooting

### "Auto-commit skipped: No files specified"

**Cause:** `metadata.filesModified` is empty or not provided

**Solution:** Add files to metadata:
```typescript
metadata: {
  filesModified: ['path/to/file.ts']
}
```

### "Auto-commit skipped: Git not available"

**Cause:** Git not installed or not in PATH

**Solution:**
- Install git: `brew install git` (macOS) or `apt-get install git` (Linux)
- Verify: `git --version`

### "Auto-commit skipped: Not a git repository"

**Cause:** Project directory is not a git repository

**Solution:**
```bash
cd /path/to/project
git init
```

### "Staged 0 of N files"

**Cause:** Files in `filesModified` don't exist or are outside repository

**Solution:**
- Verify file paths are correct
- Use absolute paths or paths relative to project root
- Check files exist: `ls -la path/to/file.ts`

### Commit created but wrong files staged

**Cause:** Dirty working directory with extra changes

**Solution:**
- Commit or stash unrelated changes before completing task
- Or set `autoCommit: false` and manually create commit

## Related Features

- **Quality Gates**: Auto-commit happens after quality gates pass
- **Verification Rules**: Auto-commit happens after verification passes
- **Checkpoints**: Auto-checkpoint created after auto-commit
- **Performance Tracking**: Commit success tracked in agent performance
- **Stream Isolation**: Each stream can have independent commits

## References

- Git Conventional Commits: https://www.conventionalcommits.org/
- Task Copilot Architecture: `../README.md`
- Quality Gates: `./QUALITY_GATES.md`
- Verification Rules: `./VERIFICATION.md`
