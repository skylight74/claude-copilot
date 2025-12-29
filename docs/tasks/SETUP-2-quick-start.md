# SETUP-2: 15-Minute Quick Start

**Priority:** P1
**Agent:** @agent-doc + @agent-me
**Status:** Not Started
**Depends On:** SETUP-1 (Unified Setup)

---

## Description

Create a minimal setup path that gets users to value in 15 minutes with memory only. No agents, no skills, no extensions - just the ability to /continue work between sessions.

## Acceptance Criteria

- [ ] Single command installs memory only
- [ ] No agents, skills, or extensions installed
- [ ] /continue works immediately
- [ ] Clear upgrade path to full framework
- [ ] Documentation explains what's included/excluded

## Output

Files:
- `/docs/QUICK-START.md` (documentation)
- `/templates/minimal-mcp.json` (memory-only config)
- Update to `/setup-copilot` to support --minimal flag

---

## Subtasks

### SETUP-2.1: Minimal MCP Template
**Agent:** @agent-me

Create memory-only .mcp.json:
```json
{
  "mcpServers": {
    "copilot-memory": {
      "command": "node",
      "args": ["$HOME/.claude/copilot/mcp-servers/copilot-memory/dist/index.js"],
      "env": {
        "MEMORY_PATH": "$HOME/.claude/memory",
        "WORKSPACE_ID": "$PROJECT_NAME"
      }
    }
  }
}
```

### SETUP-2.2: Quick Start Documentation
**Agent:** @agent-doc

Create `/docs/QUICK-START.md`:
- What you get (memory, /continue)
- What you don't get (agents, skills, extensions)
- Step-by-step setup (< 5 steps)
- "Try it now" verification
- Upgrade to full framework link

### SETUP-2.3: Minimal Setup Mode
**Agent:** @agent-me

Add --minimal flag to /setup-copilot:
```
/setup-copilot --minimal

Installing Memory Copilot only...
- Memory: ~/.claude/memory/
- Config: .mcp.json

Done! Use /continue to resume work between sessions.

Want more? Run /setup-copilot to install full framework.
```

### SETUP-2.4: Upgrade Path
**Agent:** @agent-me

When running full setup after minimal:
- Detect existing minimal config
- Preserve memory database
- Add agents, skills, extensions
- Update .mcp.json

### SETUP-2.5: Verification Steps
**Agent:** @agent-doc

Add to documentation:
```
## Verify It Works

1. Run: /continue
   Expected: "No active initiative found"

2. Say: "Start working on fixing login bug"
   Expected: Initiative created

3. Close Claude Code, reopen

4. Run: /continue
   Expected: Your initiative is restored!
```

---

## Implementation Notes

- This is the "gateway drug" to full framework
- Must be genuinely useful standalone
- Don't oversell - be honest about limitations
- Make upgrade seamless and non-destructive
