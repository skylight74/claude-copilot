1. Renumbering scope: Should I renumber all files (01→03, 02→04, etc.) or just insert 01-human-centered and move 11→02?

A: Yes, renumber them all. 

2. Philosophy doc scope: Should 01-human-centered-development.md also define the agent categories formally? Something like:

| Category               | Roles                                                  | Veto Power                    |
|------------------------|--------------------------------------------------------|-------------------------------|
| Human Advocates        | Service Designer, UX Designer, UI Designer, Copywriter | Yes - on experience decisions |
| Technical Implementers | Architect, Engineer, DevOps, QA                        | No - serve the human vision   |
| Strategic              | Business Strategist, Product Manager                   | Context-dependent             |

A: This looks good. 

3. This project (claude-copilot): For the CLI monitor, which design roles make sense?
- Full trio (SD + UX + UI)?
- Just UX + UI (since it's an existing tool, not a new service)?
- Lightweight versions adapted for terminal UI context?

A: Full Trio. 