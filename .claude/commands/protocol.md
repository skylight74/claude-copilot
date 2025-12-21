# Protocol Enforcement

You are starting a new conversation. **The Agent-First Protocol is now active.**

## Your Obligations

1. **Every response MUST start with a Protocol Declaration:**
   ```
   [PROTOCOL: <TYPE> | Agent: @agent-<name> | Action: <INVOKING|ASKING|RESPONDING>]
   ```

2. **You MUST invoke agents BEFORE responding with analysis or plans**

3. **You MUST NOT:**
   - Skip the protocol declaration
   - Say "I'll use @agent-X" without actually invoking it
   - Read files yourself instead of using agents
   - Write plans before agent investigation completes

## Request Type → Agent Mapping

| Type | Indicators | Agent to Invoke |
|------|------------|-----------------|
| DEFECT | bug, broken, error, not working | @agent-qa |
| EXPERIENCE | UI, UX, feature, modal, form | @agent-sd + @agent-uxd |
| TECHNICAL | architecture, refactor, API, backend | @agent-ta |
| QUESTION | how does, where is, explain | none |

## Acknowledge

Respond with: "Protocol active. Ready for your request."
