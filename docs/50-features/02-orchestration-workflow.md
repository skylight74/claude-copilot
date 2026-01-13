# Orchestration Workflow Guide

## Overview

The orchestration system enables parallel execution of independent work streams with automatic dependency management and initiative-scoped filtering. This guide documents the complete workflow from generation to completion.

## Core Workflow: Generate → Start → Complete

### Phase 1: Generate (Required First)

**Command:** `/orchestrate generate`

**Purpose:** Create PRD and tasks with proper stream metadata in Task Copilot.

#### Step-by-Step Process

1. **Link to Memory Copilot Initiative**
   ```typescript
   // REQUIRED FIRST - establishes initiative context
   initiative_link({
     initiativeId: "INI-xxx",
     title: "Feature Name",
     description: "Feature description"
   });
   ```

   **What happens:**
   - Archives streams from previous initiatives (clean slate)
   - Establishes current initiative in Task Copilot
   - Prevents stream pollution from prior work

2. **Invoke @agent-ta for Planning**

   @agent-ta creates:
   - **PRD** using `prd_create()` in Task Copilot
   - **Tasks** using `task_create()` with required metadata:
     ```json
     {
       "metadata": {
         "streamId": "Stream-A",
         "streamName": "Foundation Work",
         "streamPhase": "foundation|parallel|integration",
         "files": ["list", "of", "files"],
         "dependencies": ["Stream-X", "Stream-Y"]
       }
     }
     ```

3. **Validate Stream Metadata**

   Required validations:
   - [ ] All tasks have `streamId`
   - [ ] All tasks have `dependencies` array (empty `[]` for foundation)
   - [ ] At least one foundation stream exists (no dependencies)
   - [ ] No circular dependencies in graph

4. **Verify Task Copilot State (MANDATORY)**

   **Do NOT skip this step.** After @agent-ta returns:

   ```typescript
   // Check PRDs exist
   const prds = await prd_list({});
   if (prds.length === 0) {
     // ERROR: @agent-ta did not call prd_create()
     // Retry with stronger enforcement
   }

   // Check streams exist
   const streams = await stream_list({});
   if (streams.length === 0) {
     // ERROR: @agent-ta did not create tasks with streamId
     // Retry with stronger enforcement
   }
   ```

   **Why this matters:** Agents sometimes output markdown documents instead of calling tools. Verification ensures actual data exists in Task Copilot.

5. **Create Orchestrator Infrastructure**

   After verification passes:
   - Create `.claude/orchestrator/` directory
   - Copy template files (orchestrate.py, task_copilot_client.py, etc.)
   - Create `./watch-status` symlink at project root
   - Make scripts executable

6. **Display Success Message**

   ```
   ✓ PRD Created: PRD-abc123
   ✓ Tasks Created: 12 tasks across 4 streams

   Stream Dependency Structure:

     Depth 0 (Foundation):
       • Stream-A (Database Setup) - 3 tasks

     Depth 1 (Parallel):
       • Stream-B (OAuth Provider) - 4 tasks → depends on: Stream-A
       • Stream-C (Session Management) - 3 tasks → depends on: Stream-A

     Depth 2 (Integration):
       • Stream-Z (Integration Tests) - 2 tasks → depends on: Stream-B, Stream-C

   Next: Run `/orchestrate start` to begin parallel execution
   ```

### Phase 2: Start

**Command:** `/orchestrate start`

**Purpose:** Spawn parallel workers for all ready streams.

#### Pre-flight Checks

1. **File Verification (Always First)**

   Check required files exist:
   - `.claude/orchestrator/orchestrate.py`
   - `.claude/orchestrator/task_copilot_client.py`
   - `.claude/orchestrator/check_streams_data.py`
   - `.claude/orchestrator/check-streams`
   - `.claude/orchestrator/watch-status`

   **If missing:** Display error directing user to run `/orchestrate generate` first.

   **DO NOT auto-create files.** This prevents skipping the generate phase.

2. **Stream Validation**

   Query Task Copilot:
   ```typescript
   const streams = await stream_list({});

   if (streams.length === 0) {
     // ERROR: No streams found
     // Direct user to run /orchestrate generate
   }
   ```

   Verify:
   - [ ] At least one foundation stream exists (empty dependencies)
   - [ ] No circular dependencies in graph

3. **Initiative Scoping Check**

   ```typescript
   // All streams belong to current initiative
   const currentInitiative = await initiative_get();
   const streams = await stream_list({}); // Auto-filtered by initiative

   // Streams from previous initiatives are archived and not returned
   ```

#### Execution

After validation passes:

```bash
python .claude/orchestrator/orchestrate.py start
```

**What happens:**
- Query Task Copilot for streams (initiative-scoped automatically)
- Build dependency graph dynamically from metadata
- Spawn workers for foundation streams immediately
- Poll every 30s for newly-ready streams
- Start dependent streams when ALL dependencies reach 100%
- Auto-restart failed workers (max 10 attempts)

**Worker prompt includes:**
```
MANDATORY PROTOCOL - YOU MUST FOLLOW THIS EXACTLY

Step 1: Query Your Tasks
Call task_list with streamId filter.

Step 2: For EACH Task
- Before work: task_update(id="TASK-xxx", status="in_progress")
- After work: task_update(id="TASK-xxx", status="completed", notes="...")

Step 3: Verify Before Exiting
Re-query task_list and verify ALL tasks show "completed".

Step 4: Output Summary
Only after verification, output completion summary.
```

### Phase 3: Monitor

**Command:** `./watch-status`

**Purpose:** Live monitoring of stream progress.

#### Dashboard Display

```
YOUR-PROJECT
Current Initiative                                    62% ✓32 ⚙4 ○15
Implement user authentication with OAuth
═══════════════════════════════════════════════════════════════════════════
Stream-A [===============] 100%  ✓  7        DONE  2h31m  Foundation
Stream-B [==========-----]  70%  ✓  7  ⚙ 1  RUN   1h45m  API Layer
Stream-C [========-------]  40%  ✓  2  ⚙ 1  RUN     52m  UI Components
Stream-Z [---------------]   0%  ✓  0     ○ 3  ---    ---  Integration
═══════════════════════════════════════════════════════════════════════════
Workers: 2 | Data: Task Copilot + Memory Copilot (initiative-scoped) | 16:42:11
```

**Status indicators:**
- `DONE` - Stream complete (100%)
- `RUN` - Worker actively running
- `---` - Not started (waiting for dependencies)

**Initiative scoping:**
- Only shows streams from active initiative
- Archived streams from previous initiatives hidden
- Initiative title displayed at top

### Phase 4: Complete

**Detection:** All streams reach 100% complete.

**Automatic actions:**
1. Detect completion via polling loop
2. Archive streams for current initiative
3. Mark initiative complete in Memory Copilot
4. Display completion banner in watch-status

**Manual completion:**
```typescript
// When all streams complete
const allComplete = await checkAllStreamsComplete();

if (allComplete) {
  const initiative = await initiative_get();
  await initiative_complete({ id: initiative.id });

  // Archive streams
  await archiveStreamsForInitiative(initiative.id);
}
```

## Initiative Switch Behavior

### Switching Initiatives

When switching from Initiative A to Initiative B:

1. **Old streams archived automatically**

   ```typescript
   // Previous initiative
   initiative_link({ initiativeId: "INI-A", title: "Feature A" });
   // Stream-A, Stream-B created for INI-A

   // Switch to new initiative
   initiative_link({ initiativeId: "INI-B", title: "Feature B" });
   // → Automatically archives Stream-A, Stream-B
   // Stream-C, Stream-D created for INI-B
   ```

2. **stream_list() filters by initiative**

   ```typescript
   // Returns only INI-B streams
   const streams = await stream_list({});
   // Result: [Stream-C, Stream-D]
   // Stream-A, Stream-B are archived and not returned
   ```

3. **watch-status shows current initiative only**

   ```
   YOUR-PROJECT
   Current Initiative                    45% ✓12 ⚙3 ○9
   Feature B (INI-B)
   ═══════════════════════════════════════════════════════════════
   Stream-C [========-------]  45%  ✓ 12  ⚙ 3  RUN   Initiative B
   Stream-D [---------------]   0%  ✓  0     ○ 9  ---   Initiative B
   ═══════════════════════════════════════════════════════════════
   ```

   No trace of Stream-A or Stream-B (they're archived).

4. **/orchestrate start spawns only current initiative**

   Workers only created for active (non-archived) streams.

### Recovering Archived Streams

If you need to resume an old initiative:

```typescript
// 1. Unarchive specific stream
await stream_unarchive({ streamId: "Stream-A" });

// 2. Re-link to old initiative
await initiative_link({ initiativeId: "INI-A", title: "Feature A" });

// 3. Stream-A now visible again
const streams = await stream_list({});
// Result: [Stream-A, Stream-B]
```

**Use case:** Revisiting abandoned work or switching back temporarily.

## Verification Requirements

### In Generate Phase

```typescript
// After @agent-ta returns

// 1. Verify PRDs exist
const prds = await prd_list({});
assert(prds.length > 0, 'No PRDs created');

// 2. Verify streams exist
const streams = await stream_list({});
assert(streams.length > 0, 'No streams created');

// 3. Verify stream metadata
for (const stream of streams) {
  assert(stream.streamId, 'Missing streamId');
  assert(Array.isArray(stream.dependencies), 'Missing dependencies array');
}

// 4. Verify at least one foundation stream
const foundationStreams = streams.filter(s => s.dependencies.length === 0);
assert(foundationStreams.length > 0, 'No foundation streams found');

// 5. Verify no circular dependencies
const hasCircular = detectCircularDependencies(streams);
assert(!hasCircular, 'Circular dependencies detected');
```

### In Start Phase

```typescript
// Before spawning workers

// 1. Verify orchestrator files exist
const requiredFiles = [
  '.claude/orchestrator/orchestrate.py',
  '.claude/orchestrator/task_copilot_client.py',
  '.claude/orchestrator/check-streams'
];

for (const file of requiredFiles) {
  assert(await fileExists(file), `Missing: ${file}`);
}

// 2. Verify streams exist in Task Copilot
const streams = await stream_list({});
assert(streams.length > 0, 'No streams found - run /orchestrate generate first');

// 3. Verify initiative link
const initiative = await initiative_get();
assert(initiative !== null, 'No active initiative');
```

## Best Practices

### 1. Always Run Generate First

❌ **Wrong:**
```
/orchestrate start  # ERROR: No streams found
```

✅ **Correct:**
```
/orchestrate generate  # Creates PRD + tasks
/orchestrate start     # Spawns workers
```

### 2. Verify After @agent-ta

❌ **Wrong:**
```
@agent-ta creates planning document
→ Assume tools were called
→ Run /orchestrate start
→ ERROR: No streams found
```

✅ **Correct:**
```
@agent-ta creates planning document
→ Call prd_list() to verify
→ Call stream_list() to verify
→ If empty, retry with stronger prompt
→ Run /orchestrate start only after verification
```

### 3. Monitor Initiative Scoping

❌ **Wrong:**
```
Work on Initiative A
Switch to Initiative B
Expect to see all streams
```

✅ **Correct:**
```
Work on Initiative A (Stream-A, Stream-B)
Switch to Initiative B
→ Stream-A, Stream-B auto-archived
→ Only see Stream-C, Stream-D
→ Use stream_unarchive() if need Stream-A back
```

### 4. Check Dependencies Before Starting

❌ **Wrong:**
```
All streams depend on each other circularly
Run /orchestrate start
→ Workers never start (blocked forever)
```

✅ **Correct:**
```
Verify dependency graph is acyclic
At least one foundation stream exists
Run /orchestrate start
→ Foundation starts immediately
→ Dependent streams follow when ready
```

## Troubleshooting

### "No streams found in Task Copilot"

**Cause:** You ran `/orchestrate start` before `/orchestrate generate`.

**Solution:**
1. Run `/orchestrate generate` to create PRD and tasks
2. Verify streams exist via `stream_list()`
3. Run `/orchestrate start`

### "Verification failed - no PRDs found"

**Cause:** @agent-ta output a markdown document instead of calling tools.

**Solution:**
1. Re-invoke @agent-ta with stronger prompt:
   ```
   CRITICAL: You MUST call these tools:

   1. prd_create({ title, description, ... })
   2. task_create({ prdId, metadata: { streamId, dependencies } })
   3. Verify with prd_list() and stream_list()
   ```

### "Stream-A not visible after initiative switch"

**Cause:** Streams auto-archived when switching initiatives.

**Solution:**
```typescript
// Unarchive and re-link
await stream_unarchive({ streamId: "Stream-A" });
await initiative_link({ initiativeId: "INI-A", ... });

// Stream-A now visible
const streams = await stream_list({});
```

### "Circular dependency detected"

**Cause:** Streams depend on each other in a cycle (A → B → C → A).

**Solution:**
1. Review dependency graph
2. Identify cycle
3. Restructure to break cycle (typically make one stream foundation)

### "Workers not starting"

**Cause:** Missing orchestrator files.

**Solution:**
```
Run /orchestrate generate to create required files
```

**Cause:** All streams have dependencies that aren't met.

**Solution:**
```
Verify at least one stream has empty dependencies: []
```

## Reliability Features

The orchestration system includes seven reliability improvements designed to handle worker failures, prevent stale state, and maintain clean operation across initiative boundaries.

### 1. Worker Wrapper with EXIT Trap

**Purpose:** Guaranteed PID file cleanup regardless of how workers terminate.

**Implementation:** `worker-wrapper.sh`

Every worker process is spawned through a wrapper script that:
- Creates PID files on worker startup
- Sets up `trap cleanup EXIT INT TERM HUP` for all exit scenarios
- Removes PID files on ANY exit (success, failure, signal, crash)

**Benefits:**
- No orphaned PID files from crashed workers
- Prevents false "already running" errors
- Clean state across restarts

**Example trap:**
```bash
cleanup() {
    local exit_code=$?
    # Log exit details
    rm -f "$PID_FILE"  # Always cleanup
    exit $exit_code
}
trap cleanup EXIT INT TERM HUP
```

### 2. Per-Initiative Log Files

**Purpose:** Clean log separation across different initiatives.

**Implementation:** `worker-wrapper.sh`

Log files use initiative-aware naming:
```
{stream_id}_{initiative_id[:8]}.log
```

**Example:**
- Initiative: `INI-abc123456789`
- Stream: `Stream-A`
- Log file: `Stream-A_abc12345.log`

**Features:**
- Prevents log contamination when switching initiatives
- Auto-archives old logs from previous initiatives
- Legacy fallback support for old log format (`Stream-A.log`)

**Archival behavior:**
```bash
# Old logs from different initiatives automatically archived
Stream-A_xyz78901.log → archive/Stream-A_xyz78901_20260113_143022.log
Stream-A.log          → archive/Stream-A_20260113_143022.log
```

### 3. Zombie Process Detection

**Purpose:** Reliably detect dead workers including zombie processes.

**Implementation:** Two-stage verification in `orchestrate.py`, `monitor-workers.py`, and `check-streams`

**Problem:** `kill -0` succeeds for zombie processes, causing false "running" status.

**Solution:** Double-check with `ps -p`:

```python
def _is_running(self, stream_id: str) -> bool:
    # Stage 1: Check with kill -0
    os.kill(pid, 0)  # Succeeds for zombies

    # Stage 2: Verify with ps (fails for zombies)
    result = subprocess.run(["ps", "-p", str(pid)])
    if result.returncode != 0:
        pid_file.unlink()  # Clean up stale file
        return False
    return True
```

**Benefits:**
- Catches zombie processes that pass basic PID checks
- Prevents workers from never starting due to zombie detection
- Automatic PID file cleanup for dead processes

### 4. Stale PID Cleanup at Startup

**Purpose:** Automatic recovery from orphaned PID files.

**Implementation:** `orchestrate.py` in `__init__()` method

**Behavior:**
- On orchestrator startup, scans all PID files in `.claude/orchestrator/pids/`
- For each PID file, checks if process is actually running
- Removes stale PID files from crashed/killed workers
- Logs count of cleaned up files

```python
def _cleanup_stale_pids(self):
    """Clean up stale PID files from workers that exited without cleanup."""
    cleaned = 0
    for pid_file in PID_DIR.glob("*.pid"):
        stream_id = pid_file.stem
        if not self._is_running(stream_id):
            # _is_running already cleaned up the file if stale
            cleaned += 1
    if cleaned > 0:
        log(f"Cleaned up {cleaned} stale PID file(s)")
```

**Triggers:**
- Every time `/orchestrate start` is run
- Before any workers are spawned

**Benefits:**
- Clean slate on every orchestration start
- No manual cleanup needed after crashes
- Prevents false "already running" errors

### 5. Worker Chaining (start-ready-streams.py)

**Purpose:** Near-instant dependency chain progression.

**Implementation:** `start-ready-streams.py`

**Problem:** Orchestrator polls every 30 seconds, causing delays between stream completions and dependent stream starts.

**Solution:** Workers can trigger immediate start of dependent streams on completion.

**Workflow:**
```
Worker A completes → Calls start-ready-streams.py --completed-stream Stream-A
                  → Finds streams that depend on Stream-A
                  → Checks if all dependencies are satisfied
                  → Spawns workers for ready streams immediately
```

**Usage:**

```bash
# Manual check for ready streams
python .claude/orchestrator/start-ready-streams.py

# Check specific dependency chain
python .claude/orchestrator/start-ready-streams.py --completed-stream Stream-A
```

**Integration with workers:**
Workers can call this at completion to trigger dependent streams:
```python
import subprocess
subprocess.run([
    "python3", ".claude/orchestrator/start-ready-streams.py",
    "--completed-stream", "Stream-A"
])
```

**Benefits:**

| Scenario | Without Chaining | With Chaining |
|----------|------------------|---------------|
| Stream A → B,C | 0-30s delay | Immediate |
| A → B → C → D (chain) | Up to 90s delay | Immediate |
| Deep chains | Delay × depth | All immediate |

**Example impact:**
```
Without chaining:
T=0:00  Stream-A completes
T=0:30  Orchestrator polls, starts B and C
T=2:00  Stream-B completes
T=2:10  Stream-C completes
T=2:30  Orchestrator polls, starts D
Total delay: 60 seconds

With chaining:
T=0:00  Stream-A completes, immediately triggers B and C
T=2:00  Stream-B completes, checks D (not ready)
T=2:10  Stream-C completes, immediately triggers D
Total delay: 0 seconds
```

### 6. Worker Monitor Daemon (monitor-workers.py)

**Purpose:** Automatic detection and restart of crashed workers.

**Implementation:** `monitor-workers.py`

**Features:**
- Detects dead workers using zombie-aware process checking
- Auto-restart with configurable retry limits (default: 2)
- Respects stream dependencies (only restarts if dependencies complete)
- Supports one-shot and daemon modes

**Detection criteria:**

A worker is considered "dead" if:
- Log file exists (evidence of prior execution)
- Process is not running (verified with `ps -p`)
- Tasks are not complete
- Dependencies are satisfied (was eligible to run)

**Usage:**

```bash
# One-shot check (no restart)
python monitor-workers.py

# Background daemon with auto-restart
python monitor-workers.py --auto-restart

# Custom retry limit
python monitor-workers.py --auto-restart --max-restarts 3

# Daemon mode with custom interval
python monitor-workers.py --daemon --auto-restart --interval 60
```

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--auto-restart` | false | Enable automatic restart of dead workers |
| `--max-restarts` | 2 | Maximum restart attempts per worker |
| `--daemon` | false | Run as continuous background daemon |
| `--interval` | 30 | Check interval in seconds (daemon mode) |

**Restart behavior:**
- Tracks restart count per stream
- Logs each restart attempt with timestamp
- Gives up after max restarts reached
- Uses same worker-wrapper.sh for consistency

**Integration points:**
- Uses `task_copilot_client.py` for stream state
- Uses `worker-wrapper.sh` for spawning
- Respects initiative scoping
- Logs to `.claude/orchestrator/logs/monitor.log`

### 7. Auto-Restart in watch-status

**Purpose:** Integrated auto-restart during live monitoring.

**Implementation:** `watch-status` bash script

**Behavior:**
- Automatically calls `monitor-workers.py --auto-restart` on each refresh
- Only shows output if action taken (quiet mode)
- Can be disabled with `--no-auto-restart` flag
- Detects initiative completion and displays celebration

**Usage:**

```bash
# Default: auto-restart enabled, 15s interval
./watch-status

# Custom interval with auto-restart
./watch-status 5

# Disable auto-restart
./watch-status --no-auto-restart

# Custom interval without auto-restart
./watch-status 10 --no-auto-restart
```

**Display:**
```
Starting live status monitor (refresh every 15s)
Auto-restart: enabled (use --no-auto-restart to disable)
Press Ctrl-C to stop

PROJECT-NAME                                          62% ✓32 ⚙4 ○15
Current Initiative
Implement user authentication with OAuth
═══════════════════════════════════════════════════════════════════════════
Stream-A [===============] 100%  ✓  7        DONE  2h31m  Foundation
Stream-B [==========-----]  70%  ✓  7  ⚙ 1  RUN   1h45m  API Layer
Stream-C [========-------]  40%  ✓  2  ⚙ 1  RUN     52m  UI Components
Stream-Z [---------------]   0%  ✓  0     ○ 3  ---    ---  Integration
═══════════════════════════════════════════════════════════════════════════
Workers: 2 | Data: Task Copilot + Memory Copilot (initiative-scoped) | 16:42:11
```

**Initiative completion detection:**

When all streams reach 100%:
```
╔═════════════════════════════════════════════════════════════════════════════╗
║                       🎉 INITIATIVE COMPLETE 🎉                             ║
╚═════════════════════════════════════════════════════════════════════════════╝

All streams completed. Streams have been archived for this initiative.

Clearing in 30s... (Ctrl-C to keep viewing)
```

After countdown:
```
╔═════════════════════════════════════════════════════════════════════════════╗
║                    Ready for Next Initiative                                ║
╚═════════════════════════════════════════════════════════════════════════════╝

Previous initiative completed and archived.
Run '/orchestrate generate' to start a new initiative.
```

**Benefits:**
- Continuous monitoring with automatic recovery
- No separate daemon process needed
- Clear visibility into restart actions
- Celebration display for completed work
- Graceful handling of initiative boundaries

## Reliability Best Practices

### 1. Always Use watch-status for Monitoring

✅ **Correct:**
```bash
./watch-status  # Auto-restart enabled by default
```

❌ **Wrong:**
```bash
# Just checking status without monitoring
python .claude/orchestrator/check-streams
```

**Why:** watch-status includes auto-restart and completion detection.

### 2. Monitor Logs for Restart Activity

Check monitor log for restart patterns:
```bash
tail -f .claude/orchestrator/logs/monitor.log
```

**Look for:**
- Repeated restarts (may indicate deeper issues)
- Max restart limit reached (needs investigation)
- Consistent failures on specific streams

### 3. Handle Max Restarts Gracefully

When a worker hits max restarts:
1. Check the worker log: `tail .claude/orchestrator/logs/Stream-A_abc12345.log`
2. Identify the failure cause (dependency, environment, code issue)
3. Fix the underlying issue
4. Manually restart: `python .claude/orchestrator/orchestrate.py start Stream-A`

### 4. Use Worker Chaining for Deep Dependencies

For deep dependency chains (A → B → C → D → E):
- Recommend workers call `start-ready-streams.py` on completion
- Reduces total execution time by eliminating polling delays
- Especially beneficial for sequential dependencies

### 5. Clean Logs Periodically

Logs accumulate in `.claude/orchestrator/logs/`:
```bash
# Archive old logs
mv .claude/orchestrator/logs/*.log .claude/orchestrator/logs/archive/

# Or delete logs older than 30 days
find .claude/orchestrator/logs -name "*.log" -mtime +30 -delete
```

## Troubleshooting Reliability Issues

### Worker Keeps Restarting

**Symptoms:** Monitor log shows repeated restarts for same stream.

**Causes:**
- Task blocking on missing dependency
- Environment issue (missing package, permissions)
- Bug in worker code causing crash

**Solution:**
```bash
# Check worker log for errors
tail -50 .claude/orchestrator/logs/Stream-A_abc12345.log

# Check Task Copilot state
python .claude/orchestrator/orchestrate.py status

# Check dependencies are truly complete
python .claude/orchestrator/check_streams_data.py
```

### Zombie Processes Detected

**Symptoms:** Log shows "Process is zombie or doesn't exist".

**Cause:** Worker terminated abnormally (killed, segfault, OOM).

**Solution:**
- Stale PID files are automatically cleaned up
- Worker will be detected as dead and restarted
- Check system logs for OOM or crash indicators:
  ```bash
  dmesg | grep -i "killed process"
  ```

### Stale PID Files After Crash

**Symptoms:** Orchestrator reports "already running" but no process exists.

**Solution:**
- This is now automatically fixed on startup
- Stale PID cleanup runs before any workers spawn
- If issue persists, manually clean:
  ```bash
  rm .claude/orchestrator/pids/*.pid
  ```

### Worker Not Auto-Restarting

**Symptoms:** Dead worker not detected by monitor.

**Check:**
1. Is auto-restart enabled?
   ```bash
   # Should show "Auto-restart: enabled"
   ./watch-status
   ```

2. Has worker hit max restarts?
   ```bash
   grep "max restart limit" .claude/orchestrator/logs/monitor.log
   ```

3. Are dependencies satisfied?
   ```bash
   python .claude/orchestrator/orchestrate.py status
   ```

### Initiative Completion Not Detected

**Symptoms:** All streams at 100% but watch-status doesn't show completion.

**Check:**
```bash
# Check raw data
python .claude/orchestrator/check_streams_data.py

# Should show:
# ALL_STREAMS_COMPLETE
```

**Possible causes:**
- Streams from different initiative still in database (check archival)
- Task not properly marked completed in Task Copilot
- Cache issue in Task Copilot client

**Solution:**
```bash
# Verify in Task Copilot
python -c "
from task_copilot_client import TaskCopilotClient
tc = TaskCopilotClient('your-project')
for stream in tc.stream_list():
    progress = tc.stream_get(stream.stream_id)
    print(f'{stream.stream_id}: {progress.completion_percentage}%')
"
```

## See Also

- **Command Reference:** [.claude/commands/orchestrate.md](../../.claude/commands/orchestrate.md)
- **Full Guide:** [01-orchestration-guide.md](./01-orchestration-guide.md)
- **Stream Management:** [mcp-servers/task-copilot/README.md](../../mcp-servers/task-copilot/README.md)
- **Integration Tests:** [tests/integration/orchestration-lifecycle.test.ts](../../tests/integration/orchestration-lifecycle.test.ts)

---

*Updated: January 2026 - Post v1.7.1 with initiative-scoped filtering and reliability improvements*
