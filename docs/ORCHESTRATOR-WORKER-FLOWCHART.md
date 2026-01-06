# Orchestrator-Worker Flowchart

## 1. Initial Setup Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           START: New Project                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  cd ~/Work/my-project && claude                                              │
│  Then run: /orchestrator                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PHASE 1: Environment Detection                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  • Is current dir a git repo?                                        │    │
│  │  • Find sub-repos (directories with .git)                            │    │
│  │  • Find non-git directories                                          │    │
│  │  • Check for existing Makefile, SPRINT_BOARD.md                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │   Makefile exists?      │
                        └─────────────────────────┘
                           │                │
                      YES  │                │  NO
                           ▼                ▼
              ┌────────────────┐   ┌────────────────────────┐
              │ Skip to LOAD   │   │ Continue to SETUP      │
              │ (Phase 3)      │   │ (Phase 2)              │
              └────────────────┘   └────────────────────────┘
```

---

## 2. Setup Flow (Phase 2)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 2: Setup Wizard                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │   What was detected?    │
                        └─────────────────────────┘
                                      │
        ┌─────────────┬───────────────┼───────────────┬─────────────┐
        │             │               │               │             │
        ▼             ▼               ▼               ▼             ▼
   ┌─────────┐  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ EMPTY   │  │ NON-GIT  │   │ SINGLE   │   │ MULTI    │   │ CURRENT  │
   │ DIR     │  │ DIRS     │   │ REPO     │   │ REPOS    │   │ DIR IS   │
   │         │  │          │   │          │   │          │   │ REPO     │
   └─────────┘  └──────────┘   └──────────┘   └──────────┘   └──────────┘
        │             │               │               │             │
        ▼             ▼               ▼               ▼             ▼
```

### 2A. Empty Directory Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EMPTY DIRECTORY FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Orchestrator: "This directory is empty. What are you building?"             │
│                                                                              │
│  User: "I'm building an e-commerce platform with a Node.js backend,          │
│         React admin panel, and Next.js storefront"                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Route to ta (Tech Architect) Agent                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  ta agent analyzes and recommends:                                   │    │
│  │  • Repo structure (backend, admin, web)                              │    │
│  │  • Technology per repo (Node/Express, React, Next.js)                │    │
│  │  • Dependencies between repos                                        │    │
│  │  • Shared packages if needed                                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Orchestrator presents design:                                               │
│                                                                              │
│  "Recommended structure:                                                     │
│   ├── ecommerce-backend/    (Node.js + Express + PostgreSQL)                 │
│   ├── ecommerce-admin/      (React + Vite)                                   │
│   └── ecommerce-web/        (Next.js 14)                                     │
│                                                                              │
│   Options: [Approve] [Modify] [Redesign]"                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │   User approves?        │
                        └─────────────────────────┘
                           │                │
                      YES  │                │  NO (modify/redesign)
                           ▼                ▼
              ┌────────────────┐   ┌────────────────────────┐
              │ Route to me    │   │ Loop back to ta agent  │
              │ (Engineer)     │   │ with modifications     │
              └────────────────┘   └────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    me (Engineer) Agent Scaffolds                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  For each repo:                                                      │    │
│  │  • mkdir + git init + git flow init                                  │    │
│  │  • Create package.json / pyproject.toml / Cargo.toml                 │    │
│  │  • Create .gitignore                                                 │    │
│  │  • Create basic Makefile                                             │    │
│  │  • Create README.md                                                  │    │
│  │  • Create VERSION file (0.1.0)                                       │    │
│  │  • Initial commit                                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            [Continue to GENERATE CONFIG]
```

### 2B. Non-Git Directories Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NON-GIT DIRECTORIES FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Orchestrator: "Found directories that aren't git repos:                     │
│                 - backend/                                                   │
│                 - frontend/                                                  │
│                 - shared/                                                    │
│                                                                              │
│                 Which should be initialized as git repositories?"            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  User: "backend and frontend, not shared"                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  For selected directories:                                                   │
│  • cd backend && git init && git flow init -d                                │
│  • cd frontend && git init && git flow init -d                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            [Continue to GENERATE CONFIG]
```

### 2C. Single Repo Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SINGLE REPO FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Orchestrator: "This appears to be a single-repo project.                    │
│                 Is this correct, or will you add more repos?"                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │   User response?        │
                        └─────────────────────────┘
                           │                │
            "Single repo"  │                │  "Will add more"
                           ▼                ▼
              ┌────────────────┐   ┌────────────────────────┐
              │ EXIT           │   │ Continue to            │
              │                │   │ GENERATE CONFIG        │
              │ "Use /protocol │   │ with current repo      │
              │  for single-   │   └────────────────────────┘
              │  repo projects"│
              └────────────────┘
```

### 2D. Multiple Repos Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MULTIPLE REPOS FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Orchestrator: "Found these repositories:                                    │
│                 - backend/ (on develop)                                      │
│                 - admin/ (on main)                                           │
│                 - web/ (on feature/auth)                                     │
│                                                                              │
│                 Include all in orchestration? (Y/n)"                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  User: "Yes" or specifies subset                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            [Continue to GENERATE CONFIG]
```

---

## 3. Generate Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GENERATE CONFIGURATION                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Gather details:                                                             │
│  • Project name? → [default: directory name]                                 │
│  • Workspace ID? → [default: sanitized project name]                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Generate Makefile:                                                          │
│  (from ~/.claude/copilot/templates/Makefile.orchestrator)                    │
│     - PROJECT_NAME := my-project                                             │
│     - WORKSPACE_ID := my-project                                             │
│     - REPOS := backend admin web                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            [Continue to EXTERNAL INTEGRATIONS]
```

---

## 3A. External Integrations Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL INTEGRATIONS                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  "Do you have an external sprint board?"                                     │
│  (Notion, Trello, Jira, Linear, GitHub Issues, Asana, etc.)                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        │                           │
                   YES  ▼                           ▼  NO
       ┌────────────────────────────┐    ┌────────────────────────────┐
       │  "Which system?"           │    │  Create local              │
       │                            │    │  SPRINT_BOARD.md           │
       │  • Notion                  │    └────────────────────────────┘
       │  • Linear                  │
       │  • Jira                    │
       │  • Trello                  │
       │  • GitHub Issues           │
       │  • Asana                   │
       └────────────────────────────┘
                        │
                        ▼
       ┌────────────────────────────────────────────────────────────────┐
       │  Request system-specific credentials:                          │
       │                                                                │
       │  NOTION:                                                       │
       │    → "API Key (secret_xxx or ntn_xxx):"                        │
       │    → "Sprint Board Database ID:"                               │
       │                                                                │
       │  LINEAR:                                                       │
       │    → "Linear API Key:"                                         │
       │    → "Team ID:"                                                │
       │                                                                │
       │  JIRA:                                                         │
       │    → "Jira API Token:"                                         │
       │    → "Domain (e.g., company.atlassian.net):"                   │
       │    → "Project Key:"                                            │
       │                                                                │
       │  TRELLO:                                                       │
       │    → "API Key:"                                                │
       │    → "Token:"                                                  │
       │    → "Board ID:"                                               │
       └────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  "Do you have an external invoicing system?"                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
         YES  ▼              SAME AS  ▼                  NO   ▼
              │              SPRINT   │                       │
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  "Which system?"    │  │  "Invoice Database  │  │  "Track invoices    │
│                     │  │   ID:"              │  │   locally?"         │
│  (ask for separate  │  │                     │  │                     │
│   credentials)      │  │  (reuse API key     │  │  Yes → INVOICES.md  │
└─────────────────────┘  │   from sprint)      │  │  No  → Skip         │
                         └─────────────────────┘  └─────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GENERATE .mcp.json                                      │
│  (if any external integrations were configured)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                        ┌─────────────────────────┐
                        │  Existing .mcp.json?    │
                        └─────────────────────────┘
                           │                │
                      YES  │                │  NO
                           ▼                ▼
              ┌────────────────┐   ┌────────────────────────┐
              │ MERGE configs  │   │ CREATE new .mcp.json   │
              │ • Keep existing│   │ with integration       │
              │   copilot-     │   │ servers                │
              │   memory       │   └────────────────────────┘
              │ • Keep skills- │
              │   copilot      │
              │ • Add new      │
              │   integrations │
              └────────────────┘
```

### .mcp.json Templates

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      .mcp.json EXAMPLES                                      │
└─────────────────────────────────────────────────────────────────────────────┘

NOTION (Sprint + Invoices):
┌─────────────────────────────────────────────────────────────────────────────┐
│  {                                                                           │
│    "mcpServers": {                                                           │
│      "copilot-memory": { ... },        // Preserved                          │
│      "skills-copilot": { ... },        // Preserved                          │
│      "notion-sprint": {                // NEW                                │
│        "command": "npx",                                                     │
│        "args": ["-y", "@notionhq/notion-mcp-server"],                        │
│        "env": {                                                              │
│          "NOTION_API_KEY": "secret_xxx",                                     │
│          "NOTION_DATABASE_ID": "abc123..."                                   │
│        }                                                                     │
│      },                                                                      │
│      "notion-invoices": {              // NEW                                │
│        "command": "npx",                                                     │
│        "args": ["-y", "@notionhq/notion-mcp-server"],                        │
│        "env": {                                                              │
│          "NOTION_API_KEY": "secret_xxx",                                     │
│          "NOTION_DATABASE_ID": "def456..."                                   │
│        }                                                                     │
│      }                                                                       │
│    }                                                                         │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘

LINEAR:
┌─────────────────────────────────────────────────────────────────────────────┐
│  {                                                                           │
│    "mcpServers": {                                                           │
│      "linear": {                                                             │
│        "command": "npx",                                                     │
│        "args": ["-y", "@linear/mcp-server"],                                 │
│        "env": {                                                              │
│          "LINEAR_API_KEY": "lin_api_xxx",                                    │
│          "LINEAR_TEAM_ID": "TEAM-123"                                        │
│        }                                                                     │
│      }                                                                       │
│    }                                                                         │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘

JIRA:
┌─────────────────────────────────────────────────────────────────────────────┐
│  {                                                                           │
│    "mcpServers": {                                                           │
│      "jira": {                                                               │
│        "command": "npx",                                                     │
│        "args": ["-y", "@anthropic/jira-mcp-server"],                         │
│        "env": {                                                              │
│          "JIRA_API_TOKEN": "xxx",                                            │
│          "JIRA_DOMAIN": "company.atlassian.net",                             │
│          "JIRA_PROJECT": "PROJ"                                              │
│        }                                                                     │
│      }                                                                       │
│    }                                                                         │
│  }                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Supported Integrations Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUPPORTED INTEGRATIONS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  System         MCP Server                      Required Config              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Notion         @notionhq/notion-mcp-server     API Key, Database ID         │
│  Linear         @linear/mcp-server              API Key, Team ID             │
│  Jira           @anthropic/jira-mcp-server      API Token, Domain, Project   │
│  Trello         @anthropic/trello-mcp-server    API Key, Token, Board ID     │
│  GitHub Issues  @anthropic/github-mcp-server    Token, Repo                  │
│  Asana          @anthropic/asana-mcp-server     Token, Project ID            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3B. Finalize Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FINALIZE CONFIGURATION                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Generated files summary:                                                    │
│                                                                              │
│  ALWAYS CREATED:                                                             │
│    ✓ Makefile (from template)                                                │
│                                                                              │
│  IF EXTERNAL INTEGRATIONS:                                                   │
│    ✓ .mcp.json (with integration servers)                                    │
│                                                                              │
│  IF NO EXTERNAL SPRINT BOARD:                                                │
│    ✓ SPRINT_BOARD.md (local tracking)                                        │
│                                                                              │
│  IF NO EXTERNAL INVOICING + TRACKING REQUESTED:                              │
│    ✓ INVOICES.md (local tracking)                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Initialize:                                                                 │
│                                                                              │
│  1. git flow init in all repos                                               │
│  2. Create initiative via memory copilot                                     │
│  3. Store setup decisions in memory                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            [Continue to LOAD]
```

---

## 4. Load Flow (Phase 3)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 3: Load Orchestrator                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Load Initiative                                                          │
│     initiative_get → retrieves project context, progress, decisions          │
│                                                                              │
│  2. Check Repo Status                                                        │
│     make status → shows all repos, branches, uncommitted changes             │
│                                                                              │
│  3. Check Worker Updates                                                     │
│     memory_search "[WORKER UPDATE]" → finds worker progress reports          │
│                                                                              │
│  4. Check Local Files                                                        │
│     • SPRINT_BOARD.md pending changes                                        │
│     • INVOICES.md pending entries                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ORCHESTRATOR STATUS REPORT                                                  │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
│  Project: evArkadasi-v3                                                      │
│  Workspace: v3                                                               │
│                                                                              │
│  Repos:                                                                      │
│    • backend     → develop (clean)                                           │
│    • admin       → feature/dashboard (3 uncommitted)                         │
│    • web         → develop (clean)                                           │
│                                                                              │
│  Worker Updates: 2 new                                                       │
│    • [admin/dashboard] Status: in progress, 60% complete                     │
│    • [backend/api-v2] Status: done, ready for merge                          │
│                                                                              │
│  Sprint Board: 3 pending changes                                             │
│  Invoices: 2 pending entries                                                 │
│                                                                              │
│  What would you like to do?                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Orchestrator Operations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR OPERATIONS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  USER COMMANDS → ORCHESTRATOR ACTIONS                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  "Check status"                                                              │
│      │                                                                       │
│      └──→ make status                                                        │
│                                                                              │
│  "Check workers"                                                             │
│      │                                                                       │
│      └──→ memory_search "[WORKER UPDATE]"                                    │
│                                                                              │
│  "Run tests"                                                                 │
│      │                                                                       │
│      └──→ make test (runs in all repos)                                      │
│                                                                              │
│  "Run CI"                                                                    │
│      │                                                                       │
│      └──→ make ci (lint + test + build)                                      │
│                                                                              │
│  "Start feature X in backend"                                                │
│      │                                                                       │
│      └──→ make feature-start REPO=backend                                    │
│           └──→ Prompts for feature name                                      │
│           └──→ git flow feature start {name}                                 │
│                                                                              │
│  "Start a worker for dashboard in admin"                                     │
│      │                                                                       │
│      └──→ Instructs user: make worker-new REPO=admin TASK=dashboard          │
│           (User runs this in a NEW TERMINAL)                                 │
│                                                                              │
│  "Merge backend feature"                                                     │
│      │                                                                       │
│      └──→ make feature-finish REPO=backend                                   │
│           └──→ git flow feature finish {name}                                │
│                                                                              │
│  "Start release for web"                                                     │
│      │                                                                       │
│      └──→ make release-start REPO=web                                        │
│           └──→ Prompts: major/minor/patch                                    │
│           └──→ Bumps version, starts release branch                          │
│                                                                              │
│  "Update sprint board"                                                       │
│      │                                                                       │
│      └──→ Edits SPRINT_BOARD.md                                              │
│           └──→ Moves tasks between To Do / In Progress / Done                │
│                                                                              │
│  "Push to Notion"                                                            │
│      │                                                                       │
│      └──→ Syncs SPRINT_BOARD.md and INVOICES.md to Notion                    │
│                                                                              │
│  "Deploy to staging"                                                         │
│      │                                                                       │
│      └──→ make deploy-staging                                                │
│           └──→ Triggers deploy-staging in each repo's Makefile               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Starting a Worker

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STARTING A WORKER                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                    TERMINAL 1 (Orchestrator)
                    ┌─────────────────────────────────────┐
                    │  Orchestrator: "Start worker for    │
                    │  task 'user-auth' in backend"       │
                    │                                     │
                    │  → Updates SPRINT_BOARD.md          │
                    │  → Instructs user:                  │
                    │    "Open new terminal and run:      │
                    │     make worker-new REPO=backend \  │
                    │       TASK=user-auth"               │
                    └─────────────────────────────────────┘
                                      │
                                      │ User opens new terminal
                                      ▼
                    TERMINAL 2 (Worker)
                    ┌─────────────────────────────────────┐
                    │  $ cd ~/Work/my-project             │
                    │  $ make worker-new REPO=backend \   │
                    │      TASK=user-auth                 │
                    │                                     │
                    │  ═══════════════════════════════    │
                    │    Creating feature/user-auth       │
                    │    in backend...                    │
                    │  ═══════════════════════════════    │
                    │                                     │
                    │  → git flow feature start user-auth │
                    │  → cd backend                       │
                    │  → Opens Claude with WORKSPACE_ID   │
                    │                                     │
                    │  Tip: Run /worker to start          │
                    └─────────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────┐
                    │  Worker runs /worker command        │
                    │                                     │
                    │  → Confirms task: user-auth         │
                    │  → Checks branch: feature/user-auth │
                    │  → Loads context from memory        │
                    │  → Begins implementation            │
                    └─────────────────────────────────────┘
```

---

## 7. Worker Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          WORKER LIFECYCLE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    STARTUP      │────▶│    WORKING      │────▶│   COMPLETION    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼

┌─────────────────────────────────────────────────────────────────────────────┐
│  STARTUP                                                                     │
│  ────────                                                                    │
│  1. Run /worker                                                              │
│  2. Confirm task and branch                                                  │
│  3. Check git status                                                         │
│  4. Load previous context: memory_search "feature/user-auth"                 │
│  5. Begin implementation                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  WORKING (repeat cycle)                                                      │
│  ───────                                                                     │
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │
│  │   CODE      │────▶│   COMMIT    │────▶│   REPORT    │──┐                 │
│  └─────────────┘     └─────────────┘     └─────────────┘  │                 │
│        ▲                                                   │                 │
│        └───────────────────────────────────────────────────┘                 │
│                                                                              │
│  Code: Implement feature                                                     │
│  Commit: git add . && git commit -m "feat: add login endpoint"               │
│  Report: memory_store with [WORKER UPDATE] format                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  [WORKER UPDATE]                                                     │    │
│  │  Task: user-auth                                                     │    │
│  │  Branch: feature/user-auth                                           │    │
│  │  Status: in progress                                                 │    │
│  │  Commits: 5                                                          │    │
│  │  Done: Login endpoint, JWT generation                                │    │
│  │  Next: Password reset, email verification                            │    │
│  │  Blockers: None                                                      │    │
│  │  Ready for merge: no                                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  COMPLETION                                                                  │
│  ──────────                                                                  │
│                                                                              │
│  1. Final [WORKER UPDATE] with status: done, ready for merge: yes            │
│                                                                              │
│  2. Merge to develop:                                                        │
│     git checkout develop                                                     │
│     git pull origin develop                                                  │
│     git merge --no-ff feature/user-auth                                      │
│     git push origin develop                                                  │
│                                                                              │
│  3. Clean up:                                                                │
│     git branch -d feature/user-auth                                          │
│     git push origin --delete feature/user-auth                               │
│                                                                              │
│  4. Notify: "Merged feature/user-auth to develop. Task complete."            │
│                                                                              │
│  5. Worker session ends                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR ←→ WORKER COMMUNICATION                      │
└─────────────────────────────────────────────────────────────────────────────┘

     ORCHESTRATOR (Terminal 1)              WORKERS (Terminals 2, 3, ...)
     ════════════════════════               ═════════════════════════════
              │                                       │
              │                                       │
              │    ┌──────────────────────────────────┤
              │    │  Worker stores update:           │
              │    │  memory_store "[WORKER UPDATE]   │
              │    │  Task: user-auth                 │
              │    │  Status: in progress..."         │
              │    └──────────────────────────────────┤
              │                                       │
              ▼                                       │
     ┌────────────────────┐                          │
     │  Orchestrator      │                          │
     │  checks workers:   │                          │
     │  memory_search     │                          │
     │  "[WORKER UPDATE]" │                          │
     └────────────────────┘                          │
              │                                       │
              │  Sees update, updates                 │
              │  SPRINT_BOARD.md                      │
              │                                       │
              ▼                                       │
     ┌────────────────────┐                          │
     │  User asks:        │                          │
     │  "What's the       │                          │
     │  status of         │                          │
     │  user-auth?"       │                          │
     └────────────────────┘                          │
              │                                       │
              │  Orchestrator reports:                │
              │  "Worker is 60% done,                 │
              │   login endpoint complete,            │
              │   working on password reset"          │
              │                                       │
              ▼                                       │
     ┌────────────────────┐                          │
     │  Worker completes, │◀─────────────────────────┤
     │  reports:          │   memory_store           │
     │  "Ready for merge" │   "[WORKER UPDATE]       │
     └────────────────────┘   Status: done           │
              │               Ready for merge: yes"  │
              │                                       │
              ▼                                       │
     ┌────────────────────┐                          │
     │  Orchestrator      │                          │
     │  can now:          │                          │
     │  • Verify merge    │                          │
     │  • Run tests       │                          │
     │  • Update board    │                          │
     │  • Start release   │                          │
     └────────────────────┘                          │
```

---

## 9. Multi-Worker Parallel Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PARALLEL WORKERS EXAMPLE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

     TERMINAL 1              TERMINAL 2              TERMINAL 3
     Orchestrator            Worker: backend         Worker: admin
     ════════════            ═══════════════         ═════════════
          │                        │                       │
          │  Start workers         │                       │
          ├───────────────────────▶│                       │
          │  "make worker-new      │                       │
          │   REPO=backend         │                       │
          │   TASK=api-v2"         │                       │
          │                        │                       │
          ├────────────────────────┼──────────────────────▶│
          │  "make worker-new      │                       │
          │   REPO=admin           │                       │
          │   TASK=dashboard"      │                       │
          │                        │                       │
          │                        │                       │
          │                   ┌────┴────┐            ┌─────┴────┐
          │                   │ Working │            │ Working  │
          │                   │ on API  │            │ on UI    │
          │                   │ v2...   │            │ ...      │
          │                   └────┬────┘            └─────┬────┘
          │                        │                       │
          │◀───────────────────────┤                       │
          │  [WORKER UPDATE]       │                       │
          │  api-v2: 30% done      │                       │
          │                        │                       │
          │◀───────────────────────┼───────────────────────┤
          │                        │  [WORKER UPDATE]      │
          │                        │  dashboard: 50% done  │
          │                        │                       │
     ┌────┴────┐                   │                       │
     │ Update  │                   │                       │
     │ sprint  │                   │                       │
     │ board   │                   │                       │
     └────┬────┘                   │                       │
          │                        │                       │
          │                   ┌────┴────┐                  │
          │                   │ DONE!   │                  │
          │◀──────────────────┤ Ready   │                  │
          │                   │ merge   │                  │
          │                   └─────────┘                  │
          │                                                │
     ┌────┴────┐                                           │
     │ Review  │                                           │
     │ & merge │                                           │
     │ api-v2  │                                           │
     └────┬────┘                                           │
          │                                                │
          │                                           ┌────┴────┐
          │                                           │ DONE!   │
          │◀──────────────────────────────────────────┤ Ready   │
          │                                           │ merge   │
          │                                           └─────────┘
          │
     ┌────┴────┐
     │ Merge   │
     │ both,   │
     │ run CI, │
     │ release │
     └─────────┘
```

---

## 10. Git Flow Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GIT FLOW BRANCHES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

    main ─────●─────────────────────────────────●─────────────────●───▶
              │                                 │                 │
              │                                 │   release/1.1.0 │
              │                                 │   ┌─────────────┘
              │                                 │   │
  develop ────●────●────●────●────●────●────●──●───●────●────●────●───▶
              │    │    │    │    │    │    │      │    │    │
              │    │    │    │    │    │    │      │    │    │
              │    │    │    │    │    │    │      │    │    │
              │    │    │    └────┼────┼────┘      │    │    │
              │    │    │         │    │           │    │    │
              │    │    │  feature/api-v2          │    │    │
              │    │    │                          │    │    │
              │    │    └─────────┼────────────────┘    │    │
              │    │              │                     │    │
              │    │       feature/dashboard           │    │
              │    │                                    │    │
              │    └───────────────────────────────────┘    │
              │                                             │
              │                     hotfix/1.0.1 ───────────┘
              │
              └── Initial setup

┌─────────────────────────────────────────────────────────────────────────────┐
│  MAKEFILE COMMANDS                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Feature Flow:                                                               │
│  ─────────────                                                               │
│  make feature-start REPO=backend    → git flow feature start {name}          │
│  make feature-finish REPO=backend   → git flow feature finish {name}         │
│                                                                              │
│  Release Flow:                                                               │
│  ─────────────                                                               │
│  make release-start REPO=backend    → Prompts bump type, creates release     │
│  make release-finish REPO=backend   → Finishes, merges, tags, pushes         │
│                                                                              │
│  Hotfix Flow:                                                                │
│  ────────────                                                                │
│  make hotfix-start REPO=backend     → Auto patch bump, creates hotfix        │
│  make hotfix-finish REPO=backend    → Finishes, merges to main + develop     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Complete Session Example

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPLETE SESSION EXAMPLE                                │
└─────────────────────────────────────────────────────────────────────────────┘

DAY 1 - Morning
═══════════════

[Terminal 1 - Orchestrator]
$ cd ~/Work/my-ecommerce
$ make orchestrator
> /orchestrator

Orchestrator loads:
  Project: my-ecommerce
  Repos: backend, admin, web

  Worker updates:
    • (none)

  Sprint board:
    To Do: 5 tasks
    In Progress: 0
    Done: 0

User: "Let's start the user authentication feature in backend
       and dashboard redesign in admin"

Orchestrator:
  → Updates SPRINT_BOARD.md (moves tasks to In Progress)
  → "Open two new terminals and run:
     Terminal 2: make worker-new REPO=backend TASK=user-auth
     Terminal 3: make worker-new REPO=admin TASK=dashboard"

─────────────────────────────────────────────────────────────────

[Terminal 2 - Backend Worker]
$ make worker-new REPO=backend TASK=user-auth
> /worker

Worker: "Working on user-auth in backend"
  → Implements JWT authentication
  → Commits: "feat: add JWT token generation"
  → Reports progress via memory_store

─────────────────────────────────────────────────────────────────

[Terminal 3 - Admin Worker]
$ make worker-new REPO=admin TASK=dashboard
> /worker

Worker: "Working on dashboard in admin"
  → Implements new dashboard UI
  → Commits: "feat: add dashboard layout"
  → Reports progress via memory_store

═══════════════════════════════════════════════════════════════════

DAY 1 - Afternoon
═════════════════

[Terminal 1 - Orchestrator]
User: "Check worker status"

Orchestrator:
  → memory_search "[WORKER UPDATE]"
  → Reports:
    "backend/user-auth: 60% complete, working on password reset
     admin/dashboard: 80% complete, finishing charts"

User: "Run tests on backend"
  → make test-backend
  → "All tests pass"

═══════════════════════════════════════════════════════════════════

DAY 2 - Morning
═══════════════

[Terminal 3 - Admin Worker]
Worker completes:
  → Final commit: "feat: complete dashboard"
  → Reports: [WORKER UPDATE] status: done, ready for merge: yes
  → Merges to develop:
    git checkout develop
    git merge --no-ff feature/dashboard
    git push origin develop
  → "Task complete, merged to develop"

─────────────────────────────────────────────────────────────────

[Terminal 1 - Orchestrator]
User: "Check workers"

Orchestrator:
  → "admin/dashboard: COMPLETE, merged to develop
     backend/user-auth: 90% complete"

User: "Update the sprint board"
  → Moves dashboard to Done
  → Updates completion date

═══════════════════════════════════════════════════════════════════

DAY 2 - Afternoon
═════════════════

[Terminal 2 - Backend Worker]
Worker completes:
  → Reports: [WORKER UPDATE] status: done, ready for merge: yes
  → Merges to develop
  → "Task complete"

─────────────────────────────────────────────────────────────────

[Terminal 1 - Orchestrator]
User: "All workers done. Run full CI"
  → make ci
  → Lint: pass
  → Tests: pass
  → Build: pass

User: "Start release for all repos"
  → make release-start REPO=backend (bump: minor → 1.1.0)
  → make release-start REPO=admin (bump: minor → 1.1.0)
  → make release-start REPO=web (bump: minor → 1.1.0)

User: "Finish releases and deploy"
  → make release-finish REPO=backend
  → make release-finish REPO=admin
  → make release-finish REPO=web
  → make deploy-prod
  → "Deployed to production!"

User: "Update sprint board and push to Notion"
  → Updates SPRINT_BOARD.md (closes sprint)
  → Syncs to Notion

═══════════════════════════════════════════════════════════════════

END OF SPRINT
═════════════

Sprint Board:
  To Do: 0
  In Progress: 0
  Done: 5 tasks ✓

Repos:
  backend: v1.1.0 (main)
  admin: v1.1.0 (main)
  web: v1.1.0 (main)
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          QUICK REFERENCE                                     │
└─────────────────────────────────────────────────────────────────────────────┘

ORCHESTRATOR COMMANDS (run from project root)
─────────────────────────────────────────────
make orchestrator                    Start orchestrator session
make status                          View all repos
make branches                        View feature branches
make test                            Run all tests
make ci                              Full CI (lint + test + build)
make deploy-staging                  Deploy to staging
make deploy-prod                     Deploy to production

WORKER COMMANDS (run from project root)
───────────────────────────────────────
make worker REPO=x TASK=y            Resume existing feature
make worker-new REPO=x TASK=y        Create new feature + start worker

GIT FLOW COMMANDS
─────────────────
make gitflow-init                    Init git flow in all repos
make feature-start REPO=x            Start feature branch
make feature-finish REPO=x           Finish feature → develop
make release-start REPO=x            Start release (prompts bump)
make release-finish REPO=x           Finish release → main + tag
make hotfix-start REPO=x             Start hotfix (auto patch)
make hotfix-finish REPO=x            Finish hotfix → main + develop

SLASH COMMANDS
──────────────
/orchestrator                        Load orchestrator context
/worker                              Load worker context
/protocol                            Single-repo workflow (not for orchestrator)

MEMORY PATTERNS
───────────────
memory_search "[WORKER UPDATE]"      Find all worker updates
memory_store "[WORKER UPDATE]..."    Report worker progress
initiative_get                       Load project initiative
initiative_update                    Update initiative state

EXTERNAL INTEGRATIONS
─────────────────────
During setup, orchestrator asks about external systems:

Sprint Board Options:
  • Notion      → API Key + Database ID
  • Linear      → API Key + Team ID
  • Jira        → API Token + Domain + Project
  • Trello      → API Key + Token + Board ID
  • GitHub      → Token + Repo
  • Asana       → Token + Project ID
  • None        → Creates local SPRINT_BOARD.md

Invoicing Options:
  • Same system → Just Database/Board ID (reuses API key)
  • Different   → Full credentials for that system
  • None        → Creates local INVOICES.md (optional)

Config is stored in .mcp.json and merged with existing copilot servers.
```
