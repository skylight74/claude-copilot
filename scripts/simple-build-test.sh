#!/bin/bash

echo "=== Testing Build: copilot-memory ==="
cd /Users/pabs/Sites/COPILOT/claude-copilot/mcp-servers/copilot-memory
npm run build
echo ""
echo "Exit code: $?"
echo ""
echo "Files in dist:"
ls -la dist/ 2>/dev/null || echo "No dist directory"
echo ""
echo "==================================="
