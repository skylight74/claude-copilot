# Orchestrator Setup Skill

Intelligent project bootstrapping and multi-repo coordination.

---

## Phase 1: Environment Detection

Scan the current directory:

```bash
# Current directory name (potential project name)
basename $(pwd)

# Is current dir a git repo?
[ -d .git ] && echo "IS_GIT_REPO"

# Find git repos in subdirectories
find . -maxdepth 2 -name ".git" -type d | sed 's|/\.git||' | sed 's|^\./||'

# Find non-git directories (potential repos)
for dir in */; do
  [ ! -d "$dir/.git" ] && echo "DIR: ${dir%/}"
done

# Existing configuration
[ -f Makefile ] && echo "HAS_MAKEFILE"
[ -f SPRINT_BOARD.md ] && echo "HAS_BOARD"
```

Report findings to user.

---

## Phase 2: Decision Flow

### Already Configured
```
Makefile exists?
  → "Project already configured. Loading orchestrator..."
  → Skip to Phase 6
```

### Empty Directory
```
No files or directories?
  → "This is an empty directory."
  → "What are you building? Describe your project."
  → Route to ta agent for architecture design
  → Phase 3: Design Project
```

### Has Non-Git Directories
```
Directories exist but not git repos?
  → "Found directories: [list them]"
  → "Which should be initialized as git repos?"
  → User selects
  → git init + git flow init in selected
  → Continue to Phase 4
```

### Single Repo Detected
```
Current dir is git repo OR only 1 subdirectory repo?
  → "Is this a single-repo project, or will you add more repos?"

  User: "Single repo"
    → "For single-repo projects, use /protocol instead."
    → "It provides full agent access without orchestration overhead."
    → Exit

  User: "Multi-repo / will add more"
    → Continue to Phase 4
```

### Multiple Repos Detected
```
Multiple git repos found?
  → "Found these repos: [list]"
  → "Include all in orchestration? (Y/n)"
  → "Or specify which ones"
  → Continue to Phase 4
```

---

## Phase 3: Project Design (Empty Directory)

Use agents to design the project from scratch.

### 3.1 Gather Information
Ask user:
- "What is this project? Describe what you're building."
- "Any technology preferences? (languages, frameworks)"
- "Who will use this? (users, admins, APIs, etc.)"

### 3.2 Route to ta (Tech Architect)
```
ta agent receives the description and:
- Analyzes requirements
- Recommends repo structure
- Suggests technology per repo
- Identifies dependencies between repos
- Returns a structured design
```

### 3.3 Present Design
```
"Based on your description, here's the recommended structure:"

[ta agent's design]

"Options:"
- Approve this design
- Modify (add/remove/change repos)
- Describe differently and redesign
```

### 3.4 Create Repos
For each approved repo, use **me (Engineer)** agent to:
- Create directory
- Initialize git + git flow
- Scaffold based on technology:
  - Appropriate package/project file
  - .gitignore
  - Basic Makefile
  - README.md
  - VERSION file (0.1.0)
- Initial commit

---

## Phase 4: Generate Configuration

### 4.1 Gather Final Details
```
"Project name?" → [default: directory name]
"Workspace ID?" → [default: sanitized project name]
```

### 4.2 Generate Makefile
Load template: `~/.claude/copilot/templates/Makefile.orchestrator`

Replace placeholders:
- `PROJECT_NAME` → user's project name
- `WORKSPACE_ID` → user's workspace ID
- `REPOS` → detected/created repos (space-separated)

Write to `./Makefile`

### 4.3 External Integrations

#### Sprint Board Integration
```
"Do you have an external sprint board? (Notion, Trello, Jira, Linear, etc.)"

User: "Yes"
  → "Which system?"
  → Based on system, ask for required config:

  Notion:
    → "Notion API Key (secret_xxx or ntn_xxx):"
    → "Sprint Board Database ID:"

  Linear:
    → "Linear API Key:"
    → "Team ID:"

  Jira:
    → "Jira API Token:"
    → "Jira Domain (e.g., company.atlassian.net):"
    → "Project Key:"

  Trello:
    → "Trello API Key:"
    → "Trello Token:"
    → "Board ID:"

User: "No"
  → Create local SPRINT_BOARD.md
```

#### Invoicing Integration
```
"Do you have an external invoicing system?"

User: "Yes"
  → "Which system?"
  → If same as sprint board (e.g., both Notion):
    → "Invoice Database ID:" (reuse API key)
  → If different system:
    → Ask for system-specific config

User: "No"
  → "Do you want to track invoices locally?"
    → If yes: Create local INVOICES.md
    → If no: Skip invoicing
```

### 4.4 Generate .mcp.json (if external integrations)

**Template for Notion:**
```json
{
  "mcpServers": {
    "notion-sprint": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_API_KEY": "{api-key}",
        "NOTION_DATABASE_ID": "{sprint-db-id}"
      }
    },
    "notion-invoices": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_API_KEY": "{api-key}",
        "NOTION_DATABASE_ID": "{invoices-db-id}"
      }
    }
  }
}
```

**Template for Linear:**
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "@linear/mcp-server"],
      "env": {
        "LINEAR_API_KEY": "{api-key}",
        "LINEAR_TEAM_ID": "{team-id}"
      }
    }
  }
}
```

**Template for Jira:**
```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["-y", "@anthropic/jira-mcp-server"],
      "env": {
        "JIRA_API_TOKEN": "{api-token}",
        "JIRA_DOMAIN": "{domain}",
        "JIRA_PROJECT": "{project-key}"
      }
    }
  }
}
```

**Merge with existing .mcp.json:**
If project already has `.mcp.json`:
1. Read existing file
2. Merge `mcpServers` objects
3. Preserve existing copilot-memory and skills-copilot configs
4. Write merged config

### 4.5 Generate Local Files (if no external integrations)

**SPRINT_BOARD.md** (if no external sprint board):
```markdown
# Sprint Board - [Project Name]

## Current Sprint
**Sprint:** [Number/Name]
**Started:** [Date]
**Goal:** [Sprint goal]

---

## To Do
| ID | Task | Priority | Repo | Assignee |
|----|------|----------|------|----------|

## In Progress
| ID | Task | Repo | Branch | Worker | Started |
|----|------|------|--------|--------|---------|

## Done
| ID | Task | Repo | Branch | Completed |
|----|------|------|--------|-----------|

---

## Pending Changes
<!-- Changes here will be pushed to external system on command -->
```

**INVOICES.md** (if no external invoicing and tracking requested):
```markdown
# Invoice Tracking - [Project Name]

## Current Period

## Unbilled Work
| Date | Task | Hours | Rate | Amount | Notes |
|------|------|-------|------|--------|-------|

## Pending Invoices
| Invoice # | Date | Amount | Status |
|-----------|------|--------|--------|

## Paid
| Invoice # | Amount | Paid Date |
|-----------|--------|-----------|

---

## Pending Changes
```

### 4.6 Create Sub-Repo Makefiles
For repos without Makefiles, create basic ones with:
- `test` target
- `lint` target
- `build` target
- `clean` target
- Git flow helpers

### 4.7 Supported Integration Reference

| System | MCP Server | Required Config |
|--------|------------|-----------------|
| Notion | `@notionhq/notion-mcp-server` | API Key, Database ID |
| Linear | `@linear/mcp-server` | API Key, Team ID |
| Jira | `@anthropic/jira-mcp-server` | API Token, Domain, Project |
| Trello | `@anthropic/trello-mcp-server` | API Key, Token, Board ID |
| GitHub Issues | `@anthropic/github-mcp-server` | Token, Repo |
| Asana | `@anthropic/asana-mcp-server` | Token, Project ID |

---

## Phase 5: Initialize

### 5.1 Git Flow
```bash
for repo in [REPOS]; do
  cd $repo && git flow init -d && cd ..
done
```

### 5.2 Create Initiative
```
initiative_start:
  name: "[Project Name]"
  goal: "[User's project description]"
  context: "Multi-repo orchestration with [N] repos"
```

### 5.3 Store Decisions
```
memory_store "Project setup: [summary of configuration]"
memory_store "Architecture: [ta agent's design if applicable]"
```

---

## Phase 6: Ready

Show status and available actions:

```
ORCHESTRATOR READY

Project: [name]
Workspace: [id]
Repos: [list]

Commands:
  make status         - View all repos
  make worker-new ... - Start a worker
  make test           - Run all tests

What would you like to do?
```

---

## Agent Usage Summary

| Situation | Agent | Task |
|-----------|-------|------|
| Design new project | ta | Architecture |
| Scaffold repos | me | Initial code |
| Setup CI/CD | do | Pipelines |
| Create docs | doc | README files |
| Security review | sec | Before deploy |
| UI repos | uid/uxd | Frontend structure |

---

## Notes

- No hardcoded repo names - everything is dynamic
- No assumptions about technology - ask or let ta decide
- Single-repo projects redirect to /protocol
- Design grows with the project - can add repos later
- All configuration is regeneratable
