# Continue Previous Work

Resume a conversation by loading context from Memory Copilot and Task Copilot.

## Step 1: Load Context (Slim)

Load minimal context to preserve token budget:

1. **From Memory Copilot** (permanent knowledge):
   ```
   initiative_get() → currentFocus, nextAction, decisions, lessons
   ```

2. **From Task Copilot** (work progress):
   ```
   progress_summary() → PRD counts, task status, recent activity
   ```

3. If no initiative exists, ask user what they're working on and call `initiative_start`

**Important:** Do NOT load full task lists. Use `progress_summary` for compact status.

## Step 2: Activate Protocol

**The Agent-First Protocol is now active.**

### Your Obligations

1. **Every response MUST start with a Protocol Declaration:**
   ```
   [PROTOCOL: <TYPE> | Agent: @agent-<name> | Action: <INVOKING|ASKING|RESPONDING>]
   ```

2. **You MUST invoke agents BEFORE responding with analysis or plans**

3. **You MUST NOT:**
   - Skip the protocol declaration
   - Say "I'll use @agent-X" without actually invoking it
   - Read files yourself instead of using agents
   - Write plans before agent investigation completes
   - Load full task lists into context

### Request Type to Agent Mapping

| Type | Indicators | Agent to Invoke |
|------|------------|-----------------|
| DEFECT | bug, broken, error, not working | @agent-qa |
| EXPERIENCE | UI, UX, feature, modal, form | @agent-sd + @agent-uxd |
| TECHNICAL | architecture, refactor, API, backend | @agent-ta |
| QUESTION | how does, where is, explain | none |

## Step 3: Present Status (Compact)

Present a compact summary (~300 tokens max):

```
## Resuming: [Initiative Name]

**Status:** [IN PROGRESS / BLOCKED / READY FOR REVIEW]

**Progress:** [X/Y tasks complete] | [Z work products]

**Current Focus:** [From initiative.currentFocus]

**Next Action:** [From initiative.nextAction]

**Recent Decisions:**
- [Key decisions from Memory Copilot]

**Recent Activity:**
- [From Task Copilot progress_summary]
```

**Do NOT list all completed/in-progress tasks.** That data lives in Task Copilot.

## Step 4: Ask

End with: "Protocol active. What would you like to work on?"

## During Session

### Routing to Agents

Pass task IDs when invoking agents:
```
[PROTOCOL: TECHNICAL | Agent: @agent-ta | Action: INVOKING]

Please complete TASK-xxx: <brief description>
```

Agents will store work products in Task Copilot and return minimal summaries.

### Progress Updates

Use Task Copilot for task management:
- `task_update({ id, status, notes })` - Update task status
- `progress_summary()` - Check overall progress

Use Memory Copilot for permanent knowledge:
- `memory_store({ type: "decision", content })` - Strategic decisions
- `memory_store({ type: "lesson", content })` - Key learnings

## End of Session

Update Memory Copilot with **slim context only**:

```
initiative_update({
  currentFocus: "Brief description of current focus",  // 100 chars max
  nextAction: "Specific next step: TASK-xxx",          // 100 chars max
  decisions: [{ decision, rationale }],                // Strategic only
  lessons: [{ lesson, context }],                      // Key learnings only
  keyFiles: ["important/files/touched.ts"]
})
```

**Do NOT store in Memory Copilot:**
- `completed` - Lives in Task Copilot (task status = completed)
- `inProgress` - Lives in Task Copilot (task status = in_progress)
- `blocked` - Lives in Task Copilot (task status = blocked)
- `resumeInstructions` - Replaced by `currentFocus` + `nextAction`

### If Initiative is Bloated

If `initiative_get` returns a bloated initiative (many tasks inline):

1. Call `initiative_slim({ archiveDetails: true })` to migrate
2. Archive is saved to `~/.claude/memory/archives/`
3. Continue with slim initiative

This ensures the next session loads quickly with minimal context usage.
