# Service Design Specification: /protocol Command Redesign

## Overview

This specification maps the complete user experience for the redesigned /protocol command in Claude Copilot. The redesign flips the default from technical-first (@agent-ta) to experience-first (@agent-sd → @agent-uxd → @agent-uids), making it easier to create thoughtful software that people use.

**Core Principle:** Assume experience-first unless explicitly technical or defect-related.

---

## 1. User Journey Map

### 1.1 Complete Journey Flow

```
Entry Point → Intent Detection → Route Selection → Agent Chain → Checkpoints → Completion
     ↓              ↓                  ↓                ↓              ↓            ↓
  User types    Analyze request    Choose flow    Execute agents   Validate     Output
  /protocol     keywords/flags     (A/B/C/D)      sd→uxd→uids→ta  alignment    summary
```

### 1.2 Journey Stages

| Stage | User Action | System Response | Emotional State | Duration Feel |
|-------|-------------|-----------------|----------------|---------------|
| **Entry** | Types `/protocol [request]` | Parses input, acknowledges | Hopeful, slightly uncertain | Instant |
| **Detection** | (Passive) Waits for routing | Analyzes keywords, detects intent | Curious, trusting | 1-2 seconds |
| **Routing** | Sees protocol declaration | Shows detected flow + escape options | Informed, confident or cautious | 3-5 seconds |
| **Stage 1: SD** | Confirms journey direction | Reviews service blueprint (~100 tokens) | Engaged, validating mental model | 10-20 seconds |
| **Checkpoint 1** | Approves or requests changes | "Proceed?" or modification options | Decision point, empowered | User-paced |
| **Stage 2: UXD** | Reviews interactions | Sees wireframe summary | Visualizing, refining | 10-20 seconds |
| **Checkpoint 2** | Approves or requests changes | "Proceed?" or modification options | Confident or adjusting | User-paced |
| **Stage 3: UIDS** | Reviews visual design | Sees design token summary | Aesthetic judgment | 10-20 seconds |
| **Checkpoint 3** | Approves or requests changes | "Proceed?" or modification options | Almost there, final polish | User-paced |
| **Stage 4: TA** | (Passive) Waits for plan | Sees task breakdown summary | Relief, ready to build | 15-30 seconds |
| **Stage 5: ME** | (Optional) Watches implementation | Sees progress updates | Satisfaction, validation | Variable |
| **Exit** | Receives completion summary | Full chain summary, next steps | Accomplished, clear direction | 5 seconds |

### 1.3 Entry Points

| Entry Method | Example | Initial State |
|--------------|---------|---------------|
| Basic invocation | `/protocol` | Interactive mode, asks for description |
| With description | `/protocol add user profiles` | Auto-detection, experience flow |
| With flag | `/protocol --technical refactor auth` | Explicit technical flow |
| With defect flag | `/protocol --defect login broken` | Explicit defect flow |
| Alternative command | `/build add user profiles` | Alias for experience flow |
| Alternative command | `/fix login broken` | Alias for defect flow |

### 1.4 Decision Points

```
User Request
    ↓
Intent Detection
    ↓
    ├─ Contains defect keywords? → [Flow B: Defect]
    ├─ Has --technical flag? → [Flow C: Technical-Only]
    ├─ Has --defect flag? → [Flow B: Defect]
    ├─ Ambiguous? → [Flow D: Clarification]
    └─ Default → [Flow A: Experience-First]
```

### 1.5 Checkpoints

**Checkpoint Pattern:**
- Occurs after each major agent stage (sd, uxd, uids)
- User sees: Agent summary (~100 tokens) + alignment question
- User responds: Approve, request changes, or skip stage
- System reacts: Proceed, iterate with agent, or bypass

**Checkpoint Interaction:**
```
[Agent Summary]
---
Does this align with your vision?
→ Yes, proceed
→ No, I need changes: [describe]
→ Skip this stage
→ Go back to [previous stage]
```

### 1.6 Handoffs

| From | To | Trigger | Context Passed |
|------|-----|---------|----------------|
| Main → SD | User approves experience flow | 50-char task context |
| SD → UXD | Journey blueprint complete | 50-char journey context |
| UXD → UIDS | Wireframes complete | 50-char interaction context |
| UIDS → TA | Visual design complete | 50-char design context |
| TA → ME | Tasks created | Task IDs + implementation notes |
| Agent → Main | Chain complete or blocked | ~100 token consolidated summary |

### 1.7 Exit Points

| Exit Type | Trigger | User Sees |
|-----------|---------|-----------|
| **Complete** | All stages finished, tasks created | Chain summary, task IDs, next steps |
| **Blocked** | Agent encounters blocker | Blocker description, resolution options |
| **Abandoned** | User stops responding | Checkpoint saved, resume instructions |
| **Skipped** | User skips to implementation | Abbreviated chain, task IDs |
| **Rejected** | User rejects at checkpoint | Agent re-invoked with feedback |

---

## 2. Flow Scenarios

### 2.1 Scenario A: New Feature Request (Experience-First)

**User Input:** "add user voice profiles" or "I want dark mode"

**Flow Path:** sd → uxd → uids → ta → me

#### Stage-by-Stage Experience

**Stage 1: Service Design (@agent-sd)**

```
[PROTOCOL: EXPERIENCE | Agent: @agent-sd | Action: INVOKING]

Mapping user voice profiles journey...

[10-20 seconds pass]

Task: TASK-001 | WP: WP-001
Service: User Voice Profiles
Stages: Discovery → Setup → Usage → Management
Pain Points: Profile creation friction, unclear value prop
Opportunities: Contextual onboarding, social proof

Does this journey align with your vision?
→ Yes, proceed to interaction design
→ No, I need changes: [describe]
→ Skip interaction design
```

**User Action:** Approves or requests changes

**If approved:**
- System: "Proceeding to interaction design..."
- Handoff to @agent-uxd with 50-char context

**If changes requested:**
- System: Re-invokes @agent-sd with user feedback
- Iterates until approved or user skips

---

**Stage 2: UX Design (@agent-uxd)**

```
[PROTOCOL: EXPERIENCE | Agent: @agent-uxd | Action: INVOKING]

Designing voice profile interactions...

[10-20 seconds pass]

Task: TASK-002 | WP: WP-002
Interactions: 8 states designed (empty, setup, recording, reviewing, saved, error, editing, deleting)
Key Flows: First-time setup (3 steps), Quick record (1-tap), Profile switching
Accessibility: WCAG 2.1 AA, keyboard navigation, screen reader optimized

Do these interactions feel right?
→ Yes, proceed to visual design
→ No, I need changes: [describe]
→ Skip visual design
→ Go back to service design
```

**User Action:** Approves or requests changes

---

**Stage 3: UI Design (@agent-uids)**

```
[PROTOCOL: EXPERIENCE | Agent: @agent-uids | Action: INVOKING]

Creating visual design system...

[10-20 seconds pass]

Task: TASK-003 | WP: WP-003
Design Tokens: 12 color tokens, 6 spacing tokens, 4 typography styles
Components: VoiceProfileCard, RecordButton, WaveformVisualizer, ProfileSwitcher
Visual States: All 8 states designed with micro-interactions

Does this visual direction match your aesthetic?
→ Yes, proceed to technical architecture
→ No, I need changes: [describe]
→ Skip architecture, go straight to implementation
→ Go back to interaction design
```

**User Action:** Approves or requests changes

---

**Stage 4: Technical Architecture (@agent-ta)**

```
[PROTOCOL: EXPERIENCE | Agent: @agent-ta | Action: INVOKING]

Breaking down into implementation tasks...

[15-30 seconds pass]

Task: TASK-004 | WP: WP-004
PRD: PRD-001 created
Tasks: 6 tasks across 3 streams
- Stream-A (foundation): Audio storage, profile data model
- Stream-B (parallel): Recording service, profile management API
- Stream-C (parallel): UI components, profile switching
- Stream-Z (integration): E2E flows, error handling

All design requirements incorporated from WP-001, WP-002, WP-003.

Ready to begin implementation?
→ Yes, start coding
→ No, show me the full task breakdown
→ Pause here, I'll implement later
```

**User Action:** Chooses next step

---

**Stage 5: Implementation (@agent-me)** *(Optional)*

```
[PROTOCOL: EXPERIENCE | Agent: @agent-me | Action: INVOKING]

Implementing Stream-A: Foundation...

[Progress updates appear]

Implementation complete:
- Audio storage service created
- Profile data models defined
- Database migrations ready

Stream-A complete. Continue with Stream-B?
→ Yes, continue
→ Pause and review code
→ Stop here
```

---

#### Emotional Journey

```
Discovery → Setup → Validation → Refinement → Confidence → Satisfaction
  ↓           ↓          ↓            ↓              ↓             ↓
Hopeful    Engaged   Evaluating   Adjusting      Ready       Accomplished
```

**Pain Points Addressed:**
- No more jumping straight to code without design thinking
- Clear visibility into what's being designed at each stage
- Control at every checkpoint (approve/modify/skip)
- Full traceability from journey → interactions → visuals → code

**Opportunities:**
- Learn design thinking through guided process
- Build muscle memory for experience-first development
- Catch design issues before implementation
- Create better software with less rework

---

### 2.2 Scenario B: Bug Fix / Defect

**User Input:** "the login is broken" or "fix authentication error"

**Flow Path:** qa → me → qa

#### Stage-by-Stage Experience

**Stage 1: QA Investigation (@agent-qa)**

```
[PROTOCOL: DEFECT | Agent: @agent-qa | Action: INVOKING]

Investigating login issue...

[10-20 seconds pass]

Task: TASK-005 | WP: WP-005
Issue: Authentication token expiry not handled gracefully
Root Cause: Missing error boundary in login flow
Reproduction: 100% reproducible when token expires mid-session
Impact: High (blocks user access)

Diagnosis complete. Proceed with fix?
→ Yes, fix this issue
→ No, I need more investigation: [describe]
→ This isn't the real issue, investigate: [describe]
```

**User Action:** Approves fix or requests more investigation

---

**Stage 2: Implementation (@agent-me)**

```
[PROTOCOL: DEFECT | Agent: @agent-me | Action: INVOKING]

Implementing fix...

[Implementation happens]

Task: TASK-006 | WP: WP-006
Fix: Added error boundary + token refresh flow
Files: src/auth/login.ts, src/middleware/auth.ts
Tests: Added unit tests for expiry handling

Fix complete. Ready for verification?
→ Yes, verify the fix
→ No, show me the code changes
→ Pause here
```

---

**Stage 3: Verification (@agent-qa)**

```
[PROTOCOL: DEFECT | Agent: @agent-qa | Action: INVOKING]

Verifying fix...

[Testing happens]

Task: TASK-007 | WP: WP-007
Verification: All tests pass, issue resolved
Regression: No regressions detected
Acceptance: User can complete login flow even with expired tokens

Fix verified. Issue resolved.
```

---

#### Key Differences from Experience Flow

| Aspect | Experience Flow | Defect Flow |
|--------|----------------|-------------|
| **Starting point** | Journey mapping | Issue investigation |
| **Checkpoints** | After each design stage | After diagnosis, after fix |
| **Emotional arc** | Creative → Confident → Satisfied | Concerned → Hopeful → Relieved |
| **Agent chain** | sd → uxd → uids → ta → me | qa → me → qa |
| **User control** | Can skip design stages | Can request deeper investigation |
| **Output focus** | Forward-looking (new capability) | Backward-looking (restore function) |

---

### 2.3 Scenario C: Technical-Only Work

**User Input:** "refactor the auth module" or `/protocol --technical optimize database queries`

**Flow Path:** ta → me

#### Stage-by-Stage Experience

**Stage 1: Technical Architecture (@agent-ta)**

```
[PROTOCOL: TECHNICAL | Agent: @agent-ta | Action: INVOKING]

Analyzing auth module refactor...

[15-30 seconds pass]

Task: TASK-008 | WP: WP-008
Refactor Plan:
- Extract token generation to separate service
- Consolidate middleware logic
- Add caching layer for user lookups
Complexity: Medium
Risk: Low (no API changes)

Refactor plan ready. Proceed with implementation?
→ Yes, refactor now
→ No, I want changes: [describe]
→ Show me the full technical design
```

**User Action:** Approves or requests changes

---

**Stage 2: Implementation (@agent-me)**

```
[PROTOCOL: TECHNICAL | Agent: @agent-me | Action: INVOKING]

Refactoring auth module...

[Implementation happens]

Task: TASK-009 | WP: WP-009
Refactor Complete:
- TokenService extracted (src/services/token.ts)
- AuthMiddleware consolidated (src/middleware/auth.ts)
- UserCache added (src/cache/user.ts)
Tests: All existing tests pass + 12 new tests

Refactor complete.
```

---

#### Detection Mechanisms

| Mechanism | Example | Confidence |
|-----------|---------|------------|
| **Explicit flag** | `--technical` | 100% (user intent clear) |
| **Keywords** | refactor, optimize, architecture, performance, database, API | 85% (likely technical) |
| **Context** | No user-facing changes mentioned | 70% (probably technical) |
| **Ambiguous** | Could be either → clarification flow | 50% (ask user) |

**Keyword List (Technical):**
- refactor, optimize, performance, scale
- architecture, infrastructure, database
- API, backend, service, worker
- cache, queue, pipeline
- migrate, upgrade, consolidate

---

### 2.4 Scenario D: Ambiguous Request

**User Input:** "improve the dashboard" (unclear if UX or performance)

**Flow Path:** Clarification → Route to A, B, or C

#### Clarification Experience

```
[PROTOCOL: CLARIFYING | Action: ASKING]

I detected an ambiguous request: "improve the dashboard"

What type of improvement are you looking for?

→ User experience (redesign, new features, better flows)
→ Technical (performance, code quality, architecture)
→ Bug fix (something is broken)
→ I'm not sure, suggest options based on: [context]

[User selects option]

Great! Routing to [experience/technical/defect] flow...
```

**Detection Triggers:**

| Pattern | Example | Why Ambiguous |
|---------|---------|---------------|
| Generic verbs | "improve", "enhance", "update" | Could mean UX or technical |
| Vague nouns | "dashboard", "system", "platform" | Scope unclear |
| No qualifiers | Missing "UI", "performance", "bug", etc. | No clear domain |
| Mixed signals | "redesign the API" | Design + technical |

**Clarification Questions:**

```
Type A: "I detected an ambiguous request: '[user input]'"
Type B: "What aspect do you want to improve?"
Type C: "Are you thinking about [option 1] or [option 2]?"
```

**Suggested Options (when user unsure):**

```
Based on recent activity, I suggest:
1. User experience flow (you have pending design work)
2. Technical flow (performance issues detected)
3. Bug fix flow (3 open defects in this area)

Which feels right?
```

---

## 3. Edge Cases

### 3.1 Mid-Flow Pivots

**Scenario:** User changes mind during experience flow

**Example:**
```
[User at Checkpoint 2, after UXD stage]

User: "Actually, I don't need visual design. Just implement the basic version."

System Response:
Understood. Skipping visual design and moving directly to technical architecture.

Note: Visual design can be added later via `/protocol add visual design to [feature]`

[Routes directly to @agent-ta with context from sd + uxd]
```

**Handling:**
- Acknowledge the pivot
- Skip remaining stages
- Pass accumulated context to final agent
- Offer recovery path (how to add skipped work later)

---

### 3.2 Partial Completion

**Scenario:** User stops responding mid-flow

**System Behavior:**

```
[After 5 minutes of no response at Checkpoint 2]

Checkpoint saved at Stage 2 (UX Design).

To resume later:
1. Run /continue to pick up from Checkpoint 2
2. Or run /protocol to start fresh

Work Products Saved:
- WP-001: Service Design (complete)
- WP-002: UX Design (awaiting approval)
```

**Recovery Options:**

| User Action | System Response |
|-------------|-----------------|
| `/continue` | Resumes from last checkpoint with context |
| `/continue --skip-checkpoint` | Skips approval, proceeds to next stage |
| `/protocol [same request]` | Detects duplicate, offers to resume or restart |
| Do nothing | Checkpoint expires after 24 hours |

---

### 3.3 Skip Requests

**Scenario:** User wants to skip a design stage

**User Input at Checkpoint:**
```
User: "Skip this stage, I already know what I want"
```

**System Response:**
```
Skipping [current stage]. Moving to [next stage].

Note: You can revisit this stage later via:
/protocol add [stage] to [feature]

Example: /protocol add visual design to user profiles
```

**Skip Patterns:**

| Skip Type | Command | Effect |
|-----------|---------|--------|
| **Skip one stage** | "Skip visual design" | Bypasses uids, continues to ta |
| **Skip to implementation** | "Skip to code" | Bypasses all design, goes to ta → me |
| **Skip checkpoints** | `/protocol --no-checkpoints` | Runs full chain without pausing |

---

### 3.4 Revisit Requests

**Scenario:** User wants to go back to previous stage

**User Input at Checkpoint:**
```
User: "Go back to service design, I want to change the journey"
```

**System Response:**
```
Returning to Stage 1 (Service Design).

Current work from Stage 2 (UX Design) will be:
→ Saved as WP-002 (draft)
→ Accessible for reference
→ Can be resumed after service design revision

Re-invoking @agent-sd with revision request...
```

**Revisit Handling:**
- Save current stage work as draft
- Re-invoke previous stage agent with context
- Offer to merge or replace previous work
- Resume forward flow when ready

---

### 3.5 Parallel Work

**Scenario:** User wants to start another feature while one is in progress

**User Input:**
```
User: /protocol add admin dashboard
[While "user profiles" is at Checkpoint 2]
```

**System Response:**
```
Detected in-progress work: User Profiles (at UX Design stage)

Options:
→ Pause "User Profiles" and start "Admin Dashboard"
→ Continue "User Profiles" first, then start "Admin Dashboard"
→ Create parallel streams for both (advanced)

Which approach?
```

**Parallel Stream Handling:**
- Detect file conflicts via `stream_conflict_check()`
- Warn if features touch same files
- Suggest sequential if high conflict risk
- Create independent streams if low conflict

---

## 4. Checkpoint Experience

### 4.1 Checkpoint Interaction Pattern

**Standard Checkpoint Format:**

```
[Agent Summary Block]
---
Task: TASK-xxx | WP: WP-xxx
[Agent-specific summary, ~100 tokens]
[Key decisions or outputs]
---

Does this align with your vision?

Options:
1. Yes, proceed to [next stage]
2. No, I need changes: [describe what to change]
3. Skip [next stage]
4. Go back to [previous stage]
5. Show me the full work product (WP-xxx)

[User responds with number or natural language]
```

---

### 4.2 Verbosity vs. Conciseness

**Guiding Principle:** Summaries are concise (~100 tokens), details available on demand.

| User Preference | Checkpoint Style |
|-----------------|------------------|
| **Default (Balanced)** | ~100 token summary + options |
| **Verbose** (via `/protocol --verbose`) | ~200 token summary + reasoning |
| **Minimal** (via `/protocol --minimal`) | ~50 token summary + binary choice |

**Example Minimal Checkpoint:**
```
Service blueprint complete (WP-001).
Proceed to interaction design? (y/n)
```

**Example Verbose Checkpoint:**
```
Service Design Complete (WP-001)

Journey Stages:
1. Discovery: User learns about voice profiles (pain point: unclear value)
2. Setup: User creates first profile (pain point: friction, 5 steps)
3. Usage: User switches between profiles (opportunity: 1-tap switch)
4. Management: User edits/deletes profiles (backstage: data retention)

Key Decisions:
- Prioritized setup flow optimization (reduce from 5 to 3 steps)
- Added social proof during discovery (reduce value prop uncertainty)

Emotional Journey: Curious → Frustrated (setup) → Delighted (usage) → Confident

Does this align with your vision?
[Options...]
```

---

### 4.3 Approval Signals

**Explicit Approval:**
- "Yes, proceed"
- "Looks good"
- "Continue"
- "y"
- "1" (option number)

**Implicit Approval:**
- No response for 30 seconds → auto-proceed (with warning)
- "Next" → proceed without confirmation
- Pressing Enter → proceed (if default action is proceed)

**Rejection Signals:**
- "No, change X"
- "Go back"
- "Skip"
- "n"
- "2" (change option)

---

### 4.4 What Happens on Rejection

**Rejection Flow:**

```
User: "No, I need changes: Make the setup flow 2 steps, not 3"

System:
Understood. Re-invoking @agent-sd with your feedback...

Revision requested:
- Original: 3-step setup flow
- Requested: 2-step setup flow

[Agent re-runs with constraint]

[10-20 seconds pass]

Task: TASK-001 (revised) | WP: WP-001-v2
Service: User Voice Profiles (revised)
Setup Flow: Reduced to 2 steps (combine profile creation + first recording)

Does this revision align better?
→ Yes, proceed
→ No, I need more changes: [describe]
```

**Rejection Handling:**
- Agent is re-invoked with user feedback as constraint
- Previous version is saved (WP-001-v1)
- New version references previous (WP-001-v2)
- User can compare versions if needed
- Process repeats until approval or user abandons

**Iteration Limit:**
- After 3 iterations, system asks: "Would you like to proceed with current version or start fresh?"
- Prevents infinite revision loops

---

## 5. Escape Hatches

### 5.1 Explicit Flags

| Flag | Effect | Example |
|------|--------|---------|
| `--technical` | Skip to technical flow (ta → me) | `/protocol --technical refactor auth` |
| `--defect` | Skip to defect flow (qa → me → qa) | `/protocol --defect login broken` |
| `--no-checkpoints` | Run full chain without pausing | `/protocol --no-checkpoints add profiles` |
| `--verbose` | Show detailed summaries at checkpoints | `/protocol --verbose add dashboard` |
| `--minimal` | Show minimal summaries (y/n only) | `/protocol --minimal fix cache` |
| `--skip-sd` | Skip service design stage | `/protocol --skip-sd add profiles` |
| `--skip-uxd` | Skip UX design stage | `/protocol --skip-uxd add profiles` |
| `--skip-uids` | Skip UI design stage | `/protocol --skip-uids add profiles` |
| `--design-only` | Stop after design stages (no ta/me) | `/protocol --design-only add profiles` |

---

### 5.2 Alternative Commands

| Command | Equivalent To | Purpose |
|---------|---------------|---------|
| `/build [feature]` | `/protocol [feature]` | Shorter alias for experience flow |
| `/fix [issue]` | `/protocol --defect [issue]` | Shorter alias for defect flow |
| `/refactor [component]` | `/protocol --technical refactor [component]` | Explicit technical work |
| `/design [feature]` | `/protocol --design-only [feature]` | Design-only mode |

**Why Alternative Commands:**
- Reduce cognitive load (fewer flags to remember)
- Clear intent signaling (build vs. fix vs. refactor)
- Faster typing for common patterns
- Discoverability (easier to guess `/fix` than `--defect`)

---

### 5.3 Mid-Flow Overrides

**User can interrupt at any checkpoint:**

```
[At Checkpoint 2, during UX Design stage]

User: "Skip the rest, just implement what we have so far"

System:
Understood. Skipping visual design and moving directly to implementation.

Context preserved:
- Service Design (WP-001)
- UX Design (WP-002)

Routing to @agent-ta for task breakdown based on current designs...
```

**Override Commands:**

| Command | Effect |
|---------|--------|
| "Skip to code" | Bypass remaining design, go to ta → me |
| "Skip the rest" | Same as above |
| "Pause here" | Save checkpoint, exit flow |
| "Restart" | Discard current work, start fresh |
| "Go back to [stage]" | Return to previous stage |

---

### 5.4 Skip Commands

**Granular Skip Control:**

```
# Skip individual stages
/protocol add profiles --skip-sd          # Skip service design
/protocol add profiles --skip-uxd         # Skip UX design
/protocol add profiles --skip-uids        # Skip UI design

# Skip multiple stages
/protocol add profiles --skip-sd,uxd      # Skip SD and UXD

# Skip all design
/protocol add profiles --skip-design      # Skip sd, uxd, uids (go straight to ta)
```

**Why Skip Commands:**
- User already has designs
- Rapid prototyping mode
- Technical-only changes disguised as features
- Time-sensitive implementations

---

## 6. Error States

### 6.1 Detection Fails

**Scenario:** System cannot determine flow from user input

**User Input:** "do the thing"

**System Response:**
```
[PROTOCOL: CLARIFYING | Action: ASKING]

I couldn't determine what type of work you need:
→ "do the thing" is too vague

Can you clarify?
1. Describe the feature/change you want
2. Choose a flow manually:
   - Experience (new feature, UI work)
   - Technical (refactor, optimization)
   - Defect (fix a bug)

Or try:
- /protocol add [feature name]
- /fix [issue description]
- /refactor [component name]
```

**Error Handling:**
- Never assume intent
- Provide concrete examples
- Offer manual flow selection
- Suggest better phrasing

---

### 6.2 Agent Returns Unexpected Result

**Scenario:** Agent completes but work product is malformed

**System Response:**
```
[PROTOCOL: ERROR | Agent: @agent-sd]

Unexpected result from @agent-sd:
→ Work product missing required sections

Attempting recovery...

Options:
1. Retry @agent-sd (recommended)
2. Skip to next stage with partial context
3. Start fresh with different approach

Which recovery option?
```

**Recovery Strategies:**

| Error Type | Recovery |
|------------|----------|
| Malformed work product | Retry agent with validation |
| Agent timeout | Offer manual input or retry |
| Agent returns blocker | Surface blocker, ask user how to proceed |
| Agent returns incomplete | Prompt agent to complete or user provides missing info |

---

### 6.3 User Abandons Mid-Flow

**Scenario:** User stops responding for 5+ minutes at checkpoint

**System Behavior:**

```
[After 5 minutes of inactivity]

Checkpoint saved at Stage 2 (UX Design).

Your work is preserved:
- WP-001: Service Design (complete)
- WP-002: UX Design (awaiting approval)

To resume later:
→ /continue (resume from checkpoint)
→ /continue --skip (skip approval, proceed)
→ /protocol [same feature] (detect and offer resume)

Checkpoint expires in: 24 hours
```

**Checkpoint Expiry:**
- Checkpoints expire after 24 hours
- User is warned at 22 hours (if system supports notifications)
- Expired checkpoints can be restored manually via Memory Copilot

---

### 6.4 Conflict Between Agents' Outputs

**Scenario:** UX Design conflicts with earlier Service Design

**Example:**
- Service Design: "3-step onboarding flow"
- UX Design: "Designed 5-step flow for clarity"

**System Detection:**
```
[PROTOCOL: WARNING | Stage: UX Design]

Potential conflict detected:
→ Service Design specified 3-step flow (WP-001)
→ UX Design created 5-step flow (WP-002)

Recommendation:
1. Review both designs (show WP-001 and WP-002)
2. Choose preferred approach:
   - Use 3-step flow (revise UX Design)
   - Use 5-step flow (revise Service Design)
   - Use hybrid approach (describe)

Which resolution?
```

**Conflict Detection Logic:**
- Compare agent outputs for contradictions
- Check metadata for incompatible decisions
- Flag when acceptance criteria misaligned
- Surface to user for resolution

**Resolution Flow:**
- Present both options clearly
- Explain trade-offs if known
- Allow user to choose or describe hybrid
- Re-invoke relevant agent with resolution

---

## 7. Implementation Implications

### 7.1 Architecture Requirements

**Core Components:**

| Component | Purpose | Dependencies |
|-----------|---------|--------------|
| Intent Detector | Parse input, detect flow | Memory Copilot (context), keyword database |
| Flow Router | Choose A/B/C/D, route to agents | Intent Detector, agent registry |
| Checkpoint Manager | Save/load state, track approvals | Task Copilot, Memory Copilot |
| Agent Orchestrator | Invoke agents, manage handoffs | Task Copilot, agent_handoff tool |
| Conflict Detector | Compare outputs, detect issues | Work product analyzer, metadata parser |
| Error Handler | Catch failures, offer recovery | Preflight check, validation system |

---

### 7.2 Data Flows

**Flow A: Experience-First**

```
User Input → Intent Detector → Flow Router → Checkpoint Manager
                                                      ↓
                                              Agent Orchestrator
                                                      ↓
                                         sd → [checkpoint] → uxd → [checkpoint] → uids → [checkpoint] → ta → me
                                         ↓         ↓                ↓                ↓                ↓
                                      WP-001   Validate         WP-002          WP-003           WP-004 + Tasks
                                                  User                                                   ↓
                                               Approval?                                          Task Copilot
```

**Flow B: Defect**

```
User Input → Intent Detector → Flow Router → qa → [checkpoint] → me → qa
                                              ↓                    ↓      ↓
                                           WP-005              WP-006  WP-007
                                                                         ↓
                                                                  Task Copilot
```

**Flow C: Technical**

```
User Input → Intent Detector → Flow Router → ta → [checkpoint] → me
                                              ↓                    ↓
                                           WP-008              WP-009
                                                                  ↓
                                                           Task Copilot
```

**Flow D: Clarification**

```
User Input → Intent Detector → (ambiguous) → Clarification UI → User Choice → Flow A/B/C
```

---

### 7.3 Performance Requirements

| Interaction | Target Response | User Expectation |
|-------------|----------------|------------------|
| Intent detection | < 2 seconds | Instant |
| Agent invocation | 0 seconds (async) | Immediate acknowledgment |
| Agent completion | 10-30 seconds | Progress indication needed |
| Checkpoint rendering | < 1 second | Instant |
| User approval processing | < 1 second | Instant |
| Work product storage | < 500ms | Transparent |
| Conflict detection | < 2 seconds | Real-time during checkpoint |
| Error recovery | < 1 second | Immediate guidance |

---

### 7.4 Integration Points

**With Memory Copilot:**
- Load initiative context for intent detection
- Store flow decisions as lessons
- Track user preferences (verbosity, skip patterns)
- Preserve checkpoint state across sessions

**With Task Copilot:**
- Store all work products (WP-xxx)
- Create PRDs and tasks from final stage
- Track agent performance by flow type
- Store checkpoint metadata
- Link agent handoffs

**With Agents:**
- Pass 50-char context between agents
- Collect ~100 token summaries for checkpoints
- Validate work product structure
- Handle agent blockers and errors

**With Skills Copilot:**
- Load relevant skills per agent
- Track skill usage by flow type
- Suggest skills during clarification

---

## 8. Success Metrics

### 8.1 User Experience Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Flow completion rate | > 80% | % users who reach final stage |
| Checkpoint approval rate | > 70% first try | % approvals without revision |
| Average iterations per stage | < 2 | # revision loops before approval |
| Abandonment rate | < 15% | % users who stop mid-flow |
| Time to first checkpoint | < 30 seconds | Agent response time |
| User preference adherence | > 90% | Correct flow detection rate |

### 8.2 Design Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Experience-first adoption | > 60% of feature requests | % features that go through sd → uxd → uids |
| Design stage skip rate | < 30% | % users who skip design stages |
| Design-to-code alignment | > 85% | % implementations matching specifications |
| Conflict detection rate | 100% of conflicts | % conflicts caught before implementation |

### 8.3 System Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Intent detection accuracy | > 90% | % correct flow assignments |
| Agent handoff latency | < 2 seconds | Time between agents |
| Checkpoint save time | < 500ms | Time to persist state |
| Error recovery success | > 95% | % errors resolved without restart |

---

## 9. Open Questions for Technical Architect

### 9.1 Architecture Questions

- How to efficiently detect conflicts between agent outputs?
- What's the optimal checkpoint persistence strategy?
- How to handle concurrent flows (user starts second feature mid-flow)?
- Should checkpoints use Task Copilot or Memory Copilot storage?

### 9.2 Integration Questions

- How to pass context between agents without bloating tokens?
- What's the handoff protocol between agents in multi-agent chains?
- How to validate work product structure before checkpoint?
- Should conflict detection be synchronous or async?

### 9.3 User Experience Questions

- What's the optimal checkpoint timeout (5 min vs. 10 min)?
- Should we auto-proceed after timeout or require explicit resume?
- How verbose should conflict descriptions be?
- What's the right balance for default checkpoint verbosity?

### 9.4 Performance Questions

- Can we parallelize agent invocations (e.g., sd + ta simultaneously)?
- Should we pre-load next agent while user reviews checkpoint?
- What's the impact of checkpoint storage on database performance?
- How to optimize intent detection for large request strings?

---

## 10. Acceptance Criteria

### 10.1 Flow A (Experience-First)

- [ ] User can invoke `/protocol add [feature]` and reach sd → uxd → uids → ta → me flow
- [ ] Checkpoints appear after sd, uxd, uids stages
- [ ] User can approve, request changes, skip, or go back at each checkpoint
- [ ] Work products are stored in Task Copilot after each stage
- [ ] Final stage (ta) creates tasks with sourceSpecifications metadata
- [ ] Agent handoffs pass 50-char context correctly
- [ ] Emotional journey: Hopeful → Engaged → Confident → Satisfied

### 10.2 Flow B (Defect)

- [ ] User can invoke `/fix [issue]` or `/protocol --defect [issue]` and reach qa → me → qa flow
- [ ] Checkpoints appear after qa diagnosis and me implementation
- [ ] QA verification runs automatically after fix
- [ ] Root cause analysis is stored in work product
- [ ] Emotional journey: Concerned → Hopeful → Relieved

### 10.3 Flow C (Technical-Only)

- [ ] User can invoke `/protocol --technical [work]` or `/refactor [component]` and reach ta → me flow
- [ ] Checkpoint appears after ta planning
- [ ] No design stages are invoked
- [ ] Technical design is stored in work product
- [ ] Emotional journey: Focused → Confident → Accomplished

### 10.4 Flow D (Clarification)

- [ ] System detects ambiguous requests
- [ ] User is presented with flow options (experience/technical/defect)
- [ ] User selection routes correctly to chosen flow
- [ ] System suggests most likely flow based on context
- [ ] Emotional journey: Uncertain → Informed → Clear

### 10.5 Edge Cases

- [ ] User can pivot mid-flow (e.g., skip visual design)
- [ ] User can abandon and resume later via `/continue`
- [ ] User can go back to previous stage for revision
- [ ] System detects and surfaces conflicts between agent outputs
- [ ] System handles agent errors with recovery options
- [ ] Parallel flows detect file conflicts

### 10.6 Escape Hatches

- [ ] All flags work correctly (`--technical`, `--defect`, `--no-checkpoints`, etc.)
- [ ] Alternative commands route correctly (`/build`, `/fix`, `/refactor`, `/design`)
- [ ] Mid-flow overrides work ("skip to code", "pause here", etc.)
- [ ] Skip commands work (`--skip-sd`, `--skip-uxd`, etc.)

### 10.7 Performance

- [ ] Intent detection completes in < 2 seconds
- [ ] Checkpoints render in < 1 second
- [ ] Agent handoffs have < 2 second latency
- [ ] Checkpoint save time is < 500ms
- [ ] Error recovery provides options in < 1 second

---

## 11. Next Steps

### Phase 1: Foundation (Prerequisites: none)

**Goal:** Build core routing and checkpoint infrastructure

- Implement Intent Detector with keyword database
- Build Flow Router with A/B/C/D routing logic
- Create Checkpoint Manager with state persistence
- Add Agent Orchestrator for handoff management
- Implement basic Error Handler with retry logic

### Phase 2: Flow A (Prerequisites: Phase 1)

**Goal:** Enable experience-first flow with full agent chain

- Wire sd → uxd → uids → ta → me agent chain
- Add checkpoints after sd, uxd, uids stages
- Implement approval/rejection/skip/back logic
- Add conflict detection between agent outputs
- Test full experience-first flow end-to-end

### Phase 3: Flows B & C (Prerequisites: Phase 1)

**Goal:** Enable defect and technical-only flows

- Wire qa → me → qa agent chain for defects
- Wire ta → me agent chain for technical work
- Add checkpoints for each flow
- Test detection keywords for both flows

### Phase 4: Flow D & Edge Cases (Prerequisites: Phase 1-3)

**Goal:** Handle ambiguity and edge cases gracefully

- Implement clarification UI for ambiguous requests
- Add mid-flow pivot handling
- Add checkpoint resume logic via `/continue`
- Add go-back functionality
- Test parallel flow conflict detection

### Phase 5: Escape Hatches (Prerequisites: Phase 1-4)

**Goal:** Provide advanced user control mechanisms

- Implement all flags (`--technical`, `--no-checkpoints`, etc.)
- Add alternative commands (`/build`, `/fix`, etc.)
- Add mid-flow override commands
- Add skip commands (`--skip-sd`, etc.)
- Add verbosity controls (`--verbose`, `--minimal`)

### Phase 6: Polish & Optimization (Prerequisites: Phase 1-5)

**Goal:** Optimize performance and user experience

- Tune checkpoint timeouts
- Optimize intent detection accuracy
- Add progress indicators for agent work
- Improve error messages and recovery
- Add usage analytics and performance tracking

---

## Appendix A: Keyword Database

### Experience Keywords (Flow A)

```
add, create, build, design, feature, new, UI, UX, user
interface, experience, screen, page, modal, form, component
dashboard, profile, settings, flow, journey, interaction
visual, layout, style, brand, theme, redesign, improve (UX context)
```

### Defect Keywords (Flow B)

```
bug, broken, fix, error, crash, issue, not working, failing
regression, invalid, incorrect, wrong, unexpected, exception
500, 404, timeout, undefined, null, memory leak, race condition
```

### Technical Keywords (Flow C)

```
refactor, optimize, architecture, performance, scale, database
API, backend, service, worker, queue, cache, pipeline, infrastructure
migrate, upgrade, consolidate, modularize, decouple, extract
security, auth, permissions, encryption, validation
```

### Ambiguous Keywords (Flow D - triggers clarification)

```
improve, enhance, update, change, modify, revise, adjust
better, faster, cleaner, simpler, easier, more, less
fix (without error context), optimize (without performance context)
```

---

## Appendix B: Agent Summary Templates

### Service Design Summary Template

```
Task: TASK-xxx | WP: WP-xxx
Service: [Name]
Stages: [Journey stages]
Pain Points: [Top 2-3]
Opportunities: [Top 2-3]
Emotional Arc: [Low → High journey]
```

### UX Design Summary Template

```
Task: TASK-xxx | WP: WP-xxx
Interactions: [# states designed]
Key Flows: [Top 2-3 flows]
Accessibility: [WCAG level, key considerations]
Edge Cases: [# handled]
```

### UI Design Summary Template

```
Task: TASK-xxx | WP: WP-xxx
Design Tokens: [# color, spacing, typography tokens]
Components: [List of components]
Visual States: [# states designed]
Responsive: [Breakpoints covered]
```

### Technical Architecture Summary Template

```
Task: TASK-xxx | WP: WP-xxx
PRD: [PRD-xxx] created
Tasks: [# tasks] across [# streams]
Streams: [Stream IDs and names]
Complexity: [Low/Medium/High]
Source Specifications: [WP-xxx, WP-yyy, WP-zzz]
```

---

## Appendix C: Error Message Templates

### Detection Failed

```
I couldn't determine what type of work you need: "[user input]"

Can you clarify? Try:
→ /protocol add [feature name]
→ /fix [issue description]
→ /refactor [component name]

Or describe in more detail:
→ What you're building (feature)
→ What's broken (defect)
→ What you're improving (technical)
```

### Agent Error

```
[Agent name] encountered an error: [error description]

Recovery options:
1. Retry [agent name]
2. Skip to next stage (may lose context)
3. Start fresh with different approach

Which option? (or describe issue)
```

### Conflict Detected

```
Potential conflict detected:
→ [Stage 1]: [decision A]
→ [Stage 2]: [decision B]

These decisions conflict because: [reason]

Resolution options:
1. Use [decision A] (revise [Stage 2])
2. Use [decision B] (revise [Stage 1])
3. Use hybrid: [describe approach]

Which resolution?
```

### Checkpoint Expired

```
Checkpoint expired (created [X] hours ago).

Your work is still saved:
- [WP-xxx]: [Stage name] (status)
- [WP-yyy]: [Stage name] (status)

To recover:
→ /continue --from=[WP-xxx] (resume from specific stage)
→ /protocol [feature] (system will detect and offer resume)
→ Start fresh

Which recovery?
```

---

**End of Service Design Specification**
