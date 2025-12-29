# Task Copilot MCP Server

MCP server providing PRD and task management for Claude Code.

## Features

- **PRD Management**: Create and track Product Requirements Documents
- **Task Hierarchy**: Create tasks and subtasks with full dependency tracking
- **Work Products**: Store agent outputs (designs, implementations, reviews, etc.)
- **Activity Log**: Automatic tracking of all changes
- **Initiative Linking**: Lightweight connection to Memory Copilot initiatives

## Installation

```bash
npm install
npm run build
```

## Configuration

Configure in your `.mcp.json`:

```json
{
  "mcpServers": {
    "task-copilot": {
      "command": "node",
      "args": [
        "/path/to/claude-copilot/mcp-servers/task-copilot/dist/index.js"
      ],
      "env": {
        "TASK_DB_PATH": "~/.claude/tasks",
        "WORKSPACE_ID": "optional-explicit-id"
      }
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TASK_DB_PATH` | `~/.claude/tasks` | Base storage path |
| `WORKSPACE_ID` | (auto-hash) | Explicit workspace identifier |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |

### Workspace ID

By default, each project gets a unique database based on its path hash. Set `WORKSPACE_ID` explicitly to:
- Preserve data when renaming/moving projects
- Share task database across multiple projects
- Use a human-readable identifier

## Database Schema

### Tables

- **initiatives**: Lightweight initiative tracking
- **prds**: Product Requirements Documents
- **tasks**: Tasks and subtasks with status tracking
- **work_products**: Agent outputs and deliverables
- **activity_log**: Audit trail of all changes

### Database Path

`{TASK_DB_PATH}/{workspace_id}/tasks.db`

## Available Tools

### PRD Tools

#### prd_create
Create a new PRD.

**Input:**
- `title` (string, required): PRD title
- `description` (string): PRD description
- `content` (string, required): Full PRD content
- `metadata` (object): Optional metadata (priority, complexity, tags)

**Output:**
```json
{
  "id": "PRD-xxx",
  "initiativeId": "INIT-xxx",
  "createdAt": "2025-12-29T...",
  "summary": "First 200 chars..."
}
```

#### prd_get
Get PRD by ID.

**Input:**
- `id` (string, required): PRD ID
- `includeContent` (boolean): Include full content (default: false)

**Output:**
```json
{
  "id": "PRD-xxx",
  "initiativeId": "INIT-xxx",
  "title": "...",
  "description": "...",
  "content": "...",
  "metadata": {},
  "taskCount": 10,
  "completedTasks": 5,
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### prd_list
List PRDs for initiative.

**Input:**
- `initiativeId` (string): Filter by initiative ID
- `status` (string): Filter by status (active, archived, cancelled)

**Output:**
```json
[
  {
    "id": "PRD-xxx",
    "title": "...",
    "description": "...",
    "taskCount": 10,
    "completedTasks": 5,
    "progress": "5/10 (50%)"
  }
]
```

### Task Tools

#### task_create
Create task or subtask.

**Input:**
- `title` (string, required): Task title
- `description` (string): Task description
- `prdId` (string): Parent PRD ID (optional)
- `parentId` (string): Parent task ID for subtasks (optional)
- `assignedAgent` (string): Assigned agent name
- `metadata` (object): Optional metadata (complexity, priority, dependencies, acceptanceCriteria, phase)

**Output:**
```json
{
  "id": "TASK-xxx",
  "prdId": "PRD-xxx",
  "parentId": null,
  "status": "pending",
  "createdAt": "2025-12-29T..."
}
```

#### task_update
Update task.

**Input:**
- `id` (string, required): Task ID
- `status` (string): New status (pending, in_progress, blocked, completed, cancelled)
- `assignedAgent` (string): New assigned agent
- `notes` (string): Task notes
- `blockedReason` (string): Reason if blocked
- `metadata` (object): Metadata updates (merged)

**Output:**
```json
{
  "id": "TASK-xxx",
  "status": "in_progress",
  "updatedAt": "2025-12-29T..."
}
```

#### task_get
Get task details.

**Input:**
- `id` (string, required): Task ID
- `includeSubtasks` (boolean): Include subtasks (default: false)
- `includeWorkProducts` (boolean): Include work products (default: false)

**Output:**
```json
{
  "id": "TASK-xxx",
  "prdId": "PRD-xxx",
  "parentId": null,
  "title": "...",
  "description": "...",
  "assignedAgent": "me",
  "status": "in_progress",
  "blockedReason": null,
  "notes": "...",
  "metadata": {},
  "createdAt": "...",
  "updatedAt": "...",
  "subtasks": [...],
  "workProducts": [...]
}
```

#### task_list
List tasks with filters.

**Input:**
- `prdId` (string): Filter by PRD ID
- `parentId` (string): Filter by parent task ID
- `status` (string): Filter by status
- `assignedAgent` (string): Filter by assigned agent

**Output:**
```json
[
  {
    "id": "TASK-xxx",
    "title": "...",
    "status": "in_progress",
    "assignedAgent": "me",
    "subtaskCount": 3,
    "completedSubtasks": 1,
    "hasWorkProducts": true
  }
]
```

### Work Product Tools

#### work_product_store
Store agent output.

**Input:**
- `taskId` (string, required): Task ID
- `type` (string, required): Work product type (technical_design, implementation, test_plan, security_review, documentation, architecture, other)
- `title` (string, required): Work product title
- `content` (string, required): Full content
- `metadata` (object): Optional metadata

**Output:**
```json
{
  "id": "WP-xxx",
  "taskId": "TASK-xxx",
  "summary": "First 300 chars...",
  "wordCount": 1500,
  "createdAt": "2025-12-29T..."
}
```

#### work_product_get
Get full work product.

**Input:**
- `id` (string, required): Work product ID

**Output:**
```json
{
  "id": "WP-xxx",
  "taskId": "TASK-xxx",
  "type": "technical_design",
  "title": "...",
  "content": "...",
  "metadata": {},
  "createdAt": "..."
}
```

#### work_product_list
List work products for task.

**Input:**
- `taskId` (string, required): Task ID

**Output:**
```json
[
  {
    "id": "WP-xxx",
    "type": "technical_design",
    "title": "...",
    "summary": "First 300 chars...",
    "wordCount": 1500,
    "createdAt": "..."
  }
]
```

### Initiative Tools

#### initiative_link
Link an initiative from Memory Copilot to Task Copilot.

**Input:**
- `initiativeId` (string, required): Initiative ID from Memory Copilot
- `title` (string, required): Initiative title
- `description` (string): Initiative description

**Output:**
```json
{
  "initiativeId": "INIT-xxx",
  "workspaceCreated": true,
  "dbPath": "~/.claude/tasks/workspace/tasks.db"
}
```

#### initiative_archive
Archive all task data for an initiative to JSON.

**Input:**
- `initiativeId` (string): Initiative ID (default: current)
- `archivePath` (string): Custom archive path (default: ~/.claude/archives/{id}_{timestamp}.json)

**Output:**
```json
{
  "initiativeId": "INIT-xxx",
  "archivePath": "~/.claude/archives/INIT-xxx_20251229.json",
  "prdCount": 3,
  "taskCount": 15,
  "workProductCount": 8,
  "archivedAt": "2025-12-29T..."
}
```

#### initiative_wipe
Delete all task data for an initiative (fresh start).

**Input:**
- `initiativeId` (string): Initiative ID (default: current)
- `confirm` (boolean, required): Must be true to proceed

**Output:**
```json
{
  "initiativeId": "INIT-xxx",
  "deletedPrds": 3,
  "deletedTasks": 15,
  "deletedWorkProducts": 8,
  "deletedActivityLogs": 42
}
```

#### progress_summary
Get high-level progress overview (optimized for minimal context usage).

**Input:**
- `initiativeId` (string): Initiative ID (default: current)

**Output:**
```json
{
  "initiativeId": "INIT-xxx",
  "title": "Framework Improvements",
  "prds": { "total": 3, "active": 2, "completed": 1 },
  "tasks": {
    "total": 15,
    "pending": 5,
    "inProgress": 3,
    "completed": 6,
    "blocked": 1
  },
  "workProducts": {
    "total": 8,
    "byType": {
      "technical_design": 3,
      "implementation": 4,
      "test_plan": 1
    }
  },
  "recentActivity": [
    { "timestamp": "...", "type": "task_updated", "summary": "..." }
  ]
}
```

### Utility Tools

#### health_check
Get server health and statistics.

**Output:**
```json
{
  "status": "healthy",
  "workspaceId": "abc123",
  "prdCount": 5,
  "taskCount": 42,
  "completedTasks": 20,
  "workProductCount": 15
}
```

## Usage Example

```javascript
// Create a PRD
const prd = await prdCreate({
  title: "User Authentication Feature",
  description: "Add OAuth2 authentication",
  content: "# PRD: User Authentication...",
  metadata: {
    priority: "P0",
    complexity: "High",
    tags: ["auth", "security"]
  }
});

// Create tasks
const task1 = await taskCreate({
  title: "Design authentication flow",
  prdId: prd.id,
  assignedAgent: "ta",
  metadata: {
    phase: "Phase 1",
    complexity: "Medium"
  }
});

// Update task status
await taskUpdate({
  id: task1.id,
  status: "in_progress",
  notes: "Working on OAuth2 provider integration"
});

// Store work product
await workProductStore({
  taskId: task1.id,
  type: "technical_design",
  title: "OAuth2 Authentication Design",
  content: "# Technical Design\n\n..."
});

// List tasks for PRD
const tasks = await taskList({
  prdId: prd.id,
  status: "in_progress"
});
```

## Integration with Memory Copilot

Task Copilot maintains lightweight initiative records but does not duplicate Memory Copilot's functionality. Use both together:

- **Memory Copilot**: Session memory, decisions, lessons, context
- **Task Copilot**: PRDs, task tracking, work products

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev

# Start server
npm start
```

## License

MIT
