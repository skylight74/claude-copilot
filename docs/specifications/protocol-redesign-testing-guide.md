# Protocol Redesign Testing Guide

## Overview

This guide provides test scenarios for validating the redesigned /protocol command with experience-first flows, checkpoints, and multi-agent chains.

---

## Test Scenarios

### Scenario 1: Experience Flow (Flow A)

**Goal:** Verify full experience-first chain works with checkpoints

**Test Steps:**

1. Run `/protocol add user voice profiles`
2. Verify protocol declaration shows:
   ```
   [PROTOCOL: EXPERIENCE | Agent: @agent-sd | Action: INVOKING]

   Routing to experience-first flow:
   sd (journey mapping) → uxd (interactions) → uids (visual design) → ta (tasks) → me (implementation)
   ```

3. Wait for @agent-sd checkpoint
4. Verify checkpoint contains:
   - `Task: TASK-xxx | WP: WP-xxx`
   - Service name
   - Journey stages
   - Pain points
   - Opportunities
   - Key decisions
   - Handoff context (≤50 chars)
   - Options 1-5

5. Respond with "1" (approve)
6. Verify @agent-uxd is invoked with handoff context
7. Wait for @agent-uxd checkpoint
8. Verify checkpoint contains:
   - Interactions designed
   - Key flows
   - Accessibility notes
   - Key decisions
   - Handoff context
   - Options 1-5

9. Respond with "1" (approve)
10. Verify @agent-uids is invoked
11. Wait for @agent-uids checkpoint
12. Verify checkpoint contains:
    - Design tokens count
    - Components list
    - Visual states
    - Key decisions
    - Handoff context

13. Respond with "1" (approve)
14. Verify @agent-ta is invoked
15. Wait for @agent-ta checkpoint
16. Verify checkpoint contains:
    - PRD ID created
    - Tasks count and streams
    - Complexity
    - Source specifications (WP-xxx from sd, uxd, uids)
    - Key decisions

17. Respond with "Yes, start coding" (optional)
18. Verify @agent-me is invoked if user approved implementation
19. Verify final completion summary

**Success Criteria:**
- ✅ All agents invoked in correct order
- ✅ All checkpoints presented with correct format
- ✅ Handoff contexts passed between agents (≤50 chars)
- ✅ User can approve at each stage
- ✅ Final @agent-ta receives all prior WP IDs in sourceSpecifications

---

### Scenario 2: Experience Flow with Changes

**Goal:** Verify checkpoint rejection and iteration works

**Test Steps:**

1. Run `/protocol add dark mode UI`
2. Wait for @agent-sd checkpoint
3. Respond with "No, focus only on dashboard and settings, skip other pages"
4. Verify @agent-sd is re-invoked with constraint
5. Wait for revised @agent-sd checkpoint
6. Verify revision note appears (e.g., "WP-001-v2")
7. Respond with "1" (approve revised version)
8. Verify @agent-uxd is invoked
9. Continue to completion

**Success Criteria:**
- ✅ Agent re-invoked with user feedback
- ✅ Revised work product created (version tracking)
- ✅ User can approve revised version
- ✅ Flow continues normally after revision

---

### Scenario 3: Experience Flow with Skip

**Goal:** Verify skip functionality works

**Test Steps:**

1. Run `/protocol add user profiles`
2. Wait for @agent-sd checkpoint
3. Respond with "1" (approve)
4. Wait for @agent-uxd checkpoint
5. Respond with "3" (skip visual design)
6. Verify skip warning appears:
   ```
   ⚠️ Skipping UI Design means you'll proceed without:
   - Design tokens or style guide
   - Visual consistency in implementation
   - You can add visual design later via: /protocol add visual design to user profiles

   Do you want to proceed? (yes to skip, no to return)
   ```

7. Respond with "yes"
8. Verify @agent-uids is skipped
9. Verify @agent-ta is invoked directly
10. Verify @agent-ta receives WP IDs from sd and uxd only (no uids WP)

**Success Criteria:**
- ✅ Skip warning shown with consequences
- ✅ User confirms skip
- ✅ Skipped agent not invoked
- ✅ Next agent receives correct context (missing skipped WP)

---

### Scenario 4: Defect Flow (Flow B)

**Goal:** Verify defect flow works correctly

**Test Steps:**

1. Run `/protocol fix login authentication bug` OR `/fix login authentication bug`
2. Verify protocol declaration shows:
   ```
   [PROTOCOL: DEFECT | Agent: @agent-qa | Action: INVOKING]

   Routing to defect flow:
   qa (diagnosis) → me (fix) → qa (verification)
   ```

3. Wait for @agent-qa diagnosis checkpoint
4. Verify checkpoint contains:
   - Issue description
   - Root cause
   - Reproduction steps
   - Impact assessment
   - Key decisions

5. Respond with "Yes, fix this issue"
6. Verify @agent-me is invoked with handoff context
7. Wait for @agent-me fix checkpoint
8. Verify checkpoint contains:
   - Files modified
   - Key changes
   - Tests status
   - Key decisions

9. Respond with "Yes, verify the fix"
10. Verify @agent-qa is invoked for verification
11. Wait for @agent-qa verification (no checkpoint needed)
12. Verify verification summary contains:
    - Verification status (pass/fail)
    - Tests run
    - Regression check
    - Acceptance criteria met

**Success Criteria:**
- ✅ Correct agent chain: qa → me → qa
- ✅ Diagnosis checkpoint presented
- ✅ Fix checkpoint presented
- ✅ Verification runs automatically after user approval
- ✅ Final verification summary provided

---

### Scenario 5: Technical Flow (Flow C)

**Goal:** Verify technical-only flow works

**Test Steps:**

1. Run `/protocol --technical refactor auth module` OR `/refactor auth module`
2. Verify protocol declaration shows:
   ```
   [PROTOCOL: TECHNICAL | Agent: @agent-ta | Action: INVOKING]

   Routing to technical-only flow:
   ta (planning) → me (implementation)
   ```

3. Wait for @agent-ta checkpoint
4. Verify checkpoint contains:
   - Refactor plan
   - Complexity
   - Risk assessment
   - Key decisions

5. Respond with "Yes, refactor now"
6. Verify @agent-me is invoked
7. Wait for @agent-me completion
8. Verify completion summary

**Success Criteria:**
- ✅ Correct agent chain: ta → me
- ✅ No design agents invoked
- ✅ Technical architecture checkpoint presented
- ✅ Implementation proceeds after approval

---

### Scenario 6: Clarification Flow (Flow D)

**Goal:** Verify ambiguous request handling

**Test Steps:**

1. Run `/protocol improve the dashboard`
2. Verify clarification request appears:
   ```
   [PROTOCOL: CLARIFYING | Action: ASKING]

   I detected an ambiguous request: "improve the dashboard"

   What type of improvement are you looking for?
   1. User experience (redesign, new features, better flows) → Experience Flow
   2. Technical (performance, code quality, architecture) → Technical Flow
   3. Bug fix (something is broken) → Defect Flow
   4. Not sure, help me decide
   ```

3. Respond with "1" (user experience)
4. Verify routing to Experience Flow (sd → uxd → uids → ta)
5. Continue to completion

**Alternative Test:**

1. Run `/protocol improve the dashboard`
2. Respond with "4" (not sure)
3. Verify system provides suggestions based on context
4. Select suggested flow
5. Verify correct flow activated

**Success Criteria:**
- ✅ Ambiguous intent detected
- ✅ Clarification options presented
- ✅ User selection routes to correct flow
- ✅ Suggestions provided when user unsure

---

### Scenario 7: Mid-Flow Pivot

**Goal:** Verify user can change direction mid-flow

**Test Steps:**

1. Run `/protocol add user dashboard`
2. Complete @agent-sd checkpoint (approve)
3. Complete @agent-uxd checkpoint (approve)
4. At @agent-uids checkpoint, respond with "Skip the rest, just implement what we have"
5. Verify system acknowledges pivot:
   ```
   Understood. Skipping visual design and moving directly to implementation.

   Context preserved:
   - Service Design (WP-001)
   - UX Design (WP-002)

   Routing to @agent-ta for task breakdown...
   ```

6. Verify @agent-ta receives WP-001 and WP-002 in sourceSpecifications
7. Continue to completion

**Success Criteria:**
- ✅ Mid-flow pivot acknowledged
- ✅ Remaining stages skipped
- ✅ Context from completed stages preserved
- ✅ User informed of recovery path

---

### Scenario 8: Go Back

**Goal:** Verify user can return to previous stage

**Test Steps:**

1. Run `/protocol add profiles`
2. Complete @agent-sd checkpoint (approve)
3. Complete @agent-uxd checkpoint (approve)
4. At @agent-uids checkpoint, respond with "4" (go back to UX design)
5. Verify system saves uids work as draft
6. Verify @agent-uxd is re-invoked
7. Make changes at uxd
8. Approve uxd revision
9. Verify flow continues to uids (either uses saved draft or generates new)

**Success Criteria:**
- ✅ Current work saved as draft
- ✅ Previous agent re-invoked
- ✅ User can make changes
- ✅ Flow resumes forward after revision

---

### Scenario 9: Show Full Details

**Goal:** Verify user can view full work product

**Test Steps:**

1. Run `/protocol add feature`
2. Wait for @agent-sd checkpoint
3. Respond with "5" (show full work product)
4. Verify system calls `work_product_get({ id: "WP-xxx" })`
5. Verify full work product displayed
6. Verify checkpoint options re-presented after display
7. Respond with "1" (approve after reviewing details)
8. Verify flow continues

**Success Criteria:**
- ✅ Full work product retrieved and displayed
- ✅ Checkpoint options re-presented
- ✅ User can continue after viewing details

---

### Scenario 10: Explicit Flags

**Goal:** Verify all command flags work

**Test Steps:**

#### Test 10a: --no-checkpoints

1. Run `/protocol --no-checkpoints add profiles`
2. Verify full chain runs without pausing
3. Verify final summary provided

#### Test 10b: --verbose

1. Run `/protocol --verbose add profiles`
2. Verify checkpoints show ~200 tokens (detailed)
3. Verify includes reasoning and context

#### Test 10c: --minimal

1. Run `/protocol --minimal add profiles`
2. Verify checkpoints show ~50 tokens
3. Verify binary choice (y/n) presented

#### Test 10d: --skip-sd

1. Run `/protocol --skip-sd add profiles`
2. Verify @agent-sd not invoked
3. Verify flow starts at @agent-uxd

#### Test 10e: --design-only

1. Run `/protocol --design-only add profiles`
2. Verify flow stops after @agent-uids
3. Verify @agent-ta and @agent-me not invoked

**Success Criteria:**
- ✅ All flags respected
- ✅ Behavior changes as expected per flag
- ✅ Appropriate output verbosity

---

### Scenario 11: Alternative Commands

**Goal:** Verify alternative command aliases work

**Test Steps:**

1. Run `/build user profiles` (should route to Experience Flow)
2. Verify same as `/protocol add user profiles`

3. Run `/fix login bug` (should route to Defect Flow)
4. Verify same as `/protocol --defect login bug`

5. Run `/refactor auth` (should route to Technical Flow)
6. Verify same as `/protocol --technical refactor auth`

**Success Criteria:**
- ✅ Alternative commands route correctly
- ✅ Produce same output as full /protocol equivalents

---

### Scenario 12: Iteration Limit

**Goal:** Verify iteration limit prevents infinite loops

**Test Steps:**

1. Run `/protocol add feature`
2. At @agent-sd checkpoint, respond with changes
3. At revised checkpoint, respond with more changes
4. At 2nd revision, respond with more changes
5. After 3rd iteration, verify system asks:
   ```
   After 3 iterations, would you like to:
   1. Proceed with current version
   2. Start fresh with different approach
   ```

6. Select option and verify behavior

**Success Criteria:**
- ✅ System tracks iteration count per agent
- ✅ After 3 iterations, offers exit options
- ✅ User can proceed or restart

---

## Edge Cases

### Edge Case 1: Agent Returns Blocker

**Test:** Agent encounters blocker (e.g., missing dependency)

**Expected:**
- System surfaces blocker to user
- User is asked how to proceed
- Options: resolve blocker, skip stage, or abort

---

### Edge Case 2: Malformed Agent Output

**Test:** Agent returns output without checkpoint format

**Expected:**
- System detects missing checkpoint markers
- Offers to retry agent or proceed without checkpoint
- User chooses next action

---

### Edge Case 3: User Abandons Mid-Flow

**Test:** User stops responding for 5+ minutes at checkpoint

**Expected:**
- Checkpoint saved automatically
- User can resume via `/continue`
- Checkpoint expires after 24 hours

---

### Edge Case 4: Parallel Work Conflict

**Test:** User starts new feature while one is in progress

**Expected:**
- System detects in-progress work
- Offers to pause, continue, or create parallel streams
- File conflict check if parallel chosen

---

## Performance Benchmarks

| Interaction | Target | Measurement |
|-------------|--------|-------------|
| Intent detection | < 2 seconds | Time from user input to protocol declaration |
| Agent invocation | 0 seconds (async) | Immediate acknowledgment shown |
| Checkpoint rendering | < 1 second | Time from agent response to checkpoint display |
| User response parsing | < 1 second | Time from user input to next action |

---

## Token Efficiency Validation

| Interaction Type | Expected Tokens | Validation |
|------------------|-----------------|------------|
| Protocol declaration | ~30 tokens | Measure actual output |
| Agent invocation notice | ~20 tokens | Measure actual output |
| Agent checkpoint summary | ~100 tokens | Verify agent output |
| Main session guidance | ~30 tokens | Measure checkpoint options |
| Total per checkpoint | ~180-230 tokens | Sum of above |

**Token Budget Alert:**

If any single interaction exceeds budget:
- Protocol declaration > 50 tokens → Simplify
- Agent summary > 150 tokens → Agent needs to compact
- Main session guidance > 50 tokens → Remove redundant text

---

## Manual Testing Checklist

Use this checklist for manual validation:

### Flow A (Experience)
- [ ] Intent detected correctly
- [ ] All agents invoked in order (sd → uxd → uids → ta → me)
- [ ] Checkpoints presented after sd, uxd, uids, ta
- [ ] User can approve at each checkpoint
- [ ] Handoff contexts passed (≤50 chars)
- [ ] Final ta receives all prior WP IDs
- [ ] User can skip stages with warning
- [ ] User can request changes and iterate
- [ ] User can go back to previous stage
- [ ] User can view full work products

### Flow B (Defect)
- [ ] Intent detected correctly
- [ ] Agent chain: qa → me → qa
- [ ] Diagnosis checkpoint presented
- [ ] Fix checkpoint presented
- [ ] Verification runs automatically
- [ ] Verification summary provided

### Flow C (Technical)
- [ ] Intent detected correctly
- [ ] Agent chain: ta → me
- [ ] No design agents invoked
- [ ] Architecture checkpoint presented
- [ ] Implementation proceeds after approval

### Flow D (Clarification)
- [ ] Ambiguous intent detected
- [ ] Clarification options shown
- [ ] User selection routes correctly
- [ ] Suggestions provided when unsure

### Flags & Overrides
- [ ] --no-checkpoints runs full chain
- [ ] --verbose shows detailed summaries
- [ ] --minimal shows concise summaries
- [ ] --skip-sd/uxd/uids work correctly
- [ ] --design-only stops at design
- [ ] Alternative commands (/build, /fix, /refactor) work
- [ ] Mid-flow overrides ("skip to code") work

### Edge Cases
- [ ] Agent blockers surfaced to user
- [ ] Malformed output handled gracefully
- [ ] Abandoned flows save checkpoints
- [ ] Parallel work conflict detection works
- [ ] Iteration limit (3) prevents loops

---

## Automated Test Suite (Future)

Future work: Create automated tests using Task Copilot integration tests.

**Test Structure:**

```typescript
describe('Protocol Redesign', () => {
  describe('Flow A: Experience', () => {
    it('should invoke all agents in correct order', async () => {
      // Test logic
    });

    it('should present checkpoints with correct format', async () => {
      // Test logic
    });

    it('should pass handoff contexts between agents', async () => {
      // Test logic
    });

    // ... more tests
  });

  describe('Flow B: Defect', () => {
    // Defect flow tests
  });

  describe('Flow C: Technical', () => {
    // Technical flow tests
  });

  describe('Flow D: Clarification', () => {
    // Clarification flow tests
  });
});
```

---

## Success Criteria Summary

The protocol redesign is successful when:

1. ✅ All 4 flows (A/B/C/D) work end-to-end
2. ✅ Checkpoints presented at correct stages with correct format
3. ✅ User can approve, reject, skip, go back at each checkpoint
4. ✅ Handoff contexts passed between agents (≤50 chars)
5. ✅ Iteration limits prevent infinite loops
6. ✅ Skip warnings shown with consequences
7. ✅ Alternative commands work as aliases
8. ✅ All flags respected (--technical, --no-checkpoints, etc.)
9. ✅ Token efficiency maintained (~230 tokens per checkpoint interaction)
10. ✅ Edge cases handled gracefully (blockers, malformed output, abandonment)

---

**End of Testing Guide**
