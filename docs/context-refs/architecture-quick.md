# Architecture Quick Reference

**Purpose**: Core system architecture for Claude Code Usage Monitor

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLI (Entry Point)                     │
│                 claude-monitor / ccm                     │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Monitoring Loop                         │
│              monitoring/orchestrator.py                  │
└──────┬─────────────────────────────────┬────────────────┘
       │                                 │
┌──────▼──────┐                 ┌────────▼────────┐
│   Core      │                 │       UI        │
│ Calculations│                 │  Rich Panels    │
│  Predictions│                 │  Tables/Layout  │
└──────┬──────┘                 └─────────────────┘
       │
┌──────▼──────┐
│    Data     │
│  Parsing    │
│  Reading    │
└─────────────┘
```

## Module Map

| Module | Files | Purpose |
|--------|-------|---------|
| `cli/` | `main.py` | Click commands, args |
| `core/` | `models.py`, `settings.py`, `calculator.py` | Business logic |
| `data/` | `reader.py`, `parser.py` | File handling |
| `monitoring/` | `orchestrator.py` | Main loop |
| `ui/` | `layouts.py`, `panels.py` | Rich components |
| `utils/` | `config.py`, `logging.py` | Utilities |

## Data Flow

```
~/.claude/usage.json → DataReader → TokenUsage → Calculator → UI Panel → Terminal
```

## Key Models

```python
@dataclass
class TokenUsage:
    current: int
    limit: int
    plan: str  # pro, max5, max20, custom

@dataclass
class Prediction:
    estimated_daily: int
    days_remaining: float
    reset_date: datetime
```

## Integration Points

| External | Location | Purpose |
|----------|----------|---------|
| Claude usage files | `~/.claude/` | Token usage data |
| Terminal | stdout | Rich UI output |

## Related

- Full architecture: `.claude/agents/architect.md`
- Development rules: `.claude/reference/development-rules.md`
