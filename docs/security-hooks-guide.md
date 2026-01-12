# Security Hooks User Guide

## Overview

Security Hooks provide proactive security validation by intercepting tool calls before execution. This prevents accidental exposure of secrets, destructive commands, and unauthorized access to sensitive files.

## Quick Start

### 1. Initialize System

Security hooks are automatically initialized when Task Copilot starts. No manual setup required.

### 2. List Active Rules

```typescript
hook_list_security({})
```

**Output:**
```json
{
  "rules": [
    {
      "id": "secret-detection",
      "name": "Secret Detection",
      "description": "Blocks writes containing API keys, passwords, tokens...",
      "enabled": true,
      "priority": 90
    },
    // ... more rules
  ],
  "totalCount": 5,
  "enabledCount": 5
}
```

### 3. Test a Tool Call

Before executing a potentially risky operation:

```typescript
hook_test_security({
  toolName: "Write",
  toolInput: {
    file_path: "config.ts",
    content: "const API_KEY = 'ghp_abc123';"
  }
})
```

**Output:**
```json
{
  "allowed": false,
  "action": "block",
  "violations": [{
    "ruleName": "secret-detection",
    "reason": "Detected potential GitHub Token in file write",
    "severity": "critical",
    "recommendation": "Use environment variables or secure secret management"
  }],
  "executionTime": 2
}
```

## Default Security Rules

### Secret Detection

**What it detects:**
- AWS keys (AKIA...)
- Google API keys (AIza...)
- GitHub tokens (ghp_..., gh[pousr]_...)
- Stripe API keys (sk_live_...)
- JWT tokens
- Database connection strings with credentials
- Private keys (RSA, DSA, EC, OpenSSH)

**Action:** Block

**Example violation:**
```typescript
Write({
  file_path: "config.ts",
  content: "const AWS_KEY = 'AKIAIOSFODNN7EXAMPLE';"
})
// BLOCKED: Detected AWS Access Key
```

### Destructive Command Detection

**What it detects:**
- `rm -rf /` (critical)
- `DROP DATABASE/TABLE` (critical)
- `TRUNCATE TABLE` (high)
- System shutdown commands (critical)
- Fork bombs (critical)
- `chmod 777` (medium)

**Action:** Block (critical) or Warn (high/medium)

**Example violation:**
```bash
Bash({ command: "rm -rf /" })
// BLOCKED: Recursive force delete from root
```

### Sensitive File Protection

**What it protects:**
- `.env` files
- Credentials files
- SSH/SSL private keys
- Cloud provider configs (.aws/credentials, .kube/config)
- Database files

**Action:** Block (critical files) or Warn (database files)

**Example violation:**
```typescript
Edit({
  file_path: ".env",
  old_string: "KEY=old",
  new_string: "KEY=new"
})
// BLOCKED: Attempting to modify sensitive file: .env
```

### Credential URL Detection

**What it detects:**
- URLs with embedded credentials: `http://user:pass@host`
- Database URLs: `postgres://admin:secret@db`

**Action:** Block

**Example violation:**
```typescript
Write({
  file_path: "db.ts",
  content: "const DB = 'postgres://admin:password@localhost';"
})
// BLOCKED: Detected URL with embedded credentials
```

## Custom Rules

### Register a Custom Rule

```typescript
hook_register_security({
  rules: [{
    id: "internal-api-key",
    name: "Internal API Key Detection",
    description: "Detects internal API key patterns",
    priority: 85,
    patterns: [
      "INTERNAL_[A-Z0-9]{32}",
      "MYAPP_API_[A-Za-z0-9]{40}"
    ],
    severity: "critical",
    action: "block"
  }]
})
```

### Rule Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Unique rule identifier (lowercase-hyphenated) |
| `name` | string | Yes | Human-readable name |
| `description` | string | Yes | What this rule detects |
| `enabled` | boolean | No | Active status (default: true) |
| `priority` | number | No | 1-100, higher runs first (default: 50) |
| `patterns` | string[] | Yes | Regex patterns to match |
| `severity` | string | Yes | low, medium, high, critical |
| `action` | string | Yes | allow, warn, block |

### Priority Guidelines

| Range | Use Case |
|-------|----------|
| 90-100 | Critical security rules (secrets, keys) |
| 80-89 | High-priority rules (sensitive files, credentials) |
| 70-79 | Medium-priority rules (destructive commands) |
| 50-69 | Low-priority rules (code quality, style) |
| 1-49 | Informational rules (warnings only) |

## Common Use Cases

### 1. Prevent Production Credential Leaks

```typescript
hook_register_security({
  rules: [{
    id: "production-db-url",
    name: "Production Database URL Protection",
    description: "Prevents hardcoding production DB URLs",
    priority: 90,
    patterns: [
      "prod-db\\.company\\.com",
      "production\\.database\\.company\\.com"
    ],
    severity: "critical",
    action: "block"
  }]
})
```

### 2. Warn on Hardcoded IPs

```typescript
hook_register_security({
  rules: [{
    id: "hardcoded-ip-warning",
    name: "Hardcoded IP Warning",
    description: "Warns when hardcoding specific IPs",
    priority: 60,
    patterns: [
      "192\\.168\\.1\\.(10|20|30)",  // Production IPs
      "10\\.0\\.0\\.(50|60|70)"
    ],
    severity: "medium",
    action: "warn"
  }]
})
```

### 3. Block Binary File Modifications

```typescript
hook_register_security({
  rules: [{
    id: "binary-file-protection",
    name: "Binary File Protection",
    description: "Prevents editing binary files",
    priority: 75,
    patterns: [
      "\\.(exe|dll|so|dylib|bin)$"
    ],
    severity: "high",
    action: "block"
  }]
})
```

### 4. Prevent Bulk Data Operations

```typescript
hook_register_security({
  rules: [{
    id: "bulk-data-operation",
    name: "Bulk Data Operation Warning",
    description: "Warns on large-scale data operations",
    priority: 65,
    patterns: [
      "DELETE FROM \\w+ WHERE",
      "UPDATE \\w+ SET",
      "TRUNCATE TABLE"
    ],
    severity: "high",
    action: "warn"
  }]
})
```

## Managing Rules

### Enable/Disable a Rule

```typescript
// Temporarily disable rule
hook_toggle_security({
  ruleId: "secret-detection",
  enabled: false
})

// Re-enable rule
hook_toggle_security({
  ruleId: "secret-detection",
  enabled: true
})
```

### List All Rules (Including Disabled)

```typescript
hook_list_security({ includeDisabled: true })
```

### Get Specific Rule Details

```typescript
hook_list_security({ ruleId: "secret-detection" })
```

### Reset to Default Rules

```typescript
hook_register_security({ resetToDefaults: true })
```

## Configuration File

Rules can be defined in `.claude/hooks/security-rules.json`:

```json
{
  "version": "1.0.0",
  "description": "Project-specific security rules",
  "rules": [
    {
      "id": "custom-pattern",
      "name": "Custom Pattern Detection",
      "description": "Project-specific pattern",
      "enabled": true,
      "priority": 85,
      "patterns": ["YOUR_PATTERN_HERE"],
      "action": "block",
      "severity": "critical"
    }
  ]
}
```

## Troubleshooting

### False Positives

**Problem:** Legitimate code triggers security rules

**Solutions:**
1. Review matched pattern: `hook_test_security({ ... })`
2. Refine regex to be more specific
3. Lower severity from BLOCK to WARN
4. Temporarily disable: `hook_toggle_security({ ruleId: "...", enabled: false })`

### Performance Issues

**Problem:** Hook evaluation is slow

**Solutions:**
1. Check `executionTime` in test output
2. Simplify complex regex patterns
3. Reduce number of enabled rules
4. Increase priority of frequently-matched rules

### Missing Detections

**Problem:** Security issues not being caught

**Solutions:**
1. Review active rules: `hook_list_security({})`
2. Add custom rule for specific pattern
3. Test rule: `hook_test_security({ ... })`
4. Verify rule is enabled and priority is appropriate

## Best Practices

### 1. Start with Defaults

Default rules cover 90% of common security issues. Only add custom rules when needed.

### 2. Test Before Deploying

Always test custom rules before enabling:

```typescript
// Test first
const result = await hook_test_security({
  toolName: "Write",
  toolInput: { /* ... */ }
});

// If working as expected, register
if (result.violations.length > 0) {
  hook_register_security({ rules: [/* ... */] });
}
```

### 3. Use Specific Patterns

More specific regex = fewer false positives:

**Bad:** `[A-Z0-9]{20,}` (too broad)
**Good:** `MYAPP_API_[A-Z0-9]{40}` (specific format)

### 4. Document Custom Rules

Add clear descriptions for team understanding:

```typescript
{
  id: "custom-rule",
  name: "Custom Rule Name",
  description: "Detects X because Y. Added for project Z.",
  // ...
}
```

### 5. Review Regularly

Audit rules quarterly:
- Remove obsolete rules
- Update patterns for new threats
- Adjust priorities based on violations

### 6. Don't Over-Block

Use WARN for non-critical issues to avoid frustration:

```typescript
{
  action: "warn",  // Not "block"
  severity: "medium"  // Not "critical"
}
```

### 7. Monitor Violations

Regularly check security violations via MCP tools to identify patterns.

## Performance

- **Average evaluation time:** < 5ms per tool call
- **Pattern matching:** Optimized regex with early exit
- **No blocking:** Async evaluation doesn't block MCP server
- **Minimal overhead:** Only enabled rules are evaluated

## Limitations

- **Pattern-based:** Only detects known patterns, not semantic issues
- **Post-hoc validation:** Cannot prevent manual tool use outside MCP
- **No execution context:** Cannot analyze runtime behavior
- **Regex limitations:** Complex obfuscation may bypass detection

## Advanced Topics

### Rule Evaluation Order

Rules are evaluated in priority order (highest first):

1. Secret Detection (90)
2. Credential URL (88)
3. Destructive Command (85)
4. Sensitive File Protection (80)
5. Git Secret Commit (75)

**First BLOCK stops evaluation:** If a high-priority rule blocks, lower-priority rules are not evaluated.

### Context Extraction

The system extracts different contexts based on tool type:

- **File writes (Edit, Write):** File paths and content
- **Commands (Bash, Run):** Command text
- **Other tools:** All string values

### Security Actions

| Action | Value | Behavior | Use When |
|--------|-------|----------|----------|
| ALLOW | 0 | Silent pass | Content is safe |
| WARN | 1 | Log warning, allow | Potentially risky |
| BLOCK | 2 | Prevent execution | Security violation |

## API Reference

### `hook_register_security(input)`

Register custom rules or reset to defaults.

**Input:**
```typescript
{
  rules?: Array<SecurityRule>;
  resetToDefaults?: boolean;
}
```

**Returns:**
```typescript
{
  success: boolean;
  registered: string[];
  message: string;
}
```

### `hook_list_security(input)`

List active security rules.

**Input:**
```typescript
{
  includeDisabled?: boolean;
  ruleId?: string;
}
```

**Returns:**
```typescript
{
  rules: Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    priority: number;
  }>;
  totalCount: number;
  enabledCount: number;
}
```

### `hook_test_security(input)`

Test security rules without executing tool.

**Input:**
```typescript
{
  toolName: string;
  toolInput: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

**Returns:**
```typescript
{
  toolName: string;
  allowed: boolean;
  action: 'allow' | 'warn' | 'block';
  violations: Array<{
    ruleName: string;
    reason: string;
    severity: string;
    recommendation?: string;
  }>;
  warnings: Array<{...}>;
  executionTime: number;
}
```

### `hook_toggle_security(input)`

Enable or disable a rule.

**Input:**
```typescript
{
  ruleId: string;
  enabled: boolean;
}
```

**Returns:**
```typescript
{
  success: boolean;
  ruleId: string;
  enabled: boolean;
  message: string;
}
```

## Support

For issues or questions:
1. Check `.claude/hooks/README.md` for detailed documentation
2. Review integration examples in `src/hooks/__tests__/`
3. Run tests: `npm run test:security-hooks`
4. Check logs for detailed error messages

## License

MIT License - See LICENSE file for details
