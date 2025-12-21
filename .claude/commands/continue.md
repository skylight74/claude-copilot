# Continue Previous Work

Resume a conversation by loading context from Memory Copilot and activating the Agent-First Protocol.

## Step 1: Load Initiative Context

Use the `copilot-memory` MCP server to retrieve context:

1. Call `initiative_get` to retrieve the current initiative
2. Call `memory_search` with query "recent context decisions" for additional context
3. If no initiative exists, ask user what they're working on and call `initiative_start`

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

### Request Type to Agent Mapping

| Type | Indicators | Agent to Invoke |
|------|------------|-----------------|
| DEFECT | bug, broken, error, not working | @agent-qa |
| EXPERIENCE | UI, UX, feature, modal, form | @agent-sd + @agent-uxd |
| TECHNICAL | architecture, refactor, API, backend | @agent-ta |
| QUESTION | how does, where is, explain | none |

## Step 3: Present Status

After loading the initiative, present a summary:

```
## Resuming: [Initiative Name]

**Status:** [IN PROGRESS / BLOCKED / READY FOR REVIEW / COMPLETE]

**Completed:**
- [List key completed items]

**In Progress:**
- [Current tasks]

**Recent Context:**
- [Relevant memories: decisions, lessons, key files]

**Resume Instructions:**
[What to do next]
```

## Step 4: Ask

End with: "Protocol active. What would you like to work on?"

## Updating Initiative During Session

When work progresses, update the initiative:

- Call `initiative_update` with progress as you work
- Call `memory_store` for decisions and lessons learned
- Use `type: "decision"` for choices made and rationale
- Use `type: "lesson"` for insights and gotchas

## End of Session

Before ending work, call `initiative_update` with:

| Field | Content |
|-------|---------|
| `completed` | Tasks finished this session |
| `inProgress` | Current state of work |
| `resumeInstructions` | Specific next steps for resuming |
| `lessons` | Insights gained |
| `decisions` | Choices made and rationale |
| `keyFiles` | Important files touched |

This ensures the next session can seamlessly continue where you left off.
