# QA-1: Smoke Test Suite

**Priority:** P2
**Agent:** @agent-qa
**Status:** In Progress
**Depends On:** None

---

## Description

Create automated smoke tests that validate the framework is correctly configured. The QA agent has already created initial tests - this task tracks completion and maintenance.

## Acceptance Criteria

- [ ] Tests each MCP server connectivity
- [ ] Tests agent file validity
- [ ] Tests extension resolution
- [ ] Tests command availability
- [ ] Runs in < 60 seconds
- [ ] Clear pass/fail output
- [ ] CI/CD integration ready

## Existing Work

QA agent created:
- `/docs/qa/framework-validation-strategy.md`
- `/docs/qa/TESTING.md`
- `/scripts/smoke-test.sh`
- `/scripts/integration-test.sh`

## Output

Complete and maintain files in `/docs/qa/` and `/scripts/`

---

## Subtasks

### QA-1.1: Review Existing Tests
**Agent:** @agent-qa
**Status:** Done

Initial smoke tests created:
- 81 automated checks
- Found 3 real issues on first run
- 96% pass rate

### QA-1.2: Fix Identified Issues
**Agent:** @agent-me

Issues found by smoke tests:
1. Knowledge Copilot agent missing routing section
2. Knowledge Copilot agent missing decision authority
3. 6 time estimate policy violations

### QA-1.3: MCP Connectivity Tests
**Agent:** @agent-qa

Verify MCP servers respond:
```bash
# Memory Copilot
claude -p "Call health_check from copilot-memory"

# Skills Copilot
claude -p "Call skills_hub_status from skills-copilot"
```

### QA-1.4: Agent Validation
**Agent:** @agent-qa

For each agent file:
- Valid YAML frontmatter
- Required fields present (name, description, tools)
- No time estimates in content
- Routing section exists (if required)

### QA-1.5: Extension Tests
**Agent:** @agent-qa

Test extension resolution:
- Global knowledge repo detection
- Project knowledge repo priority
- Override vs extension behavior
- Fallback when skills missing

### QA-1.6: Command Tests
**Agent:** @agent-qa

Verify commands exist and parse:
- /protocol
- /continue
- /setup-project
- /knowledge-copilot

### QA-1.7: CI/CD Integration
**Agent:** @agent-qa

Create GitHub Actions workflow:
```yaml
name: Smoke Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./scripts/smoke-test.sh
```

### QA-1.8: Documentation
**Agent:** @agent-doc

Update `/docs/qa/TESTING.md`:
- How to run tests
- Expected output
- Common failures and fixes
- Adding new tests

---

## Test Categories

### Structure Tests (ST-*)
- File existence
- Directory structure
- YAML validity

### Build Tests (BT-*)
- MCP servers compile
- No TypeScript errors

### Configuration Tests (CT-*)
- Template validity
- Environment variables

### Integration Tests (IT-*)
- MCP tool calls
- Agent invocation
- Extension resolution

### Policy Tests (PT-*)
- No time estimates
- Required sections present

---

## Implementation Notes

- Tests should be idempotent
- No side effects (don't create files)
- Clear error messages
- Exit codes for CI/CD
- Run subset with flags (--quick, --full)
