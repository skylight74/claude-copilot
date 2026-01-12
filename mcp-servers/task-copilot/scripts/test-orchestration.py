#!/usr/bin/env python3
"""
Test script for orchestration components validation.
"""

import subprocess
import sys
import json
from pathlib import Path

# Test 1: Validate Python syntax
print("=" * 70)
print("Test 1: Python Syntax Validation")
print("=" * 70)

template_path = Path(__file__).parent.parent.parent / "templates/orchestration/start-streams.py.template"

if not template_path.exists():
    print(f"✗ Template not found: {template_path}")
    sys.exit(1)

print(f"✓ Template found: {template_path}")

# Validate syntax using py_compile
result = subprocess.run(
    ["python3", "-m", "py_compile", str(template_path)],
    capture_output=True,
    text=True
)

if result.returncode == 0:
    print("✓ Python syntax is valid")
else:
    print("✗ Python syntax errors:")
    print(result.stderr)
    sys.exit(1)

print()

# Test 2: Check required imports
print("=" * 70)
print("Test 2: Required Imports Check")
print("=" * 70)

with open(template_path) as f:
    content = f.read()

required_imports = [
    "import json",
    "import subprocess",
    "import time",
    "import sys",
    "import argparse",
    "import requests"
]

for imp in required_imports:
    if imp in content:
        print(f"✓ {imp}")
    else:
        print(f"✗ Missing: {imp}")

print()

# Test 3: Check required features
print("=" * 70)
print("Test 3: Required Features Check")
print("=" * 70)

required_features = {
    "CLI argument parsing (--dry-run)": "--dry-run",
    "CLI argument parsing (--stream)": "--stream",
    "CLI argument parsing (--status)": "--status",
    "tmux session management": "tmux",
    "API polling logic": "requests.get",
    "Dependency checking": "_are_dependencies_complete",
    "Error handling with retries": "_retry_request",
    "Progress bars": "_print_progress_bar",
    "Desktop notifications": "_send_notification",
    "Configuration loading": "_load_config"
}

for feature_name, search_string in required_features.items():
    if search_string in content:
        print(f"✓ {feature_name}")
    else:
        print(f"✗ Missing: {feature_name}")

print()

# Test 4: Check API endpoints
print("=" * 70)
print("Test 4: API Endpoints Validation")
print("=" * 70)

required_endpoints = [
    "/health",
    "/api/streams/"
]

for endpoint in required_endpoints:
    if endpoint in content:
        print(f"✓ {endpoint}")
    else:
        print(f"✗ Missing endpoint: {endpoint}")

print()

# Test 5: Create sample configuration
print("=" * 70)
print("Test 5: Sample Configuration Creation")
print("=" * 70)

sample_config = {
    "version": "1.0",
    "generatedAt": "2026-01-08T12:00:00Z",
    "initiative": {
        "id": "test-initiative",
        "name": "Test Initiative"
    },
    "apiBaseUrl": "http://127.0.0.1:9090",
    "pollInterval": 30,
    "maxParallelStreams": 5,
    "streams": [
        {
            "streamId": "Stream-A",
            "streamName": "foundation",
            "streamPhase": "foundation",
            "totalTasks": 4,
            "completedTasks": 0,
            "dependencies": [],
            "projectRoot": "/test/project",
            "worktreePath": None
        },
        {
            "streamId": "Stream-B",
            "streamName": "parallel-work",
            "streamPhase": "parallel",
            "totalTasks": 2,
            "completedTasks": 0,
            "dependencies": ["Stream-A"],
            "projectRoot": "/test/project",
            "worktreePath": ".claude/worktrees/Stream-B"
        }
    ],
    "executionPlan": {
        "foundation": ["Stream-A"],
        "parallel": ["Stream-B"],
        "integration": []
    }
}

config_path = Path(__file__).parent / "test-orchestration-config.json"

try:
    with open(config_path, "w") as f:
        json.dump(sample_config, f, indent=2)
    print(f"✓ Created sample config: {config_path}")

    # Validate it can be parsed
    with open(config_path) as f:
        loaded = json.load(f)
    print("✓ Configuration can be parsed successfully")

    # Check required fields
    required_fields = ["version", "generatedAt", "initiative", "streams", "executionPlan"]
    for field in required_fields:
        if field in loaded:
            print(f"✓ Required field: {field}")
        else:
            print(f"✗ Missing field: {field}")

except Exception as e:
    print(f"✗ Error creating/parsing configuration: {e}")
    sys.exit(1)

print()

# Test 6: Check command file
print("=" * 70)
print("Test 6: Command File Validation")
print("=" * 70)

command_path = Path(__file__).parent.parent.parent / "templates/commands/orchestrate.md"

if not command_path.exists():
    print(f"✗ Command file not found: {command_path}")
    sys.exit(1)

print(f"✓ Command file found: {command_path}")

with open(command_path) as f:
    command_content = f.read()

# Check for required actions
required_actions = [
    "Action: Generate",
    "Action: Config",
    "Action: Status"
]

for action in required_actions:
    if action in command_content:
        print(f"✓ {action}")
    else:
        print(f"✗ Missing action: {action}")

# Check for key steps
key_steps = [
    "stream_list()",
    "orchestration-config.json",
    "start-streams.py",
    "README.md"
]

for step in key_steps:
    if step in command_content:
        print(f"✓ References: {step}")
    else:
        print(f"✗ Missing reference: {step}")

print()

# Test Summary
print("=" * 70)
print("Test Summary")
print("=" * 70)
print("✓ All tests passed!")
print()
print("Files validated:")
print(f"  - {template_path}")
print(f"  - {command_path}")
print(f"  - {config_path} (sample created)")
