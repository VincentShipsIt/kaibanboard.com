# PRD: Cross-Session Memory

**Created:** 2026-01-15
**Status:** Draft
**Related Task:** [Link](../TASKS/cross-session-memory.md)

---

## Overview

Enable AI agents to retain insights and context across sessions, making subsequent task executions smarter and more efficient. Store learned patterns, project-specific knowledge, and past decisions in a persistent memory store that agents can reference.

## Goals

1. Persist agent learnings across sessions
2. Store project-specific patterns and conventions
3. Remember past decisions and their outcomes
4. Reduce repeated exploration of familiar codebases
5. Enable knowledge transfer between tasks

## Requirements

### Functional Requirements

#### 1. Memory Storage
- **FR1.1**: Store memories in `.agent/MEMORY/` directory
- **FR1.2**: Structured memory format (JSON or Markdown)
- **FR1.3**: Categorize memories: patterns, decisions, insights, errors
- **FR1.4**: Timestamp and source task for each memory
- **FR1.5**: Memory versioning for updates

#### 2. Memory Types
- **FR2.1**: **Code Patterns**: Naming conventions, file structure, common patterns
- **FR2.2**: **Decisions**: Architectural choices, library selections, rationale
- **FR2.3**: **Insights**: Performance discoveries, security considerations
- **FR2.4**: **Errors**: Common mistakes and how to avoid them
- **FR2.5**: **Preferences**: User preferences learned during tasks

#### 3. Memory Retrieval
- **FR3.1**: Inject relevant memories into agent context
- **FR3.2**: Semantic search for related memories
- **FR3.3**: Recency-weighted retrieval (prefer recent memories)
- **FR3.4**: Task-type filtering (e.g., only "Bug" memories for bug fixes)

#### 4. Memory Management
- **FR4.1**: View all memories in UI
- **FR4.2**: Edit/delete individual memories
- **FR4.3**: Export memories (for sharing across projects)
- **FR4.4**: Import memories from other projects
- **FR4.5**: Memory pruning (remove outdated/irrelevant)

#### 5. Agent Integration
- **FR5.1**: Prompt template includes memory context
- **FR5.2**: Agent can write new memories during execution
- **FR5.3**: Agent asked to summarize learnings at task end
- **FR5.4**: Memory confidence scores

### Non-Functional Requirements

#### 1. Performance
- **NFR1.1**: Memory retrieval < 100ms
- **NFR1.2**: Memory injection doesn't bloat prompt significantly
- **NFR1.3**: Efficient storage (compress if needed)

#### 2. Privacy
- **NFR2.1**: Memories stored locally only
- **NFR2.2**: No sensitive data in memories (API keys, secrets)
- **NFR2.3**: User controls what gets remembered

## Technical Notes

### Memory Structure
```
.agent/MEMORY/
├── index.json           # Memory index with metadata
├── patterns/
│   ├── naming.md        # Naming conventions
│   ├── file-structure.md
│   └── api-patterns.md
├── decisions/
│   ├── 2026-01-15-auth-choice.md
│   └── 2026-01-10-database-selection.md
├── insights/
│   └── performance-findings.md
└── errors/
    └── common-mistakes.md
```

### Memory Schema
```typescript
interface Memory {
  id: string;
  type: 'pattern' | 'decision' | 'insight' | 'error' | 'preference';
  title: string;
  content: string;
  tags: string[];
  sourceTask?: string;
  createdAt: Date;
  updatedAt: Date;
  confidence: number; // 0-1, how reliable this memory is
  references: number; // How many times this was useful
}

interface MemoryIndex {
  version: string;
  memories: Memory[];
  lastUpdated: Date;
}
```

### Prompt Injection
```typescript
function buildPromptWithMemory(task: Task, memories: Memory[]): string {
  const relevantMemories = retrieveRelevantMemories(task, memories);

  return `
## Project Memory (Learned from previous sessions)

${relevantMemories.map(m => `
### ${m.title}
${m.content}
`).join('\n')}

## Current Task
${task.label}
${task.description}
`;
}
```

### Memory Writing During Execution
Agent can emit special markers that get captured:
```markdown
[MEMORY:pattern] The codebase uses kebab-case for file names
[MEMORY:decision] Chose React Query over SWR because of better devtools
[MEMORY:insight] The auth module has a 500ms timeout that can cause issues
```

## User Stories

1. **As a developer**, I want the agent to remember my codebase patterns so it writes consistent code.

2. **As a user**, I want past decisions recorded so I don't have to re-explain choices.

3. **As a power user**, I want to share learnings across projects for consistency.

## Acceptance Criteria

- [ ] Memories stored in `.agent/MEMORY/`
- [ ] Multiple memory types supported
- [ ] Relevant memories injected into prompts
- [ ] Agent can write new memories
- [ ] Memory viewer in UI
- [ ] Edit/delete memories
- [ ] Export/import memories
- [ ] Semantic search for retrieval
- [ ] No sensitive data storage

## Out of Scope

- Cloud-based memory storage
- Team memory sharing (local only for now)
- Automatic memory generation from git history
- Memory conflicts resolution

---

## Changelog

- 2026-01-15: Initial draft
