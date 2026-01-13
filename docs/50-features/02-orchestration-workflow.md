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

## See Also

- **Command Reference:** [.claude/commands/orchestrate.md](../../.claude/commands/orchestrate.md)
- **Full Guide:** [01-orchestration-guide.md](./01-orchestration-guide.md)
- **Stream Management:** [mcp-servers/task-copilot/README.md](../../mcp-servers/task-copilot/README.md)
- **Integration Tests:** [tests/integration/orchestration-lifecycle.test.ts](../../tests/integration/orchestration-lifecycle.test.ts)

---

*Updated: January 2026 - Post v1.7.1 with initiative-scoped filtering*
