# CMD-2: /extensions Command

**Priority:** P1
**Agent:** @agent-me
**Status:** Not Started
**Depends On:** None

---

## Description

Create an /extensions command that surfaces the extension system, making it discoverable. This is our biggest differentiator but currently hidden.

## Acceptance Criteria

- [ ] Shows global knowledge repo status
- [ ] Shows project knowledge repo status
- [ ] Lists active extensions by agent
- [ ] Explains extension types
- [ ] Provides setup guidance

## Output

File: `/.claude/commands/extensions.md`

---

## Subtasks

### CMD-2.1: Repository Status
**Agent:** @agent-me

Show both tiers:
```
## Knowledge Repositories

### Global (Machine-Level)
Location: ~/.claude/knowledge/
Status: Configured
Manifest: knowledge-manifest.json

### Project (This Directory)
Location: Not configured
Status: Using global only

Priority: Project > Global > Base agents
```

### CMD-2.2: Active Extensions
**Agent:** @agent-me

List what's active:
```
## Active Extensions

| Agent | Extension | Type | Source |
|-------|-----------|------|--------|
| @agent-sd | Moments Framework | override | Global |
| @agent-uxd | Company UX Standards | extension | Global |
| @agent-cw | Brand Voice Guide | skills | Global |
| @agent-ta | (base) | - | Framework |
```

### CMD-2.3: Extension Types
**Agent:** @agent-me

Explain each type:
```
## Extension Types

### override
Completely replaces the base agent with your version.
Use when: You have a proprietary methodology.

### extension
Adds to the base agent (section-level merge).
Use when: You want base + your additions.

### skills
Injects additional skills into the agent.
Use when: You have company-specific tools/patterns.
```

### CMD-2.4: Setup Guidance
**Agent:** @agent-me

Help users get started:
```
## Set Up Extensions

### Option 1: Global (All Projects)
Run /knowledge-copilot to create ~/.claude/knowledge/

### Option 2: Project-Specific
1. Create knowledge repo in your project
2. Add to .mcp.json:
   "KNOWLEDGE_REPO_PATH": "/path/to/knowledge"

### Learn More
See: docs/EXTENSION-SPEC.md
```

### CMD-2.5: No Extensions State
**Agent:** @agent-me

When nothing configured:
```
## Extension Status

No extensions configured.
Using base framework agents only.

## Why Use Extensions?

Extensions let you customize agents for your team:
- Override with company methodologies
- Add company-specific checklists
- Inject proprietary skills

## Get Started

Run /knowledge-copilot to set up shared knowledge.
```

### CMD-2.6: Validation Warnings
**Agent:** @agent-me

Show issues:
```
## Warnings

- @agent-sd extension requires skill "moments-framework" (not found)
  Fallback: Using base agent

- @agent-cw extension file not found: cw.extension.md
  Fallback: Using base agent
```

---

## Implementation Notes

- Use extension_list, extension_get, manifest_status MCP tools
- Show clear priority order
- Link to /knowledge-copilot for setup
- Make it actionable, not just informational
