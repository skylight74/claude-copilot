# SKILLS-1: Auto-Discovery

**Priority:** P2
**Agent:** @agent-me
**Status:** Not Started
**Depends On:** None

---

## Description

Modify Skills Copilot to auto-scan and register skills from local paths without requiring manifest entries. Match native Claude Code behavior where skills are discovered automatically.

## Acceptance Criteria

- [ ] Scans .claude/skills/ automatically on startup
- [ ] Validates SKILL.md frontmatter
- [ ] Falls back gracefully on malformed skills
- [ ] Supplements (doesn't replace) manifest
- [ ] Caches discovered skills for performance
- [ ] Reports discovered skills in skill_list

## Output

Updates to:
- `/mcp-servers/skills-copilot/src/providers/local.ts`
- `/mcp-servers/skills-copilot/src/index.ts`

---

## Subtasks

### SKILLS-1.1: Define Discovery Paths
**Agent:** @agent-me

Standard scan locations:
```typescript
const DISCOVERY_PATHS = [
  '.claude/skills',           // Project skills
  `${HOME}/.claude/skills`,   // User skills
];
```

### SKILLS-1.2: Implement Scanner
**Agent:** @agent-me

Add to LocalProvider:
```typescript
async discoverSkills(): Promise<SkillMeta[]> {
  const discovered: SkillMeta[] = [];

  for (const basePath of DISCOVERY_PATHS) {
    if (!fs.existsSync(basePath)) continue;

    const skillDirs = fs.readdirSync(basePath, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const dir of skillDirs) {
      const skillPath = path.join(basePath, dir.name, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const skill = await this.parseSkillFile(skillPath);
        if (skill) discovered.push(skill);
      }
    }
  }

  return discovered;
}
```

### SKILLS-1.3: Frontmatter Validation
**Agent:** @agent-me

Validate required fields:
```typescript
function validateSkill(skill: Partial<Skill>): ValidationResult {
  const errors: string[] = [];

  if (!skill.name) errors.push('Missing: name');
  if (!skill.description) errors.push('Missing: description');

  return {
    valid: errors.length === 0,
    errors,
    warnings: []
  };
}
```

### SKILLS-1.4: Graceful Fallback
**Agent:** @agent-me

Handle malformed skills:
```typescript
try {
  const skill = await this.parseSkillFile(skillPath);
  const validation = validateSkill(skill);

  if (validation.valid) {
    discovered.push(skill);
  } else {
    console.warn(`Skipping ${skillPath}: ${validation.errors.join(', ')}`);
  }
} catch (e) {
  console.warn(`Failed to parse ${skillPath}: ${e.message}`);
}
```

### SKILLS-1.5: Caching Layer
**Agent:** @agent-me

Cache discovered skills:
```typescript
private discoveryCache: Map<string, {
  skill: SkillMeta;
  mtime: number;
}> = new Map();

private shouldRefresh(skillPath: string): boolean {
  const cached = this.discoveryCache.get(skillPath);
  if (!cached) return true;

  const stat = fs.statSync(skillPath);
  return stat.mtimeMs > cached.mtime;
}
```

### SKILLS-1.6: Integration with skill_list
**Agent:** @agent-me

Update skill_list to show discovered skills:
```typescript
// In skill_list handler
const discovered = await localProvider.discoverSkills();
const manifest = await this.getManifestSkills();

return {
  manifest: manifest,
  discovered: discovered.map(s => ({
    ...s,
    source: 'discovered-local'
  }))
};
```

### SKILLS-1.7: New MCP Tool
**Agent:** @agent-me

Add skill_discover tool:
```typescript
{
  name: 'skill_discover',
  description: 'Force re-scan of local skill directories',
  inputSchema: {
    type: 'object',
    properties: {
      clearCache: { type: 'boolean', default: false }
    }
  }
}
```

### SKILLS-1.8: Testing
**Agent:** @agent-qa

Test scenarios:
- Empty skills directory
- Valid skills discovered
- Malformed skill ignored
- Cache invalidation on file change
- Mix of manifest + discovered skills

---

## Implementation Notes

- Don't break existing manifest-based loading
- Discovery should be additive
- Log warnings for malformed skills (don't fail silently)
- Consider startup performance impact
- Document new behavior in README
