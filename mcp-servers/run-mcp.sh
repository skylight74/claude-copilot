#!/bin/bash
# run-mcp.sh - MCP Server Launcher
# Resolves paths dynamically based on machine location
#
# Usage: ./mcp-servers/run-mcp.sh <server-path> [additional-args...]
# Example: ./mcp-servers/run-mcp.sh category/server-name/src/index.js

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# The server path is passed as the first argument
SERVER_PATH="$1"
shift  # Remove first arg, pass rest to node

if [ -z "$SERVER_PATH" ]; then
  echo "Usage: run-mcp.sh <server-path> [args...]" >&2
  echo "Example: run-mcp.sh dev-tools/git-mcp/src/index.js" >&2
  exit 1
fi

FULL_PATH="$SCRIPT_DIR/$SERVER_PATH"

if [ ! -f "$FULL_PATH" ]; then
  echo "Error: Server not found at $FULL_PATH" >&2
  echo "Available servers:" >&2
  find "$SCRIPT_DIR" -name "index.js" -o -name "index.ts" 2>/dev/null | sed "s|$SCRIPT_DIR/||g" >&2
  exit 1
fi

# Determine runtime based on file extension
case "$FULL_PATH" in
  *.ts)
    exec npx ts-node "$FULL_PATH" "$@"
    ;;
  *.js)
    exec node "$FULL_PATH" "$@"
    ;;
  *.py)
    exec python "$FULL_PATH" "$@"
    ;;
  *)
    echo "Error: Unknown file type for $FULL_PATH" >&2
    exit 1
    ;;
esac
