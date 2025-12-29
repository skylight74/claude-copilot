# DOC-3: Decision Matrices

**Priority:** P0
**Agent:** @agent-doc
**Status:** Not Started
**Depends On:** None

---

## Description

Add decision matrices throughout existing documentation to help users understand "when to use what". This is the #1 takeaway from both the article and claude-howto.

## Acceptance Criteria

- [ ] Feature comparison table in USER-JOURNEY.md
- [ ] Agent selection matrix in AGENTS.md
- [ ] Memory vs Skills vs Commands distinction
- [ ] Use case → recommended approach mapping
- [ ] Extension type selection guide

## Reference

Study:
- `/docs/claude-howto-reference/README.md` (Feature Comparison, Use Case Matrix)
- Alex's article decision matrix

## Output

Updates to:
- `/docs/USER-JOURNEY.md`
- `/docs/AGENTS.md`
- `/docs/CONFIGURATION.md`
- `/CLAUDE.md`

---

## Subtasks

### DOC-3.1: Feature Comparison Matrix
**Agent:** @agent-doc
**File:** `/docs/USER-JOURNEY.md`

Create table comparing all features:
| Feature | Invocation | Persistence | Best For |
|---------|------------|-------------|----------|
| Memory | Auto | Cross-session | Context preservation |
| Agents | Protocol | Session | Expert tasks |
| Skills | Auto | On-demand | Reusable patterns |
| Commands | Manual | Session | Quick shortcuts |
| Extensions | Auto | Permanent | Team standards |

### DOC-3.2: Agent Selection Matrix
**Agent:** @agent-doc
**File:** `/docs/AGENTS.md`

Create "When to use which agent":
| Scenario | Agent | Why |
|----------|-------|-----|
| Bug reported | @agent-qa | Reproduces, tests |
| New feature design | @agent-sd → @agent-uxd | Journey → interaction |
| Architecture question | @agent-ta | System design |
| Code implementation | @agent-me | Writing code |
| Security concern | @agent-sec | Vulnerability check |

### DOC-3.3: Use Case Mapping
**Agent:** @agent-doc
**File:** `/docs/USER-JOURNEY.md`

Create "I want to..." guide:
| I want to... | Start with | Then |
|--------------|------------|------|
| Fix a bug | /protocol (DEFECT) | @agent-qa |
| Add a feature | /protocol (EXPERIENCE) | @agent-sd |
| Resume yesterday's work | /continue | Automatic |
| Share company standards | /knowledge-copilot | Extension setup |

### DOC-3.4: Extension Type Guide
**Agent:** @agent-doc
**File:** `/docs/EXTENSION-SPEC.md`

Add decision guide:
| Goal | Extension Type | Example |
|------|----------------|---------|
| Replace agent entirely | override | Custom methodology |
| Add to agent | extension | Additional checklists |
| Inject skills | skills | Company-specific tools |

### DOC-3.5: Commands Quick Reference
**Agent:** @agent-doc
**File:** `/CLAUDE.md`

Add command decision matrix:
| Command | When to Use | Scope |
|---------|-------------|-------|
| /setup | First time on machine | Machine |
| /setup-project | New project | Project |
| /protocol | Start fresh work | Session |
| /continue | Resume work | Session |

---

## Implementation Notes

- Tables should be scannable (short descriptions)
- Link to detailed sections for more info
- Use consistent column headers across all matrices
- Test that all recommendations actually work
