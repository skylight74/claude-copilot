# CMD-1: /memory Command

**Priority:** P1
**Agent:** @agent-me
**Status:** Not Started
**Depends On:** None

---

## Description

Create a /memory command that shows the current state of Memory Copilot, making the invisible visible. Users should understand what's being stored and how to use it.

## Acceptance Criteria

- [ ] Shows current initiative status
- [ ] Lists recent memories stored
- [ ] Shows key files tracked
- [ ] Displays next session resume info
- [ ] Works even with no active initiative

## Output

File: `/.claude/commands/memory.md`

---

## Subtasks

### CMD-1.1: Initiative Status Display
**Agent:** @agent-me

Show current initiative:
```
## Current Initiative

Name: Fix authentication bug
Status: IN PROGRESS
Started: 2 hours ago
Last updated: 5 minutes ago

### Progress
Completed:
- Identified root cause in auth middleware
- Updated token validation logic

In Progress:
- Writing tests for new validation

Blocked:
- (none)
```

### CMD-1.2: Recent Memories
**Agent:** @agent-me

Show last 5 memories:
```
## Recent Memories

| Type | Content | When |
|------|---------|------|
| decision | Use bcrypt for password hashing | 30 min ago |
| lesson | Auth middleware must run before routes | 1 hour ago |
| context | User reported issue on /login endpoint | 2 hours ago |
```

### CMD-1.3: Key Files
**Agent:** @agent-me

Show tracked files:
```
## Key Files

Files modified in this initiative:
- src/auth/login.ts
- src/middleware/auth.ts
- tests/auth.test.ts
- docs/security.md
```

### CMD-1.4: Resume Info
**Agent:** @agent-me

Show what /continue will restore:
```
## Next Session

When you run /continue, you'll resume with:
- Full initiative context
- All decisions and lessons
- Key files reference

Resume instructions:
"Continue testing the authentication fixes. Run the auth test suite
and verify all edge cases pass."
```

### CMD-1.5: Empty State
**Agent:** @agent-me

When no initiative exists:
```
## Memory Status

No active initiative.

To start tracking work:
1. Run /protocol
2. Describe your task
3. Work normally - context is saved automatically

Or run /continue to see past initiatives.
```

### CMD-1.6: Memory Stats
**Agent:** @agent-me

Optional: Show statistics:
```
## Statistics

Total memories: 47
- Decisions: 12
- Lessons: 8
- Context: 27

Database: ~/.claude/memory/workspace-abc123.db
Size: 2.3 MB
```

---

## Implementation Notes

- Use memory_search, initiative_get MCP tools
- Format output for CLI readability
- Keep it scannable (use tables)
- Link to /continue for action
