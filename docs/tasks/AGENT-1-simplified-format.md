# AGENT-1: Simplified Agent Format

**Priority:** P2
**Agent:** @agent-ta
**Status:** Not Started
**Depends On:** None

---

## Description

Reduce agent files from ~200 lines to ~60 lines while preserving functionality. Move routing logic to protocol, focus agent files on identity and core behaviors.

## Acceptance Criteria

- [ ] Agent files reduced to ~60 lines
- [ ] Routing logic moved to protocol.md
- [ ] Functionality preserved (test with real tasks)
- [ ] Example output added to each agent
- [ ] Consistent format across all 12 agents

## Reference

Study: `/docs/claude-howto-reference/04-subagents/code-reviewer.md` (~60 lines)

## Output

Updates to all files in `/.claude/agents/`

---

## Subtasks

### AGENT-1.1: Define New Format
**Agent:** @agent-ta

New agent structure (~60 lines):
```yaml
---
name: agent-name
description: One-line description. Use PROACTIVELY when [trigger].
tools: Tool1, Tool2, Tool3
model: inherit
---

# Agent Name

You are a [role] specializing in [domain].

## When Invoked
1. [First action]
2. [Second action]
3. [Third action]

## Priorities (in order)
1. [Top priority]
2. [Second priority]
3. [Third priority]

## Output Format
[Template for deliverables]

## Example Output
[Concrete example of what agent produces]
```

### AGENT-1.2: Extract Routing to Protocol
**Agent:** @agent-ta

Move from agents to protocol.md:
- "Route To Other Agent" sections
- "Decision Authority" sections
- Inter-agent handoff rules

Update protocol.md with routing table:
```markdown
## Agent Routing

| From | To | When |
|------|-----|------|
| Any | @agent-ta | Architecture decisions |
| @agent-sd | @agent-uxd | After journey mapping |
| @agent-uxd | @agent-uids | After wireframes |
```

### AGENT-1.3: Simplify @agent-me
**Agent:** @agent-ta

Current: ~200 lines
Target: ~60 lines

Keep:
- Identity and mission
- Core behaviors (always/never)
- Output format

Remove:
- Verbose decision authority
- Detailed routing instructions
- Extensive examples

### AGENT-1.4: Simplify Design Agents
**Agent:** @agent-ta

Simplify: @agent-sd, @agent-uxd, @agent-uids, @agent-uid, @agent-cw

Focus on:
- What they do
- How they do it
- What they produce

### AGENT-1.5: Simplify Technical Agents
**Agent:** @agent-ta

Simplify: @agent-ta, @agent-qa, @agent-sec, @agent-doc, @agent-do

Same approach:
- Identity
- Priorities
- Output format
- Example

### AGENT-1.6: Add Example Outputs
**Agent:** @agent-ta

Each agent gets concrete example:
```markdown
## Example Output

### Security Review for auth/login.ts

**Critical Issues (1)**
- SQL injection in line 45: Use parameterized queries

**Warnings (2)**
- Missing rate limiting on login endpoint
- Password not hashed before comparison

**Suggestions (1)**
- Consider adding 2FA support
```

### AGENT-1.7: Validation
**Agent:** @agent-qa

Test each simplified agent:
- Invoke with real task
- Compare output quality to before
- Verify routing still works
- Check extension compatibility

---

## Implementation Notes

- Work on one agent at a time
- Test before moving to next
- Keep git history for rollback
- Document any functionality loss
- Balance brevity with clarity
