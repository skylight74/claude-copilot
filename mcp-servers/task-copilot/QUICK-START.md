# Task Copilot Quick Start

## Installation

1. Build the server:
```bash
cd mcp-servers/task-copilot
npm install
npm run build
```

2. Add to your `.mcp.json`:
```json
{
  "mcpServers": {
    "task-copilot": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcp-servers/task-copilot/dist/index.js"
      ]
    }
  }
}
```

3. Restart Claude Code

## Basic Workflow

### 1. Create a PRD

```javascript
const result = await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "prd_create",
  arguments: {
    title: "User Authentication System",
    description: "OAuth2 authentication with JWT tokens",
    content: `
# PRD: User Authentication System

## Overview
Build secure authentication using OAuth2...

## Requirements
- OAuth2 provider integration
- JWT token management
- User session handling
    `,
    metadata: {
      priority: "P0",
      complexity: "High",
      tags: ["auth", "security", "backend"]
    }
  }
});

// Returns: { id: "PRD-xxx", initiativeId: "INIT-xxx", ... }
```

### 2. Create Tasks

```javascript
// Main task
const task1 = await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "task_create",
  arguments: {
    title: "Design OAuth2 flow",
    description: "Create technical design for OAuth2 integration",
    prdId: "PRD-xxx",
    assignedAgent: "ta",
    metadata: {
      phase: "Phase 1",
      complexity: "Medium",
      acceptanceCriteria: [
        "Architecture diagram created",
        "Security reviewed",
        "API contracts defined"
      ]
    }
  }
});

// Subtask
const subtask1 = await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "task_create",
  arguments: {
    title: "Review OAuth2 providers",
    description: "Compare Auth0, Okta, and AWS Cognito",
    parentId: task1.id,
    assignedAgent: "ta"
  }
});
```

### 3. Update Task Status

```javascript
await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "task_update",
  arguments: {
    id: task1.id,
    status: "in_progress",
    notes: "Started architecture design. Reviewing OAuth2 specs."
  }
});
```

### 4. Store Work Product

```javascript
await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "work_product_store",
  arguments: {
    taskId: task1.id,
    type: "technical_design",
    title: "OAuth2 Authentication Architecture",
    content: `
# OAuth2 Authentication Architecture

## Components
- Authorization Server: AWS Cognito
- Resource Server: API Gateway
- Client Application: React SPA

## Flow
1. User initiates login...
    `,
    metadata: {
      version: "1.0",
      reviewedBy: ["sec", "ta"]
    }
  }
});
```

### 5. List Tasks

```javascript
// All tasks for a PRD
const tasks = await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "task_list",
  arguments: {
    prdId: "PRD-xxx"
  }
});

// Tasks by status
const inProgress = await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "task_list",
  arguments: {
    status: "in_progress"
  }
});

// Tasks by agent
const myTasks = await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "task_list",
  arguments: {
    assignedAgent: "me"
  }
});
```

### 6. Get Task Details

```javascript
const task = await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "task_get",
  arguments: {
    id: "TASK-xxx",
    includeSubtasks: true,
    includeWorkProducts: true
  }
});

// Returns full task with subtasks and work products
```

### 7. List Work Products

```javascript
const workProducts = await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "work_product_list",
  arguments: {
    taskId: "TASK-xxx"
  }
});

// Returns: [{ id, type, title, summary, wordCount, createdAt }, ...]
```

### 8. Get Work Product

```javascript
const wp = await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "work_product_get",
  arguments: {
    id: "WP-xxx"
  }
});

// Returns full work product with content
```

## Common Patterns

### Multi-Phase Project

```javascript
// Create PRD
const prd = await prd_create({...});

// Phase 1 tasks
await task_create({ title: "Architecture Design", prdId: prd.id, assignedAgent: "ta", metadata: { phase: "Phase 1" } });
await task_create({ title: "Security Review", prdId: prd.id, assignedAgent: "sec", metadata: { phase: "Phase 1" } });

// Phase 2 tasks
await task_create({ title: "Backend Implementation", prdId: prd.id, assignedAgent: "me", metadata: { phase: "Phase 2" } });
await task_create({ title: "Frontend Implementation", prdId: prd.id, assignedAgent: "uid", metadata: { phase: "Phase 2" } });

// Phase 3 tasks
await task_create({ title: "Integration Testing", prdId: prd.id, assignedAgent: "qa", metadata: { phase: "Phase 3" } });
```

### Task with Dependencies

```javascript
await task_create({
  title: "Deploy to production",
  prdId: prd.id,
  assignedAgent: "do",
  metadata: {
    dependencies: ["TASK-abc", "TASK-def"],
    acceptanceCriteria: [
      "All tests passing",
      "Security scan clean",
      "Performance benchmarks met"
    ]
  }
});
```

### Blocked Task

```javascript
await task_update({
  id: "TASK-xxx",
  status: "blocked",
  blockedReason: "Waiting for API credentials from vendor"
});
```

### Complete Task

```javascript
await task_update({
  id: "TASK-xxx",
  status: "completed",
  notes: "Implementation complete. All tests passing. PR merged."
});
```

## Status Values

### Task Status
- `pending` - Not started
- `in_progress` - Currently being worked on
- `blocked` - Blocked by dependency or issue
- `completed` - Finished
- `cancelled` - Abandoned

### PRD Status
- `active` - Current PRD
- `archived` - Completed PRD
- `cancelled` - Abandoned PRD

### Work Product Types
- `technical_design` - Architecture, system design
- `implementation` - Code, configuration
- `test_plan` - Test strategy, test cases
- `security_review` - Security analysis
- `documentation` - User docs, API docs
- `architecture` - Architecture decisions
- `other` - Other outputs

## Tips

1. **Use metadata extensively** - Store priority, complexity, dependencies, acceptance criteria
2. **Create subtasks** - Break down complex tasks using `parentId`
3. **Track work products** - Store all agent outputs for future reference
4. **Update task status** - Keep status current for accurate progress tracking
5. **Use assigned agents** - Track who's responsible for each task
6. **Document blocking reasons** - When blocked, explain why
7. **Add notes** - Use task notes for running commentary

## Health Check

```javascript
const health = await use_mcp_tool({
  server_name: "task-copilot",
  tool_name: "health_check",
  arguments: {}
});

// Returns: { status, workspaceId, prdCount, taskCount, completedTasks, workProductCount }
```

## Database Location

Default: `~/.claude/tasks/{workspace_id}/tasks.db`

Set `TASK_DB_PATH` environment variable to change base path.
Set `WORKSPACE_ID` to use explicit workspace identifier.
