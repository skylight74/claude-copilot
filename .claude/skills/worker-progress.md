# Worker Progress Reporting

## Purpose
Standardized progress reporting format for worker sessions to communicate with the orchestrator.

---

## Progress Update Template

When a worker needs to report progress, use this exact format:

```
[WORKER UPDATE]
Task: {descriptive task name}
Branch: feature/{branch-name}
Status: {not started | in progress | review | done}
Commits: {number of commits on this branch}
Done:
  - {completed item 1}
  - {completed item 2}
Next:
  - {next task 1}
  - {next task 2}
Blockers: {describe blockers or "None"}
Time: {number} {units - e.g., "2 hours", "1 day", "3 units"}
Ready for merge: {yes | no}
Notes: {any decisions, lessons, or context}
Timestamp: {ISO timestamp}
```

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| `not started` | Branch created but no work done |
| `in progress` | Actively working on task |
| `review` | Work complete, needs code review |
| `done` | Complete and ready for merge |

---

## Example Updates

### Starting Work
```
[WORKER UPDATE]
Task: User Authentication
Branch: feature/auth
Status: in progress
Commits: 1
Done:
  - Created branch
  - Set up auth module structure
Next:
  - Implement JWT generation
  - Add login endpoint
Blockers: None
Time: 1 hour
Ready for merge: no
Notes: Using jsonwebtoken library
Timestamp: 2025-01-15T10:30:00Z
```

### Blocked
```
[WORKER UPDATE]
Task: User Authentication
Branch: feature/auth
Status: in progress
Commits: 5
Done:
  - JWT generation
  - Login endpoint
  - Token refresh logic
Next:
  - Integrate with user database
Blockers: Need database schema from feature/database branch
Time: 3 hours
Ready for merge: no
Notes: Blocked waiting for database work to complete
Timestamp: 2025-01-15T14:30:00Z
```

### Complete
```
[WORKER UPDATE]
Task: User Authentication
Branch: feature/auth
Status: done
Commits: 12
Done:
  - JWT generation and validation
  - Login/logout endpoints
  - Token refresh
  - Middleware for protected routes
  - Unit tests
Next:
  - None (task complete)
Blockers: None
Time: 8 hours
Ready for merge: yes
Notes: All tests passing. Follows RFC 7519 for JWT.
Timestamp: 2025-01-15T18:00:00Z
```

---

## Saving Updates

After composing an update, save it with:
```
memory_store "[WORKER UPDATE] Task: {name} Status: {status} Branch: {branch} ..."
```

The orchestrator will find it with:
```
memory_search "[WORKER UPDATE]"
```

---

## Quick Decision Recording

For important decisions during work:
```
memory_store "feature/{branch}: Decided to {decision} because {reason}"
```

Examples:
```
memory_store "feature/auth: Using bcrypt for password hashing, cost factor 12"
memory_store "feature/auth: Refresh tokens stored in httpOnly cookies for security"
```
