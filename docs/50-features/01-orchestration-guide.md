# Orchestration Guide

## Overview

### What is Orchestration?

Orchestration is the automated management of multiple Claude Code sessions running in parallel across independent work streams. When you have complex initiatives broken into multiple streams, orchestration enables you to:

- Run foundation streams sequentially (shared dependencies)
- Execute parallel streams simultaneously (independent work)
- Monitor progress across all streams in real-time
- Automatically manage dependency resolution between streams

### When to Use Orchestration

Use orchestration when you have:

- **3+ parallel work streams** that can run independently
- **Complex dependency chains** (foundation → parallel → integration)
- **Multiple team members** working on different streams simultaneously
- **Large initiatives** where manual coordination becomes difficult

**Don't use orchestration for:**
- Single linear workflows (use `/continue` instead)
- 1-2 simple streams (manual coordination is easier)
- Streams with many file conflicts (requires serial execution)

### Architecture: Generate → Execute

Claude Code generates orchestration scripts but doesn't execute them:

```
┌─────────────────────────────────────────────────────────────┐
│ Claude Code Session (Main)                                   │
│                                                               │
│ User runs: /orchestration generate                           │
│ ↓                                                             │
│ Queries Task Copilot for streams                             │
│ ↓                                                             │
│ Generates:                                                    │
│   • orchestration-config.json (stream configuration)         │
│   • start-streams.py (Python orchestration script)           │
│   • README.md (usage instructions)                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ User Runs External Script                                    │
│                                                               │
│ $ python start-streams.py                                    │
│ ↓                                                             │
│ • Polls Task Copilot HTTP API for stream status              │
│ • Manages multiple Claude Code sessions via tmux             │
│ • Monitors progress across all streams                       │
│ • Enforces dependency ordering                               │
└─────────────────────────────────────────────────────────────┘
```

**Why external scripts?** Claude Code sessions are isolated - one session can't launch or control another. External scripts (Python, bash) can manage multiple tmux/terminal sessions independently.

---

## Prerequisites

Before using orchestration, ensure you have:

### 1. tmux Installed

Orchestration uses tmux for managing multiple terminal sessions:

```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt install tmux

# Verify installation
tmux -V  # Should show: tmux 3.x
```

### 2. Python 3 with requests

The orchestration script requires Python 3.8+ and the `requests` library:

```bash
# Check Python version
python3 --version  # Should be 3.8 or higher

# Install requests
pip3 install requests

# Verify installation
python3 -c "import requests; print(requests.__version__)"
```

### 3. Task Copilot HTTP API Running

The orchestration script queries Task Copilot's HTTP API for stream status.

**Configure in `.mcp.json`:**

```json
{
  "mcpServers": {
    "task-copilot": {
      "command": "node",
      "args": [
        "/path/to/claude-copilot/mcp-servers/task-copilot/dist/index.js"
      ],
      "env": {
        "HTTP_API_PORT": "9090"
      }
    }
  }
}
```

**Verify API is running:**

```bash
curl http://127.0.0.1:9090/health

# Expected response:
# {"status":"ok","timestamp":"2026-01-08T12:34:56.789Z"}
```

If the health check fails, restart Claude Code to reload `.mcp.json` configuration.

### 4. Organized Work Streams

Orchestration requires tasks organized into streams with:

- **streamId**: Unique identifier (e.g., "Stream-A", "Stream-B")
- **streamName**: Human-readable name (e.g., "foundation", "api-updates")
- **streamPhase**: Execution phase (`"foundation"`, `"parallel"`, or `"integration"`)
- **streamDependencies**: Array of stream IDs this stream depends on

Work with `@agent-ta` to create a PRD with proper stream organization.

---

## Quick Start

### Step 1: Create an Initiative with Streams

Start with `/protocol` and work with `@agent-ta` to create a PRD:

```
User: /protocol
User: Create a PRD for adding stream orchestration with these streams:
      - Foundation: Core types and tools (4 tasks)
      - Parallel Stream A: Update commands (3 tasks)
      - Parallel Stream B: Update agents (2 tasks)
      - Integration: Documentation and tests (3 tasks)
```

The Tech Architect will create a PRD with tasks organized into streams.

### Step 2: Generate Orchestration Scripts

Once streams are defined, generate orchestration scripts:

```
User: /orchestration generate
```

**Output:**

```
Orchestration Scripts Generated

Created files:
- .claude/orchestration/orchestration-config.json
- .claude/orchestration/start-streams.py
- .claude/orchestration/README.md

Next steps:
1. Review the configuration: cat .claude/orchestration/orchestration-config.json
2. Read the README: cat .claude/orchestration/README.md
3. Start orchestration: python3 .claude/orchestration/start-streams.py

Stream summary:
- Foundation: 1 stream (4 tasks)
- Parallel: 2 streams (5 tasks total)
- Integration: 1 stream (3 tasks)
```

### Step 3: Review Configuration

Check the generated configuration:

```bash
cat .claude/orchestration/orchestration-config.json
```

**Example output:**

```json
{
  "version": "1.0",
  "generatedAt": "2026-01-08T12:00:00.000Z",
  "initiative": {
    "id": "INIT-abc123",
    "name": "Stream Orchestration"
  },
  "apiEndpoint": "http://127.0.0.1:9090",
  "streams": [
    {
      "streamId": "Stream-A",
      "streamName": "foundation",
      "streamPhase": "foundation",
      "totalTasks": 4,
      "completedTasks": 0,
      "dependencies": [],
      "projectRoot": "/path/to/your/project",
      "worktreePath": null
    },
    {
      "streamId": "Stream-B",
      "streamName": "command-updates",
      "streamPhase": "parallel",
      "totalTasks": 3,
      "completedTasks": 0,
      "dependencies": ["Stream-A"],
      "projectRoot": "/path/to/your/project",
      "worktreePath": ".claude/worktrees/Stream-B"
    }
  ],
  "executionPlan": {
    "foundation": ["Stream-A"],
    "parallel": ["Stream-B", "Stream-C"],
    "integration": ["Stream-Z"]
  }
}
```

### Step 4: Complete Foundation Streams

Before running parallel orchestration, complete foundation streams manually:

```bash
claude
/continue Stream-A
```

Work through all tasks in the foundation stream until 100% complete.

**Why manually?** Foundation streams often require architectural decisions and shared infrastructure setup best handled with full user oversight.

### Step 5: Run Orchestration Script

Once foundation is complete, start parallel orchestration:

```bash
python3 .claude/orchestration/start-streams.py
```

**The script will:**

1. Check that Task Copilot HTTP API is running
2. Verify foundation streams are complete
3. Launch tmux sessions for each parallel stream
4. Monitor progress in real-time
5. Wait for all parallel streams to complete
6. Notify you when integration streams are ready

### Step 6: Monitor Progress

The orchestration script displays real-time progress:

```
==============================================================
Claude Code Parallel Stream Orchestration
==============================================================

Checking Task Copilot HTTP API...
✓ API is healthy

Phase 1: Foundation Streams
--------------------------------------------------------------
✓ Stream-A already complete

Phase 2: Parallel Streams
--------------------------------------------------------------
Starting 2 parallel sessions...

┌─ Starting session for Stream-B (command-updates)
│  Working directory: /path/to/project/.claude/worktrees/Stream-B
│  Command: claude
│  Initial command: /continue Stream-B
└─ Session started

┌─ Starting session for Stream-C (agent-updates)
│  Working directory: /path/to/project/.claude/worktrees/Stream-C
│  Command: claude
│  Initial command: /continue Stream-C
└─ Session started

Monitoring progress (Ctrl+C to stop)...

Stream-B: [████████████░░░░░░░░] 60% (2/3 tasks)
Stream-C: [████████████████████] 100% (3/3 tasks)

Stream-B: [████████████████████] 100% (3/3 tasks)
Stream-C: [████████████████████] 100% (3/3 tasks)

✓ All parallel streams complete!

Phase 3: Integration Streams
--------------------------------------------------------------
⚠ Stream-Z ready to start
  Run: /continue Stream-Z

Run integration streams manually to merge parallel work.

==============================================================
Orchestration complete!
==============================================================
```

### Step 7: Complete Integration Streams

After all parallel streams finish, run integration streams to merge work:

```bash
claude
/continue Stream-Z
```

Integration streams typically involve:
- Merging stream branches
- Resolving any conflicts
- Running integration tests
- Updating documentation

---

## Command Reference

### `/orchestration` or `/orchestration generate`

Generate external orchestration scripts.

**What it does:**
1. Queries `stream_list()` for active streams in current initiative
2. Validates stream configuration (foundation exists, no circular dependencies)
3. Creates `.claude/orchestration/` directory
4. Generates three files:
   - `orchestration-config.json` - Stream configuration and execution plan
   - `start-streams.py` - Python orchestration script
   - `README.md` - Usage instructions

**Requirements:**
- Active initiative (run `/protocol` or `/continue` first)
- Streams defined with proper metadata (streamId, streamName, streamPhase)
- At least one foundation stream
- Maximum 5 parallel streams (practical limit)

**Example:**

```
User: /orchestration generate

Output:
Orchestration Scripts Generated

Created files:
- .claude/orchestration/orchestration-config.json
- .claude/orchestration/start-streams.py
- .claude/orchestration/README.md

Stream summary:
- Foundation: 1 stream (4 tasks)
- Parallel: 2 streams (5 tasks total)
- Integration: 1 stream (3 tasks)
```

**Errors:**

| Error | Cause | Solution |
|-------|-------|----------|
| "No active initiative" | No initiative context | Run `/protocol` or `/continue` |
| "No streams defined" | Tasks don't have stream metadata | Work with `@agent-ta` to organize tasks into streams |
| "No foundation stream" | All streams are parallel or integration | Add at least one foundation stream for shared dependencies |
| "Circular dependencies detected" | Stream A depends on B, B depends on A | Fix dependency chain in task metadata |
| "Too many parallel streams (>5)" | More than 5 parallel streams | Split into multiple phases or increase limit |

### `/orchestration config`

Display current orchestration configuration.

**What it does:**
- Checks for `.claude/orchestration/orchestration-config.json`
- Shows high-level summary (initiative, stream counts, API endpoint)
- Provides path to full configuration file

**Example:**

```
User: /orchestration config

Output:
Current Orchestration Configuration

Generated: 2026-01-08T12:00:00.000Z
Initiative: Stream Orchestration (INIT-abc123)
API Endpoint: http://127.0.0.1:9090

Stream Summary:
- Foundation: 1 stream(s)
- Parallel: 2 stream(s)
- Integration: 1 stream(s)

Configuration file: .claude/orchestration/orchestration-config.json

To view full configuration:
cat .claude/orchestration/orchestration-config.json

To regenerate:
/orchestration generate
```

**If no configuration exists:**

```
No Orchestration Configuration Found

No orchestration scripts have been generated yet.

To generate orchestration scripts:
/orchestration generate
```

### `/orchestration status`

Show current stream progress and status.

**What it does:**
1. Calls `stream_list()` to get all active streams
2. Displays progress bars and task breakdowns by phase
3. Shows dependencies and completion status
4. Provides next action recommendations

**Example:**

```
User: /orchestration status

Output:
Stream Status

Total streams: 4
Active sessions: 2 (streams with in-progress tasks)

Foundation Phase
────────────────────────────────────────────────────

Stream-A (foundation)
├─ Progress: ████████████████████ 100% (4/4 tasks)
├─ Status: Complete ✓
├─ Files: src/types.ts, src/tools/stream.ts
└─ Dependencies: None

Parallel Phase
────────────────────────────────────────────────────

Stream-B (command-updates)
├─ Progress: ██████████░░░░░░░░░░ 50% (1/2 tasks)
├─ Status: In Progress ⚠
├─ Worktree: .claude/worktrees/Stream-B
├─ Branch: stream-b
├─ Files: .claude/commands/protocol.md
└─ Dependencies: Stream-A ✓

Stream-C (agent-updates)
├─ Progress: ████████████████████ 100% (3/3 tasks)
├─ Status: Complete ✓
├─ Worktree: .claude/worktrees/Stream-C
├─ Branch: stream-c
├─ Files: .claude/agents/ta.md
└─ Dependencies: Stream-A ✓

Integration Phase
────────────────────────────────────────────────────

Stream-Z (integration)
├─ Progress: ░░░░░░░░░░░░░░░░░░░░ 0% (0/2 tasks)
├─ Status: Blocked ⚫
├─ Files: docs/*, README.md
└─ Dependencies: Stream-B (50%), Stream-C (100%)

Legend: ✓ Complete | ⚠ In Progress | ⏸ Pending | ⚫ Blocked

Suggested Next Actions:
1. Complete Stream-B (1 task remaining)
   Run: /continue Stream-B
2. Once Stream-B completes, start integration
   Run: /continue Stream-Z
```

---

## Running Orchestration

### Using the Python Script

The generated `start-streams.py` script provides automated orchestration:

```bash
# Basic usage
python3 .claude/orchestration/start-streams.py

# With custom poll interval (default: 30 seconds)
# Edit POLL_INTERVAL in script
python3 .claude/orchestration/start-streams.py
```

**Script behavior:**

1. **Health check**: Verifies Task Copilot HTTP API is running
2. **Foundation phase**: Prompts you to complete foundation streams manually
3. **Parallel phase**: Launches tmux sessions for parallel streams
4. **Progress monitoring**: Polls API every 30 seconds, displays progress bars
5. **Integration phase**: Notifies when integration streams are ready

### tmux Session Management

Orchestration creates a tmux session for each parallel stream.

**Basic tmux commands:**

| Command | Description |
|---------|-------------|
| `tmux ls` | List all tmux sessions |
| `tmux attach -t <session>` | Attach to a session |
| `Ctrl-b d` | Detach from session (returns to orchestration script) |
| `Ctrl-b [` | Scroll mode (use arrow keys, `q` to exit) |
| `tmux kill-session -t <session>` | Kill a session |

**Session naming convention:**

```
claude-Stream-B  # Session for Stream-B
claude-Stream-C  # Session for Stream-C
```

**Navigating between streams:**

```bash
# List sessions
tmux ls

# Output:
# claude-Stream-B: 1 windows (created Wed Jan  8 12:00:00 2026)
# claude-Stream-C: 1 windows (created Wed Jan  8 12:00:01 2026)

# Attach to Stream-B
tmux attach -t claude-Stream-B

# Inside Stream-B: Work on tasks
# Press Ctrl-b then d to detach

# Attach to Stream-C
tmux attach -t claude-Stream-C
```

### Monitoring with watch-status.py

The `/orchestration generate` command creates a `watch-status.py` script for real-time monitoring with a rich terminal display.

**Features:**

- Unicode progress bars with color coding
- Live terminal updates with configurable refresh
- Agent activity tracking per stream
- Alerts section for blocked streams
- Graceful keyboard interrupt handling

**Usage:**

```bash
# Default 5-second refresh
python3 watch-status.py

# Custom refresh interval (10 seconds)
python3 watch-status.py --refresh 10

# Disable colors (for logging or pipes)
python3 watch-status.py --no-color

# Custom API endpoint
python3 watch-status.py --api http://localhost:9090
```

**CLI Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--refresh N` | 5 | Refresh interval in seconds |
| `--no-color` | false | Disable ANSI color codes |
| `--api URL` | `http://127.0.0.1:9090` | Task Copilot API base URL |

**Output Example:**

```
╔════════════════════════════════════════════════════════════════════╗
║  ORCHESTRATION STATUS                          [Refresh: 5s]       ║
╠════════════════════════════════════════════════════════════════════╣
║  Overall: ████████████░░░░░░░░  55.5% (15/27 tasks)                ║
╠════════════════════════════════════════════════════════════════════╣
║  Stream-A (foundation)  ████████████████████ 100.0% ✓ COMPLETE     ║
║  Stream-B (parallel)    ████████████░░░░░░░░  60.0% (3/5 tasks)    ║
║      └─ @agent-me: Implementing user authentication                ║
║  Stream-C (parallel)    ██████░░░░░░░░░░░░░░  30.0% (1/3 tasks)    ║
║      └─ @agent-qa: Running integration tests                       ║
║  Stream-Z (integration) ░░░░░░░░░░░░░░░░░░░░   0.0% (0/4 tasks)    ║
╠════════════════════════════════════════════════════════════════════╣
║  ALERTS                                                            ║
║  ⚠ Stream-D: Waiting on external API dependency                    ║
╚════════════════════════════════════════════════════════════════════╝

Press Ctrl+C to exit
```

**Color Coding:**

| Color | Meaning |
|-------|---------|
| Green | Complete (100%) |
| Yellow | In progress (1-99%) |
| Gray | Not started (0%) |
| Red | Blocked |

**Simple Alternative (bash):**

For environments without Python, use this basic bash one-liner:

```bash
watch -n 5 'curl -s http://127.0.0.1:9090/api/streams | jq -r ".streams[] | \"\(.streamId): \(.progressPercentage)% (\(.completedTasks)/\(.totalTasks))\""'
```

### Manual Parallel Execution

If you prefer not to use the Python script, run streams manually in separate terminals:

```bash
# Terminal 1
cd /path/to/project/.claude/worktrees/Stream-B
claude
/continue Stream-B

# Terminal 2
cd /path/to/project/.claude/worktrees/Stream-C
claude
/continue Stream-C

# Terminal 3 (monitoring)
watch -n 5 'curl -s http://127.0.0.1:9090/api/streams | jq'
```

---

## Configuration

### orchestration-config.json Schema

```json
{
  "version": "1.0",
  "generatedAt": "ISO 8601 timestamp",
  "initiative": {
    "id": "INIT-xxx",
    "name": "Initiative name"
  },
  "apiEndpoint": "http://127.0.0.1:9090",
  "streams": [
    {
      "streamId": "Stream-A",
      "streamName": "human-readable-name",
      "streamPhase": "foundation | parallel | integration",
      "totalTasks": 4,
      "completedTasks": 0,
      "dependencies": ["Stream-X", "Stream-Y"],
      "projectRoot": "/absolute/path/to/project",
      "worktreePath": null | ".claude/worktrees/Stream-X"
    }
  ],
  "executionPlan": {
    "foundation": ["Stream-A"],
    "parallel": ["Stream-B", "Stream-C"],
    "integration": ["Stream-Z"]
  }
}
```

**Field descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Config version (currently "1.0") |
| `generatedAt` | string | ISO 8601 timestamp when config was generated |
| `initiative.id` | string | Initiative ID from Memory Copilot |
| `initiative.name` | string | Human-readable initiative name |
| `apiEndpoint` | string | Task Copilot HTTP API URL |
| `streams[].streamId` | string | Unique stream identifier |
| `streams[].streamName` | string | Human-readable stream name |
| `streams[].streamPhase` | string | Execution phase: foundation, parallel, or integration |
| `streams[].totalTasks` | number | Total tasks in stream |
| `streams[].completedTasks` | number | Tasks with status "completed" |
| `streams[].dependencies` | string[] | Stream IDs this stream depends on |
| `streams[].projectRoot` | string | Absolute path to project root |
| `streams[].worktreePath` | string \| null | Relative path to git worktree (null for main worktree) |
| `executionPlan.foundation` | string[] | Foundation stream IDs (run first, sequentially) |
| `executionPlan.parallel` | string[] | Parallel stream IDs (run simultaneously) |
| `executionPlan.integration` | string[] | Integration stream IDs (run last, after parallel complete) |

### Customizing maxParallelStreams

The default limit is 5 parallel streams. To change this, modify the validation logic in `.claude/commands/orchestration.md`.

**Why 5?** Practical limits:
- Terminal/tmux session management complexity
- Cognitive load of monitoring multiple streams
- Resource constraints (memory, CPU) running multiple Claude Code sessions
- Merge conflict likelihood increases with more parallel streams

**If you need more parallel streams:**

1. Split work into multiple phases (run 5, complete, then run next 5)
2. Increase limit in command validation (not recommended without careful planning)
3. Consider if streams are truly independent or should be sequential

### Customizing pollInterval

Edit `start-streams.py`:

```python
# Near top of file
POLL_INTERVAL = 30  # seconds

# Change to desired interval
POLL_INTERVAL = 10  # Poll every 10 seconds (more frequent)
POLL_INTERVAL = 60  # Poll every 60 seconds (less frequent)
```

**Recommendations:**

- **5-10 seconds**: For short-running tasks, frequent updates
- **30 seconds** (default): Balanced for most workflows
- **60+ seconds**: For long-running tasks, reduce API load

### Changing API Endpoint

**In `.mcp.json`:**

```json
{
  "mcpServers": {
    "task-copilot": {
      "env": {
        "HTTP_API_PORT": "9091"
      }
    }
  }
}
```

**Then regenerate configuration:**

```
/orchestration generate
```

The new `orchestration-config.json` will use the updated endpoint.

---

## Context Recovery System

The orchestration system includes automatic context exhaustion detection and recovery, preventing streams from getting stuck when Claude runs out of context.

### How It Works

**Detection Methods:**

| Method | Trigger | Detection |
|--------|---------|-----------|
| **Stall Detection** | No task progress for N minutes | Compares progress % over time |
| **Pattern Detection** | Context exhaustion in tmux output | Scans for specific phrases |

**Detected Patterns:**
- "context window exceeded"
- "conversation compacted"
- "maximum context"
- "context limit reached"
- "The conversation is too long"

**Recovery Flow:**

```
1. Stall/exhaustion detected
2. Kill tmux window for stream
3. Create new tmux window
4. Start fresh Claude session
5. Run /continue {streamId}
6. Claude resumes from Task Copilot checkpoint
```

### Configuration

Add to your `orchestration-config.json`:

```json
{
  "contextRecovery": {
    "stallTimeoutMinutes": 10,
    "autoRecoveryEnabled": true,
    "maxRecoveryAttempts": 3
  }
}
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `stallTimeoutMinutes` | 10 | Minutes of no progress before stall detection |
| `autoRecoveryEnabled` | true | Enable automatic recovery |
| `maxRecoveryAttempts` | 3 | Max restarts per stream |

### Why Recovery Works

The recovery relies on **Task Copilot's state persistence**:

1. **Task Progress**: Stored in Task Copilot DB, not in Claude's context
2. **Work Products**: Saved via `work_product_store()`, survive session restarts
3. **Checkpoints**: Created periodically during execution
4. **/continue Command**: Loads state from Task Copilot on startup

When a stream is recovered:
- New Claude session starts with clean context
- `/continue {streamId}` loads the stream's state from Task Copilot
- Claude sees completed tasks and picks up where it left off
- Work already done is preserved in Task Copilot

### Monitoring Recovery

Watch for recovery events in the orchestration output:

```
⚠ Stream-B: stall detected - initiating recovery
⚠ Attempting recovery for Stream-B (attempt 1)
✓ Stream-B: Recovery successful (attempt 1)
```

Desktop notifications (macOS) alert you to recovery events.

### Disabling Recovery

For streams that legitimately take long periods:

```json
{
  "contextRecovery": {
    "autoRecoveryEnabled": false
  }
}
```

Or increase the timeout for long-running tasks:

```json
{
  "contextRecovery": {
    "stallTimeoutMinutes": 30
  }
}
```

---

## Troubleshooting

### API Not Running

**Symptom:**

```
Error: Task Copilot HTTP API is not available
Ensure Task Copilot MCP server is running with HTTP API enabled
```

**Causes:**
1. Task Copilot MCP server not running
2. HTTP API not configured in `.mcp.json`
3. Wrong port or host configuration
4. Port conflict (another service using 9090)

**Solutions:**

```bash
# 1. Check if API is running
curl http://127.0.0.1:9090/health

# 2. Verify .mcp.json configuration
cat .mcp.json | grep -A 5 "task-copilot"

# Expected output should include:
# "env": {
#   "HTTP_API_PORT": "9090"
# }

# 3. Check if port is in use
lsof -i :9090

# 4. Restart Claude Code to reload configuration
# Close and reopen Claude Code

# 5. Try a different port
# Edit .mcp.json and change HTTP_API_PORT to 9091
# Restart Claude Code
# Regenerate orchestration: /orchestration generate
```

### tmux Not Found

**Symptom:**

```
tmux: command not found
```

**Solution:**

```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt install tmux

# Fedora/CentOS
sudo dnf install tmux

# Verify installation
tmux -V
```

### Stream Stuck or Not Progressing

**Symptom:** A stream shows "In Progress" but progress bar hasn't moved in a while.

**Diagnosis:**

```bash
# 1. Check stream status via API
curl http://127.0.0.1:9090/api/streams/Stream-B | jq

# 2. Look for blocked tasks
curl http://127.0.0.1:9090/api/tasks?streamId=Stream-B&status=blocked | jq

# 3. Attach to tmux session to see what's happening
tmux attach -t claude-Stream-B
```

**Common causes:**

| Cause | Solution |
|-------|----------|
| Waiting for user input | Attach to tmux session and respond |
| Task blocked on dependency | Check `blockedReason`, resolve dependency |
| Agent error or crash | Review logs, restart stream with `/continue Stream-B` |
| File conflict | Resolve conflicts manually, commit changes |

### Dependency Issues

**Symptom:**

```
Error: Foundation streams not complete
```

**Cause:** Parallel streams depend on foundation, but foundation isn't 100% complete.

**Solution:**

```bash
# 1. Check foundation stream status
/orchestration status

# 2. Complete any remaining foundation tasks
/continue Stream-A

# 3. Verify completion
/orchestration status

# 4. Re-run orchestration script
python3 .claude/orchestration/start-streams.py
```

**Circular dependency:**

```
Error: Circular dependencies detected
Stream-B depends on Stream-C
Stream-C depends on Stream-B
```

**Solution:** Fix dependency chain in task metadata. Work with `@agent-ta` to reorganize streams.

### Worktree Conflicts

**Symptom:**

```
Error: Worktree already exists
fatal: '.claude/worktrees/Stream-B' already exists
```

**Cause:** Stale worktree from previous session not cleaned up.

**Solution:**

```bash
# 1. List existing worktrees
git worktree list

# Output:
# /path/to/project          abcd123 [main]
# /path/to/project/.claude/worktrees/Stream-B  efgh456 [stream-b]

# 2. Check if worktree is in use
cd .claude/worktrees/Stream-B
git status

# 3. If safe to remove (no uncommitted changes):
cd ../../..
git worktree remove .claude/worktrees/Stream-B

# 4. Clean up stale references
git worktree prune

# 5. Try again
/continue Stream-B
```

**If worktree has uncommitted changes:**

```bash
cd .claude/worktrees/Stream-B

# Option 1: Commit changes
git add .
git commit -m "WIP: Stream-B work"

# Option 2: Stash changes
git stash save "Stream-B in-progress work"

# Then remove worktree
cd ../../..
git worktree remove .claude/worktrees/Stream-B
```

### Python requests Module Missing

**Symptom:**

```
ModuleNotFoundError: No module named 'requests'
```

**Solution:**

```bash
# Install requests
pip3 install requests

# Verify installation
python3 -c "import requests; print('Success')"

# If pip3 not found, install pip first:
# macOS: brew install python3
# Ubuntu: sudo apt install python3-pip
```

### Permission Denied Creating Orchestration Directory

**Symptom:**

```
Error: Permission Denied
Cannot create orchestration directory or files.
```

**Solution:**

```bash
# Check permissions
ls -ld .claude/

# Make .claude writable
chmod u+w .claude/

# Create orchestration directory manually
mkdir -p .claude/orchestration

# Try again
/orchestration generate
```

---

## Best Practices

### 1. Plan Streams Before Orchestrating

Work with `@agent-ta` to carefully plan stream organization:

- **Foundation first**: Identify shared dependencies (types, core tools, database schema)
- **Minimize conflicts**: Assign non-overlapping files to parallel streams
- **Logical boundaries**: Group related tasks into streams (e.g., "API endpoints", "UI components")
- **Right-size streams**: 2-5 tasks per stream (not too small, not too large)

**Example good stream organization:**

```
Foundation Stream (Stream-A):
- Define core types
- Create database schema
- Set up shared utilities

Parallel Stream B (API):
- Implement user endpoints
- Implement post endpoints
- Add API tests

Parallel Stream C (UI):
- Create dashboard component
- Add user profile page
- Style components

Integration Stream (Stream-Z):
- Connect UI to API
- End-to-end tests
- Update documentation
```

### 2. Use Foundation → Parallel → Integration Pattern

Follow the three-phase pattern:

```
Phase 1: Foundation (Sequential)
└─ Build shared infrastructure
   └─ Complete 100% before starting parallel work

Phase 2: Parallel (Concurrent)
└─ Independent feature streams run simultaneously
   └─ Minimal file conflicts
   └─ Each stream has its own git worktree

Phase 3: Integration (Sequential)
└─ Merge parallel work
   └─ Resolve any conflicts
   └─ Run integration tests
```

**Why this pattern works:**

- Foundation prevents duplicate work and conflicting designs
- Parallel maximizes throughput on independent work
- Integration ensures everything works together

### 3. Keep Parallel Streams < 5

**Practical limits:**

| # Streams | Complexity | When to Use |
|-----------|------------|-------------|
| 1-2 | Low | Manual coordination is easier |
| 3-4 | Medium | Sweet spot for orchestration |
| 5 | High | Maximum recommended |
| 6+ | Very High | Split into multiple phases instead |

**Why limit parallel streams?**

- **Cognitive load**: Hard to monitor >5 streams simultaneously
- **Merge conflicts**: More streams = higher conflict probability
- **Resource usage**: Each Claude Code session consumes memory/CPU
- **Orchestration overhead**: Managing >5 tmux sessions gets complex

**If you have >5 parallel streams:**

```
Instead of:
Foundation → 8 parallel streams → Integration

Do:
Foundation → 4 parallel streams (Phase 1) → Mini-integration →
           → 4 parallel streams (Phase 2) → Integration
```

### 4. Monitor Progress Regularly

Don't set up orchestration and walk away. Monitor actively:

```bash
# Use watch-status script (see "Monitoring with watch-status.py" section)
python3 watch-status.py

# Or check status in Claude Code
/orchestration status

# Or attach to individual streams
tmux attach -t claude-Stream-B
```

**Set up alerts for completion:**

```bash
# wait-for-completion.sh
#!/bin/bash
while true; do
  COMPLETE=$(curl -s http://127.0.0.1:9090/api/streams | jq '.streams[] | select(.progressPercentage < 100) | .streamId' | wc -l)

  if [ "$COMPLETE" -eq 0 ]; then
    osascript -e 'display notification "All streams complete!" with title "Orchestration"'
    break
  fi

  sleep 30
done
```

### 5. Handle Blockers Quickly

If a stream gets blocked:

1. **Identify the blocker** - Check `/orchestration status` or API
2. **Attach to stream** - `tmux attach -t claude-Stream-X`
3. **Resolve issue** - Provide missing info, fix dependency, resolve conflict
4. **Resume work** - Stream should auto-continue after resolution

**Common blockers:**

- Missing requirements or acceptance criteria
- Dependency on another stream not complete
- File conflicts with another stream
- External resource unavailable (API, database)

### 6. Clean Up After Completion

Once all streams are done:

```bash
# 1. Kill tmux sessions
tmux kill-session -t claude-Stream-B
tmux kill-session -t claude-Stream-C

# Or kill all at once
tmux kill-server

# 2. Merge stream branches
git checkout main
git merge stream-b
git merge stream-c

# 3. Remove worktrees
git worktree remove .claude/worktrees/Stream-B
git worktree remove .claude/worktrees/Stream-C
git worktree prune

# 4. Optional: Archive orchestration scripts
mkdir -p .archive/orchestration
mv .claude/orchestration .archive/orchestration/$(date +%Y%m%d)
```

### 7. Test Foundation Thoroughly

Foundation streams are critical - they affect all downstream streams.

**Before starting parallel work:**

```bash
# 1. Run all foundation tests
npm test  # or your test command

# 2. Verify no errors
npm run lint
npm run build

# 3. Commit foundation work
git add .
git commit -m "feat: Foundation complete for orchestration"

# 4. Double-check with @agent-qa
```

**Why this matters:** If you discover a foundation bug mid-orchestration, you may need to:
- Stop all parallel streams
- Fix foundation
- Potentially redo parallel work that depended on the broken foundation

---

## See Also

### Related Documentation

- **Stream Management**: Stream concepts and worktree isolation (`docs/TASK-WORKTREE-ISOLATION.md`)
- **API Reference**: HTTP API endpoints for external queries (`docs/orchestration/api-reference.md`)
- **HTTP Implementation**: Technical details of embedded HTTP server (`mcp-servers/task-copilot/HTTP_IMPLEMENTATION.md`)
- **Task Copilot**: Full MCP tool reference (`mcp-servers/task-copilot/README.md`)

### Commands

- `/protocol` - Start fresh work with Agent-First Protocol
- `/continue [stream]` - Resume work on specific stream
- `/orchestration generate` - Generate orchestration scripts
- `/orchestration config` - View current configuration
- `/orchestration status` - Check stream progress

### MCP Tools

- `stream_list()` - List all streams with progress
- `stream_get(streamId)` - Get detailed stream information
- `stream_conflict_check(streamId, files)` - Check file conflicts
- `task_list({ streamId })` - List tasks in a stream
- `progress_summary()` - Get compact progress overview

---

## Appendix

### tmux Quick Reference

| Command | Description |
|---------|-------------|
| `tmux new -s <name>` | Create new named session |
| `tmux ls` | List all sessions |
| `tmux attach -t <name>` | Attach to session |
| `tmux kill-session -t <name>` | Kill specific session |
| `tmux kill-server` | Kill all sessions |
| **Inside tmux:** | |
| `Ctrl-b d` | Detach from session |
| `Ctrl-b [` | Enter scroll mode (arrow keys to navigate) |
| `Ctrl-b ]` | Paste buffer |
| `Ctrl-b ?` | Show help |

### HTTP API Quick Reference

```bash
# Health check
curl http://127.0.0.1:9090/health

# List all streams
curl http://127.0.0.1:9090/api/streams | jq

# Get specific stream details
curl http://127.0.0.1:9090/api/streams/Stream-B | jq

# Query tasks by stream
curl http://127.0.0.1:9090/api/tasks?streamId=Stream-B | jq

# Get in-progress tasks
curl http://127.0.0.1:9090/api/tasks?status=in_progress | jq

# Check agent activity
curl http://127.0.0.1:9090/api/activity?active=true | jq
```

### Example Workflow

**Full orchestration workflow from start to finish:**

```bash
# === Setup ===
# 1. Start initiative with /protocol
claude
> /protocol

> Create a PRD for refactoring the authentication system with these streams:
  - Foundation: Extract auth types and interfaces (3 tasks)
  - Parallel A: Refactor backend auth service (4 tasks)
  - Parallel B: Update frontend auth components (4 tasks)
  - Integration: Update tests and docs (2 tasks)

# @agent-ta creates PRD with organized streams

# === Generate Orchestration ===
# 2. Generate orchestration scripts
> /orchestration generate

# Output:
# Orchestration Scripts Generated
# Stream summary:
# - Foundation: 1 stream (3 tasks)
# - Parallel: 2 streams (8 tasks total)
# - Integration: 1 stream (2 tasks)

# === Complete Foundation ===
# 3. Complete foundation stream
> /continue Stream-A

# Work through 3 foundation tasks...
# [All foundation tasks complete]

> /pause foundation complete, ready for parallel

# Exit Claude Code

# === Run Orchestration ===
# 4. Start orchestration script
$ python3 .claude/orchestration/start-streams.py

# Script verifies foundation, launches parallel sessions

# 5. Monitor in separate terminal
$ python3 watch-status.py

# Rich terminal display with progress bars:
# ╔════════════════════════════════════════════════╗
# ║  ORCHESTRATION STATUS        [Refresh: 5s]     ║
# ╠════════════════════════════════════════════════╣
# ║  Stream-A (foundation) ████████████████ 100.0% ║
# ║  Stream-B (parallel)   ████████████░░░░  75.0% ║
# ║  Stream-C (parallel)   ████████░░░░░░░░  50.0% ║
# ╚════════════════════════════════════════════════╝

# 6. Attach to streams as needed
$ tmux attach -t claude-Stream-B
# Provide input, resolve issues
# Ctrl-b d to detach

# === Integration ===
# 7. Wait for parallel completion
# Script notifies: "All parallel streams complete!"

# 8. Run integration stream
$ claude
> /continue Stream-Z

# Complete integration tasks (merge, test, document)

# === Cleanup ===
# 9. Clean up
$ tmux kill-server
$ git checkout main
$ git merge stream-b stream-c
$ git worktree remove .claude/worktrees/Stream-B
$ git worktree remove .claude/worktrees/Stream-C
$ git worktree prune

# Done!
```
