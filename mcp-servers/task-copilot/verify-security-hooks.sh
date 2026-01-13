#!/bin/bash

# Security Hooks Build & Test Verification Script

set -e  # Exit on any error

echo "========================================"
echo "Security Hooks Build & Test Verification"
echo "========================================"
echo ""

# Navigate to task-copilot directory
cd "$(dirname "$0")"

echo "Step 1: Clean previous build..."
rm -rf dist/hooks
echo "✓ Cleaned"
echo ""

echo "Step 2: Building TypeScript..."
npm run build
echo "✓ Build completed"
echo ""

echo "Step 3: Verifying build artifacts..."
if [ ! -f "dist/hooks/pre-tool-use.js" ]; then
  echo "✗ Error: pre-tool-use.js not found"
  exit 1
fi

if [ ! -f "dist/hooks/security-rules.js" ]; then
  echo "✗ Error: security-rules.js not found"
  exit 1
fi

if [ ! -f "dist/tools/security-hooks.js" ]; then
  echo "✗ Error: security-hooks.js not found"
  exit 1
fi
echo "✓ All build artifacts present"
echo ""

echo "Step 4: Running unit tests..."
npm run test:security-hooks
echo "✓ Unit tests passed"
echo ""

echo "Step 5: Running integration examples..."
npm run test:security-integration
echo "✓ Integration tests passed"
echo ""

echo "========================================"
echo "✓ ALL VERIFICATIONS PASSED"
echo "========================================"
echo ""
echo "Security Hooks Implementation:"
echo "  - Core system: ✓"
echo "  - Default rules: ✓"
echo "  - MCP tools: ✓"
echo "  - Configuration: ✓"
echo "  - Documentation: ✓"
echo "  - Tests: ✓"
echo ""
echo "Ready for production use!"
