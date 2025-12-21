# Claude Copilot

A complete AI-enabled development framework that solves the four biggest challenges with AI-assisted development.

## The Four Pillars

| Challenge | Solution | Pillar |
|-----------|----------|--------|
| **Lost context between sessions** | Persistent memory + semantic search | Memory Copilot |
| **Generic AI lacks expertise** | Specialized agents for complex tasks | Agents |
| **Manual skill management** | On-demand skill loading from multiple sources | Skills Copilot |
| **Inconsistent processes** | Battle-tested workflows | Protocol |

## Quick Start

### One-Time Setup (Per Machine)

```bash
# Clone to global location
mkdir -p ~/.claude
cd ~/.claude
git clone https://github.com/Everyone-Needs-A-Copilot/claude-copilot.git copilot

# Build MCP servers
cd copilot/mcp-servers/copilot-memory && npm install && npm run build
cd ../skills-copilot && npm install && npm run build
```

### Per-Project Setup

```bash
# Copy MCP configuration
cp ~/.claude/copilot/templates/mcp.json ./.mcp.json

# Create CLAUDE.md from template
cp ~/.claude/copilot/templates/CLAUDE.template.md ./CLAUDE.md
```

### Start Working

```bash
# In Claude Code, run:
/protocol    # Start fresh with Agent-First Protocol
/continue    # Resume previous work
```

## The Four Pillars Explained

### 1. Memory Copilot

**Problem:** Claude loses context between sessions, forcing manual note-taking and wasted tokens rebuilding context.

**Solution:** MCP server with persistent memory and semantic search.

```
/continue    # Loads previous initiative, decisions, and context
```

**Tools:**
- `initiative_get` - Retrieve current work state
- `initiative_update` - Save progress as you work
- `memory_store` - Store decisions and lessons
- `memory_search` - Find relevant past context

### 2. Agents

**Problem:** Generic AI responses lack specialized expertise for complex tasks.

**Solution:** 11 specialized agents with deep domain knowledge.

#### Technical Core

| Agent | Name | Purpose |
|-------|------|---------|
| `me` | Engineer | Feature implementation, bug fixes, code writing |
| `ta` | Tech Architect | System design, architecture decisions, task breakdown |
| `qa` | QA Engineer | Test plans, automated testing, quality assurance |
| `sec` | Security | Vulnerability analysis, security review, OWASP compliance |
| `doc` | Documentation | Technical writing, API docs, knowledge curation |
| `do` | DevOps | CI/CD, deployment, infrastructure, monitoring |

#### Human Advocates

| Agent | Name | Purpose |
|-------|------|---------|
| `sd` | Service Designer | Service blueprints, journey mapping, experience strategy |
| `uxd` | UX Designer | Interaction design, wireframes, usability, accessibility |
| `uids` | UI Designer | Visual design, design systems, typography, color |
| `uid` | UI Developer | Component implementation, responsive layouts, CSS |
| `cw` | Copywriter | UI copy, microcopy, error messages, content strategy |

**Usage:**
```
@agent-ta Design the architecture for user authentication
@agent-uxd Create a task flow for the checkout process
@agent-me Implement the login endpoint with JWT
```

### 3. Skills Copilot

**Problem:** Manual skill management wastes tokens and lacks consistency.

**Solution:** MCP server for on-demand skill loading from multiple sources.

**Sources:**
- **Local** - Skills in the repo
- **Cache** - Previously loaded skills (7-day TTL)
- **Private DB** - Proprietary methodology skills
- **SkillsMP** - 25,000+ public skills

**Tools:**
- `skill_get` - Load specific skill by name
- `skill_search` - Search across all sources
- `skill_list` - List available skills

### 4. Protocol

**Problem:** Ad-hoc development leads to missed steps and inconsistent quality.

**Solution:** `/protocol` and `/continue` commands enforcing proven workflows.

| Command | Purpose |
|---------|---------|
| `/protocol` | Start fresh work with Agent-First Protocol |
| `/continue` | Resume previous work via Memory Copilot |

**Agent-First Protocol:**
1. Every response starts with protocol declaration
2. Invoke agents BEFORE responding with analysis
3. Route to appropriate specialist for each task type

## Project Structure

```
claude-copilot/
├── .claude/
│   ├── agents/           # 11 specialized agents
│   ├── commands/         # /protocol and /continue
│   ├── skills/           # Local skill files
│   └── hooks/            # Automation hooks
├── mcp-servers/
│   ├── copilot-memory/   # Memory Copilot MCP server
│   └── skills-copilot/   # Skills Copilot MCP server
├── docs/
│   ├── operations/       # Development standards
│   ├── EXTENSION-SPEC.md # How to extend agents
│   └── knowledge-manifest-schema.json
├── templates/
│   ├── mcp.json          # MCP config template
│   └── CLAUDE.template.md
├── CLAUDE.md             # Framework configuration
└── README.md             # This file
```

## Extending with Knowledge Repositories

Claude Copilot works standalone with generic methodologies. For teams with proprietary methods, extend with a **knowledge repository**.

```
┌────────────────────────────────────────┐
│  Claude Copilot (Base Framework)       │
│  Generic industry methodologies        │
│  Works for any developer               │
└────────────────────────────────────────┘
                    ↓ extends
┌────────────────────────────────────────┐
│  Your Knowledge Repo (Optional)        │
│  Company-specific methodologies        │
│  Proprietary skills & practices        │
└────────────────────────────────────────┘
```

### Extension Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Override** | Replace base methodology | Fundamentally different approach |
| **Extension** | Add to base methodology | Company-specific additions |
| **Skills** | Inject additional skills | Extra capabilities |

See [docs/EXTENSION-SPEC.md](docs/EXTENSION-SPEC.md) for the complete specification.

## Session Management

### Starting Work

```bash
/protocol
```

Activates the Agent-First Protocol with:
- Protocol declarations on every response
- Automatic agent routing
- Structured workflow

### Resuming Work

```bash
/continue
```

Loads from Memory Copilot:
- Current initiative state
- Recent decisions and lessons
- Resume instructions

### End of Session

Call `initiative_update` with:
- `completed` - Tasks finished
- `inProgress` - Current state
- `resumeInstructions` - Next steps
- `lessons` - Insights gained
- `decisions` - Choices made
- `keyFiles` - Important files touched

## Philosophy

### Every Developer Deserves a Team

Solo developers shouldn't have to be experts in everything. Claude Copilot gives you access to specialized expertise when you need it.

### Human Advocates

The "Human Advocate" agents (SD, UXD, UIDS, UID, CW) represent disciplines that ensure your software serves real human needs. They have equal standing with technical agents.

### Memory That Persists

Your context shouldn't be lost between sessions. Memory Copilot ensures seamless continuity.

### Skills on Demand

Load what you need, when you need it. No token bloat from unused skills.

## Requirements

- Node.js 18+
- Claude Code CLI
- Git

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE)

---

Built by [Everyone Needs a Copilot](https://github.com/Everyone-Needs-A-Copilot)
