#!/bin/bash

# Verify protocol injection feature builds successfully

set -e

echo "=== Building Task Copilot ==="
cd mcp-servers/task-copilot
npm run build

echo ""
echo "✅ Build successful!"
echo ""
echo "=== Created Files ==="
echo "  .claude/hooks/session-start.json"
echo "  .claude/hooks/protocol-injection.md"
echo "  mcp-servers/task-copilot/src/tools/protocol.ts"
echo ""
echo "=== Modified Files ==="
echo "  mcp-servers/task-copilot/src/database.ts (added protocol_violations table)"
echo "  mcp-servers/task-copilot/src/types.ts (added ProtocolViolationRow)"
echo "  mcp-servers/task-copilot/src/index.ts (registered protocol tools)"
echo "  .claude/commands/memory.md (added violations section)"
echo "  .claude/hooks/README.md (documented SessionStart hook)"
echo ""
echo "=== New MCP Tools ==="
echo "  protocol_violation_log() - Log guardrail violations"
echo "  protocol_violations_get() - Query violations with filters"
echo ""
echo "=== Test Protocol Injection ==="
echo "  1. Restart Claude Code to trigger SessionStart hook"
echo "  2. Run: /memory"
echo "  3. Should see 'Protocol Violations' section"
echo ""
