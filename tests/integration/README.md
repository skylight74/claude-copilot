# Integration Tests

This directory contains integration tests for Claude Copilot framework features.

## Test Files

### orchestration-lifecycle.test.ts

**Purpose:** Test the complete orchestration workflow from generation to completion.

**Coverage:**
- PRD creation in Task Copilot (`prd_create`, `prd_list`)
- Task creation with stream metadata (`task_create`, `task_list`)
- Initiative-scoped stream filtering (`stream_list`)
- Stream archival on initiative switch (`initiative_link`)
- Auto-completion detection (`allStreamsComplete`)
- Dependency validation (foundation, parallel, integration)
- Progress tracking (completed, in-progress, total tasks)

**Test Suites:**

1. **Lifecycle Tests:** Generate → Start → Complete
   - PRD creation verification
   - Task metadata validation
   - Initiative scoping behavior
   - Completion triggers archival

2. **Initiative Switch Tests:** Stream archival behavior
   - Auto-archival when switching initiatives
   - `stream_list()` filtering by current initiative
   - `watch-status` displaying only current initiative
   - `stream_unarchive()` recovery

3. **Dependency Tests:** Validation and graph structure
   - Foundation streams (empty dependencies)
   - Parallel streams (depend on foundation)
   - Integration streams (depend on multiple parallel)
   - Circular dependency detection

4. **Progress Tracking Tests:** Metrics and completion
   - Stream progress calculation
   - In-progress task counting
   - 100% completion detection

**Run:**
```bash
cd tests/integration
npx tsx orchestration-lifecycle.test.ts
```

**Expected Output:**
```
======================================================================
ORCHESTRATION LIFECYCLE INTEGRATION TESTS
Testing: Generate → Start → Complete → Initiative Switch
======================================================================

======================================================================
ORCHESTRATION LIFECYCLE: GENERATE → START → COMPLETE
======================================================================

✅ Generate creates PRDs in Task Copilot (5ms)
✅ Generate creates tasks with stream metadata (3ms)
✅ Start only sees current initiative streams (4ms)
✅ All streams complete triggers initiative completion (2ms)
✅ Streams auto-archived on completion (3ms)

======================================================================
INITIATIVE SWITCH: STREAM ARCHIVAL
======================================================================

✅ Initiative switch archives old streams (4ms)
✅ stream_list() filters by current initiative (3ms)
✅ watch-status shows only current initiative (2ms)
✅ stream_unarchive recovers archived streams (3ms)

======================================================================
DEPENDENCY VALIDATION
======================================================================

✅ Foundation streams have empty dependencies (2ms)
✅ Parallel streams depend on foundation (3ms)
✅ Integration streams depend on multiple parallel streams (4ms)
✅ Circular dependencies are detectable (5ms)

======================================================================
PROGRESS TRACKING
======================================================================

✅ Stream progress calculated correctly (2ms)
✅ In-progress tasks counted correctly (3ms)
✅ 100% completion detected (2ms)

======================================================================
TEST SUMMARY
======================================================================

✅ Passed: 17
❌ Failed: 0
⏭️  Skipped: 0
📊 Total: 17

✅ ALL TESTS PASSED

Coverage:
  ✓ PRD creation in Task Copilot
  ✓ Task creation with stream metadata
  ✓ Initiative-scoped stream filtering
  ✓ Stream archival on initiative switch
  ✓ Auto-completion detection
  ✓ Dependency validation
  ✓ Progress tracking
```

### hooks-evaluation-corrections.test.ts

**Purpose:** Test lifecycle hooks, skill evaluation, and correction detection.

**Coverage:**
- Lifecycle hook registration and execution
- Completion promise detection (COMPLETE, BLOCKED, ESCALATE)
- Skill pattern matching (file extensions, keywords)
- Correction pattern detection (explicit, negation, replacement)

**Test Suites:**
- Stream-B: Lifecycle Hooks
- Stream-C: Skill Evaluation
- Stream-D: Correction Detection
- E2E: Workflow integration

**Run:**
```bash
cd tests/integration
npx tsx hooks-evaluation-corrections.test.ts
```

### lean-agents-skills.test.ts

**Purpose:** Test lean agent model refactoring and skills system integration.

**Coverage:**
- Agent structure validation (lean ~60-100 lines)
- Skill loading protocol in agents
- Skill template structure (quality sections)
- skill_evaluate auto-detection

**Test Suites:**
- Agent structure validation
- Skill template validation
- Skill loading integration

**Run:**
```bash
cd tests/integration
npx tsx lean-agents-skills.test.ts
```

## Running All Tests

```bash
cd tests/integration

# Run all tests
for test in *.test.ts; do
  echo "Running $test..."
  npx tsx "$test"
  echo ""
done
```

## Test Structure

Each test file follows this structure:

```typescript
// ============================================================================
// TEST FRAMEWORK
// ============================================================================

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  error?: string;
  details?: string;
}

// Assertion helpers
function assert(condition: boolean, message: string): void
function assertEquals<T>(actual: T, expected: T, message: string): void
function assertGreaterThan(actual: number, expected: number, message: string): void

// Test runner
async function runTest(testName: string, testFn: () => void | Promise<void>): Promise<void>

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

// Mock data types, database implementations, etc.

// ============================================================================
// TEST SUITES
// ============================================================================

async function runXXXTests() {
  // Group of related tests
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  // Execute all test suites
  // Print summary
  // Exit with appropriate code
}

runAllTests().catch(console.error);
```

## Adding New Tests

1. Create new file: `your-feature.test.ts`
2. Copy the test framework boilerplate
3. Define mock types and implementations
4. Write test suites
5. Add to main test runner
6. Update this README

## CI/CD Integration

Tests can be run in CI pipelines:

```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  run: |
    cd tests/integration
    npm install -g tsx
    for test in *.test.ts; do
      npx tsx "$test" || exit 1
    done
```

## Dependencies

Tests use:
- **tsx:** TypeScript execution (install globally: `npm install -g tsx`)
- **Node.js:** Built-in `fs`, `path` modules
- **No external test frameworks:** Self-contained assertion library

## See Also

- [Orchestration Workflow Guide](../../docs/50-features/02-orchestration-workflow.md)
- [Lifecycle Hooks](../../docs/50-features/lifecycle-hooks.md)
- [Skill Evaluation](../../docs/50-features/skill-evaluation.md)
- [Correction Detection](../../docs/50-features/correction-detection.md)

---

*Updated: January 2026*
