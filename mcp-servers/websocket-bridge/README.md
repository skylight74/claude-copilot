# WebSocket Bridge Service

Real-time event streaming service for Task Copilot activity log.

## Overview

The WebSocket Bridge connects Task Copilot's SQLite database to WebSocket clients, providing real-time updates on tasks, work products, and progress changes. It polls the `activity_log` table and broadcasts events to subscribed clients.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│  Task Copilot   │         │  WebSocket       │         │   Clients    │
│  (SQLite DB)    │────────▶│    Bridge        │────────▶│  (Browser,   │
│                 │ Poll    │                  │ Stream  │   Mobile)    │
│  activity_log   │ 100ms   │  Event Mapper    │         │              │
└─────────────────┘         └──────────────────┘         └──────────────┘
```

### Components

| Component | Purpose |
|-----------|---------|
| **EventPoller** | Polls SQLite `activity_log` every 100ms |
| **WatermarkTracker** | Tracks last seen event ID to avoid duplicates |
| **ConnectionManager** | Manages WebSocket connections and JWT auth |
| **SubscriptionManager** | Routes events to subscribed clients by initiativeId |
| **EventMapper** | Enriches activity_log with task/work_product details |

## Event Types

Events are broadcast to clients subscribed to the corresponding initiative:

| Event Type | Trigger | Payload |
|------------|---------|---------|
| `task.create` | New task created | `{ taskId, title, status, assignedAgent, prdId }` |
| `task.update` | Task status/notes changed | `{ taskId, title, status, assignedAgent, prdId }` |
| `task.complete` | Task marked completed | `{ taskId, title, status, assignedAgent, prdId }` |
| `work_product.store` | Work product saved | `{ workProductId, taskId, type, title }` |
| `prd.create` | PRD created | `{ prdId, title, status }` |
| `prd.update` | PRD updated | `{ prdId, title, status }` |

## Setup

### 1. Install Dependencies

```bash
cd mcp-servers/websocket-bridge
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Configure Environment

Create a `.env` file or set environment variables:

```bash
# Required
JWT_SECRET="your-secret-key-here"
WORKSPACE_ID="abc123def456"  # From Task Copilot

# Optional
WS_PORT=8765                 # Default: 8765
POLL_INTERVAL=100            # Default: 100ms
HEARTBEAT_INTERVAL=30000     # Default: 30s
TASK_DB_PATH="~/.claude/tasks"  # Default: ~/.claude/tasks
```

**Getting WORKSPACE_ID:**
- Run `task_list` in Task Copilot MCP server
- The workspace ID is part of the database path shown in logs
- Or check `~/.claude/tasks/` directory for folder names

### 4. Start Service

```bash
npm start
```

Or run directly:

```bash
JWT_SECRET="secret" WORKSPACE_ID="abc123" node dist/index.js
```

## Client Usage

### 1. Generate JWT Token

Clients need a JWT token with `initiativeId` claim:

```javascript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { initiativeId: 'INIT-123' },
  'your-secret-key',
  { expiresIn: '24h' }
);
```

### 2. Connect to WebSocket

```javascript
const ws = new WebSocket(`ws://localhost:8765?token=${token}`);

ws.onopen = () => {
  console.log('Connected to Task Copilot stream');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected');
};
```

### 3. Subscribe to Additional Initiatives (Optional)

```javascript
// Auto-subscribed to token's initiativeId on connect
// Manually subscribe to others:
ws.send(JSON.stringify({
  type: 'subscribe',
  initiativeId: 'INIT-456'
}));

// Unsubscribe
ws.send(JSON.stringify({
  type: 'unsubscribe',
  initiativeId: 'INIT-456'
}));
```

### 4. Heartbeat (Optional)

```javascript
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 30000);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'pong') {
    console.log('Server alive:', data.timestamp);
  }
};
```

## Event Examples

### Task Created

```json
{
  "id": "activity-123",
  "type": "task.create",
  "initiativeId": "INIT-abc123",
  "timestamp": "2026-01-07T10:30:00.000Z",
  "data": {
    "taskId": "TASK-456",
    "title": "Implement login endpoint",
    "status": "pending",
    "assignedAgent": "agent-me",
    "prdId": "PRD-789"
  }
}
```

### Work Product Stored

```json
{
  "id": "activity-124",
  "type": "work_product.store",
  "initiativeId": "INIT-abc123",
  "timestamp": "2026-01-07T10:35:00.000Z",
  "data": {
    "workProductId": "WP-111",
    "taskId": "TASK-456",
    "type": "implementation",
    "title": "Login Endpoint Implementation"
  }
}
```

### Task Completed

```json
{
  "id": "activity-125",
  "type": "task.complete",
  "initiativeId": "INIT-abc123",
  "timestamp": "2026-01-07T10:40:00.000Z",
  "data": {
    "taskId": "TASK-456",
    "title": "Implement login endpoint",
    "status": "completed",
    "assignedAgent": "agent-me",
    "prdId": "PRD-789"
  }
}
```

## Security

- **JWT Authentication**: Required on connection
- **Initiative Isolation**: Clients only receive events for subscribed initiatives
- **Token Expiry**: Set appropriate `expiresIn` when generating tokens
- **Read-Only Database**: Poller uses SQLite in read-only mode

## Performance

- **Poll Interval**: 100ms default (configurable)
- **Watermark Tracking**: Prevents duplicate event processing
- **Memory Management**: Seen IDs limited to 1000 entries (auto-cleanup)
- **Heartbeat**: 30s default (auto-disconnects stale clients after 60s)

## Monitoring

Server logs:
- Connection attempts and authentication results
- Event broadcast counts
- Active connection stats (every 60s)
- Stale connection cleanup

## Development

### Run in Dev Mode

```bash
npm run dev  # Watch mode with auto-rebuild
```

### Lint

```bash
npm run lint
```

## Troubleshooting

### No Events Received

1. Check `activity_log` table has entries:
   ```sql
   SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10;
   ```

2. Verify WORKSPACE_ID matches Task Copilot:
   ```bash
   ls ~/.claude/tasks/
   ```

3. Check JWT token has correct `initiativeId`

### Authentication Failed

- Verify JWT_SECRET matches between server and token generation
- Check token hasn't expired
- Ensure token includes `initiativeId` claim

### Connection Timeout

- Check heartbeat interval settings
- Ensure client sends periodic pings
- Verify network stability

## Architecture Notes

### Why Polling?

- **Simplicity**: No changes to Task Copilot schema
- **Reliability**: SQLite doesn't support native triggers/notifications
- **Performance**: 100ms poll interval is negligible for SQLite reads
- **Decoupling**: Bridge can restart without affecting Task Copilot

### Why JWT?

- **Stateless**: No session storage needed
- **Initiative Isolation**: Token binds client to specific initiative
- **Standard**: Works with any JWT library
- **Flexible**: Can add custom claims (permissions, expiry)

### Watermark Strategy

The watermark tracks `activity_log.id` (which is a UUID, not sequential). The poller:

1. Sorts by `id ASC` to maintain consistent ordering
2. Tracks last seen ID and a set of recently seen IDs
3. Filters out already-processed events (duplicate protection)
4. Limits memory by capping seen set to 1000 entries

This ensures **exactly-once delivery** even if poll cycles overlap.

## Future Enhancements

Potential improvements (not in scope for v1):

- [ ] Binary protocol (MessagePack/Protobuf) for efficiency
- [ ] Event batching (send multiple events per message)
- [ ] Backpressure handling (slow clients)
- [ ] Metrics export (Prometheus/OpenTelemetry)
- [ ] Multi-database support (multiple workspaces)
- [ ] Event filtering (client-side subscriptions to specific event types)
- [ ] Replay support (send historical events on connect)

## License

MIT
