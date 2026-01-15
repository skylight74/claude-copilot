#!/usr/bin/env bash
# Quick test script for validate-setup.py

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATE_SCRIPT="${SCRIPT_DIR}/validate-setup.py"

echo "Testing validate-setup.py..."
echo

# Test 1: Basic run (should work in this project)
echo "Test 1: Basic validation run"
echo "========================================"
python3 "$VALIDATE_SCRIPT" || {
    echo "FAIL: Basic run failed"
    exit 1
}
echo

# Test 2: Verbose mode
echo "Test 2: Verbose mode"
echo "========================================"
python3 "$VALIDATE_SCRIPT" --verbose || {
    echo "FAIL: Verbose mode failed"
    exit 1
}
echo

# Test 3: Help text
echo "Test 3: Help text"
echo "========================================"
python3 "$VALIDATE_SCRIPT" --help || {
    echo "FAIL: Help text failed"
    exit 1
}
echo

echo "=========================================="
echo "All tests passed!"
echo "=========================================="
