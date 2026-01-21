# Context Reference Cards

Quick-access context cards for efficient AI development sessions.

## Available Cards

| Card | Tokens | Use When |
|------|--------|----------|
| `architecture-quick.md` | ~300 | Starting any session, understanding system |
| `development-quick.md` | ~250 | Daily development, quick command reference |

## Loading Strategy

### Standard Session
```
Load: architecture-quick.md + development-quick.md
Total: ~550 tokens
```

### Focused Session
```
Load: Just the card relevant to your task
Total: ~250-300 tokens
```

### Full Context (rare)
```
Load: All cards + agent context
Total: ~1,000-1,500 tokens
```

## Token Efficiency

| Approach | Tokens |
|----------|--------|
| Traditional (full docs) | 5,000+ |
| Context cards | 500-1,500 |
| **Reduction** | **75-85%** |

## Creating New Cards

Target: 200-400 tokens per card

Template:
```markdown
# [Topic] Quick Reference

**Purpose**: One-line description

## Core Concepts
[3-5 key points]

## Essential Patterns
[Most common code/commands]

## Related
- Links to detailed docs
```
