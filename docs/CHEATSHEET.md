# Claude Copilot Cheatsheet

Quick reference for all commands and workflows.

---

## Table of Contents

1. [Session Commands](#session-commands)
2. [Makefile Commands](#makefile-commands)
3. [Memory Commands](#memory-commands)
4. [Worker Progress Format](#worker-progress-format)
5. [Orchestrator Workflows](#orchestrator-workflows)
6. [Git Flow Commands](#git-flow-commands)
7. [Local Files](#local-files)

---

## Session Commands

### Starting Sessions

| Command | Where | Purpose |
|---------|-------|---------|
| `/protocol` | Any project | Start fresh work (auto-selects agent) |
| `/continue` | Any project | Resume previous work (loads initiative) |
| `/orchestrator` | Any project | Start as coordinator |
| `/worker` | Any project | Start as task worker |

### When to Use What

| Situation | Command |
|-----------|---------|
| New work session, single person | `/protocol` |
| Resuming previous work | `/continue` |
| Coordinating parallel workers | `/orchestrator` |
| Focused task work (parallel setup) | `/worker` |

---

## Makefile Commands

### Single-Repo Project

```bash
# Sessions
make orchestrator              # Start orchestrator session
make worker TASK=auth          # Start worker on feature/auth
make worker-new TASK=auth      # Create feature/auth + start worker

# Status
make status                    # Show project status
make branches                  # Show feature branches

# Version Management
make version-get               # Show current version
make version-bump-major        # Bump X.0.0
make version-bump-minor        # Bump 0.X.0
make version-bump-patch        # Bump 0.0.X
make version-init              # Create VERSION file

# Git Flow
make gitflow-init              # Initialize git-flow
make feature-start             # Start new feature (prompts for name)
make feature-finish            # Finish current feature → develop
make release-start             # Start release (prompts for bump type)
make release-finish            # Finish release → main + develop
make hotfix-start              # Start hotfix (auto patch bump)
make hotfix-finish             # Finish hotfix → main + develop

# Release
make release-notes             # Generate RELEASE_NOTES.md

# Branch Management
make archive-old-branches      # Archive non-git-flow branches
make delete-archived-branches  # Delete archived branches

# Development
make setup                     # Set up dev environment
make verify                    # Run verification checks
make git-hooks                 # Install pre-commit hooks

# Docker (if configured)
make docker-build              # Build image
make docker-push               # Push image
make release-deploy            # Build + push
```

### Multi-Repo Project (evArkadasi style)

```bash
# Orchestrator
make orchestrator              # Start orchestrator (coordinates all)

# Workers by repo
make worker-admin TASK=x       # Worker in adminv2
make worker-backend TASK=x     # Worker in backend
make worker-web TASK=x         # Worker in web

make worker-admin-new TASK=x   # Create feature + worker (admin)
make worker-backend-new TASK=x # Create feature + worker (backend)
make worker-web-new TASK=x     # Create feature + worker (web)

# Status
make status                    # All repos overview
make status-admin              # adminv2 status
make status-backend            # backend status
make status-web                # web status
make branches                  # Feature branches across all repos
make version-get               # Show all repo versions

# Testing (delegates to sub-repos)
make test                      # Test all repos
make test-admin                # Test adminv2 only
make test-backend              # Test backend only
make test-web                  # Test web only
make lint                      # Lint all repos
make verify                    # Lint + test all

# Build (delegates to sub-repos)
make build                     # Build all repos
make build-admin               # Build adminv2 only
make build-backend             # Build backend only
make build-web                 # Build web only
make clean                     # Clean all repos

# Git Flow (uses git flow commands)
make gitflow-init              # Initialize git flow in all repos
make feature-start-admin       # Start feature in adminv2
make feature-finish-admin      # Finish feature in adminv2
make release-start-admin       # Start release (prompts for bump)
make release-finish-admin      # Finish release + push + tag
make hotfix-start-admin        # Start hotfix (auto patch bump)
make hotfix-finish-admin       # Finish hotfix + push + tag
# (same pattern for -backend and -web)

# CI/CD (orchestrated)
make ci                        # Full pipeline (lint + test + build)
make deploy-staging            # Deploy all to staging
make deploy-prod               # Deploy all to production (confirms)
make docker-build              # Build Docker images
make docker-push               # Push Docker images

# Notion (handled by orchestrator)
make sync-sprint               # Reminder to use orchestrator
make sync-invoices             # Reminder to use orchestrator
```

---

## Memory Commands

### Initiative Management

| Command | Purpose |
|---------|---------|
| `initiative_get` | Get current active initiative |
| `initiative_start` | Start new initiative |
| `initiative_update` | Update progress, decisions, lessons |
| `initiative_complete` | Archive completed initiative |

### Initiative Update Fields

```
initiative_update:
  completed: ["task1", "task2"]
  inProgress: "Currently working on X"
  resumeInstructions: "Next: do Y, then Z"
  lessons: ["Learned that X works better"]
  decisions: ["Chose A over B because..."]
  keyFiles: ["src/auth/", "config/"]
```

### Memory Storage

| Command | Purpose |
|---------|---------|
| `memory_store "text"` | Store a decision/lesson/context |
| `memory_search "query"` | Semantic search across memories |

### Common Memory Patterns

```bash
# Store a decision
memory_store "Decided to use PostgreSQL because of X, Y, Z"

# Store a lesson
memory_store "Lesson: Don't use library X, it breaks with Y"

# Store coordination decision
memory_store "Coordination: Prioritizing auth over dashboard"

# Search for decisions
memory_search "database choice"
memory_search "authentication"

# Search for worker updates
memory_search "[WORKER UPDATE]"

# Search for time entries
memory_search "Time:"
```

---

## Worker Progress Format

### Full Update Template

```
[WORKER UPDATE]
Task: {descriptive task name}
Branch: feature/{branch-name}
Status: {not started | in progress | review | done}
Commits: {number of commits on branch}
Done:
  - {completed item 1}
  - {completed item 2}
Next:
  - {next task 1}
  - {next task 2}
Blockers: {describe blockers or "None"}
Time: {number} {units}
Ready for merge: {yes | no}
Notes: {decisions, lessons learned}
Timestamp: {ISO timestamp}
```

### Status Values

| Status | Meaning |
|--------|---------|
| `not started` | Branch created, no work done |
| `in progress` | Actively working |
| `review` | Work complete, needs review |
| `done` | Complete, ready for merge |

### Quick Examples

**Starting work:**
```
[WORKER UPDATE]
Task: User Authentication
Branch: feature/auth
Status: in progress
Commits: 1
Done:
  - Created branch
  - Set up module structure
Next:
  - Implement JWT
  - Add login endpoint
Blockers: None
Time: 1 hour
Ready for merge: no
```

**Blocked:**
```
[WORKER UPDATE]
Task: User Authentication
Branch: feature/auth
Status: in progress
Blockers: Waiting for database schema from feature/database
Time: 3 hours
Ready for merge: no
```

**Complete:**
```
[WORKER UPDATE]
Task: User Authentication
Branch: feature/auth
Status: done
Commits: 12
Done:
  - All auth endpoints
  - Unit tests
  - Documentation
Blockers: None
Time: 8 hours
Ready for merge: yes
```

---

## Orchestrator Workflows

### Startup Checklist

1. Check git branches: `git branch -a` (all repos)
2. Load initiative: `initiative_get`
3. Check local files: `SPRINT_BOARD.md`, `INVOICES.md`
4. Search worker updates: `memory_search "[WORKER UPDATE]"`
5. Report sync status (pending changes)
6. Ask what to coordinate

### Sprint Board Commands

| Say This | What Happens |
|----------|--------------|
| "Update sprint board" | Updates local `SPRINT_BOARD.md` |
| "Check sprint status" | Shows pending changes |
| "Push sprint to Notion" | Syncs to Notion database |
| "Show sprint board" | Displays current local state |

### Invoice Commands

| Say This | What Happens |
|----------|--------------|
| "Add time entry" | Adds to local `INVOICES.md` |
| "Check invoice status" | Shows pending entries |
| "Push invoices to Notion" | Syncs to Notion table |
| "Show invoice totals" | Displays running totals |

### Notion Sync Triggers

**Auto-suggest push when:**

| Sprint Board | Invoices |
|--------------|----------|
| 5+ changes pending | 10+ entries pending |
| End of session | End of week |
| Before new sprint | Before client meeting |
| User asks for Notion link | User asks for totals |

### Coordination Commands

| Say This | What Happens |
|----------|--------------|
| "Check worker updates" | Searches for [WORKER UPDATE] |
| "What's blocked?" | Finds blockers in updates |
| "What's ready for merge?" | Finds status: done, ready: yes |
| "Merge feature/X" | Coordinates merge to develop |

---

## Git Flow Commands

### Feature Workflow

```bash
# Start feature
make feature-start
# or: git flow feature start feature-name

# Work on feature...
git add .
git commit -m "feat: description"

# Finish feature (merge to develop)
make feature-finish
# or: git checkout develop && git merge --no-ff feature/X
```

### Release Workflow

```bash
# Start release (bumps version)
make release-start
# Prompts: major | minor | patch

# Make release fixes if needed...

# Finish release (merge to main + develop, tag)
make release-finish
```

### Hotfix Workflow

```bash
# Start hotfix (auto bumps patch)
make hotfix-start

# Fix the issue...

# Finish hotfix (merge to main + develop, tag)
make hotfix-finish
```

### Commit Message Conventions

| Prefix | Use For |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring |
| `docs:` | Documentation |
| `test:` | Adding tests |
| `chore:` | Maintenance |

---

## Local Files

### Project Structure

```
your-project/
├── SPRINT_BOARD.md      # Local sprint board (orchestrator manages)
├── INVOICES.md          # Local invoices (orchestrator manages)
├── VERSION              # Version file (e.g., "1.2.3")
├── RELEASE_NOTES.md     # Generated release notes
├── Makefile             # Commands
├── .mcp.json            # Claude Copilot config
├── CLAUDE.md            # Project instructions
└── .claude/
    ├── commands/        # /protocol, /continue
    ├── agents/          # 12 specialized agents
    └── skills/          # Project-specific skills
```

### SPRINT_BOARD.md Structure

```markdown
# Sprint Board
Last synced to Notion: {date}
Pending changes: {count}

## To Do
| Task | Assignee | Branch | Priority |

## In Progress
| Task | Assignee | Branch | Started | Blockers |

## Review
| Task | Assignee | Branch | PR | Ready |

## Done (This Sprint)
| Task | Assignee | Branch | Completed |

---
## Change Log (Pending Push)
- {timestamp}: {change description}
```

### INVOICES.md Structure

```markdown
# Invoice Tracking
Last synced to Notion: {date}
Pending entries: {count}

## Current Period
| Date | Task | Worker | Time | Rate | Amount | Status |

## Running Totals
- Total hours: X
- Total amount: $X
- Uninvoiced: $X

---
## Pending Entries (Not Yet in Notion)
- {date}: {task} - {time} ({worker})
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                 CLAUDE COPILOT QUICK REF                │
├─────────────────────────────────────────────────────────┤
│ START WORK                                              │
│   /protocol        Fresh work (selects agent)           │
│   /continue        Resume previous work                 │
│   /orchestrator    Coordinate parallel work             │
│   /worker          Task-focused work                    │
├─────────────────────────────────────────────────────────┤
│ MAKEFILE (ORCHESTRATOR)                                 │
│   make orchestrator          Start coordinator          │
│   make worker-{repo} TASK=x  Start worker in repo       │
│   make status                All repos status           │
│   make test / build / ci     Testing & CI/CD            │
│   make feature-start-{repo}  Start git flow feature     │
│   make release-start-{repo}  Start release              │
│   make deploy-staging/prod   Deploy all repos           │
├─────────────────────────────────────────────────────────┤
│ MEMORY                                                  │
│   initiative_get             Load current work          │
│   initiative_update          Save progress              │
│   memory_store "X"           Store decision/lesson      │
│   memory_search "X"          Find past context          │
├─────────────────────────────────────────────────────────┤
│ ORCHESTRATOR                                            │
│   "Check worker updates"     Find [WORKER UPDATE]       │
│   "Update sprint board"      Update local file          │
│   "Push to Notion"           Sync to Notion             │
│   "Run tests"                make test (all repos)      │
│   "Deploy to staging"        make deploy-staging        │
├─────────────────────────────────────────────────────────┤
│ WORKER (in sub-repo)                                    │
│   make feature-start/finish  Git flow feature           │
│   make release-start/finish  Git flow release           │
│   make test / build          Run repo tests/build       │
│   Report progress: [WORKER UPDATE] format               │
│   Use memory_store for decisions                        │
└─────────────────────────────────────────────────────────┘
```
