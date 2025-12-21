# Complete Documentation Strategy Guide

This guide provides a comprehensive framework for documenting projects consistently and effectively. It ensures any LLM can understand your projects, how to integrate with them, and how products in the ecosystem can improve one another.

## Documentation Philosophy

**Core Principle:** Documentation should make your project accessible, maintainable, and valuable to both human contributors and LLM agents that need to understand, integrate with, or extend your systems.

**Primary Goals:**
- Enable new team members to contribute quickly
- Allow LLMs to understand system boundaries, data flows, and integration points
- Reduce support burden through self-service resources
- Preserve institutional knowledge
- Make cross-product integration discoverable and actionable

---

## Audience & Depth (Product vs Shared)

### Two-Tier Documentation Model

| Tier | Location | Audience | Purpose | Token Budget |
|------|----------|----------|---------|--------------|
| **Product Docs** | `docs/` in each repo | Developers, operators | Full implementation detail | Unlimited |
| **Shared Pack** | `docs/shared/02-products/<product>/` | LLMs, integrators, cross-team | Concise summary for context | <4,000 tokens total |

**Product docs (`docs/` in each repo):**
- Full detail for developers and operators
- Code-level steps, runbooks, schema definitions, workflows, testing procedures
- UX specifications, GTM nuances, troubleshooting guides
- Source of truth for implementation and procedures
- No length restrictions

**Shared product pack (`docs/shared/02-products/<product>/`):**
- Concise, LLM-facing summary optimized for context windows
- Purpose, system context, data model snapshot, key flows
- Auth methods, environment matrix, integration points
- Security posture, current decisions/gaps
- Always cross-links to detailed product docs
- Target: 1-2 screens per topic, <4,000 tokens for entire pack

### Length Targets for Shared Summaries

| Page Type | Word Count | Token Estimate | Notes |
|-----------|------------|----------------|-------|
| Overview | 300-500 | 400-700 | Product purpose, key capabilities |
| Architecture | 400-600 | 550-850 | + 1 diagram reference |
| Deployment | 200-400 | 280-560 | Environments, domains only |
| Operations | 200-400 | 280-560 | Monitoring, alerts summary |
| API | 300-500 | 420-700 | Endpoint list, auth, key payloads |
| Security | 200-300 | 280-420 | Auth methods, data handling |
| Integrations | 300-500 | 420-700 | How to connect, webhook formats |
| Decisions | 200-400 | 280-560 | Current priorities, known gaps |

**Token efficiency tips:**
- Use tables over prose (30-50% more token-efficient)
- Bullet points over paragraphs
- Omit articles ("the", "a") in table cells
- Use consistent abbreviations (env, config, auth)

---

## Directory Architecture Strategy

### Standard Documentation Structure

```
project-root/
├── README.md                    # Project overview and quick start
├── docs/                        # Main documentation hub
│   ├── getting-started.md      # Detailed setup and onboarding
│   ├── architecture.md         # System design and structure
│   ├── api/                    # API documentation
│   ├── guides/                 # Step-by-step tutorials
│   ├── reference/              # Technical specifications
│   ├── troubleshooting/        # Common issues and solutions
│   └── contributing.md         # Contribution guidelines
├── examples/                   # Working code examples
└── templates/                  # Reusable templates and boilerplates
```

### Shared Docs Structure (leading-zero, 00 reserved for overviews)

```
docs/shared/
├── 03-ai-enabling/03-operations/          # Global standards and templates
├── 01-company/                 # All company-facing info
│   ├── 00-overview.md
│   ├── 01-brand/               # Brand, tone, assets
│   │   ├── 00-overview.md
│   │   ├── 01-brand-colors.md
│   │   ├── 02-tone-of-voice.md
│   │   └── 03-assets/
│   ├── 02-services/            # Offerings and delivery playbooks
│   │   ├── 00-overview.md
│   │   ├── 01-coalesce-experience-design.md
│   │   ├── 02-coalesce-org-design.md
│   │   ├── 03-colab.md
│   │   ├── 04-cocreate.md
│   │   └── 05-fractional-copilot.md
│   └── 03-gtm/                 # GTM and marketing
│       ├── 00-overview.md
│       └── 01-gtm-plan.md
├── 02-products/                # Products + platform/technical
│   ├── 00-ecosystem-overview.md
│   ├── 01-tech-docs-template.md
│   ├── 02-new-product-integration-prompt.md
│   ├── 03-existing-product-integration-prompt.md
│   ├── 04-llm-docs-instructions.md
│   ├── 05-platform/            # Shared infra/architecture
│   │   └── 00-overview.md
│   ├── 06-insights-copilot/
│   │   └── 00-readme.md
│   ├── 07-research-copilot/
│   │   └── 00-readme.md
│   ├── 08-preflight-copilot/
│   │   └── 00-readme.md
│   └── 09-forces-assessment/
│       └── 00-readme.md
├── 03-ai-enabling/02-profiles/
│   └── 00-overview.md
└── 99-docs-maintenance/           # Utilities for managing shared docs
```

**Numbering rules (apply to files and folders):**
- Use leading zeros; reserve `00` for overviews/entry points only
- Start content items at `01` within each directory
- Keep per-product folders prefixed (`06-…`, `07-…`, etc.) to preserve order
- **Directories:** Sequential numbering (`01-`, `02-`) for stable hierarchies
- **Files in shared packs:** Sparse numbering (`10-`, `20-`, `30-`) to allow insertions
- Utility/tooling lives in `99-docs-maintenance/` at the shared root, not inside content areas

### Specialized Documentation Directories

**For Complex Projects:**
```
docs/
├── 00-overview/               # Project fundamentals
├── 01-setup/                 # Installation and configuration
├── 02-user-guides/           # End-user documentation
├── 03-developer-guides/      # Technical implementation guides
├── 04-architecture/          # System design and patterns
├── 05-api-reference/         # API and component documentation
├── 06-deployment/            # Deployment and operations
├── 07-troubleshooting/       # Problem resolution
└── 99-appendix/              # Additional resources
```

**For Business Process Documentation:**
```
workflows/
├── [business-function]/      # Group by business area
│   └── [specific-process]/
│       ├── overview.md       # Process description
│       ├── requirements.md   # Technical requirements
│       ├── implementation.md # Step-by-step guide
│       ├── testing.md        # Testing procedures
│       └── troubleshooting.md # Common issues
```

### Naming Conventions

**File Naming Standards:**
- Use kebab-case for all files: `user-authentication-guide.md`
- Prefix with numbers for ordered content: `01-setup.md`, `02-configuration.md`
- Use descriptive names that clearly indicate content purpose
- Include version in filename when applicable: `api-reference-v2.md`

**Directory Naming Standards:**
- Use clear, business-focused names for workflow directories
- Group related content logically
- Use consistent prefixes for organization (00-, 01-, etc.)
- Avoid abbreviations unless universally understood

**Shared product pack filenames (recommended pattern):**

| File | Purpose |
|------|---------|
| `00-overview.md` | Product summary, capabilities, status |
| `10-architecture.md` | System context, components, data flow |
| `20-deployment.md` | Environments, domains, infrastructure |
| `30-operations.md` | Monitoring, maintenance, runbook links |
| `40-integrations.md` | How to connect, webhooks, APIs |
| `50-api.md` | Endpoint reference, auth, payloads |
| `60-security.md` | Auth methods, data handling, compliance |
| `70-decisions.md` | ADRs, current priorities, known gaps |
| `80-integration-prompt.md` | LLM prompt for integration tasks |

Each file must include a cross-link to the canonical detailed page in the product repo.

---

## LLM-Ready Documentation (Shared Packs)

### Standard Header Block

Every shared pack page must begin with this metadata block:

```markdown
---
product: [Product Name]
status: [Active | Beta | Deprecated | Planning]
last_updated: YYYY-MM-DD
source_of_truth: [relative path to detailed doc in product repo]
owner: [team or role]
token_estimate: [approximate tokens for this page]
---
```

**Example:**
```markdown
---
product: Insights Copilot
status: Active
last_updated: 2025-01-15
source_of_truth: ../../insights-copilot/docs/04-architecture/system-design.md
owner: Platform Team
token_estimate: 650
---
```

### Required Sections per Shared Pack

Each product pack should include these sections (concise bullets/tables only):

1. **Purpose and Promise** - What problem it solves, who it's for
2. **System Context** - Where it fits in the ecosystem, core components
3. **Data Model Snapshot** - Key entities and fields (table format)
4. **Key Flows** - Primary user journeys (numbered steps, <5 each)
5. **Integrations** - Inbound/outbound connections, webhook formats
6. **Auth Methods** - How to authenticate (headers, tokens, signing)
7. **Environment Matrix** - Domains, regions, providers per environment
8. **Security Posture** - Data handling, encryption, compliance stance
9. **Decisions/Gaps** - Current priorities, known limitations

### Cross-Link Format and Rules

**Standard cross-link format (use consistently):**

```markdown
> **Full details:** [Page Title](relative/path/to/detailed/doc.md)
```

**Placement rules:**
- Place cross-links at section end, not inline (easier for LLMs to parse)
- Bold the "Full details:" prefix for visual scanning
- Use relative paths from the shared file's location
- One cross-link per section maximum

**Example:**
```markdown
## Deployment

| Environment | Domain | Region |
|-------------|--------|--------|
| Production | insights.example.com | us-east-1 |
| Staging | insights-staging.example.com | us-east-1 |

> **Full details:** [Deployment Runbook](../../insights-copilot/docs/06-deployment/runbook.md)
```

**Update protocol:**
1. Change product doc first (source of truth)
2. Update shared summary to reflect changes
3. Update `last_updated` in header block
4. Verify cross-links still resolve

### Decision Framework: Detail vs Summary

When content exists in both locations, use this framework:

| Content Type | Location | Rationale |
|--------------|----------|-----------|
| Step-by-step runbooks (>5 steps) | `docs/` only | Procedures change with code |
| Code examples, configs | `docs/` only | Must match implementation |
| Architecture diagrams | Both | Shared links to detailed; LLMs need visual context |
| Environment matrix | Both | Shared = table; docs = full rationale |
| API endpoint list | Both | Shared = summary table; docs = full specs |
| Auth header examples | Both | Shared = pattern; docs = all variations |
| Error code reference | `docs/` only | Too detailed for summaries |
| Security posture summary | `docs/shared/` | LLMs need auth context fast |
| Security implementation | `docs/` only | Audit trail, compliance |
| Troubleshooting guides | `docs/` only | Requires full context |
| Data model (key entities) | Both | Shared = snapshot; docs = full schema |
| Integration webhooks | Both | Shared = format; docs = all fields |

### Duplication Control

**Prevention workflow:**
1. Run `docs/shared/99-docs-maintenance/check-shared-redundancy.sh` after doc changes
2. For each duplicate identified, apply decision framework above
3. Keep summaries in shared; keep procedures/how-tos in product docs
4. Replace redundant copies with cross-link pointers

**Handling redundant docs (DO NOT DELETE):**

Replace content with a redirect stub:
```markdown
# [Original Title] - MOVED

This content has been consolidated.

**New location:** [Link to canonical page](path/to/canonical.md)
**Archived:** YYYY-MM-DD
**Reason:** [Brief explanation]
```

Then archive the original file:
```bash
# Preserve directory structure in archive
mkdir -p _archive/docs/[original-path]
mv docs/[original-path]/file.md _archive/docs/[original-path]/file.md
```

### LLM Ingestion Optimization

**Structural patterns that help LLMs:**
- Favor tables for env vars, payloads, and endpoint lists
- Use consistent field names that match code/models exactly
- Include auth headers with placeholders (`Authorization: Bearer <token>`)
- Note known defaults/thresholds inline: `timeout: 30s (default)`
- List error codes briefly; link to full reference

**Example optimized table:**
```markdown
## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/forces` | Bearer token | Create force |
| GET | `/api/v1/forces/{id}` | Bearer token | Get force by ID |
| POST | `/webhooks/assessment` | HMAC-SHA256 | Receive assessment |

> **Full details:** [API Reference](../../insights-copilot/docs/05-api-reference/endpoints.md)
```

**Payload examples (minimal but real):**
```markdown
## Webhook Payload

```json
{
  "event": "assessment.completed",
  "assessment_id": "uuid",
  "client_id": "uuid",
  "forces": [{"name": "string", "intensity": 1-10}],
  "timestamp": "ISO-8601"
}
```

Headers required:
- `X-Webhook-Signature`: HMAC-SHA256 of body
- `Content-Type`: application/json
```

### Canonical Source Map

Each product pack should include a source map table:

```markdown
## Source Map

| Topic | Shared Summary | Detailed Doc |
|-------|---------------|--------------|
| Architecture | [10-architecture.md](./10-architecture.md) | [docs/04-architecture/](../../insights-copilot/docs/04-architecture/) |
| API | [50-api.md](./50-api.md) | [docs/05-api-reference/](../../insights-copilot/docs/05-api-reference/) |
| Deployment | [20-deployment.md](./20-deployment.md) | [docs/06-deployment/](../../insights-copilot/docs/06-deployment/) |
| Operations | [30-operations.md](./30-operations.md) | [docs/06-deployment/operations.md](../../insights-copilot/docs/06-deployment/operations.md) |
| Security | [60-security.md](./60-security.md) | [docs/07-security/](../../insights-copilot/docs/07-security/) |
| Integrations | [40-integrations.md](./40-integrations.md) | [docs/08-integrations/](../../insights-copilot/docs/08-integrations/) |
```

---

## Cross-Product Integration Documentation

### Integration Discovery

For LLMs to understand how products can integrate:

**Each product's `40-integrations.md` must include:**

1. **Inbound integrations** - How other products send data to this one
2. **Outbound integrations** - What this product sends to others
3. **Shared data entities** - Common models across products
4. **Event catalog** - Webhooks/events this product emits or consumes

**Example integration matrix:**
```markdown
## Integration Matrix

| Direction | Partner Product | Method | Data Exchanged |
|-----------|-----------------|--------|----------------|
| Inbound | Forces Assessment | Webhook | Assessment results, forces |
| Inbound | Research Copilot | API | Research findings |
| Outbound | n8n Copilot | Webhook | Synthesized insights |
| Outbound | Notion | MCP | Published reports |
```

### Shared Entity Definitions

When multiple products share data models, document in `docs/shared/02-products/05-platform/`:

```markdown
## Shared Entities

### Force
Used by: Insights Copilot, Forces Assessment, Research Copilot

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Unique identifier |
| name | string | Force name (max 255 chars) |
| category | enum | internal, external |
| intensity | int | 1-10 scale |
| source_type | enum | assessment, industry_scan, research |
| evidence | text | Supporting evidence |
| created_at | timestamp | ISO-8601 |
```

### Integration Prompt Template

Each product should include `80-integration-prompt.md`:

```markdown
# Integration Prompt: [Product Name]

Use this prompt when an LLM needs to integrate with [Product Name].

## Context
[Product Name] is [one-sentence description]. It [key capability].

## To send data TO [Product Name]:
1. Authenticate using [method]
2. POST to `[endpoint]` with payload:
   ```json
   { "required_fields": "here" }
   ```
3. Expect response: [format]

## To receive data FROM [Product Name]:
1. Register webhook at [endpoint]
2. Implement signature validation (HMAC-SHA256)
3. Handle events: [event_type_1], [event_type_2]

## Common integration patterns:
- [Pattern 1]: [brief description]
- [Pattern 2]: [brief description]

## Gotchas:
- [Known issue or non-obvious behavior]
- [Rate limits or constraints]
```

---

## Checklists

### New/Updated Feature Checklist

- [ ] Write/update the detailed doc in `docs/` (implementation, runbooks, examples)
- [ ] Add/update the shared summary with concise bullets and Source of Truth link
- [ ] Update `last_updated` and `status` in shared page header
- [ ] Run redundancy check script; remove duplicates and add pointers
- [ ] If payloads/auth changed, update tables and headers to reflect current fields
- [ ] Verify all cross-links resolve correctly
- [ ] If integration points changed, update `40-integrations.md` in shared pack

### Documentation Consolidation Checklist

Use this when consolidating existing documentation:

- [ ] Run `docs/shared/99-docs-maintenance/check-shared-redundancy.sh` to identify duplicates
- [ ] For each duplicate, classify using decision framework (detail vs summary)
- [ ] Merge overlapping detail pages into single canonical versions in `docs/`
- [ ] Replace shared duplicates with summaries + cross-links
- [ ] Create redirect stubs for moved content
- [ ] Archive redundant files (never delete) per project archival rules
- [ ] Update `last_updated` on all modified shared pages
- [ ] Verify all cross-links resolve correctly
- [ ] Test shared pack total token count (<4,000 target)
- [ ] Update source map table in product overview

### New Product Documentation Checklist

- [ ] Create product folder in `docs/shared/02-products/XX-product-name/`
- [ ] Create `00-overview.md` with standard header block
- [ ] Create minimum viable pack: overview, architecture, API, integrations
- [ ] Add product to `00-ecosystem-overview.md`
- [ ] Create `80-integration-prompt.md` for LLM integration
- [ ] Add source map table linking to detailed `docs/`
- [ ] Verify total pack is <4,000 tokens
- [ ] Add shared entities to platform docs if applicable

---

## Content Strategy and Structure

### Documentation Hierarchy

**1. Project Level (README.md)**
- What the project does (one clear sentence)
- Who it's for
- Quick start (under 5 minutes)
- Links to detailed documentation

**2. Getting Started**
- Prerequisites
- Step-by-step setup
- First successful use case
- Next steps

**3. User Guides**
- Task-oriented instructions
- Real-world scenarios
- Screenshots and examples
- Common workflows

**4. Technical Reference**
- API documentation
- Configuration options
- Architecture decisions
- Integration details

**5. Troubleshooting**
- Common error messages
- Diagnostic steps
- Resolution procedures
- When to escalate

### Content Types and Templates

**Process Documentation Template:**
```markdown
# [Process Name]

## Purpose
Brief description of what this process accomplishes.

## Prerequisites
- List required access, tools, or knowledge
- Link to setup documentation

## Step-by-Step Instructions
1. Action verb describing the first step
   - Expected result: what you should see
2. Next action with specific details
   - Include example data where helpful

## Troubleshooting
**If you see [specific error]:**
- Try this solution first
- Alternative approaches

## Related Resources
- Link to related processes
- Reference documentation
```

**Technical Guide Template:**
```markdown
# [Feature/Component Name]

## Overview
What this component does and why it exists.

## Quick Start
Minimal example to get started immediately.

## Configuration
Available options with examples and explanations.

## Advanced Usage
Complex scenarios and customization options.

## API Reference
Technical specifications and parameter details.

## Examples
Real-world use cases with complete code samples.
```

**Shared Pack Page Template:**
```markdown
---
product: [Product Name]
status: Active
last_updated: YYYY-MM-DD
source_of_truth: [path to detailed doc]
owner: [team]
token_estimate: [number]
---

# [Topic]: [Product Name]

## Summary
[2-3 sentences maximum]

## [Main Content Section]

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| data | data | data |

## Key Points
- Bullet point 1
- Bullet point 2
- Bullet point 3

> **Full details:** [Detailed Doc Title](path/to/detailed/doc.md)
```

---

## Tone of Voice Guidelines

### Core Writing Principles

**Write like you're explaining to a colleague**
- Use everyday language instead of technical jargon
- When technical terms are necessary, explain them in context
- Replace complex words with simple alternatives
- Assume intelligence but not familiarity with your specific system

**Be conversational and helpful**
- Address the reader directly with "you"
- Use contractions naturally (you'll, won't, it's)
- Write in active voice ("Click the button" not "The button should be clicked")
- Keep sentences concise and paragraphs focused (2-3 sentences max)

### Structure and Format Standards

**Guide users step-by-step**
- Number each step clearly (1, 2, 3...)
- Start each step with an action verb
- Include only one action per step
- Show expected results: "Click Save. The confirmation dialog appears."

**Make content scannable**
- Use clear, descriptive headings that answer questions
- Bold important terms, warnings, or key concepts
- Include bullet points for lists and options
- Add white space between sections for visual clarity

### Language and Tone Best Practices

**Be encouraging and supportive**
- Use positive framing ("When you're ready" instead of "You must")
- Acknowledge complexity ("This step can be tricky, but here's how...")
- Celebrate progress ("Great! You've successfully...")
- Choose welcoming words ("required" vs "mandatory", "run" vs "execute")

**Stay consistent throughout**
- Use the same term for the same concept
- Maintain present tense for instructions
- Keep formatting patterns consistent
- Choose either American or British English and stick with it

### Example Transformations

**Instead of:**
"Users must configure the authentication parameters via the designated configuration interface to establish secure connectivity."

**Write:**
"To connect securely, you'll need to set up authentication. Here's how:

1. Open the settings page
2. Click 'Authentication' in the sidebar
3. Enter your API key (for example: sk-1234567890abcdef)
4. Click 'Save Settings'

You'll see a green checkmark when the connection is successful."

---

## Implementation Strategy

### Getting Started with a New Project

**1. Create Core Structure**
```bash
mkdir docs
mkdir docs/guides docs/reference docs/troubleshooting
touch README.md docs/getting-started.md
```

**2. Write Foundation Documents**
- Start with README.md (project overview)
- Create getting-started.md (detailed setup)
- Document your first major use case

**3. Expand Based on User Needs**
- Add troubleshooting as questions arise
- Create guides for common workflows
- Build reference documentation for complex features

### Maintaining Documentation Quality

**Regular Review Process:**
- Review documentation with each major feature release
- Test setup instructions with fresh environment
- Update examples to reflect current best practices
- Remove or consolidate outdated content

**Quality Checklist for Each Document:**
- Can a newcomer understand this without additional context?
- Are examples realistic and tested?
- Are steps numbered and actionable?
- Did I explain technical terms when first introduced?
- Is each sentence necessary and clear?
- Would this help me if I were stuck?

### Documentation Workflow Integration

**During Development:**
1. Document API changes as you make them
2. Update setup instructions when dependencies change
3. Add troubleshooting entries when you solve problems
4. Create examples for new features

**Before Release:**
1. Test all setup instructions from scratch
2. Update version-specific references
3. Review and update outdated screenshots
4. Validate all external links

---

## Special Considerations

### Technical Documentation
- Include complete, working code examples
- Show both successful and error responses
- Document edge cases and limitations
- Provide migration guides for breaking changes

### Business Process Documentation
- Focus on business outcomes, not just technical steps
- Include decision trees for complex processes
- Document approval workflows and escalation paths
- Explain the "why" behind each requirement

### Integration Documentation
- Document both sides of integrations
- Include authentication examples with placeholders
- Provide test data and sandbox information
- Document rate limits and error handling
- Include webhook payload schemas

### Security Documentation
- Never include actual credentials or secrets
- Use placeholder values consistently (e.g., `<API_KEY>`, `sk-xxx...xxx`)
- Document security requirements clearly
- Include links to security best practices
- Specify required headers and signing methods

---

## Measuring Documentation Success

**Key Metrics:**
- Time to first successful setup for new users
- Reduction in support requests for documented topics
- User feedback and satisfaction scores
- Documentation usage analytics (if available)
- LLM integration success rate (for shared packs)

**Continuous Improvement:**
- Collect feedback on documentation pain points
- Monitor support channels for common questions
- Update documentation based on actual user behavior
- Regular reviews with team members and stakeholders
- Test shared packs with LLM integration scenarios

---

## Quick Reference Checklist

When creating any documentation, ask:

- [ ] Is the purpose immediately clear?
- [ ] Can someone complete this without asking questions?
- [ ] Are examples realistic and tested?
- [ ] Is the language conversational and helpful?
- [ ] Are steps numbered and actionable?
- [ ] Did I explain necessary technical terms?
- [ ] Is this organized logically?
- [ ] Would this help me if I were new to the project?
- [ ] Can an LLM understand how to integrate with this? (for shared packs)
- [ ] Are cross-links to detailed docs present and valid?

---

## Appendix: Quick Reference Tables

### File Location Decision Matrix

| Question | If Yes | If No |
|----------|--------|-------|
| Is this >5 procedural steps? | `docs/` | Could be either |
| Does this contain code examples? | `docs/` | Could be either |
| Is this a summary for quick context? | `docs/shared/` | `docs/` |
| Will LLMs need this for integration? | Both (summary in shared) | `docs/` |
| Is this environment-specific config? | `docs/` | Could be either |
| Is this a security implementation detail? | `docs/` | `docs/shared/` for posture |

### Token Estimation Reference

| Content Type | Tokens per 100 words |
|--------------|---------------------|
| Prose text | ~130-140 |
| Markdown tables | ~100-110 |
| Code blocks | ~120-130 |
| Bullet lists | ~110-120 |

Use this guide as your foundation for creating documentation that serves both human users and LLM agents effectively.
