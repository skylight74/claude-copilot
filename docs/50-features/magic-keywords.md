# Magic Keywords

Magic keywords provide shortcuts for model selection and task routing in the `/protocol` command.

## Overview

Magic keywords are special prefixes you add to your `/protocol` commands to control:

1. **Model selection** (modifier keywords) - Which Claude model to use
2. **Task routing** (action keywords) - Which agent flow to activate

**Syntax:**
```
/protocol [modifier:] [action:] description
```

**Benefits:**
- Faster command entry (no need for flags)
- Explicit model control when needed
- Direct routing to specific flows
- Cost optimization through model selection

---

## Modifier Keywords

Modifier keywords control which Claude model is used for the task.

| Keyword | Target Model | Use When | Cost |
|---------|--------------|----------|------|
| `eco:` | Auto-select | You want cost optimization | Variable |
| `opus:` | Claude Opus | You need highest quality/reasoning | High |
| `fast:` | Claude Haiku | You need speed, simple task | Low |
| `sonnet:` | Claude Sonnet | You want balanced quality/speed | Medium |
| `haiku:` | Claude Haiku | You need speed, simple task | Low |
| `auto:` | Auto-select | You want automatic selection | Variable |
| `ralph:` | Auto-select | You want cost optimization (same as eco:) | Variable |

**Rules:**
- Maximum 1 modifier keyword per command
- Must be at the start of the message
- Case-insensitive (`eco:` = `ECO:` = `Eco:`)
- Must be followed by space or colon only (prevents false positives like "economics:")

### Examples

**Cost-optimized auto-selection:**
```
/protocol eco: fix the login bug
→ Automatically selects Haiku (low complexity) or Sonnet (medium)
```

**Force highest quality:**
```
/protocol opus: design the new checkout flow
→ Uses Claude Opus for complex design work
```

**Fast execution:**
```
/protocol fast: add console logging to auth module
→ Uses Haiku for simple implementation
```

**Balanced approach:**
```
/protocol sonnet: refactor the API layer
→ Uses Sonnet for balanced quality and speed
```

---

## Action Keywords

Action keywords route your task to specific agent flows.

| Keyword | Agent Flow | Agent Chain | Use When |
|---------|-----------|-------------|----------|
| `fix:` | Defect | qa → me → qa | Fixing bugs, errors, broken features |
| `add:` | Experience | sd → uxd → uids → ta → me | Adding new features, UI, functionality |
| `refactor:` | Technical | ta → me | Restructuring code, improving architecture |
| `optimize:` | Technical | ta → me | Performance improvements, efficiency |
| `test:` | QA | qa | Writing tests, test coverage |
| `doc:` | Documentation | doc | Writing documentation, API docs |
| `deploy:` | DevOps | do | Deployment, CI/CD, infrastructure |

**Rules:**
- Maximum 1 action keyword per command
- Can be combined with modifier keywords
- Overrides standard intent detection
- Case-insensitive

### Examples

**Fix bugs:**
```
/protocol fix: login authentication not working
→ Routes to Defect Flow: qa → me → qa
```

**Add features:**
```
/protocol add: dark mode toggle to settings
→ Routes to Experience Flow: sd → uxd → uids → ta → me
```

**Refactor code:**
```
/protocol refactor: auth module to use new patterns
→ Routes to Technical Flow: ta → me
```

**Optimize performance:**
```
/protocol optimize: database queries in user service
→ Routes to Technical Flow: ta → me
```

**Write tests:**
```
/protocol test: add unit tests for auth module
→ Routes directly to @agent-qa
```

**Write documentation:**
```
/protocol doc: API endpoints for user service
→ Routes directly to @agent-doc
```

**Deploy/infrastructure:**
```
/protocol deploy: set up staging environment
→ Routes directly to @agent-do
```

---

## Hybrid Usage

Combine modifier and action keywords for precise control.

### Format

```
/protocol [modifier:] [action:] description
```

**Order matters:** Modifier must come before action.

### Examples

**Cost-optimized bug fix:**
```
/protocol eco: fix: the login bug

[KEYWORDS DETECTED]
Model: eco → auto-select
Action: fix → Defect Flow

[PROTOCOL: DEFECT | Agent: @agent-qa | Action: INVOKING]
Routing to defect flow: qa → me → qa
Model selection: Auto-select based on complexity (cost-optimized)
```

**High-quality feature with design:**
```
/protocol opus: add: user profile customization

[KEYWORDS DETECTED]
Model: opus → opus
Action: add → Experience Flow

[PROTOCOL: EXPERIENCE | Agent: @agent-sd | Action: INVOKING]
Routing to experience-first flow: sd → uxd → uids → ta → me
Model selection: Claude Opus (highest quality)
```

**Fast refactoring:**
```
/protocol fast: refactor: simplify auth logic

[KEYWORDS DETECTED]
Model: fast → haiku
Action: refactor → Technical Flow

[PROTOCOL: TECHNICAL | Agent: @agent-ta | Action: INVOKING]
Routing to technical-only flow: ta → me
Model selection: Haiku (fastest, cost-efficient)
```

**Balanced optimization work:**
```
/protocol sonnet: optimize: API response times

[KEYWORDS DETECTED]
Model: sonnet → sonnet
Action: optimize → Technical Flow

[PROTOCOL: TECHNICAL | Agent: @agent-ta | Action: INVOKING]
Routing to technical-only flow: ta → me
Model selection: Sonnet (balanced quality and speed)
```

---

## Validation

The keyword parser validates your input and shows errors if you use invalid combinations.

### Invalid Combinations

**Multiple modifiers:**
```
/protocol eco: opus: fix the bug
❌ Invalid keyword combination:
Multiple modifiers detected: eco:, opus:. Use only one.
```

**Conflicting modifiers:**
```
/protocol fast: sonnet: add feature
❌ Invalid keyword combination:
Conflicting modifiers: fast: and sonnet: cannot be used together
```

### Valid Examples

**Single modifier only:**
```
✅ /protocol eco: the login bug
✅ /protocol opus: design the checkout flow
```

**Single action only:**
```
✅ /protocol fix: the login bug
✅ /protocol add: dark mode feature
```

**Both modifier and action:**
```
✅ /protocol eco: fix: the login bug
✅ /protocol opus: add: user profiles
```

**Neither (standard detection):**
```
✅ /protocol fix login authentication bug
✅ /protocol add dark mode to dashboard
```

---

## False Positive Protection

The parser only matches exact keywords at the start of the message to prevent false positives.

### What's NOT a Keyword

**Keyword in the middle of a word:**
```
/protocol fix economics database issue
→ No keyword detected (economics: is not eco:)
→ Standard intent detection applies
```

**Keyword in the middle of the message:**
```
/protocol the app needs to add: dark mode
→ No keyword detected (add: is not at start)
→ Standard intent detection applies
```

**Keyword without colon:**
```
/protocol fix the eco system
→ No keyword detected (eco needs colon)
→ Standard intent detection applies
```

### What IS a Keyword

**Exact match at start:**
```
✅ /protocol eco: fix the bug
✅ /protocol ECO: fix the bug (case-insensitive)
✅ /protocol eco:fix the bug (no space needed after colon)
```

**After another keyword:**
```
✅ /protocol eco: fix: the bug (modifier then action)
```

---

## Decision Guide

### When to Use Modifier Keywords

| Situation | Use | Why |
|-----------|-----|-----|
| Simple bug fix | `fast:` or `eco:` | Low complexity, save cost |
| Complex architecture | `opus:` | Need high-quality reasoning |
| Balanced task | `sonnet:` | Good quality without high cost |
| Unsure | `eco:` or omit | Let system auto-select |

### When to Use Action Keywords

| Situation | Use | Why |
|-----------|-----|-----|
| Clear intent | Use action keyword | Direct routing, faster |
| Ambiguous intent | Omit | Let system clarify |
| Experience work | `add:` | Skip to experience flow |
| Bug fix | `fix:` | Direct to defect flow |
| Refactoring | `refactor:` | Skip to technical flow |

### Comparison with Flags

| Feature | Magic Keywords | Explicit Flags |
|---------|---------------|----------------|
| Model selection | `eco:`, `opus:`, `fast:` | N/A (not available as flags) |
| Flow override | `fix:`, `add:`, `refactor:` | `--defect`, `--experience`, `--technical` |
| Typing speed | Faster (5-10 chars) | Slower (15-20 chars) |
| Clarity | Implicit | Explicit |
| Skip stages | Not available | `--skip-sd`, `--skip-uxd`, etc. |

**Recommendation:** Use magic keywords for quick commands. Use flags for advanced control (skip stages, checkpoint control, etc.).

---

## Quick Reference

### All Modifier Keywords

```
eco:     → Auto-select (cost-optimized)
opus:    → Claude Opus (highest quality)
fast:    → Claude Haiku (fastest)
sonnet:  → Claude Sonnet (balanced)
haiku:   → Claude Haiku (fastest)
auto:    → Auto-select (same as eco:)
ralph:   → Auto-select (cost-optimized)
```

### All Action Keywords

```
fix:      → Defect Flow (qa → me → qa)
add:      → Experience Flow (sd → uxd → uids → ta → me)
refactor: → Technical Flow (ta → me)
optimize: → Technical Flow (ta → me)
test:     → QA Testing (@agent-qa)
doc:      → Documentation (@agent-doc)
deploy:   → DevOps (@agent-do)
```

### Common Patterns

```bash
# Cost-optimized bug fix
/protocol eco: fix: login authentication error

# High-quality feature
/protocol opus: add: user voice recording

# Fast refactoring
/protocol fast: refactor: simplify auth logic

# Balanced optimization
/protocol sonnet: optimize: database queries

# Simple test writing
/protocol fast: test: auth module coverage

# Documentation
/protocol doc: API endpoints for users

# Deployment work
/protocol deploy: staging environment setup
```

---

## Implementation Notes

### Parser Location

The keyword parser is implemented in `.claude/commands/keyword-parser.ts`.

### Integration

The `/protocol` command imports and uses the parser:

```typescript
import { parseKeywords } from './keyword-parser';

const parsed = parseKeywords(userMessage);

if (!parsed.valid) {
  return parsed.errors; // Show validation errors
}

const modelPreference = parsed.modifier?.targetModel;
const actionKeyword = parsed.action?.keyword;
const cleanMessage = parsed.cleanMessage;

// Route based on parsed information
```

### Type Definitions

Types are defined in `mcp-servers/task-copilot/src/types/omc-features.ts`:

```typescript
interface ModifierKeyword {
  keyword: 'eco' | 'opus' | 'fast' | 'sonnet' | 'haiku' | 'auto' | 'ralph';
  position: number;
  raw: string;
  targetModel: 'haiku' | 'sonnet' | 'opus' | null;
}

interface ActionKeyword {
  keyword: 'fix' | 'add' | 'refactor' | 'optimize' | 'test' | 'doc' | 'deploy';
  position: number;
  raw: string;
  suggestedAgent?: string;
}

interface ParsedCommand {
  originalMessage: string;
  cleanMessage: string;
  modifier: ModifierKeyword | null;
  action: ActionKeyword | null;
  errors: string[];
  valid: boolean;
}
```

---

## Related Documentation

- [Protocol Command](../../.claude/commands/protocol.md) - Main protocol documentation
- [OMC Features](../50-features/omc-learnings.md) - Full OMC learnings integration
- [Ecomode](../50-features/ecomode.md) - Auto-select model routing details
- [Agent Routing](../10-architecture/02-agent-routing.md) - Agent flow details

---

## Future Enhancements

Potential future additions to magic keywords:

1. **Priority keywords:** `urgent:`, `low:`, `high:` for task prioritization
2. **Context keywords:** `solo:`, `pair:`, `team:` for collaboration mode
3. **Scope keywords:** `quick:`, `thorough:`, `deep:` for depth control
4. **Phase keywords:** `design:`, `impl:`, `test:` to skip to specific phase

See PRD-omc-learnings for roadmap details.
