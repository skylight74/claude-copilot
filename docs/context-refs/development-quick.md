# Development Quick Reference

**Purpose**: Essential commands and patterns for daily development

## Quick Commands

| Task | Command |
|------|---------|
| Run | `claude-monitor` or `ccm` |
| Test | `pytest` |
| Lint | `ruff check src` |
| Type | `mypy src/claude_monitor` |
| Format | `black src && isort src` |
| Install | `uv pip install -e ".[dev]"` |

## CLI Options

```bash
ccm --plan pro       # Pro plan (~44k)
ccm --plan max5      # Max5 plan (~88k)
ccm --plan max20     # Max20 plan (~220k)
ccm --refresh 2      # 2 Hz refresh
ccm --view daily     # Daily aggregation
```

## File Patterns

```python
# Models → dataclass
@dataclass
class Model:
    field: type

# UI → Rich
from rich.panel import Panel
panel = Panel("content", title="Title")

# CLI → Click
@click.command()
@click.option("--flag")
def cmd(flag): ...
```

## Test Patterns

```python
# Unit test
def test_feature():
    result = function(input)
    assert result == expected

# Fixture
@pytest.fixture
def sample_data():
    return {...}

# Parametrize
@pytest.mark.parametrize("input,expected", [...])
def test_cases(input, expected): ...
```

## Commit Format

```bash
git commit -m "type(scope): description" \
           -m "- Detail" \
           -m "Related to Task X"
```

Types: `feat:` `fix:` `refactor:` `docs:` `test:` `chore:`

## Pre-Commit

1. `pytest` passes
2. `ruff check src` clean
3. `mypy src/claude_monitor` clean
4. No debug code
5. Task marked `[x]`

## Related

- Full commands: `CLAUDE.md`
- Agent rules: `.claude/agents/`
