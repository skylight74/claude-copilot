# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

**Name:** [PROJECT_NAME]
**Description:** [PROJECT_DESCRIPTION]
**Stack:** [TECH_STACK]

---

## Claude Copilot

This project uses Claude Copilot for AI-enabled development.

### MCP Servers

| Server | Purpose |
|--------|---------|
| **copilot-memory** | Persistent memory and initiative tracking |
| **skills-copilot** | On-demand skill loading |

### Commands

| Command | Purpose |
|---------|---------|
| `/protocol` | Start fresh work with Agent-First Protocol |
| `/continue` | Resume previous work via Memory Copilot |

### Agents

Available agents in `~/.claude/copilot/.claude/agents/`:

| Agent | Purpose |
|-------|---------|
| `me` | General implementation, code writing, bug fixes |
| `ta` | Technical architecture, system design |
| `qa` | Testing, test plans, bug verification |
| `sec` | Security assessment, vulnerability analysis |
| `doc` | Documentation standards |
| `do` | DevOps, deployment |
| `sd` | Service design, customer journeys |
| `uxd` | UX design, interaction patterns |
| `uids` | UI design systems, visual design |
| `uid` | UI development, component styling |
| `cw` | Copywriting |

---

## Session Management

### Starting Work

Use `/protocol` to activate the Agent-First Protocol.

### Resuming Work

Use `/continue` to load context from Memory Copilot.

### End of Session

Call `initiative_update` with:
- `completed`: Tasks finished
- `inProgress`: Current state
- `resumeInstructions`: Next steps
- `lessons`: Insights gained
- `decisions`: Choices made
- `keyFiles`: Important files touched

---

## Development Standards

Follow the standards in `~/.claude/copilot/docs/operations/`:
- `development-standards.md`
- `security-guidelines.md`
- `documentation-guide.md`
- `working-protocol.md`

---

## Project-Specific Rules

[ADD YOUR PROJECT-SPECIFIC RULES HERE]
