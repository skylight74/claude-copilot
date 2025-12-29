# Memory Status

Display the current state of Memory Copilot, making the invisible visible.

## Step 1: Get Current Initiative

Call `initiative_get` to retrieve the current initiative status.

## Step 2: Display Status

### If Initiative Exists

Present the following information:

```
## Current Initiative

Name: [initiative name]
Status: [IN PROGRESS / BLOCKED / READY FOR REVIEW / COMPLETE]
Started: [started timestamp]
Last updated: [updated timestamp]

### Progress

Completed:
- [list completed items]

In Progress:
- [list in progress items]

Blocked:
- [list blocked items with reasons]
```

### If No Initiative Exists

Present the empty state:

```
## Memory Status

No active initiative.

To start tracking work:
1. Run /protocol
2. Describe your task
3. Work normally - context is saved automatically

Or run /continue to see if there are past initiatives.
```

## Step 3: Show Recent Memories

Call `memory_search` with query "recent context decisions lessons" to retrieve recent memories.

Display the last 5 memories:

```
## Recent Memories

| Type | Content | When |
|------|---------|------|
| [decision/lesson/context] | [brief summary - first 80 chars] | [relative time] |
| [type] | [summary] | [time] |
...
```

If no memories found, display:
```
## Recent Memories

No memories stored yet.
```

## Step 4: Show Key Files

From the initiative data, display key files:

```
## Key Files

Files modified in this initiative:
- [file path 1]
- [file path 2]
- [file path 3]
...
```

If no key files tracked:
```
## Key Files

No files tracked yet.
```

## Step 5: Show Resume Info

If initiative exists with resume instructions:

```
## Next Session

When you run /continue, you'll resume with:
- Full initiative context
- All decisions and lessons
- Key files reference

Resume instructions:
"[resume instructions from initiative]"
```

If no resume instructions:
```
## Next Session

When you run /continue, you'll resume with the current initiative context.
Consider updating the initiative with `resumeInstructions` before ending the session.
```

## Step 6: Show Statistics (Optional)

If the memory system supports retrieving counts, display:

```
## Statistics

Total memories in workspace: [count]
- Decisions: [count]
- Lessons: [count]
- Context: [count]

Database: ~/.claude/memory/[workspace-id].db
```

If counts unavailable, skip this section.

## Implementation Notes

- Use relative timestamps where possible ("recently", "earlier today")
- Truncate long content summaries to keep output readable
- Handle missing fields gracefully (show "Not set" or omit section)
- Don't fail if memory system is unavailable - show error state instead
- Format output for readability with proper markdown tables and lists

## Error Handling

If memory system is unavailable:

```
## Memory Status

Unable to connect to Memory Copilot.

Ensure the copilot-memory MCP server is configured in .mcp.json:
- Check server configuration
- Verify MEMORY_PATH is accessible
- Check MCP server logs for errors
```
