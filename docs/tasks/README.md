# Tasks: Framework Improvements

This directory contains the task breakdown for implementing the Framework Improvements PRD.

## Task Overview

| ID | Task | Priority | Agent | Status |
|----|------|----------|-------|--------|
| DOC-1 | Quick Reference Card | P0 | @agent-doc | ✅ Complete |
| DOC-2 | Learning Roadmap | P0 | @agent-doc | ✅ Complete |
| DOC-3 | Decision Matrices | P0 | @agent-doc | ✅ Complete |
| SETUP-1 | Unified Setup Command | P1 | @agent-me | ✅ Complete |
| SETUP-2 | 15-Minute Quick Start | P1 | @agent-doc + @agent-me | ✅ Complete |
| SETUP-3 | Template Variables | P1 | @agent-me | ✅ Complete |
| CMD-1 | /memory Command | P1 | @agent-me | ✅ Complete |
| CMD-2 | /extensions Command | P1 | @agent-me | ✅ Complete |
| AGENT-1 | Simplified Agent Format | P2 | @agent-ta | ⏸️ Deferred |
| SKILLS-1 | Auto-Discovery | P2 | @agent-me | ✅ Complete |
| QA-1 | Smoke Test Suite | P2 | @agent-qa | ✅ Complete |

## Recommended Implementation Order

### Phase 1: Documentation Foundation
1. DOC-1 → DOC-2 → DOC-3 (can be parallelized)

### Phase 2: Onboarding
1. SETUP-3 (template variables - unblocks SETUP-1)
2. SETUP-1 (unified setup)
3. SETUP-2 (quick start)

### Phase 3: Transparency Commands
1. CMD-1 and CMD-2 (can be parallelized)

### Phase 4: Framework
1. AGENT-1 (simplification)
2. SKILLS-1 (auto-discovery)
3. QA-1 (validation)

## Task Files

Each task has a dedicated file with:
- Description and acceptance criteria
- Subtask breakdown
- Implementation notes
- Agent assignment
- Dependencies

## Reference Material

- PRD: `/docs/PRD-FRAMEWORK-IMPROVEMENTS.md`
- claude-howto reference: `/docs/claude-howto-reference/`
- Existing docs: `/docs/`
