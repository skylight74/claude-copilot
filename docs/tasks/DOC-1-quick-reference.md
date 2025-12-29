# DOC-1: Quick Reference Card

**Priority:** P0
**Agent:** @agent-doc
**Status:** Not Started
**Depends On:** None

---

## Description

Create a one-page quick reference card for Claude Copilot, similar to claude-howto's QUICK_REFERENCE.md. This should be the go-to document for experienced users who need a quick reminder.

## Acceptance Criteria

- [ ] Single markdown file, suitable for printing
- [ ] Feature → Command → Example format
- [ ] Decision matrix: "I want to..." → use this
- [ ] Installation commands for each component
- [ ] File locations reference
- [ ] Common troubleshooting

## Reference

Study: `/docs/claude-howto-reference/QUICK_REFERENCE.md`

## Output

File: `/docs/QUICK-REFERENCE.md`

---

## Subtasks

### DOC-1.1: Create Structure
**Agent:** @agent-doc

Create the document structure with sections:
- Installation Quick Commands
- Feature Cheat Sheet
- Common Use Cases
- File Locations Reference
- Quick Troubleshooting

### DOC-1.2: Installation Commands Section
**Agent:** @agent-doc

Document installation for:
- Memory Copilot setup
- Skills Copilot setup
- Agent installation
- Command installation
- Extension setup

### DOC-1.3: Decision Matrix
**Agent:** @agent-doc

Create "I want to..." table:
| I want to... | Use this | Command/File |
|--------------|----------|--------------|
| Resume work | Memory | /continue |
| Get expert help | Agents | /protocol |
| Add company docs | Extensions | /knowledge-copilot |
| etc. | | |

### DOC-1.4: File Locations
**Agent:** @agent-doc

Document all file locations:
- Project level: .claude/, .mcp.json, CLAUDE.md
- User level: ~/.claude/
- Machine level: ~/.claude/copilot/
- Memory storage: ~/.claude/memory/

### DOC-1.5: Review and Polish
**Agent:** @agent-doc

- Ensure consistency with QUICK_REFERENCE.md format
- Test all commands work
- Verify file paths are correct
- Keep to one printable page

---

## Implementation Notes

- Use tables extensively (they're scannable)
- Keep descriptions to one line
- Include actual working commands
- Reference existing docs for details
