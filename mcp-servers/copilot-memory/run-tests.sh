#!/bin/bash
# Test runner for copilot-memory integration tests
# Usage: ./run-tests.sh

set -e

echo "Building TypeScript..."
npm run build

echo ""
echo "Running integration tests..."
npm test

echo ""
echo "✓ All tests passed!"
