# SETUP-1: Unified Setup Command

**Priority:** P1
**Agent:** @agent-me
**Status:** Not Started
**Depends On:** SETUP-3 (Template Variables)

---

## Description

Create a single `/setup-copilot` command that auto-detects context and runs the appropriate setup. Eliminates the need for users to know about machine vs project setup distinction.

## Acceptance Criteria

- [ ] Detects if running from ~/.claude/copilot (machine setup)
- [ ] Detects if project already configured (update mode)
- [ ] Otherwise runs project setup
- [ ] No directory switching required
- [ ] Clear feedback on what mode was detected
- [ ] Works from any directory

## Output

Files:
- `/.claude/commands/setup-copilot.md` (global command)
- Updates to `/templates/` as needed

---

## Subtasks

### SETUP-1.1: Context Detection Logic
**Agent:** @agent-me

Implement detection:
```bash
# Pseudo-logic
if [ "$PWD" = "$HOME/.claude/copilot" ]; then
  MODE="machine"
elif [ -f ".mcp.json" ]; then
  MODE="update"
else
  MODE="project"
fi
```

### SETUP-1.2: Machine Setup Mode
**Agent:** @agent-me

When in ~/.claude/copilot:
- Run existing /setup logic
- Build MCP servers
- Install global commands
- Set up user-level configs

### SETUP-1.3: Project Setup Mode
**Agent:** @agent-me

When in any other directory:
- Run existing /setup-project logic
- Use template variables (SETUP-3)
- Create .mcp.json
- Copy agents and commands

### SETUP-1.4: Update Mode
**Agent:** @agent-me

When .mcp.json exists:
- Check for newer templates
- Update commands if changed
- Preserve user customizations
- Report what was updated

### SETUP-1.5: User Feedback
**Agent:** @agent-me

Clear messaging:
```
Detected: Project directory (no existing config)
Running: Project setup

[Progress messages...]

Done! Run /protocol to start working.
```

### SETUP-1.6: Install to Global Commands
**Agent:** @agent-me

Ensure command is available everywhere:
- Copy to ~/.claude/commands/
- Works before project setup

---

## Implementation Notes

- Reuse existing setup logic, don't duplicate
- Prefer composition over copying code
- Test in fresh environment
- Handle edge cases (partial setup, etc.)
