# Worktree Conflict Handling

Enhanced merge conflict detection and resolution for Task Copilot's isolated worktree feature.

## Overview

When tasks use isolated git worktrees, merge conflicts can occur when merging task branches back into the main branch. The enhanced conflict handling system provides:

1. **Detailed conflict detection** - Classify conflicts by type (content, delete, rename, etc.)
2. **Conflict marker detection** - Identify which files still have unresolved `<<<<<<< ` markers
3. **Multiple resolution strategies** - Auto-resolve with `ours/theirs` or verify manual resolution
4. **Validation before completion** - Ensure all conflicts are truly resolved before merging

## Conflict Types

| Type | Description | Example |
|------|-------------|---------|
| `content` | Both branches modified same file differently | Line-by-line changes |
| `delete` | Both branches deleted same file | File removed in both |
| `rename` | Both branches renamed same file differently | File moved to different locations |
| `add-add` | Both branches added same file with different content | New file created independently |
| `modify-delete` | One branch modified, other deleted | Edit vs remove |

## Tools

### `worktree_conflict_status`

Check conflict status with detailed analysis.

**Input:**
```typescript
{
  taskId: string
}
```

**Output:**
```typescript
{
  taskId: string;
  hasConflicts: boolean;
  conflicts: Array<{
    file: string;
    type: 'content' | 'rename' | 'delete' | 'add-add' | 'modify-delete';
    hasConflictMarkers: boolean;
    suggestedStrategy: 'ours' | 'theirs' | 'manual';
  }>;
  summary: string;
  suggestedAction: string;
}
```

**Example:**
```typescript
const status = await worktree_conflict_status({ taskId: 'TASK-123' });

// Output:
{
  taskId: 'TASK-123',
  hasConflicts: true,
  conflicts: [
    {
      file: 'src/api/users.ts',
      type: 'content',
      hasConflictMarkers: true,
      suggestedStrategy: 'manual'
    },
    {
      file: 'src/utils/helpers.ts',
      type: 'delete',
      hasConflictMarkers: false,
      suggestedStrategy: 'manual'
    }
  ],
  summary: '1 content conflict(s), 1 delete conflict(s)',
  suggestedAction: 'All conflicts require manual resolution. Edit files to remove conflict markers, then use worktree_conflict_resolve'
}
```

### `worktree_conflict_resolve`

Resolve conflicts using specified strategy.

**Input:**
```typescript
{
  taskId: string;
  strategy?: 'ours' | 'theirs' | 'manual'; // defaults to 'manual'
  targetBranch?: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  completed: boolean;
  resolvedFiles: string[];
  message: string;
}
```

**Resolution Strategies:**

| Strategy | Behavior | Use When |
|----------|----------|----------|
| `ours` | Keep task branch changes | Task implementation is correct |
| `theirs` | Keep target branch changes | Main branch is correct, discard task changes |
| `manual` | Verify manual resolution | Human edited files to resolve conflicts |

**Example - Manual Resolution:**
```typescript
// 1. Check status
const status = await worktree_conflict_status({ taskId: 'TASK-123' });

// 2. Manually edit conflicted files to remove markers
// (Agent or human edits src/api/users.ts to resolve conflict)

// 3. Resolve with manual strategy
const result = await worktree_conflict_resolve({
  taskId: 'TASK-123',
  strategy: 'manual'
});

// Output:
{
  success: true,
  completed: true,
  resolvedFiles: ['src/api/users.ts'],
  message: 'Merge successful. Resolved 1 file(s). Task completed and worktree cleaned up.'
}
```

**Example - Auto Resolution (ours):**
```typescript
// Automatically resolve all conflicts by keeping task branch changes
const result = await worktree_conflict_resolve({
  taskId: 'TASK-123',
  strategy: 'ours'
});

// All conflicts resolved with task's version
{
  success: true,
  completed: true,
  resolvedFiles: ['src/api/users.ts', 'src/utils/helpers.ts'],
  message: 'Merge successful. Resolved 2 file(s). Task completed and worktree cleaned up.'
}
```

**Example - Auto Resolution (theirs):**
```typescript
// Automatically resolve all conflicts by keeping main branch changes
const result = await worktree_conflict_resolve({
  taskId: 'TASK-123',
  strategy: 'theirs'
});

// All conflicts resolved with main's version
{
  success: true,
  completed: true,
  resolvedFiles: ['src/api/users.ts', 'src/utils/helpers.ts'],
  message: 'Merge successful. Resolved 2 file(s). Task completed and worktree cleaned up.'
}
```

## Workflow

### Typical Conflict Resolution Workflow

```
1. Task blocked by merge conflict
   └─> Task status: 'blocked'
   └─> metadata.mergeConflicts: ['file1.ts', 'file2.ts']

2. Agent calls worktree_conflict_status()
   └─> Returns detailed conflict analysis
   └─> Shows conflict types and suggested strategies

3. Agent decides resolution approach:

   Option A: Manual Resolution
   ├─> Agent reads conflicted files
   ├─> Agent edits files to resolve conflicts
   ├─> Agent removes conflict markers (<<<<<<, =======, >>>>>>>)
   └─> Agent calls worktree_conflict_resolve({ strategy: 'manual' })

   Option B: Auto Resolution (ours)
   ├─> Agent determines task changes are correct
   └─> Agent calls worktree_conflict_resolve({ strategy: 'ours' })

   Option C: Auto Resolution (theirs)
   ├─> Agent determines main branch is correct
   └─> Agent calls worktree_conflict_resolve({ strategy: 'theirs' })

4. System validates resolution
   ├─> Checks no conflict markers remain
   ├─> Verifies all conflicts are staged
   └─> Completes merge

5. Task updated
   ├─> Status: 'completed'
   ├─> Worktree cleaned up
   └─> Conflict metadata removed
```

## Validation Rules

Before allowing resolution completion:

| Check | Purpose |
|-------|---------|
| **No conflict markers** | Files must not contain `<<<<<<< `, `=======`, `>>>>>>> ` |
| **All files staged** | Resolved files must be added with `git add` |
| **No remaining conflicts** | `git diff --name-only --diff-filter=U` returns empty |
| **Merge can complete** | `git merge` completes successfully |

## Error Handling

### Conflict Markers Still Exist

```typescript
const result = await worktree_conflict_resolve({
  taskId: 'TASK-123',
  strategy: 'manual'
});

// If markers still present:
{
  success: false,
  completed: false,
  resolvedFiles: [],
  message: 'Conflicts still exist in 2 file(s): src/api/users.ts, src/utils/helpers.ts. Remove conflict markers before resolving.'
}
```

### New Conflicts Appeared

```typescript
// After resolving some conflicts, new ones appear
{
  success: false,
  completed: false,
  resolvedFiles: ['file1.ts', 'file2.ts'],
  message: 'New conflicts detected: file3.ts'
}
```

### Strategy Failed

```typescript
{
  success: false,
  completed: false,
  resolvedFiles: ['file1.ts'],
  message: 'Failed to resolve file2.ts with strategy \'ours\': File does not exist in task branch'
}
```

## Best Practices

### For Agents

1. **Always check status first**
   - Use `worktree_conflict_status()` to understand conflicts before attempting resolution
   - Read the `suggestedStrategy` field for guidance

2. **Choose appropriate strategy**
   - `manual`: When conflicts require human judgment or line-by-line merging
   - `ours`: When task implementation is definitely correct
   - `theirs`: When abandoning task changes in favor of main branch

3. **Verify after resolution**
   - Check `success` and `completed` fields in response
   - Review `resolvedFiles` to confirm all conflicts addressed

4. **Handle failures gracefully**
   - If `success: false`, read `message` for specific error
   - Consider escalating to human if repeated failures

### For Manual Resolution

When editing files manually:

1. **Locate conflict markers:**
   ```
   <<<<<<< HEAD (ours - task branch)
   Task branch content
   =======
   Main branch content
   >>>>>>> main (theirs - target branch)
   ```

2. **Choose resolution:**
   - Keep task changes: Delete markers and main's content
   - Keep main changes: Delete markers and task's content
   - Merge both: Combine both versions intelligently

3. **Remove all markers:**
   - Ensure no `<<<<<<<`, `=======`, `>>>>>>>` remain
   - File must be valid code/text after editing

4. **Call resolve tool:**
   ```typescript
   await worktree_conflict_resolve({
     taskId: 'TASK-123',
     strategy: 'manual'
   });
   ```

## Implementation Details

### WorktreeManager Methods

**New methods added:**

```typescript
// Analyze conflict type and suggest strategy
async analyzeConflict(file: string): Promise<ConflictDetail>

// Check which files have conflict markers
async hasConflictMarkers(files: string[]): Promise<string[]>

// Mark file as resolved (git add)
async markConflictResolved(file: string): Promise<void>

// Resolve using strategy (git checkout --ours/--theirs)
async resolveConflictWithStrategy(file: string, strategy: 'ours' | 'theirs'): Promise<void>
```

### Detection Algorithm

```typescript
// 1. Get conflicting files from git
const conflicts = await execAsync('git diff --name-only --diff-filter=U');

// 2. For each conflict, check git status
const status = await execAsync(`git status --porcelain "${file}"`);

// 3. Classify by status code:
// - DD: both deleted
// - AU/UA: both added
// - DU/UD: deleted vs modified
// - UU: content conflict

// 4. Check for conflict markers
const hasMarkers = await execAsync(`grep -q "^<<<<<<< " "${file}"`);

// 5. Return detailed analysis
return {
  file,
  type: 'content' | 'delete' | 'rename' | 'add-add' | 'modify-delete',
  hasConflictMarkers: boolean,
  suggestedStrategy: 'ours' | 'theirs' | 'manual'
};
```

## Testing

Comprehensive test suite in `tests/worktree-conflict.test.ts`:

- **Conflict type detection** - Verify correct classification of content, delete, rename, add-add conflicts
- **Marker detection** - Ensure conflict markers are found/not found appropriately
- **Resolution strategies** - Test ours, theirs, manual strategies work correctly
- **Validation** - Verify conflicts must be fully resolved before completion
- **Task updates** - Ensure task status and metadata updated correctly
- **Error handling** - Test failure cases (markers remain, new conflicts, etc.)

Run tests:
```bash
cd mcp-servers/task-copilot
npm test -- worktree-conflict
```

## Integration with Task Copilot

When a task merge fails with conflicts:

1. **Task is blocked:**
   ```typescript
   task.status = 'blocked'
   task.blocked_reason = 'Merge conflicts detected'
   metadata.mergeConflicts = ['file1.ts', 'file2.ts']
   metadata.mergeConflictTimestamp = '2025-01-08T...'
   ```

2. **Agent is notified:**
   - Task shows as blocked in `task_list()`
   - `blocked_reason` explains why
   - Agent should call `worktree_conflict_status()` for details

3. **After resolution:**
   ```typescript
   task.status = 'completed'
   task.blocked_reason = null
   metadata.mergeConflicts = undefined
   metadata.mergeConflictTimestamp = undefined
   ```

4. **Worktree cleanup:**
   - Worktree directory removed
   - Task branch deleted
   - Clean working state restored

## Future Enhancements

Potential improvements for future versions:

- **Conflict preview** - Show side-by-side diff of conflicting changes
- **Smart strategy suggestions** - Analyze conflict context to recommend ours/theirs
- **Partial resolution** - Allow resolving some conflicts while leaving others
- **Conflict history** - Track how conflicts were resolved for learning
- **AI-assisted merge** - LLM suggests intelligent merge of both versions
- **Conflict prevention** - Detect potential conflicts before starting task

## See Also

- [Isolated Worktree Documentation](./ISOLATED-WORKTREE.md)
- [Stream Management](./STREAM-MANAGEMENT.md)
- [Task Status Transitions](./TASK-STATUS.md)
