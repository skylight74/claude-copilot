# Claude Copilot Setup Guide

## Quick Start

### Step 1: Clone the Repository

```bash
mkdir -p ~/.claude
cd ~/.claude
git clone https://github.com/Everyone-Needs-A-Copilot/claude-copilot.git copilot
```

### Step 2: Open Claude Code in the Copilot Directory

```bash
cd ~/.claude/copilot
claude
```

### Step 3: Run Setup

```
/setup
```

The setup wizard will:
- Check prerequisites (Node.js, build tools)
- Build the MCP servers
- Install global commands (`/setup` and `/knowledge-copilot` work anywhere)
- Guide you through configuration

### Step 4: Set Up Projects

Open Claude Code in any project and run:

```
/setup
```

### Step 5: (Optional) Set Up Shared Knowledge

```
/knowledge-copilot
```

This creates a knowledge repository for company/product information that's shared across all projects.

---

## What Gets Installed

### Machine Level (`~/.claude/copilot/`)

| Component | Purpose |
|-----------|---------|
| `mcp-servers/copilot-memory/` | Persistent memory across sessions |
| `mcp-servers/skills-copilot/` | On-demand skill loading + knowledge search |
| `.claude/agents/` | 12 specialized agent definitions |
| `.claude/commands/` | Slash commands |
| `templates/` | Project setup templates |

### User Level (`~/.claude/commands/`)

| Component | Purpose |
|-----------|---------|
| `setup.md` | `/setup` command - works in any folder |
| `knowledge-copilot.md` | `/knowledge-copilot` command - works in any folder |

### Project Level

| File/Directory | Purpose |
|----------------|---------|
| `.mcp.json` | MCP server configuration |
| `CLAUDE.md` | Project-specific instructions |
| `.claude/commands/` | Slash commands (/protocol, /continue) |
| `.claude/agents/` | Agent definitions |
| `.claude/skills/` | Project-specific skills |

### Machine Level (Optional)

| Location | Purpose |
|----------|---------|
| `~/.claude/knowledge/` | Symlink to your knowledge repository |
| `~/[company]-knowledge/` | Your actual knowledge repo (Git-managed) |

---

## Manual Setup (Alternative)

If you prefer to run setup steps manually instead of using `/setup`:

### Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | 18+ | `node --version` |
| Build tools | - | `xcode-select -p` (macOS) |

**Install build tools (macOS):**
```bash
xcode-select --install
```

### Build MCP Servers

```bash
# Memory server
cd ~/.claude/copilot/mcp-servers/copilot-memory
npm install
npm run build

# Skills server
cd ~/.claude/copilot/mcp-servers/skills-copilot
npm install
npm run build
```

### Project Setup

1. Create directories:
   ```bash
   mkdir -p .claude/commands .claude/agents .claude/skills
   ```

2. Copy commands and agents:
   ```bash
   cp ~/.claude/copilot/.claude/commands/*.md .claude/commands/
   cp ~/.claude/copilot/.claude/agents/*.md .claude/agents/
   ```

3. Create `.mcp.json` (replace `/Users/yourname` with actual path):
   ```json
   {
     "mcpServers": {
       "copilot-memory": {
         "command": "node",
         "args": ["/Users/yourname/.claude/copilot/mcp-servers/copilot-memory/dist/index.js"],
         "env": {
           "MEMORY_PATH": "/Users/yourname/.claude/memory",
           "WORKSPACE_ID": "your-project-name"
         }
       },
       "skills-copilot": {
         "command": "node",
         "args": ["/Users/yourname/.claude/copilot/mcp-servers/skills-copilot/dist/index.js"],
         "env": {
           "LOCAL_SKILLS_PATH": "./.claude/skills"
         }
       }
     }
   }
   ```

4. Create `CLAUDE.md` from template at `~/.claude/copilot/templates/CLAUDE.template.md`

5. Restart Claude Code

---

## Verification

After setup, run `/mcp` in Claude Code. You should see:
```
● copilot-memory
● skills-copilot
```

Then try:
- `/protocol` - Start working
- `/continue` - Resume previous work

---

## Troubleshooting

### Build Fails

**Native module errors:**
```bash
xcode-select --install  # macOS
cd ~/.claude/copilot/mcp-servers/copilot-memory
npm rebuild better-sqlite3
npm run build
```

### MCP Servers Not Connecting

1. Check `.mcp.json` uses absolute paths (not `~`)
2. Verify the dist/index.js files exist
3. Restart Claude Code

### Commands Not Found

Verify `.claude/commands/` contains `protocol.md` and `continue.md`

---

## Environment Variables

### Memory Copilot

| Variable | Default | Purpose |
|----------|---------|---------|
| `MEMORY_PATH` | `~/.claude/memory` | Database storage location |
| `WORKSPACE_ID` | Auto-hash | Unique project identifier |

### Skills Copilot

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOCAL_SKILLS_PATH` | `./.claude/skills` | Project skills |
| `SKILLSMP_API_KEY` | - | Access to 25K+ public skills |
| `POSTGRES_URL` | - | Team-shared private skills |
| `KNOWLEDGE_REPO_PATH` | - | Project-specific knowledge |
| `GLOBAL_KNOWLEDGE_PATH` | `~/.claude/knowledge` | Machine-wide knowledge |

---

## Knowledge Repository

Claude Copilot supports shared knowledge that's available across all projects.

### Quick Setup

Run `/knowledge-copilot` for guided setup that:
1. Creates a Git repository for your knowledge
2. Guides you through documenting company/voice/products/standards
3. Helps you push to GitHub for team sharing
4. Links to `~/.claude/knowledge` for automatic access

### Manual Setup

```bash
# Create and link
mkdir -p ~/my-company-knowledge
ln -sf ~/my-company-knowledge ~/.claude/knowledge

# Create manifest (required)
echo '{"version":"1.0","name":"my-company","description":"Company knowledge"}' > ~/.claude/knowledge/knowledge-manifest.json
```

### Team Members

```bash
# Clone team knowledge repo
git clone git@github.com:org/company-knowledge.git ~/company-knowledge

# Link it
ln -sf ~/company-knowledge ~/.claude/knowledge
```

---

## Next Steps

After setup:
1. **Start working:** `/protocol`
2. **Resume work:** `/continue`
3. **Set up knowledge:** `/knowledge-copilot` (optional but recommended)
