# Service Design Specification: OMC Learnings Integration

## PRD Reference
Initiative: 5b6ef29a-3f9a-43a2-ac00-f41945227831
Feature: OMC Learnings Integration - Five developer experience enhancements from Oh My Claude Code

## Service Blueprint Overview

This specification maps the developer journey for integrating five developer experience features from Oh My Claude Code into Claude Copilot:

1. **Smart Model Routing (Ecomode)** - Intelligent cost optimization routing simple tasks to Haiku, complex to Opus
2. **Magic Keywords** - Simple, combinable prefixes (`eco:`, `auto:`, `fast:`, `ralph:`) for workflow control
3. **Progress HUD** - Real-time statusline showing current phase/task/progress
4. **Auto Skill Extraction** - Pattern detection with "Save as skill?" prompts
5. **Zero-Config Install** - Single-command setup with auto-detection

**Target users:** Developers using Claude Code CLI to build software with Claude Copilot framework

---

## Journey Map

### Current State: Claude Copilot Developer Experience

#### Stage 1: Discovery (Learning About Features)
**Frontstage:**
- Read CLAUDE.md documentation
- Browse docs/ directory for feature guides
- Ask Claude about available features
- Search GitHub issues/discussions

**Backstage:**
- Documentation files in various locations
- No feature discovery system
- Manual documentation updates
- Scattered feature information

**Pain Points:**
- Hidden features: Developers unaware of capabilities like skill_evaluate, validation system
- Documentation sprawl: Features documented across 10+ files
- No progressive disclosure: All features presented equally, overwhelming newcomers
- Discovery friction: Must read thousands of lines to understand what's possible

**Emotional State:** Confused, overwhelmed (low)

---

#### Stage 2: Setup (Enabling Features)
**Frontstage:**
- Run `/setup` from ~/.claude/copilot
- Run `/setup-project` in each project
- Manually edit .mcp.json for MCP servers
- Configure environment variables
- Install dependencies

**Backstage:**
- Multiple MCP servers (memory, task, skills)
- Database initialization scripts
- Node.js build processes
- File copying and symlinking
- Environment variable resolution

**Pain Points:**
- Multi-step setup: Three separate commands across different directories
- Configuration complexity: Manual .mcp.json editing, env vars, database paths
- No validation feedback: Silent failures, unclear whether setup succeeded
- MCP server confusion: Unclear which servers are required vs optional
- No cost visibility: Unaware of token/cost implications until bills arrive

**Emotional State:** Frustrated, uncertain (low)

---

#### Stage 3: Daily Use (Working with Features)
**Frontstage:**
- Run `/protocol` to start work
- Use agents via @agent-name routing
- Monitor token usage in Claude Code UI
- Check `.claude/tasks/` for work products
- Manually switch between models for cost control

**Backstage:**
- Memory Copilot database updates
- Task Copilot work product storage
- Agent skill evaluation
- Model API calls (Opus/Sonnet/Haiku)
- Token counting and billing

**Pain Points:**
- No progress visibility: Agent chains run in black box, no status updates
- Cost unpredictability: No upfront cost estimates, surprise bills
- Manual model selection: Developer must remember to use Haiku for simple tasks
- No skill reuse: Patterns emerge in work but not captured
- Context loss: Mid-task interruptions lose state, must start over
- No workflow shortcuts: Common patterns require full /protocol invocation

**Emotional State:** Productive but anxious about costs (medium)

---

#### Stage 4: Mastery (Optimization and Customization)
**Frontstage:**
- Create custom skills in .claude/skills/
- Build knowledge repositories
- Set up extensions
- Optimize MCP configurations
- Write custom commands

**Backstage:**
- Skill metadata files
- Knowledge sync scripts
- Extension override system
- Environment variable tuning
- Custom agent configurations

**Pain Points:**
- Skill creation barrier: Must manually create SKILL.md, metadata.json, write trigger patterns
- No pattern detection: System doesn't suggest "Hey, you've done this 3 times - save as skill?"
- Extension complexity: Override vs extension semantics unclear
- No cost analytics: Can't see which tasks/agents cost most, where to optimize
- Limited customization discovery: Advanced features hidden in docs

**Emotional State:** Empowered but wishes for automation (medium-high)

---

### Future State: With OMC Learnings Integration

#### Stage 1: Discovery (Instant Feature Awareness)
**Frontstage:**
- Run `/setup` - auto-detects and installs all features
- Welcome message shows available magic keywords
- `/help` command shows contextual feature suggestions
- Progress HUD shows feature hints during first uses

**Backstage:**
- Feature registry system
- Contextual help API
- Usage analytics for hint triggering
- Progressive disclosure algorithm

**Opportunities:**
- **Zero-discovery friction**: Features introduce themselves during natural workflow
- **Contextual hints**: "Try `eco:` for cost savings" when running expensive task
- **Progressive disclosure**: Show beginner → intermediate → advanced features based on usage
- **Inline documentation**: Help embedded in statusline, not separate docs

**Emotional State:** Confident, curious (high)

---

#### Stage 2: Setup (One Command, Zero Config)
**Frontstage:**
- Run `/setup` from anywhere
- System auto-detects environment (Node version, MCP support, project structure)
- Interactive prompts for optional features only
- Immediate validation feedback: "✓ Memory Copilot ready ✓ Task Copilot ready"
- Cost visibility upfront: "Ecomode enabled - 30-50% savings on simple tasks"

**Backstage:**
- Auto-detection scripts (package.json, .git, Claude config)
- MCP server auto-configuration
- Database auto-initialization
- Health checks with actionable errors
- Default optimization presets (ecomode on)

**Opportunities:**
- **Single command setup**: `/setup` handles everything, including project detection
- **Smart defaults**: Ecomode, progress HUD, auto-extraction enabled by default
- **Validation built-in**: Setup doesn't complete until all checks pass
- **Cost transparency**: Show projected savings during setup
- **No manual editing**: All configuration automated

**Emotional State:** Delighted, confident (high)

---

#### Stage 3: Daily Use (Visible Progress, Controlled Costs)
**Frontstage:**
- Run `eco: /protocol add dark mode` - Haiku routing explicit in statusline
- Progress HUD shows: `[sd 2/5] Mapping journey stages... (Haiku, ~$0.02)`
- Magic keyword combos: `fast eco: /protocol` for speed + savings
- Mid-task status: Press Cmd+I to see current agent, phase, cost so far
- Auto-extraction prompt: "Pattern detected: 'React testing setup' - Save as skill? (y/n)"

**Backstage:**
- Model router analyzing task complexity
- Real-time progress broadcasting
- Token/cost tracking per agent
- Pattern recognition ML
- Skill extraction suggestions
- Checkpoint system for interruptions

**Opportunities:**
- **Cost control**: Ecomode automatic, with override via `opus:` when needed
- **Progress transparency**: Always know what's happening, how long left, cost so far
- **Workflow shortcuts**: Magic keywords replace verbose flag combinations
- **Automatic skill building**: System learns patterns, prompts to codify
- **Interruptibility**: Progress HUD shows checkpoint status, safe to pause
- **Combinable controls**: `fast eco auto:` for full automation with optimizations

**Emotional State:** Calm, in control, productive (high)

---

#### Stage 4: Mastery (Automated Optimization)
**Frontstage:**
- Review auto-extracted skills: `/skills recent`
- Cost analytics dashboard: `/costs breakdown` shows top spenders
- One-click skill refinement: Edit auto-extracted pattern, save
- Export/share skill packs: `/skills export react-patterns`
- Custom magic keywords: Define `myflow:` as `fast eco auto: --skip-sd`

**Backstage:**
- Skill extraction ML model
- Cost analytics database
- Skill pack manifests
- Custom keyword registry
- Usage pattern analysis

**Opportunities:**
- **Zero-friction skill creation**: System does the heavy lifting, you just approve
- **Data-driven optimization**: See which agents/tasks cost most, optimize automatically
- **Skill ecosystem**: Share and discover skill packs from community
- **Workflow personalization**: Define shortcuts for your unique patterns
- **Continuous learning**: System improves routing and extraction over time

**Emotional State:** Expert, efficient, creative (very high)

---

## Touchpoints Analysis

### 1. Smart Model Routing (Ecomode)

| Stage | Frontstage | Backstage | Pain Points Addressed | Opportunities |
|-------|-----------|-----------|----------------------|---------------|
| Discovery | "Ecomode enabled" in setup output | Feature flag in config | Cost anxiety, no optimization | Immediate cost awareness |
| Setup | Default on, override with `ECOMODE=false` | Complexity analyzer in router | Manual model switching | Automatic optimization |
| Daily Use | `eco:` prefix or auto-detection, cost in HUD | Task complexity scoring (0-1 scale) | Surprise bills, manual routing | Transparent savings |
| Mastery | `/costs ecomode-stats` shows savings | Analytics tracking | No cost visibility | Data-driven decisions |

**Key Insight:** Cost control must be default, not opt-in. Developers should know they're saving money without thinking about it.

---

### 2. Magic Keywords

| Stage | Frontstage | Backstage | Pain Points Addressed | Opportunities |
|-------|-----------|-----------|----------------------|---------------|
| Discovery | Welcome banner lists keywords | Keyword registry | Verbose flags, complex syntax | Instant usability |
| Setup | Auto-completion in CLI | Keyword parser in /protocol | Discoverability | Progressive learning |
| Daily Use | `eco: fast: auto:` combinations | Middleware chain applying behaviors | Workflow friction | Fluid control |
| Mastery | Custom keyword definitions | User keyword config file | Repetitive flag combinations | Personalization |

**Key Insight:** Keywords should compose naturally. `eco fast:` should feel obvious, not arcane.

---

### 3. Progress HUD

| Stage | Frontstage | Backstage | Pain Points Addressed | Opportunities |
|-------|-----------|-----------|----------------------|---------------|
| Discovery | Appears immediately in first /protocol | WebSocket progress API | Black box agents | Immediate feedback |
| Setup | No setup, works automatically | Progress event emitters in agents | Setup uncertainty | Built-in visibility |
| Daily Use | Statusline: `[agent phase/total] task... (model, cost)` | Real-time event streaming | Context loss, interruption fear | Safe interrupts |
| Mastery | `/hud config` for customization | HUD theme system | Information overload vs starvation | Personal preferences |

**Key Insight:** Progress must be ambient, not intrusive. Statusline shows just enough, details on demand.

---

### 4. Auto Skill Extraction

| Stage | Frontstage | Backstage | Pain Points Addressed | Opportunities |
|-------|-----------|-----------|----------------------|---------------|
| Discovery | First extraction prompt after 3rd pattern use | Pattern detection ML | Manual skill creation | Automatic learning |
| Setup | Enabled by default, threshold configurable | Embeddings-based similarity | Skill creation barrier | Zero-friction reuse |
| Daily Use | "Save as skill? (y/n)" inline prompt | Pattern match confidence scoring | Lost patterns | Continuous improvement |
| Mastery | Bulk review: `/skills review-candidates` | Candidate skill queue | Reactive skill building | Proactive optimization |

**Key Insight:** Suggest skills at the point of pattern recognition, not later in a separate flow.

---

### 5. Zero-Config Install

| Stage | Frontstage | Backstage | Pain Points Addressed | Opportunities |
|-------|-----------|-----------|----------------------|---------------|
| Discovery | Single command in README: `/setup` | Environment detection system | Setup complexity | Instant start |
| Setup | Interactive wizard with smart defaults | Auto-detection + validation | Multi-step confusion | Guided onboarding |
| Daily Use | Transparent MCP management | Auto-start/restart MCP servers | Configuration drift | Hands-off reliability |
| Mastery | `/setup verify` for health checks | Validation suite | Silent failures | Confidence in system |

**Key Insight:** Setup should feel like magic, not archaeology. Auto-detect everything possible, ask only when necessary.

---

## Emotional Journey Map

```
Emotion
High ┤                     ╱───╮ Future: Daily Use (Progress HUD, Ecomode working)
     │                   ╱      ╲
     │                 ╱          ╲
Med  ┤               ╱              ╲──╮ Future: Mastery (Auto-learning)
     │    ╱───╮                        ╲
     │  ╱      ╲
Low  ┤╱          ╲──────────────────╯
     │ Current: Current:  Current:   Current:
     │ Discovery Setup    Daily Use  Mastery
     └────────────────────────────────────────► Journey Stage

Key Moments That Matter:
🌟 First zero-config setup success (Future Setup)
🌟 First cost savings shown in HUD (Future Daily Use)
🌟 First auto-extracted skill saves time (Future Mastery)
```

**Critical transitions:**
- **Discovery → Setup**: Must feel easier than current (one command vs three)
- **Setup → Daily Use**: Must show immediate value (cost savings visible day 1)
- **Daily Use → Mastery**: Must happen automatically (skills suggested, not created manually)

---

## Implementation Implications

### Architecture Components Needed

**1. Model Router Service**
- Complexity analyzer (AST parsing, keyword detection)
- Cost calculator (model pricing table)
- Override mechanism (keyword, flag, config)
- Analytics tracker (savings over time)

**2. Progress Broadcasting System**
- Agent instrumentation (emit events at phase boundaries)
- WebSocket/SSE server (real-time push to CLI)
- Statusline renderer (format for terminal width)
- History buffer (for `/progress history` command)

**3. Pattern Detection Engine**
- Embedding model for session similarity
- Pattern candidate queue (with confidence scores)
- Skill template generator (from detected patterns)
- User approval workflow (inline prompt)

**4. Setup Automation Framework**
- Environment detector (Node, OS, Claude config)
- MCP auto-configurator (generate .mcp.json)
- Validation suite (preflight checks)
- Interactive wizard (only for ambiguous choices)

**5. Keyword Parser & Registry**
- Keyword definition DSL
- Composition rules (eco + fast = both behaviors)
- User extension system (custom keywords)
- Auto-completion data

### Integration Requirements

**Task Copilot Integration:**
- Store cost data per task/agent
- Track model used per work product
- Pattern detection across work products
- Progress checkpoints for resumability

**Memory Copilot Integration:**
- Store cost savings statistics
- Track skill extraction history
- Remember user keyword preferences
- Lesson learned: "Always use eco: for CRUD tasks"

**Agent Integration:**
- Agents emit progress events (start phase, end phase)
- Agents accept complexity hints (from router)
- Agents report estimated vs actual cost
- Agents participate in pattern detection

**CLI Integration:**
- Statusline API for HUD rendering
- Keyword preprocessing before /protocol
- Setup command orchestration
- Interactive prompt system

### Data Flows

**Ecomode Flow:**
```
User: eco: /protocol add button
  ↓
Keyword Parser: extract "eco" flag
  ↓
Model Router: analyze "add button" complexity → score: 0.3 (low)
  ↓
Router Decision: route to Haiku
  ↓
Progress HUD: show "[routing to Haiku for cost savings]"
  ↓
Agent Execution: use Haiku, track cost
  ↓
Completion: "Completed for $0.02 (saved ~$0.15 vs Opus)"
```

**Pattern Detection Flow:**
```
Agent completes task
  ↓
Pattern Detector: extract session work products
  ↓
Similarity Check: compare to past sessions (embeddings)
  ↓
Match Found: confidence > 0.7, seen 3+ times
  ↓
Candidate Generation: extract common steps, files, decisions
  ↓
User Prompt: "Pattern detected: 'React component testing' - Save as skill? (y/n)"
  ↓
User: y
  ↓
Skill Builder: generate SKILL.md, metadata.json
  ↓
Skill Registry: add to .claude/skills/auto-extracted/
  ↓
Confirmation: "Skill saved: react-component-testing. Use via @include or skill_get."
```

**Progress HUD Flow:**
```
Agent: emit event { phase: "sd", step: 2, total: 5, task: "Mapping journey" }
  ↓
Progress API: receive event, update state
  ↓
HUD Renderer: format "[sd 2/5] Mapping journey... (Haiku, $0.01)"
  ↓
CLI Statusline: display in terminal bottom bar
  ↓
User: sees real-time progress, knows cost, feels in control
```

### Performance Requirements

| Feature | Response Time | Accuracy | Resource Usage |
|---------|--------------|----------|----------------|
| Model Router | <100ms decision | >90% correct complexity | Minimal CPU |
| Progress HUD | <50ms update latency | Real-time sync | <5% CPU overhead |
| Pattern Detection | Background processing | >70% useful suggestions | Run post-task only |
| Setup Automation | <30s full setup | 100% validation success | One-time cost |
| Keyword Parser | <10ms preprocessing | 100% composition correctness | Negligible |

### Security & Privacy

- **Cost data**: Store locally only, never transmitted
- **Pattern detection**: Opt-out via `AUTO_EXTRACT=false`
- **Progress events**: No sensitive data in statusline (file paths abbreviated)
- **Setup automation**: Never auto-send telemetry, explicit opt-in

---

## Acceptance Criteria

### Smart Model Routing
- [ ] Default Ecomode reduces costs by 30-50% on typical workload
- [ ] Complexity analyzer achieves >90% accuracy (Haiku for simple, Opus for complex)
- [ ] `eco:` keyword explicitly shown in HUD when active
- [ ] `/costs ecomode-stats` shows total savings in dollars
- [ ] Override with `opus:` keyword works 100% of time

### Magic Keywords
- [ ] `eco:`, `auto:`, `fast:`, `ralph:` all functional
- [ ] Keywords composable: `eco fast:` applies both behaviors
- [ ] Custom keywords definable in config
- [ ] Auto-completion shows available keywords
- [ ] Invalid keywords show helpful error with suggestions

### Progress HUD
- [ ] Statusline shows current agent, phase, step/total
- [ ] Cost estimate updates in real-time
- [ ] Model name (Haiku/Sonnet/Opus) visible
- [ ] Task description abbreviated to fit terminal width
- [ ] Pressing Cmd+I shows full progress details
- [ ] HUD gracefully handles terminal resize
- [ ] No visual glitches or flicker

### Auto Skill Extraction
- [ ] Pattern detected after 3+ similar sessions
- [ ] Prompt appears inline at task completion
- [ ] Generated skill includes trigger files, keywords, content
- [ ] User can edit before saving
- [ ] Saved skills immediately usable via skill_evaluate
- [ ] `/skills review-candidates` shows pending suggestions
- [ ] False positive rate <30% (7/10 suggestions are useful)

### Zero-Config Install
- [ ] `/setup` completes in <30 seconds on typical machine
- [ ] Auto-detects Node version, MCP support, project structure
- [ ] Generates valid .mcp.json automatically
- [ ] Validates setup before completing (all MCP servers connectable)
- [ ] Shows actionable errors if validation fails
- [ ] No manual config file editing required
- [ ] Works on macOS, Linux, Windows (WSL)

### Cross-Feature Integration
- [ ] Ecomode + Progress HUD show cost savings in real-time
- [ ] Pattern detection suggests skills for ecomode-appropriate tasks
- [ ] Setup enables all features by default with one command
- [ ] Magic keywords work seamlessly with all agents and flows

### Emotional Goals
- [ ] Developers feel confident (not anxious) about costs
- [ ] Setup feels magical (not frustrating)
- [ ] Progress visibility eliminates "black box" fear
- [ ] Skill extraction feels helpful (not spammy)
- [ ] Overall experience feels cohesive (not bolted-on)

---

## Open Questions for Technical Architect

### Smart Model Routing
1. **Complexity algorithm**: AST-based, keyword heuristics, ML model, or hybrid?
2. **Routing transparency**: How to communicate routing decisions without cluttering output?
3. **Override persistence**: Should `opus:` apply to whole session or just one task?
4. **Cost data storage**: Extend Task Copilot schema or separate analytics DB?
5. **Routing mistakes**: How to learn from user overrides (feedback loop)?

### Magic Keywords
1. **Parsing architecture**: Preprocess before /protocol or integrate into command parsing?
2. **Composition semantics**: Explicit rules (eco + fast = ordered) or emergent (both apply)?
3. **Custom keyword limits**: How many user keywords allowed? Name collision handling?
4. **Keyword discovery**: Auto-suggest keywords based on usage patterns?
5. **Backward compatibility**: How to handle existing /protocol flags?

### Progress HUD
1. **Broadcasting mechanism**: WebSocket, SSE, polling, or file-based?
2. **Agent instrumentation**: Require manual events or auto-instrument via hooks?
3. **Statusline rendering**: Use blessed.js, ink, custom ANSI, or terminal-kit?
4. **Multi-stream orchestration**: How to show progress for parallel streams?
5. **History persistence**: Store progress events in Task Copilot for later review?

### Auto Skill Extraction
1. **Embedding model**: OpenAI embeddings, local sentence transformers, or custom?
2. **Pattern matching**: Compare sessions, tasks, or work products?
3. **Template generation**: Rule-based or LLM-generated skill content?
4. **User approval UX**: Inline prompt, separate review queue, or both?
5. **Skill quality**: How to prevent low-quality auto-extracted skills?

### Zero-Config Install
1. **MCP auto-config**: How to detect which MCP servers are available/needed?
2. **Validation depth**: Surface checks or deep integration tests?
3. **Error recovery**: Auto-fix common issues or guide user step-by-step?
4. **Update mechanism**: How to update framework without breaking projects?
5. **Multi-project sync**: Share global config across projects safely?

### Cross-Cutting Concerns
1. **Performance**: How to ensure all features together don't slow down CLI?
2. **Feature flags**: Granular on/off controls or all-or-nothing?
3. **Telemetry**: What (if any) usage data to collect for improvement?
4. **Testing**: How to integration test features that depend on real AI responses?
5. **Documentation**: Auto-generate from feature metadata or manually maintain?

---

## Success Metrics (Post-Launch)

### Adoption Metrics
- % of users with Ecomode enabled (target: >80%)
- % of users using magic keywords (target: >60%)
- % of users who've extracted at least one skill (target: >40%)
- Average setup completion time (target: <2 minutes)

### Impact Metrics
- Average cost reduction per user (target: 30-50%)
- User-reported satisfaction with progress visibility (target: >8/10)
- Auto-extracted skill reuse rate (target: >50% of extracted skills used 3+ times)
- Setup success rate without support (target: >95%)

### Quality Metrics
- Complexity routing accuracy (target: >90% users don't override)
- HUD performance overhead (target: <5% CPU)
- Pattern detection false positive rate (target: <30%)
- Setup validation pass rate (target: >98%)

### Engagement Metrics
- Magic keyword combinations used per user (indicates mastery)
- Custom keywords defined (indicates personalization)
- Skills exported/shared (indicates community building)
- `/costs` command usage (indicates cost awareness)

---

## Phased Rollout Recommendation

**Phase 1: Foundation (Zero-Config + Progress HUD)**
- Deploy setup automation first (reduces friction for all subsequent features)
- Add basic progress HUD (builds confidence, teaches progress model)
- This creates the "delightful setup, visible progress" foundation

**Phase 2: Optimization (Ecomode + Magic Keywords)**
- Layer in model routing with default Ecomode (immediate cost savings)
- Add eco:, opus: keywords (explicit control)
- Add fast: keyword (workflow optimization)
- This delivers the "controlled costs, fluid workflow" value

**Phase 3: Intelligence (Auto Skill Extraction)**
- Enable pattern detection (learns from Phases 1-2 usage)
- Prompt skill extraction (converts patterns to reusable assets)
- This provides the "continuous improvement" capstone

**Rationale:**
- Each phase builds on previous (HUD needed for Ecomode transparency, usage data needed for extraction)
- Early wins (fast setup, visible progress) build trust for later intelligence features
- Phasing allows iteration based on real usage before full complexity

---

## Design Principles Informing This Specification

1. **Default to Delight**: Features should work out-of-box, require opt-out not opt-in
2. **Progressive Disclosure**: Show what's needed when needed, don't overwhelm
3. **Ambient Awareness**: Information should be present but not intrusive (statusline, not popups)
4. **Learn From Use**: System should get smarter as developer works (auto-extraction)
5. **Explicit When It Matters**: Costs, routing decisions should be transparent
6. **Compose, Don't Conflict**: Features should layer naturally (keywords, HUD, ecomode)
7. **Recover Gracefully**: Interruptions, errors should be resume-able (checkpoints, HUD state)
8. **Respect Attention**: Only prompt when high-value (skill extraction at 3rd pattern, not 1st)

---

## Handoff to @agent-ta

This service blueprint maps the complete developer journey for OMC Learnings Integration. The key insight is that **developer experience compounds**: Zero-config setup enables progress visibility, which builds trust for cost optimization, which generates usage patterns for auto-extraction.

**Critical design decisions made:**
1. **Ecomode default-on**: Cost control must be automatic, not manual
2. **Progressive disclosure**: Features introduce themselves during natural workflow
3. **Phased rollout**: Foundation → Optimization → Intelligence sequencing

**Technical architecture needed:**
- Model routing service with complexity analysis
- Progress broadcasting system (agent events → CLI statusline)
- Pattern detection engine (embeddings-based similarity)
- Setup automation framework (detect, configure, validate)
- Keyword parsing middleware (composition semantics)

**Next steps for @agent-ta:**
- Design model routing algorithm (complexity scoring)
- Specify progress event schema (what agents emit)
- Define pattern detection architecture (when/how to analyze)
- Plan setup automation flow (detection → configuration → validation)
- Establish keyword composition rules (parsing and execution order)
