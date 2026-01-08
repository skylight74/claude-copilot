# Task Worktree Isolation

## Overview

Tasks can now optionally run in isolated git worktrees, providing complete file-level isolation for parallel work. This feature enhances the existing stream-based isolation by adding git-level branch and directory separation.

## Key Features

- **Opt-in isolation**: Tasks must explicitly enable `isolatedWorktree: true` in metadata
- **Automatic lifecycle**: Worktrees created on task start, merged on completion
- **Conflict detection**: Merge conflicts handled gracefully with manual resolution path
- **Seamless cleanup**: Worktrees and branches automatically removed after successful merge

## Metadata Fields

### TaskMetadata

```typescript
{
  isolatedWorktree?: boolean;  // If true, task runs in isolated git worktree (opt-in)
  worktreePath?: string;        // Git worktree path (auto-populated)
  branchName?: string;          // Git branch name (auto-populated)
}
```

## Lifecycle Management

### Task Start (status → in_progress)

When a task with `isolatedWorktree: true` transitions to `in_progress`:

1. **Create worktree**:
   - Path: `.worktrees/TASK-xxx`
   - Branch: `task/task-xxx` (lowercase)
   - Base: Current branch (or specified in metadata)

2. **Update metadata**:
   - Store `worktreePath`
   - Store `branchName`
   - Add note to task

### Task Completion (status → completed)

When a task with an isolated worktree completes:

1. **Attempt merge**:
   - Checkout target branch (defaults to current branch)
   - Merge task branch with `--no-ff` (creates merge commit)

2. **On successful merge**:
   - Remove worktree directory
   - Delete task branch
   - Update task notes with merge summary

3. **On merge conflict**:
   - Leave worktree intact
   - Update task notes with conflict warning
   - Manual resolution required

## WorktreeManager API

### createTaskWorktree(taskId, baseBranch?)

Creates isolated worktree for a task.

**Parameters:**
- `taskId` (string): Task identifier (e.g., "TASK-xxx")
- `baseBranch` (string, optional): Base branch to branch from (defaults to current)

**Returns:**
```typescript
{
  path: string;       // Worktree path
  branch: string;     // Branch name
  streamId: string;   // Task ID (for compatibility)
}
```

**Example:**
```typescript
const worktreeManager = new WorktreeManager(projectRoot);
const info = await worktreeManager.createTaskWorktree('TASK-123');
// info.path = '.worktrees/TASK-123'
// info.branch = 'task/task-123'
```

### mergeTaskWorktree(taskId, targetBranch?)

Merges task branch into target branch.

**Parameters:**
- `taskId` (string): Task identifier
- `targetBranch` (string, optional): Target branch (defaults to current)

**Returns:**
```typescript
{
  success: boolean;   // true if merge succeeded
  message: string;    // Merge result or error message
}
```

**Example:**
```typescript
const result = await worktreeManager.mergeTaskWorktree('TASK-123');
if (result.success) {
  console.log('Merged successfully');
} else {
  console.log('Conflict:', result.message);
}
```

### cleanupTaskWorktree(taskId, force?)

Removes worktree and deletes branch.

**Parameters:**
- `taskId` (string): Task identifier
- `force` (boolean, optional): Force removal even if dirty

**Returns:**
```typescript
{
  worktreeRemoved: boolean;  // true if worktree removed
  branchDeleted: boolean;    // true if branch deleted
}
```

**Example:**
```typescript
const result = await worktreeManager.cleanupTaskWorktree('TASK-123');
// result.worktreeRemoved = true
// result.branchDeleted = true
```

### listTaskWorktrees()

Lists all task worktrees currently active.

**Returns:**
```typescript
WorktreeInfo[] = [
  {
    path: string;       // Worktree path
    branch: string;     // Branch name
    streamId: string;   // Task ID
  }
]
```

**Example:**
```typescript
const worktrees = await worktreeManager.listTaskWorktrees();
// [{ path: '.worktrees/TASK-123', branch: 'task/task-123', streamId: 'TASK-123' }]
```

## Usage Examples

### Creating an Isolated Task

```typescript
const task = await task_create({
  title: "Refactor authentication module",
  description: "Major refactor requiring isolated workspace",
  metadata: {
    isolatedWorktree: true,  // Enable worktree isolation
    complexity: "High"
  }
});
```

### Task Lifecycle

```typescript
// 1. Start task → creates worktree
await task_update({
  id: "TASK-123",
  status: "in_progress"
});
// Worktree created at .worktrees/TASK-123
// Branch created: task/task-123

// 2. Work in worktree
// cd .worktrees/TASK-123
// ... make changes ...

// 3. Complete task → merges and cleans up
await task_update({
  id: "TASK-123",
  status: "completed"
});
// Branch merged to target
// Worktree removed
// Branch deleted
```

### Handling Merge Conflicts

If a merge conflict occurs on completion:

```typescript
// Task notes will contain:
// "Worktree merge failed: Merge conflict detected for TASK-123. Manual resolution required."

// Manual resolution steps:
// 1. cd to main project root
// 2. git checkout main (or target branch)
// 3. git merge task/task-123
// 4. Resolve conflicts
// 5. git commit
// 6. Manually cleanup:
const worktreeManager = new WorktreeManager(projectRoot);
await worktreeManager.cleanupTaskWorktree('TASK-123', true);
```

## Directory Structure

```
project-root/
├── .worktrees/              # Worktree base directory
│   ├── TASK-123/            # Isolated worktree for TASK-123
│   │   ├── src/
│   │   ├── tests/
│   │   └── ...
│   └── TASK-456/            # Isolated worktree for TASK-456
│       ├── src/
│       └── ...
├── src/                     # Main project files
└── ...
```

## Branch Naming Convention

- **Pattern**: `task/{task-id-lowercase}`
- **Examples**:
  - `TASK-123` → `task/task-123`
  - `TASK-abc-def` → `task/task-abc-def`

## Error Handling

All worktree operations are wrapped in try-catch blocks:

- **Errors are logged to task notes**
- **Status transitions never fail due to worktree errors**
- **Graceful degradation**: If git is unavailable, operations skip silently

## Comparison with Stream Isolation

| Feature | Stream Isolation | Worktree Isolation |
|---------|-----------------|-------------------|
| **Scope** | Metadata-based file tracking | Git-level directory separation |
| **Conflict detection** | File path analysis | Git merge detection |
| **Branch management** | Manual | Automatic |
| **Parallel work** | Logical streams | Physical directories |
| **Cleanup** | Metadata archival | Git worktree removal |
| **Best for** | Parallel features | High-risk refactors |

## When to Use Worktree Isolation

**Use isolated worktrees when:**
- Task requires major refactoring
- High risk of merge conflicts
- Need to test changes in isolation
- Working on long-running experimental work

**Don't use for:**
- Simple bug fixes
- Small feature additions
- Tasks with < 5 file changes
- Quick hotfixes

## Limitations

1. **Git dependency**: Requires git to be available and working directory to be a git repo
2. **Disk space**: Each worktree is a full checkout (uses more disk space)
3. **Manual conflicts**: Merge conflicts require manual resolution
4. **No nested worktrees**: Cannot create worktree of a worktree

## Integration with Existing Features

### Auto-commit

Worktree isolation works seamlessly with auto-commit:

```typescript
{
  isolatedWorktree: true,
  autoCommit: true,           // Still works in worktree
  filesModified: ['src/...']  // Auto-commits in worktree context
}
```

### Stream Management

Tasks can have both stream and worktree isolation:

```typescript
{
  streamId: "Stream-A",
  isolatedWorktree: true,  // Combine both isolation methods
  files: ['src/auth/*.ts']
}
```

### Checkpoints

Checkpoints preserve worktree metadata:

```typescript
// Checkpoint stores worktreePath and branchName
// On resume, worktree state is restored
```

## Stale Cleanup

To list and cleanup stale worktrees:

```typescript
const worktreeManager = new WorktreeManager(projectRoot);

// List all task worktrees
const worktrees = await worktreeManager.listTaskWorktrees();

// Cleanup completed/cancelled tasks
for (const worktree of worktrees) {
  const task = await task_get({ id: worktree.streamId });
  if (task.status === 'completed' || task.status === 'cancelled') {
    await worktreeManager.cleanupTaskWorktree(worktree.streamId, true);
  }
}

// Or use git's built-in prune
await worktreeManager.pruneWorktrees();
```

## Testing

Unit tests are included in `src/utils/__tests__/worktree-manager.test.ts` (placeholder - to be created).

Integration testing requires a real git repository.

## References

- [Git Worktree Documentation](https://git-scm.com/docs/git-worktree)
- Stream isolation: `docs/STREAM-MANAGEMENT.md`
- Task lifecycle: `src/tools/task.ts`
