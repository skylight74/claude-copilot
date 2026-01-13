#!/bin/bash
# Update all Claude Copilot projects with latest commands and agents
# This is a quick batch update script - run /update-project in each for full verification

COPILOT_PATH="$HOME/.claude/copilot"
PROJECTS=(
    "/Users/pabs/Sites/PERSONAL/notion-copilot"
    "/Users/pabs/Sites/PERSONAL/wedding-copilot"
    "/Users/pabs/Sites/THS/h3"
    "/Users/pabs/Sites/COPILOT/playground"
    "/Users/pabs/Sites/COPILOT/n8n-copilot"
    "/Users/pabs/Sites/COPILOT/insights-copilot"
    "/Users/pabs/Sites/COPILOT/research-copilot"
    "/Users/pabs/Sites/COPILOT/thought-leadership"
    "/Users/pabs/Sites/COPILOT/preflight-copilot"
    "/Users/pabs/Sites/COPILOT/solution-copilot"
    "/Users/pabs/Sites/COPILOT/courage"
    "/Users/pabs/Sites/COPILOT/lars-website"
    "/Users/pabs/Sites/COPILOT/ai-copilot"
    "/Users/pabs/Sites/COPILOT/force-readiness-assessment"
)

echo "========================================"
echo "Claude Copilot Batch Project Update"
echo "========================================"
echo ""

# Verify source exists
if [ ! -d "$COPILOT_PATH" ]; then
    echo "ERROR: Claude Copilot not found at $COPILOT_PATH"
    exit 1
fi

UPDATED=0
SKIPPED=0
FAILED=0

for PROJECT in "${PROJECTS[@]}"; do
    PROJECT_NAME=$(basename "$PROJECT")

    # Check if project exists
    if [ ! -d "$PROJECT" ]; then
        echo "SKIP: $PROJECT_NAME (directory not found)"
        ((SKIPPED++))
        continue
    fi

    # Check if .mcp.json exists
    if [ ! -f "$PROJECT/.mcp.json" ]; then
        echo "SKIP: $PROJECT_NAME (no .mcp.json - not a Claude Copilot project)"
        ((SKIPPED++))
        continue
    fi

    echo "Updating: $PROJECT_NAME"

    # Create directories if needed
    mkdir -p "$PROJECT/.claude/commands" 2>/dev/null
    mkdir -p "$PROJECT/.claude/agents" 2>/dev/null

    # Update commands (7 project-level commands)
    cp "$COPILOT_PATH/.claude/commands/protocol.md" "$PROJECT/.claude/commands/" 2>/dev/null
    cp "$COPILOT_PATH/.claude/commands/continue.md" "$PROJECT/.claude/commands/" 2>/dev/null
    cp "$COPILOT_PATH/.claude/commands/pause.md" "$PROJECT/.claude/commands/" 2>/dev/null
    cp "$COPILOT_PATH/.claude/commands/map.md" "$PROJECT/.claude/commands/" 2>/dev/null
    cp "$COPILOT_PATH/.claude/commands/memory.md" "$PROJECT/.claude/commands/" 2>/dev/null
    cp "$COPILOT_PATH/.claude/commands/extensions.md" "$PROJECT/.claude/commands/" 2>/dev/null
    cp "$COPILOT_PATH/.claude/commands/orchestrate.md" "$PROJECT/.claude/commands/" 2>/dev/null

    # Update agents (all 12+ agents)
    cp "$COPILOT_PATH/.claude/agents/"*.md "$PROJECT/.claude/agents/" 2>/dev/null

    if [ $? -eq 0 ]; then
        COMMANDS_COUNT=$(ls "$PROJECT/.claude/commands/"*.md 2>/dev/null | wc -l | tr -d ' ')
        AGENTS_COUNT=$(ls "$PROJECT/.claude/agents/"*.md 2>/dev/null | wc -l | tr -d ' ')
        echo "  ✓ Updated: $COMMANDS_COUNT commands, $AGENTS_COUNT agents"
        ((UPDATED++))
    else
        echo "  ✗ Failed to update"
        ((FAILED++))
    fi
done

echo ""
echo "========================================"
echo "Summary"
echo "========================================"
echo "Updated: $UPDATED projects"
echo "Skipped: $SKIPPED projects"
echo "Failed:  $FAILED projects"
echo ""
echo "Next steps:"
echo "1. Open a project in Claude Code"
echo "2. Run /continue or /protocol to verify"
echo "3. Check that /map, /pause work"
echo ""
