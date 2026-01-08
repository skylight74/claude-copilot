# WebSocket Bridge Architecture for Task Copilot

**Version:** 1.0
**Status:** Design
**Created:** 2026-01-08
**Author:** @agent-ta

---

## Executive Summary

Add real-time event streaming to Task Copilot via WebSocket bridge, eliminating polling overhead for external orchestration tools while maintaining backward compatibility with existing HTTP REST API.

**Key Decisions:**
- Use `ws` library alongside Fastify HTTP server (same port 9090)
- Topic-based subscription model (streams, tasks, checkpoints, agents)
- JSON message format with event types
- Graceful degradation to HTTP polling if WebSocket unavailable
- No authentication initially (localhost-only, same security model as HTTP API)

---

## 1. Architecture Overview

### 1.1 System Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Task Copilot MCP Server                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    HTTP Server (Fastify)                    │ │
│  │  Port: 9090                                                 │ │
│  │  Routes: /api/streams, /api/tasks, /api/checkpoints, etc.  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ▲                                   │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │            WebSocket Server (ws library)                    │ │
│  │  Path: ws://127.0.0.1:9090/ws                             │ │
│  │  Protocol: JSON-RPC style messages                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ▲                                   │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Event Bus (Internal)                       │ │
│  │  - task.updated                                             │ │
│  │  - stream.progress                                          │ │
│  │  - checkpoint.created                                       │ │
│  │  - agent.handoff                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ▲                                   │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Database Layer (SQLite)                        │ │
│  │  Tables: tasks, streams, checkpoints, agent_activity        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Orchestration Tools (Python)               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  WebSocket Client (primary, real-time)                      │ │
│  │  - Subscribe to streams                                     │ │
│  │  - Receive live progress updates                            │ │
│  │  - React to checkpoint/agent events                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  HTTP Client (fallback, polling)                            │ │
│  │  - Poll REST endpoints every 30s                            │ │
│  │  - Same data format as WebSocket                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Event Bus** | Internal pub/sub system, emits events when database changes |
| **WebSocket Server** | Manages connections, subscriptions, broadcasts events |
| **HTTP Server** | Existing REST API, unchanged behavior |
| **Database Layer** | Emits events on INSERT/UPDATE operations |
| **Python SDK** | Consumes WebSocket or falls back to HTTP polling |

---

## 2. Event Types and Message Schema

### 2.1 WebSocket Message Format

All messages use JSON format with consistent structure:

```typescript
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'event' | 'error' | 'ping' | 'pong';
  id?: string;              // Client-generated request ID
  timestamp: string;        // ISO 8601 timestamp
  payload: MessagePayload;  // Type-specific payload
}

interface SubscribePayload {
  topics: string[];  // e.g., ["stream:Stream-A", "task:*", "checkpoint:*"]
}

interface EventPayload {
  topic: string;        // e.g., "stream:Stream-A"
  eventType: string;    // e.g., "progress", "completed", "blocked"
  data: EventData;      // Type-specific event data
}

interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

### 2.2 Event Types by Domain

#### Stream Events

| Event Type | Topic Pattern | Data Schema | Trigger |
|------------|---------------|-------------|---------|
| `stream.progress` | `stream:{streamId}` | `StreamProgressData` | Task status changed within stream |
| `stream.completed` | `stream:{streamId}` | `StreamCompletedData` | All tasks in stream completed |
| `stream.blocked` | `stream:{streamId}` | `StreamBlockedData` | Stream blocked (dependency or task) |
| `stream.started` | `stream:{streamId}` | `StreamStartedData` | First task in stream started |

```typescript
interface StreamProgressData {
  streamId: string;
  streamName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  progressPercentage: number;
  lastUpdated: string;
}

interface StreamCompletedData {
  streamId: string;
  streamName: string;
  totalTasks: number;
  completedAt: string;
  duration: number; // milliseconds
}

interface StreamBlockedData {
  streamId: string;
  streamName: string;
  blockedReason: string;
  blockedTaskIds: string[];
}
```

#### Task Events

| Event Type | Topic Pattern | Data Schema | Trigger |
|------------|---------------|-------------|---------|
| `task.created` | `task:{taskId}` | `TaskCreatedData` | task_create() called |
| `task.updated` | `task:{taskId}` | `TaskUpdatedData` | task_update() called |
| `task.status_changed` | `task:{taskId}` | `TaskStatusData` | Status field changed |
| `task.blocked` | `task:{taskId}` | `TaskBlockedData` | Status changed to 'blocked' |
| `task.completed` | `task:{taskId}` | `TaskCompletedData` | Status changed to 'completed' |

```typescript
interface TaskUpdatedData {
  taskId: string;
  taskTitle: string;
  status: TaskStatus;
  assignedAgent?: string;
  streamId?: string;
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  updatedAt: string;
}

interface TaskStatusData {
  taskId: string;
  taskTitle: string;
  oldStatus: TaskStatus;
  newStatus: TaskStatus;
  statusChangedAt: string;
}
```

#### Checkpoint Events

| Event Type | Topic Pattern | Data Schema | Trigger |
|------------|---------------|-------------|---------|
| `checkpoint.created` | `checkpoint:{taskId}` | `CheckpointCreatedData` | checkpoint_create() called |
| `checkpoint.resumed` | `checkpoint:{taskId}` | `CheckpointResumedData` | checkpoint_resume() called |
| `checkpoint.expired` | `checkpoint:{checkpointId}` | `CheckpointExpiredData` | Expiry time reached |

```typescript
interface CheckpointCreatedData {
  checkpointId: string;
  taskId: string;
  taskTitle: string;
  sequence: number;
  trigger: CheckpointTrigger;
  executionPhase?: string;
  executionStep?: number;
  hasDraft: boolean;
  expiresAt: string | null;
  createdAt: string;
}
```

#### Agent Events

| Event Type | Topic Pattern | Data Schema | Trigger |
|------------|---------------|-------------|---------|
| `agent.handoff` | `agent:{fromAgent}` | `AgentHandoffData` | agent_handoff() called |
| `agent.started` | `agent:{agentId}` | `AgentActivityData` | Agent activity logged |
| `agent.heartbeat` | `agent:{agentId}` | `AgentHeartbeatData` | Heartbeat timestamp updated |
| `agent.completed` | `agent:{agentId}` | `AgentCompletedData` | Agent activity marked complete |

```typescript
interface AgentHandoffData {
  handoffId: string;
  taskId: string;
  fromAgent: string;
  toAgent: string;
  chainPosition: number;
  chainLength: number;
  handoffContext: string; // 50-char context
  workProductId: string;
  handoffAt: string;
}

interface AgentActivityData {
  streamId: string;
  streamName: string;
  agentId: string;
  agentName: string;
  taskId: string;
  taskTitle: string;
  activityDescription?: string;
  phase?: string;
  startedAt: string;
}
```

---

## 3. Subscription Protocol

### 3.1 Topic Patterns

Clients subscribe using glob-style patterns:

| Pattern | Matches | Example |
|---------|---------|---------|
| `stream:Stream-A` | Specific stream | All events for Stream-A |
| `stream:*` | All streams | All stream events |
| `task:TASK-123` | Specific task | All events for TASK-123 |
| `task:*` | All tasks | All task events |
| `checkpoint:*` | All checkpoints | All checkpoint events |
| `agent:*` | All agents | All agent events |
| `*` | Everything | All events (use cautiously) |

### 3.2 Subscription Lifecycle

```typescript
// 1. Client connects
ws = new WebSocket('ws://127.0.0.1:9090/ws');

// 2. Client subscribes
ws.send(JSON.stringify({
  type: 'subscribe',
  id: 'sub-1',
  timestamp: new Date().toISOString(),
  payload: {
    topics: ['stream:Stream-A', 'task:*']
  }
}));

// 3. Server confirms subscription
{
  type: 'subscribed',
  id: 'sub-1',
  timestamp: '2026-01-08T12:00:00Z',
  payload: {
    topics: ['stream:Stream-A', 'task:*'],
    activeSubscriptions: 2
  }
}

// 4. Server sends events
{
  type: 'event',
  timestamp: '2026-01-08T12:00:30Z',
  payload: {
    topic: 'stream:Stream-A',
    eventType: 'stream.progress',
    data: {
      streamId: 'Stream-A',
      streamName: 'foundation',
      totalTasks: 4,
      completedTasks: 1,
      progressPercentage: 25.0
    }
  }
}

// 5. Client unsubscribes (optional)
ws.send(JSON.stringify({
  type: 'unsubscribe',
  id: 'unsub-1',
  timestamp: new Date().toISOString(),
  payload: {
    topics: ['task:*']
  }
}));

// 6. Connection closes
ws.close();
```

### 3.3 Keepalive Protocol

| Message | Direction | Interval | Purpose |
|---------|-----------|----------|---------|
| `ping` | Server → Client | 30s | Check connection alive |
| `pong` | Client → Server | On ping | Confirm connection alive |

```typescript
// Server sends ping
{
  type: 'ping',
  timestamp: '2026-01-08T12:00:00Z',
  payload: {}
}

// Client responds with pong
{
  type: 'pong',
  timestamp: '2026-01-08T12:00:00Z',
  payload: {}
}
```

---

## 4. Implementation Architecture

### 4.1 New Files to Create

```
mcp-servers/task-copilot/src/
├── websocket-server.ts          # WebSocket server setup
├── event-bus.ts                 # Internal event emitter
├── websocket/
│   ├── connection-manager.ts    # Manages WS connections
│   ├── subscription-manager.ts  # Manages topic subscriptions
│   ├── event-broadcaster.ts     # Broadcasts events to subscribers
│   └── message-handler.ts       # Handles incoming WS messages
└── events/
    ├── stream-events.ts         # Stream event emitters
    ├── task-events.ts           # Task event emitters
    ├── checkpoint-events.ts     # Checkpoint event emitters
    └── agent-events.ts          # Agent event emitters
```

### 4.2 Modifications to Existing Files

| File | Changes Required |
|------|------------------|
| `src/http-server.ts` | Add WebSocket server initialization, mount on same HTTP server |
| `src/tools/task.ts` | Emit events on task create/update |
| `src/tools/stream.ts` | Calculate and emit stream progress events |
| `src/tools/checkpoint.ts` | Emit events on checkpoint create/resume |
| `src/tools/agent-handoff.ts` | Emit events on handoff |
| `src/database.ts` | Add event bus reference for row-level triggers |

### 4.3 Event Bus Pattern

```typescript
// event-bus.ts
import { EventEmitter } from 'events';

export class TaskCopilotEventBus extends EventEmitter {
  // Stream events
  emitStreamProgress(streamId: string, data: StreamProgressData): void;
  emitStreamCompleted(streamId: string, data: StreamCompletedData): void;
  emitStreamBlocked(streamId: string, data: StreamBlockedData): void;

  // Task events
  emitTaskCreated(taskId: string, data: TaskCreatedData): void;
  emitTaskUpdated(taskId: string, data: TaskUpdatedData): void;
  emitTaskStatusChanged(taskId: string, data: TaskStatusData): void;

  // Checkpoint events
  emitCheckpointCreated(taskId: string, data: CheckpointCreatedData): void;
  emitCheckpointResumed(taskId: string, data: CheckpointResumedData): void;

  // Agent events
  emitAgentHandoff(fromAgent: string, data: AgentHandoffData): void;
  emitAgentActivity(agentId: string, data: AgentActivityData): void;
}

export const eventBus = new TaskCopilotEventBus();
```

### 4.4 Integration Points

**Task Tools (`src/tools/task.ts`)**
```typescript
export async function taskUpdate(db: DatabaseClient, input: TaskUpdateInput) {
  // Existing update logic
  const result = await db.updateTask(input);

  // NEW: Emit event
  eventBus.emitTaskUpdated(input.id, {
    taskId: input.id,
    taskTitle: result.title,
    status: result.status,
    changes: calculateChanges(oldTask, result),
    updatedAt: result.updatedAt
  });

  // NEW: If status changed, emit status event + recalculate stream
  if (oldTask.status !== result.status) {
    eventBus.emitTaskStatusChanged(input.id, { /* ... */ });

    // Trigger stream progress recalculation
    if (result.metadata.streamId) {
      await recalculateStreamProgress(db, result.metadata.streamId);
    }
  }

  return result;
}

async function recalculateStreamProgress(db: DatabaseClient, streamId: string) {
  const streamInfo = await db.getStreamInfo(streamId);

  eventBus.emitStreamProgress(streamId, {
    streamId,
    streamName: streamInfo.streamName,
    totalTasks: streamInfo.totalTasks,
    completedTasks: streamInfo.completedTasks,
    inProgressTasks: streamInfo.inProgressTasks,
    blockedTasks: streamInfo.blockedTasks,
    progressPercentage: (streamInfo.completedTasks / streamInfo.totalTasks) * 100,
    lastUpdated: new Date().toISOString()
  });
}
```

---

## 5. Python SDK Updates

### 5.1 WebSocket Client Class

```python
# task_copilot_client.py

import json
import time
import threading
from typing import Callable, Dict, List, Optional
from datetime import datetime

try:
    import websocket
    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False
    print("Warning: websocket-client not installed, falling back to HTTP polling")

import requests


class TaskCopilotClient:
    """
    Client for Task Copilot with WebSocket support and HTTP fallback.

    Usage:
        client = TaskCopilotClient()

        # Subscribe to events (WebSocket mode)
        client.subscribe(['stream:Stream-A'], on_stream_progress)

        # Or use HTTP polling (fallback)
        status = client.get_stream_status('Stream-A')
    """

    def __init__(
        self,
        api_base: str = "http://127.0.0.1:9090",
        use_websocket: bool = True,
        poll_interval: int = 30
    ):
        self.api_base = api_base
        self.ws_url = api_base.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws'
        self.use_websocket = use_websocket and WEBSOCKET_AVAILABLE
        self.poll_interval = poll_interval

        self.ws: Optional[websocket.WebSocketApp] = None
        self.subscriptions: Dict[str, List[Callable]] = {}
        self.ws_thread: Optional[threading.Thread] = None
        self.connected = False

        # Fallback: polling thread
        self.polling_thread: Optional[threading.Thread] = None
        self.polling_active = False

    def connect(self) -> bool:
        """Connect to WebSocket or start HTTP polling."""
        if self.use_websocket:
            return self._connect_websocket()
        else:
            return self._start_polling()

    def _connect_websocket(self) -> bool:
        """Establish WebSocket connection."""
        try:
            self.ws = websocket.WebSocketApp(
                self.ws_url,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close,
                on_open=self._on_open
            )

            self.ws_thread = threading.Thread(
                target=self.ws.run_forever,
                daemon=True
            )
            self.ws_thread.start()

            # Wait for connection
            timeout = 5
            start = time.time()
            while not self.connected and (time.time() - start) < timeout:
                time.sleep(0.1)

            if self.connected:
                print("✓ WebSocket connected")
                return True
            else:
                print("✗ WebSocket connection timeout, falling back to HTTP polling")
                return self._start_polling()

        except Exception as e:
            print(f"✗ WebSocket error: {e}, falling back to HTTP polling")
            return self._start_polling()

    def subscribe(
        self,
        topics: List[str],
        callback: Callable[[str, str, Dict], None]
    ):
        """
        Subscribe to topics.

        Args:
            topics: List of topic patterns (e.g., ['stream:Stream-A', 'task:*'])
            callback: Function(topic, eventType, data) called on events
        """
        for topic in topics:
            if topic not in self.subscriptions:
                self.subscriptions[topic] = []
            self.subscriptions[topic].append(callback)

        if self.use_websocket and self.connected:
            # Send subscribe message
            self.ws.send(json.dumps({
                'type': 'subscribe',
                'id': f'sub-{int(time.time())}',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'payload': {
                    'topics': topics
                }
            }))

    def _on_message(self, ws, message: str):
        """Handle incoming WebSocket message."""
        try:
            msg = json.loads(message)

            if msg['type'] == 'event':
                topic = msg['payload']['topic']
                event_type = msg['payload']['eventType']
                data = msg['payload']['data']

                # Call matching subscriptions
                for pattern, callbacks in self.subscriptions.items():
                    if self._topic_matches(topic, pattern):
                        for callback in callbacks:
                            callback(topic, event_type, data)

            elif msg['type'] == 'ping':
                # Respond with pong
                ws.send(json.dumps({
                    'type': 'pong',
                    'timestamp': datetime.utcnow().isoformat() + 'Z',
                    'payload': {}
                }))

        except Exception as e:
            print(f"Error handling message: {e}")

    def _topic_matches(self, topic: str, pattern: str) -> bool:
        """Check if topic matches subscription pattern."""
        if pattern == '*':
            return True

        if pattern.endswith('*'):
            prefix = pattern[:-1]
            return topic.startswith(prefix)

        return topic == pattern

    def _on_open(self, ws):
        """WebSocket connection opened."""
        self.connected = True

    def _on_error(self, ws, error):
        """WebSocket error occurred."""
        print(f"WebSocket error: {error}")

    def _on_close(self, ws, close_status_code, close_msg):
        """WebSocket connection closed."""
        self.connected = False
        print("WebSocket connection closed")

    # HTTP fallback methods
    def _start_polling(self) -> bool:
        """Start HTTP polling thread."""
        self.polling_active = True
        self.polling_thread = threading.Thread(
            target=self._poll_loop,
            daemon=True
        )
        self.polling_thread.start()
        print(f"✓ HTTP polling started (interval: {self.poll_interval}s)")
        return True

    def _poll_loop(self):
        """Poll HTTP API for updates."""
        last_state = {}

        while self.polling_active:
            try:
                # Poll subscribed topics
                for topic_pattern in self.subscriptions.keys():
                    if topic_pattern.startswith('stream:'):
                        stream_id = topic_pattern.split(':')[1]
                        if stream_id != '*':
                            self._poll_stream(stream_id, last_state)

                    elif topic_pattern.startswith('task:'):
                        task_id = topic_pattern.split(':')[1]
                        if task_id != '*':
                            self._poll_task(task_id, last_state)

                time.sleep(self.poll_interval)

            except Exception as e:
                print(f"Polling error: {e}")
                time.sleep(self.poll_interval)

    def _poll_stream(self, stream_id: str, last_state: Dict):
        """Poll stream status and emit synthetic events."""
        try:
            resp = requests.get(
                f"{self.api_base}/api/streams/{stream_id}",
                timeout=10
            )
            resp.raise_for_status()
            data = resp.json()

            # Detect changes and emit events
            key = f'stream:{stream_id}'
            if key not in last_state or last_state[key] != data:
                # Emit progress event
                for callbacks in self.subscriptions.get(f'stream:{stream_id}', []):
                    callbacks(
                        f'stream:{stream_id}',
                        'stream.progress',
                        {
                            'streamId': stream_id,
                            'streamName': data['streamName'],
                            'totalTasks': data['tasks'],
                            'completedTasks': len([t for t in data.get('taskList', []) if t['status'] == 'completed']),
                            'progressPercentage': data.get('progress', 0)
                        }
                    )

                last_state[key] = data

        except Exception as e:
            print(f"Error polling stream {stream_id}: {e}")

    def disconnect(self):
        """Disconnect WebSocket or stop polling."""
        if self.ws:
            self.ws.close()
        self.polling_active = False
```

### 5.2 Integration with Orchestrator

```python
# start-streams.py updates

from task_copilot_client import TaskCopilotClient

# Initialize client with WebSocket support
client = TaskCopilotClient(
    api_base=config['apiBaseUrl'],
    use_websocket=True,
    poll_interval=config.get('pollInterval', 30)
)

# Connect (auto-falls back to polling if WS unavailable)
if not client.connect():
    print("Warning: Could not connect to Task Copilot")
    sys.exit(1)

# Subscribe to stream progress
def on_stream_progress(topic: str, event_type: str, data: dict):
    stream_id = data['streamId']
    progress = data['progressPercentage']
    print(f"Stream {stream_id}: {progress:.1f}% complete")

    # Check if dependencies satisfied
    if progress == 100.0:
        trigger_dependent_streams(stream_id)

for stream in config['streams']:
    client.subscribe([f"stream:{stream['streamId']}"], on_stream_progress)

# Subscribe to task status changes
def on_task_status(topic: str, event_type: str, data: dict):
    task_id = data['taskId']
    new_status = data['newStatus']

    if new_status == 'blocked':
        print(f"⚠ Task {task_id} blocked")
        send_notification(f"Task blocked: {data['taskTitle']}")

client.subscribe(['task:*'], on_task_status)

# Keep script running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\nShutting down...")
    client.disconnect()
```

---

## 6. Graceful Degradation Strategy

### 6.1 Connection Detection

```python
class TaskCopilotClient:
    def __init__(self, api_base: str, prefer_websocket: bool = True):
        self.mode = None  # 'websocket' or 'http'

        if prefer_websocket:
            # Try WebSocket first
            if self._test_websocket():
                self.mode = 'websocket'
                self._connect_websocket()
            else:
                self.mode = 'http'
                self._start_polling()
        else:
            self.mode = 'http'
            self._start_polling()

    def _test_websocket(self) -> bool:
        """Quick connectivity test."""
        try:
            # Test HTTP endpoint first
            resp = requests.get(f"{self.api_base}/health", timeout=2)
            if resp.status_code != 200:
                return False

            # Test WebSocket upgrade
            ws = websocket.create_connection(self.ws_url, timeout=2)
            ws.close()
            return True
        except Exception:
            return False
```

### 6.2 Fallback Behavior Matrix

| Scenario | WebSocket | HTTP Fallback | User Experience |
|----------|-----------|---------------|-----------------|
| WS unavailable at start | Not connected | Polling starts | ~30s latency, works |
| WS disconnects mid-run | Reconnect 3x | Switch to polling | Brief interruption, then ~30s latency |
| HTTP unavailable | N/A | Error + exit | Cannot operate |
| Both unavailable | N/A | Error + exit | Cannot operate |

---

## 7. Performance Considerations

### 7.1 Scalability Limits

| Metric | Target | Reasoning |
|--------|--------|-----------|
| Max concurrent WS connections | 100 | Localhost-only, orchestration + monitoring tools |
| Max subscriptions per client | 50 | Reasonable for multi-stream orchestration |
| Event broadcast latency | <100ms | Real-time feel for progress updates |
| Message queue size | 1000 events | Burst tolerance for rapid task updates |

### 7.2 Memory Impact

**Without WebSocket (current):**
- Python client polls every 30s
- Each poll fetches full stream/task state (~2-5KB per stream)
- Memory: Polling thread + HTTP client (~1MB)

**With WebSocket:**
- Persistent connection (~10KB per client)
- Event messages (avg ~500 bytes each)
- Subscription manager (~50KB for 100 clients)
- Total overhead: ~1.5MB for 100 clients

**Conclusion:** Minimal memory impact, massive reduction in polling overhead.

### 7.3 Network Traffic Reduction

| Mode | Traffic Pattern | Bandwidth |
|------|-----------------|-----------|
| HTTP Polling (current) | 30s interval, full state | ~200KB/min per stream |
| WebSocket Events | On-change only | ~10KB/min per stream |
| **Reduction** | **95% less traffic** | **190KB/min saved** |

---

## 8. Security Considerations

### 8.1 Current Security Model

Task Copilot HTTP API:
- Localhost-only binding (127.0.0.1)
- No authentication
- No encryption (HTTP, not HTTPS)

**Rationale:** MCP servers run locally, same trust domain as Claude Code.

### 8.2 WebSocket Security

**Phase 1 (this design):**
- Same security model as HTTP API
- Localhost-only WebSocket binding
- No authentication required
- No encryption (ws://, not wss://)

**Phase 2 (future, if needed):**
- Token-based authentication (optional)
- TLS support (wss://) (optional)
- Origin validation (optional)

**Decision:** Match existing HTTP API security model for consistency.

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Component | Test Coverage |
|-----------|--------------|
| Event Bus | Emit events, verify subscribers called |
| Subscription Manager | Add/remove subscriptions, pattern matching |
| Connection Manager | Connect/disconnect, keepalive |
| Event Broadcaster | Fan-out to multiple clients |

### 9.2 Integration Tests

| Test Scenario | Expected Behavior |
|---------------|-------------------|
| Task update → WS event | Update task via MCP tool, verify WS clients receive event |
| Stream progress calculation | Complete task, verify stream progress event emitted |
| Checkpoint creation | Create checkpoint, verify event with correct sequence number |
| Agent handoff | Record handoff, verify both agents receive events |
| Client disconnect | Client disconnects, subscriptions cleaned up |
| Fallback to HTTP | WS unavailable, Python client uses polling |

### 9.3 Load Tests

| Scenario | Target | Metric |
|----------|--------|--------|
| 10 concurrent clients | <100ms latency | Event delivery time |
| 100 events/sec | No message loss | All events delivered |
| 1000 subscriptions | <50ms | Subscription pattern matching |

---

## 10. Implementation Plan

### Phase 1: Foundation (Complexity: High)

**Tasks:**
1. Create event bus infrastructure (`event-bus.ts`)
2. Create WebSocket server setup (`websocket-server.ts`)
3. Create connection manager (`websocket/connection-manager.ts`)
4. Create subscription manager (`websocket/subscription-manager.ts`)
5. Integrate WebSocket with HTTP server (`http-server.ts`)
6. Add unit tests for event bus and managers

**Acceptance Criteria:**
- WebSocket server starts on same port as HTTP (9090)
- Clients can connect and subscribe to topics
- Ping/pong keepalive works
- Subscription pattern matching works

---

### Phase 2: Event Emitters (Complexity: Medium)

**Tasks:**
1. Add task event emitters (`events/task-events.ts`)
2. Add stream event emitters (`events/stream-events.ts`)
3. Add checkpoint event emitters (`events/checkpoint-events.ts`)
4. Add agent event emitters (`events/agent-events.ts`)
5. Integrate emitters with existing tools (task.ts, stream.ts, etc.)
6. Add integration tests for event emission

**Acceptance Criteria:**
- Task updates emit events to subscribed clients
- Stream progress calculated on task completion
- Checkpoint/agent events emitted correctly
- Events contain correct data schemas

---

### Phase 3: Python SDK (Complexity: Medium)

**Tasks:**
1. Create Python WebSocket client class (`task_copilot_client.py`)
2. Implement subscription management
3. Implement HTTP fallback logic
4. Update orchestration template to use new client
5. Add reconnection logic with exponential backoff
6. Add Python tests for client

**Acceptance Criteria:**
- Python client connects to WebSocket
- Falls back to HTTP polling if WS unavailable
- Can subscribe to topics and receive events
- Gracefully handles disconnection

---

### Phase 4: Integration & Testing (Complexity: Low)

**Tasks:**
1. End-to-end test with orchestration script
2. Load testing with multiple clients
3. Failure mode testing (disconnect, reconnect)
4. Documentation updates (README, API docs)
5. Example orchestration script with WebSocket

**Acceptance Criteria:**
- Orchestrator receives real-time updates
- No message loss under normal conditions
- Graceful degradation to polling works
- Performance meets targets (<100ms latency)

---

## 11. Open Questions

| Question | Options | Recommendation |
|----------|---------|----------------|
| Should we add authentication? | Yes (token-based) / No (trust localhost) | **No** - match HTTP API security model initially |
| Message persistence? | Yes (queue missed events) / No (live only) | **No** - clients can query HTTP API for current state |
| Compression? | Yes (gzip) / No | **No** - localhost, minimal traffic |
| Event history? | Yes (retain N events) / No | **No** - use activity log via HTTP API |
| Binary protocol? | Yes (MessagePack/Protobuf) / No (JSON) | **No** - JSON for simplicity, human-readable |

---

## 12. Dependencies

### 12.1 NPM Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `ws` | ^8.14.0 | WebSocket server implementation |
| `@types/ws` | ^8.5.0 | TypeScript types for ws |

### 12.2 Python Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `websocket-client` | ^1.7.0 | WebSocket client for Python |
| `requests` | ^2.31.0 | HTTP fallback (already installed) |

---

## 13. Migration Path

### 13.1 Backward Compatibility

**HTTP API remains unchanged:**
- All existing endpoints continue to work
- No breaking changes to request/response formats
- Polling-based clients continue to work

**Opt-in WebSocket:**
- Orchestration script detects WebSocket availability
- Falls back to HTTP polling automatically
- No configuration changes required

### 13.2 Adoption Timeline

| Timeframe | Milestone |
|-----------|-----------|
| Week 1 | Implement Phase 1 (Foundation) |
| Week 2 | Implement Phase 2 (Event Emitters) |
| Week 3 | Implement Phase 3 (Python SDK) |
| Week 4 | Phase 4 (Integration & Testing) |
| Week 5+ | Production use, monitor performance |

---

## 14. Success Metrics

| Metric | Baseline (HTTP) | Target (WebSocket) | Measurement |
|--------|-----------------|-------------------|-------------|
| Update latency | 30s (poll interval) | <1s | Time from task update to client notification |
| Network traffic | ~200KB/min per stream | ~10KB/min per stream | Bytes sent over network |
| CPU usage | ~5% (polling threads) | ~2% (event-driven) | Server CPU utilization |
| Client complexity | ~200 LOC (polling logic) | ~150 LOC (subscription) | Lines of code in orchestrator |

---

## 15. Future Enhancements

### 15.1 Phase 2 Features (Post-MVP)

| Feature | Benefit | Complexity |
|---------|---------|-----------|
| Event filtering | Client-side filtering (e.g., only completed tasks) | Low |
| Event batching | Reduce message count for rapid updates | Medium |
| Replay buffer | Send last N events on subscription | Medium |
| Compression | Reduce bandwidth for remote connections | Low |
| Authentication | Token-based auth for remote clients | High |

### 15.2 Advanced Use Cases

- **Multi-machine orchestration:** Remote WebSocket connections over network
- **Real-time dashboards:** Web UI showing live task progress
- **Slack/Discord integration:** Bot notifications via WebSocket events
- **Metrics/monitoring:** Prometheus exporter consuming WebSocket events

---

## Appendix A: Message Examples

### A.1 Stream Progress Event

```json
{
  "type": "event",
  "timestamp": "2026-01-08T12:34:56Z",
  "payload": {
    "topic": "stream:Stream-A",
    "eventType": "stream.progress",
    "data": {
      "streamId": "Stream-A",
      "streamName": "foundation",
      "totalTasks": 4,
      "completedTasks": 2,
      "inProgressTasks": 1,
      "blockedTasks": 0,
      "progressPercentage": 50.0,
      "lastUpdated": "2026-01-08T12:34:56Z"
    }
  }
}
```

### A.2 Task Status Changed Event

```json
{
  "type": "event",
  "timestamp": "2026-01-08T12:35:10Z",
  "payload": {
    "topic": "task:TASK-123",
    "eventType": "task.status_changed",
    "data": {
      "taskId": "TASK-123",
      "taskTitle": "Implement JWT authentication",
      "oldStatus": "in_progress",
      "newStatus": "completed",
      "statusChangedAt": "2026-01-08T12:35:10Z"
    }
  }
}
```

### A.3 Agent Handoff Event

```json
{
  "type": "event",
  "timestamp": "2026-01-08T12:36:00Z",
  "payload": {
    "topic": "agent:agent-ta",
    "eventType": "agent.handoff",
    "data": {
      "handoffId": "HO-abc123",
      "taskId": "TASK-456",
      "fromAgent": "agent-ta",
      "toAgent": "agent-me",
      "chainPosition": 1,
      "chainLength": 2,
      "handoffContext": "Design complete, ready for implementation",
      "workProductId": "WP-def456",
      "handoffAt": "2026-01-08T12:36:00Z"
    }
  }
}
```

---

## Appendix B: Error Codes

| Code | Message | Resolution |
|------|---------|-----------|
| `WS_INVALID_MESSAGE` | Invalid message format | Check JSON structure |
| `WS_UNKNOWN_TYPE` | Unknown message type | Use: subscribe, unsubscribe, ping, pong |
| `WS_INVALID_TOPIC` | Invalid topic pattern | Use pattern: `entity:id` or `entity:*` |
| `WS_SUBSCRIPTION_LIMIT` | Too many subscriptions | Max 50 per client |
| `WS_NOT_SUBSCRIBED` | Cannot unsubscribe (not subscribed) | Subscribe first |

---

**End of Design Document**
