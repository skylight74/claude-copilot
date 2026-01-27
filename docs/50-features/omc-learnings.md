# OMC Learnings - Feature Overview

Five productivity enhancements inspired by [Oh My Claude Code](https://github.com/code-yeongyu/oh-my-opencode) (OMC), integrated into Claude Copilot.

## Overview

| Feature | Purpose | Status |
|---------|---------|--------|
| [Ecomode](#1-ecomode) | Smart model routing based on task complexity | ✅ Implemented |
| [Magic Keywords](#2-magic-keywords) | Quick action routing via keywords | ✅ Implemented |
| [Progress HUD](#3-progress-hud) | Real-time terminal status display | ✅ Implemented |
| [Skill Extraction](#4-skill-extraction) | Auto-detect patterns for skill creation | 🔄 Planned |
| [Zero-Config Install](#5-zero-config-install) | Simplified installation | 🔄 Planned |

---

## 1. Ecomode

**Smart Model Routing** - Automatically routes tasks to haiku/sonnet/opus based on complexity analysis.

**Location:** `mcp-servers/task-copilot/src/ecomode/`

### How It Works

1. Analyzes task title, description, file count, and agent type
2. Calculates complexity score (0.0 to 1.0)
3. Routes: < 0.3 → haiku, 0.3-0.7 → sonnet, > 0.7 → opus
4. Supports explicit overrides with modifier keywords

### Quick Example

```typescript
import { routeToModel } from 'task-copilot/ecomode/model-router';

// Low complexity → haiku
routeToModel({ title: 'Fix typo', fileCount: 1 });
// → model: 'haiku', score: 0.18

// High complexity → opus
routeToModel({ title: 'Architecture migration', fileCount: 15, agentId: 'ta' });
// → model: 'opus', score: 0.73

// Explicit override
routeToModel({ title: 'opus: Simple task' });
// → model: 'opus', isOverride: true
```

### Benefits

- **Cost optimization** - Simple tasks use cheaper models
- **Performance** - Haiku is faster for quick fixes
- **Quality** - Complex work gets Opus reasoning

📖 **Full documentation:** [Ecomode](./ecomode.md)

---

## 2. Magic Keywords

**Quick Action Routing** - Keywords at message start control model selection and agent routing.

### Modifier Keywords (Model Selection)

| Keyword | Model | Use Case |
|---------|-------|----------|
| `eco:` | Auto | Cost optimization |
| `opus:` | Opus | Highest quality |
| `fast:` | Haiku | Speed priority |
| `sonnet:` | Sonnet | Balanced |

### Action Keywords (Agent Routing)

| Keyword | Flow | Agent Chain |
|---------|------|-------------|
| `fix:` | Defect | qa → me → qa |
| `add:` | Experience | sd → uxd → uids → ta → me |
| `refactor:` | Technical | ta → me |
| `test:` | QA | qa |
| `doc:` | Documentation | doc |
| `deploy:` | DevOps | do |

### Quick Example

```bash
# Cost-optimized bug fix
/protocol eco: fix: login authentication error

# High-quality feature with design
/protocol opus: add: user profile customization

# Fast documentation
/protocol fast: doc: API endpoints
```

📖 **Full documentation:** [Magic Keywords](./magic-keywords.md)

---

## 3. Progress HUD

**Real-time Status Display** - Terminal UI showing task progress, model, and token usage.

**Location:** `mcp-servers/task-copilot/src/hud/`

### Display Format

```
[Stream-A] ▶ 50% | sonnet | ~1.2k tokens
[Stream-B] ✓ 100% | haiku | ~500 tokens
```

### Components

| Component | Description |
|-----------|-------------|
| `statusline.ts` | Main progress display |
| `terminal-compat.ts` | Capability detection, fallbacks |
| `websocket-client.ts` | Real-time event streaming |

### Quick Example

```typescript
import { createStatusline } from 'task-copilot/hud/statusline';

const hud = createStatusline('TASK-123', 'Fix bug', 'Stream-A');
hud.updateState({ status: 'in_progress', progressPercent: 50 });
hud.updateModel('sonnet');

console.log(hud.render().text);
// → [Stream-A] ▶ 50% | sonnet
```

### Terminal Compatibility

- Auto-detects color, unicode, TTY support
- ASCII fallback for CI environments
- Progress bars adapt to terminal capabilities

📖 **Full documentation:** [Progress HUD](./progress-hud.md)

---

## 4. Skill Extraction

**Auto-Detect Patterns** - Identifies repeated patterns in work and suggests skill creation.

### Detection Types

| Type | Example |
|------|---------|
| File patterns | "Always use X pattern in src/auth/**/*.ts" |
| Keyword patterns | "error handling", "validation" |
| Workflow patterns | "run tests before commit" |
| Best practices | "use async/await, not callbacks" |

### Planned Workflow

1. Pattern detection runs after task completion
2. Suggests skill creation with confidence score
3. Review via `/skills-approve` command
4. Auto-generates skill file with triggers

**Status:** 🔄 Planned for future implementation

---

## 5. Zero-Config Install

**Simplified Setup** - Reduce installation friction with auto-detection and sensible defaults.

### Planned Features

| Feature | Description |
|---------|-------------|
| Platform detection | macOS, Linux, Windows paths |
| Dependency checking | Node.js, Python, Git |
| Auto-configuration | MCP servers, directories |
| Migration support | Upgrade existing installs |

**Status:** 🔄 Planned for future implementation

---

## Architecture

### File Structure

```
mcp-servers/task-copilot/src/
├── ecomode/
│   ├── complexity-scorer.ts   # Complexity analysis (0.0-1.0)
│   └── model-router.ts        # Model selection logic
├── hud/
│   ├── statusline.ts          # Progress display component
│   ├── terminal-compat.ts     # Terminal capability detection
│   └── websocket-client.ts    # Real-time event streaming
└── types/
    └── omc-features.ts        # Shared type definitions
```

### Type Definitions

All OMC feature types are centralized in `omc-features.ts`:

| Category | Types |
|----------|-------|
| Ecomode | `ComplexityScore`, `ModelRoute`, `CostTracking` |
| Keywords | `ModifierKeyword`, `ActionKeyword`, `ParsedCommand` |
| HUD | `StatuslineState`, `ProgressEvent`, `TerminalCapabilities` |

---

## Integration Points

### With /protocol Command

Magic keywords integrate with the protocol command:

```bash
/protocol eco: fix: the login bug
# Parses keywords → routes to defect flow → uses auto-model
```

### With Task Copilot

Ecomode scores can be stored in task metadata:

```typescript
task_create({
  title: 'My task',
  metadata: {
    complexityScore: 0.45,
    recommendedModel: 'sonnet'
  }
});
```

### With Orchestration

Progress HUD integrates with parallel stream orchestration:

```bash
./watch-status  # Uses HUD components for live display
```

---

## Configuration

### Ecomode Thresholds

Customize routing thresholds:

```typescript
routeToModel({
  title: 'My task',
  thresholds: {
    low: 0.25,   // Default: 0.3
    medium: 0.65 // Default: 0.7
  }
});
```

### HUD Options

```typescript
createStatusline('TASK-123', 'Title', 'Stream-A', {
  useColor: true,      // Enable ANSI colors
  useUnicode: true,    // Enable unicode symbols
  maxWidth: 80,        // Max output width
  showFiles: false     // Show active files
});
```

---

## Related Documentation

- [Ecomode](./ecomode.md) - Complexity scoring and model routing
- [Magic Keywords](./magic-keywords.md) - Modifier and action keywords
- [Progress HUD](./progress-hud.md) - Terminal UI components
- [OMC Foundation Tasks](./omc-foundation-tasks.md) - Implementation details
- [Service Design](./service-design-omc-learnings.md) - Original service design spec
