# Activity Log Events

This document describes all event types emitted to the `activity_log` table for WebSocket bridge consumption.

## Database Schema

```sql
CREATE TABLE activity_log (
  id TEXT PRIMARY KEY,
  initiative_id TEXT NOT NULL,
  type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_type TEXT,           -- 'task' | 'prd' | 'work_product' | 'checkpoint' | 'initiative' | 'stream' | 'agent_handoff'
  summary TEXT NOT NULL,
  metadata TEXT,              -- JSON string with event-specific enrichment data
  created_at TEXT NOT NULL,
  FOREIGN KEY (initiative_id) REFERENCES initiatives(id)
);
```

## Event Types

### Task Events

#### `task_created`
**Emitted when:** A new task is created
**Entity Type:** `task`
**Metadata:**
```json
{
  "taskId": "TASK-xxx",
  "prdId": "PRD-xxx",
  "parentId": "TASK-xxx",
  "assignedAgent": "me",
  "activationMode": "ultrawork"
}
```

#### `task_updated`
**Emitted when:** Task status changes (except to `completed`)
**Entity Type:** `task`
**Metadata:**
```json
{
  "taskId": "TASK-xxx",
  "previousStatus": "pending",
  "newStatus": "in_progress",
  "assignedAgent": "me",
  "blockedReason": null
}
```

#### `task_completed`
**Emitted when:** Task status changes to `completed`
**Entity Type:** `task`
**Metadata:**
```json
{
  "taskId": "TASK-xxx",
  "previousStatus": "in_progress",
  "newStatus": "completed",
  "assignedAgent": "me",
  "blockedReason": null
}
```

### Work Product Events

#### `work_product_created`
**Emitted when:** A work product is stored
**Entity Type:** `work_product`
**Metadata:**
```json
{
  "workProductId": "WP-xxx",
  "taskId": "TASK-xxx",
  "type": "implementation",
  "title": "User authentication implementation",
  "wordCount": 1234,
  "assignedAgent": "me",
  "hasValidationWarnings": false,
  "validationFlagCount": 0
}
```

### PRD Events

#### `prd_created`
**Emitted when:** A PRD is created
**Entity Type:** `prd`
**Metadata:**
```json
{
  "prdId": "PRD-xxx",
  "title": "User Authentication System",
  "contentLength": 5678
}
```

### Checkpoint Events

#### `checkpoint_created`
**Emitted when:** A checkpoint is created (manual or automatic)
**Entity Type:** `checkpoint`
**Metadata:**
```json
{
  "checkpointId": "CP-xxx",
  "taskId": "TASK-xxx",
  "sequence": 3,
  "trigger": "manual",
  "executionPhase": "implementation",
  "executionStep": 2,
  "hasDraft": true,
  "draftType": "implementation",
  "subtaskCount": 5,
  "assignedAgent": "me",
  "isPause": true
}
```

### Initiative Events

#### `initiative_created`
**Emitted when:** A new initiative is linked
**Entity Type:** `initiative`
**Metadata:**
```json
{
  "initiativeId": "INIT-xxx",
  "title": "Authentication System",
  "isNew": true
}
```

#### `initiative_updated`
**Emitted when:** An existing initiative is updated
**Entity Type:** `initiative`
**Metadata:**
```json
{
  "initiativeId": "INIT-xxx",
  "title": "Authentication System (Updated)",
  "isNew": false
}
```

#### `initiative_archived`
**Emitted when:** An initiative is archived to file
**Entity Type:** `initiative`
**Metadata:**
```json
{
  "initiativeId": "INIT-xxx",
  "archivePath": "/path/to/archive.json",
  "archivedItemCounts": {
    "prds": 2,
    "tasks": 15,
    "workProducts": 8
  }
}
```

#### `initiative_wiped`
**Emitted when:** All data for an initiative is wiped
**Entity Type:** `initiative`
**Metadata:**
```json
{
  "initiativeId": "INIT-xxx",
  "deletedCounts": {
    "prds": 2,
    "tasks": 15,
    "workProducts": 8,
    "activityLogs": 50
  }
}
```

### Stream Events

#### `stream_unarchived`
**Emitted when:** An archived stream is restored
**Entity Type:** `stream`
**Metadata:**
```json
{
  "streamId": "Stream-A",
  "tasksUnarchived": 8,
  "targetInitiativeId": "INIT-xxx"
}
```

#### `stream_archive_all`
**Emitted when:** All streams are bulk archived
**Entity Type:** `stream`
**Metadata:**
```json
{
  "streamsArchived": 3,
  "tasksArchived": 25,
  "targetInitiativeId": "INIT-xxx"
}
```

#### `streams_auto_archived`
**Emitted when:** Streams are auto-archived due to initiative switch
**Entity Type:** `initiative`
**Metadata:**
```json
{
  "archivedStreamsCount": 2,
  "previousInitiativeId": "INIT-old",
  "newInitiativeId": "INIT-new"
}
```

### Agent Handoff Events

#### `agent_handoff`
**Emitted when:** An agent hands off a task to another agent
**Entity Type:** `agent_handoff`
**Metadata:**
```json
{
  "handoffId": "HO-xxx",
  "taskId": "TASK-xxx",
  "fromAgent": "ta",
  "toAgent": "me",
  "chainPosition": 2,
  "chainLength": 3,
  "context": "Implementation ready after design review"
}
```

## Usage for WebSocket Bridge

The WebSocket bridge should poll the `activity_log` table for new events and:

1. **Filter by initiative**: Use `initiative_id` to scope to current workspace
2. **Parse metadata**: All `metadata` fields are JSON strings - parse before enrichment
3. **Enrich events**: Use `entity_type` to fetch additional details:
   - `task` → Query `tasks` table by `entity_id`
   - `work_product` → Query `work_products` table by `entity_id`
   - `prd` → Query `prds` table by `entity_id`
   - `checkpoint` → Query `checkpoints` table by `entity_id`

4. **Timestamp filtering**: Use `created_at` for polling (get events after last poll timestamp)

### Example Query

```sql
SELECT * FROM activity_log
WHERE initiative_id = ?
  AND created_at > ?
ORDER BY created_at ASC
LIMIT 100;
```

### Example Event Processing

```typescript
for (const event of events) {
  const metadata = JSON.parse(event.metadata || '{}');

  // Enrich based on entity_type
  let enrichedData = {};
  switch (event.entity_type) {
    case 'task':
      enrichedData = await fetchTaskDetails(event.entity_id);
      break;
    case 'work_product':
      enrichedData = await fetchWorkProductDetails(event.entity_id);
      break;
    // ... etc
  }

  // Emit to WebSocket clients
  websocket.broadcast({
    type: event.type,
    entityType: event.entity_type,
    entityId: event.entity_id,
    summary: event.summary,
    metadata,
    enrichedData,
    timestamp: event.created_at
  });
}
```

## Key Events for Dashboard

Most important events for real-time dashboard updates:

1. **`task_created`** - New work started
2. **`task_updated`** - Progress on task (especially `→ in_progress`)
3. **`task_completed`** - Task finished
4. **`work_product_created`** - Agent output available
5. **`checkpoint_created`** - Progress saved (useful for pause/resume indicators)

## Migration Notes

The schema was updated to add `entity_type` and `metadata` columns. Existing databases will need migration:

```sql
ALTER TABLE activity_log ADD COLUMN entity_type TEXT;
ALTER TABLE activity_log ADD COLUMN metadata TEXT;
```

Existing activity log entries will have `entity_type = NULL` and `metadata = NULL`, but all new events will populate these fields.
