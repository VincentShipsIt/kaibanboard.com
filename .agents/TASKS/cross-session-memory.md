## Task: Cross-Session Memory

**ID:** task-cross-session-memory
**Label:** Cross-Session Memory
**Description:** Enable AI agents to retain insights and context across sessions, storing learned patterns, decisions, and project knowledge persistently.
**Type:** Feature
**Status:** Done
**CompletedAt:** 2026-01-19
**Priority:** Medium
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [Link](../PRDS/cross-session-memory.md)
**Order:** 6

---

## Details

### Scope

1. **Memory Storage**: `.agent/MEMORY/` structure
2. **Memory Types**: Patterns, decisions, insights, errors
3. **Retrieval**: Inject relevant memories into prompts
4. **Management**: View, edit, export memories

### Key Deliverables

- [ ] Memory storage service
- [ ] Memory types and schemas
- [ ] Prompt injection logic
- [ ] Memory viewer UI
- [ ] Export/import functionality

### Memory Structure

```
.agent/MEMORY/
├── index.json
├── patterns/
├── decisions/
├── insights/
└── errors/
```

### Agent Memory Writing

Agent can emit markers during execution:
```markdown
[MEMORY:pattern] Uses kebab-case for filenames
[MEMORY:decision] Chose React Query for data fetching
```

### Success Criteria

- Memories persist across sessions
- Relevant memories injected into prompts
- Agent can write new memories
- UI for viewing/editing memories
