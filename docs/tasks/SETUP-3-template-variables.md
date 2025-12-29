# SETUP-3: Template Variables

**Priority:** P1
**Agent:** @agent-me
**Status:** Not Started
**Depends On:** None

---

## Description

Implement template variable expansion in .mcp.json and other config files. Eliminates the #1 setup error: manually editing absolute paths.

## Acceptance Criteria

- [ ] $HOME expansion in templates
- [ ] $PROJECT_PATH expansion
- [ ] $PROJECT_NAME expansion (directory name)
- [ ] No manual editing of absolute paths
- [ ] Works on macOS and Linux
- [ ] Clear error if expansion fails

## Output

Files:
- Update `/templates/*.json`
- Update `/.claude/commands/setup-project.md`
- Potentially: `/scripts/expand-template.sh`

---

## Subtasks

### SETUP-3.1: Define Variables
**Agent:** @agent-me

Standard variables:
| Variable | Expands To | Example |
|----------|------------|---------|
| $HOME | User home directory | /Users/pabs |
| $PROJECT_PATH | Current working directory | /Users/pabs/my-project |
| $PROJECT_NAME | Directory name | my-project |
| $COPILOT_PATH | Claude Copilot install | ~/.claude/copilot |

### SETUP-3.2: Update Templates
**Agent:** @agent-me

Update `/templates/mcp.template.json`:
```json
{
  "mcpServers": {
    "copilot-memory": {
      "command": "node",
      "args": ["$COPILOT_PATH/mcp-servers/copilot-memory/dist/index.js"],
      "env": {
        "MEMORY_PATH": "$HOME/.claude/memory",
        "WORKSPACE_ID": "$PROJECT_NAME"
      }
    }
  }
}
```

### SETUP-3.3: Expansion Script
**Agent:** @agent-me

Create or update expansion logic:
```bash
# In setup-project command
expand_template() {
  local template="$1"
  local output="$2"

  sed -e "s|\$HOME|$HOME|g" \
      -e "s|\$PROJECT_PATH|$PWD|g" \
      -e "s|\$PROJECT_NAME|$(basename $PWD)|g" \
      -e "s|\$COPILOT_PATH|$HOME/.claude/copilot|g" \
      "$template" > "$output"
}
```

### SETUP-3.4: Validation
**Agent:** @agent-me

After expansion, validate:
- All paths exist
- No unexpanded variables remain
- JSON is valid
- MCP servers can be found

### SETUP-3.5: Error Messages
**Agent:** @agent-me

Clear errors:
```
ERROR: Template expansion failed

Variable: $COPILOT_PATH
Expected: ~/.claude/copilot
Found: Directory does not exist

Fix: Run /setup from ~/.claude/copilot first
```

### SETUP-3.6: Cross-Platform Testing
**Agent:** @agent-qa

Test on:
- macOS (primary)
- Linux (if applicable)
- Different shell environments (bash, zsh)

---

## Implementation Notes

- Use sed for simplicity (available everywhere)
- Validate before writing final file
- Keep backup of old config if updating
- This unblocks SETUP-1 and SETUP-2
