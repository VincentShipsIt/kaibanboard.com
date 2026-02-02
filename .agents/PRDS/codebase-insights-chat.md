# PRD: Codebase Insights Chat

**Created:** 2026-01-15
**Status:** Draft
**Related Task:** [Link](../TASKS/codebase-insights-chat.md)

---

## Overview

Provide a chat interface for exploring and understanding the codebase. Users can ask questions like "How does authentication work?" or "Where are API endpoints defined?" and get contextual answers with code references. This reduces time spent manually searching through code.

## Goals

1. Natural language codebase exploration
2. Contextual answers with file/line references
3. Understand code architecture and patterns
4. Find relevant code quickly
5. Learn unfamiliar codebases faster

## Requirements

### Functional Requirements

#### 1. Chat Interface
- **FR1.1**: Chat panel in VS Code sidebar or webview
- **FR1.2**: Persistent chat history per project
- **FR1.3**: Clear/reset conversation option
- **FR1.4**: Export conversation as markdown

#### 2. Codebase Understanding
- **FR2.1**: Index codebase for semantic search
- **FR2.2**: Understand file relationships and dependencies
- **FR2.3**: Recognize common patterns (MVC, services, hooks)
- **FR2.4**: Track imports/exports between files

#### 3. Query Types
- **FR3.1**: "What does X do?" - Explain function/class
- **FR3.2**: "Where is X defined?" - Find definition
- **FR3.3**: "How does X work?" - Trace execution flow
- **FR3.4**: "What files use X?" - Find usages
- **FR3.5**: "What's the architecture?" - High-level overview

#### 4. Response Format
- **FR4.1**: Markdown formatted responses
- **FR4.2**: Code snippets with syntax highlighting
- **FR4.3**: Clickable file paths (open in editor)
- **FR4.4**: Diagrams for architecture questions (optional)

#### 5. CLI Integration
- **FR5.1**: `kai ask "How does auth work?"`
- **FR5.2**: `kai explain src/auth/login.ts`
- **FR5.3**: `kai find "user validation"`

### Non-Functional Requirements

#### 1. Performance
- **NFR1.1**: Initial indexing < 30 seconds for medium projects
- **NFR1.2**: Query response < 5 seconds
- **NFR1.3**: Incremental re-indexing on file changes

#### 2. Accuracy
- **NFR2.1**: References point to correct files/lines
- **NFR2.2**: Explanations are grounded in actual code
- **NFR2.3**: Acknowledge when uncertain

#### 3. Privacy
- **NFR3.1**: Code stays local (no cloud indexing)
- **NFR3.2**: Use local models or user's API key

## Technical Notes

### Architecture
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Chat UI        │────▶│  Query       │────▶│  Code       │
│  (Webview)      │     │  Processor   │     │  Index      │
└─────────────────┘     └──────────────┘     └─────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  LLM API     │
                        │  (Claude)    │
                        └──────────────┘
```

### Code Indexing
```typescript
interface CodeIndex {
  files: IndexedFile[];
  symbols: Symbol[];
  dependencies: Dependency[];
  lastIndexed: Date;
}

interface IndexedFile {
  path: string;
  language: string;
  symbols: string[];
  imports: string[];
  exports: string[];
  summary?: string;
}
```

### Query Processing
```typescript
async function processQuery(query: string, index: CodeIndex): Promise<Response> {
  // 1. Determine query type
  const queryType = classifyQuery(query);

  // 2. Find relevant files
  const relevantFiles = searchIndex(query, index);

  // 3. Build context
  const context = buildContext(relevantFiles, queryType);

  // 4. Query LLM with context
  const response = await queryLLM(query, context);

  // 5. Add file references
  return addReferences(response, relevantFiles);
}
```

### Chat Panel UI
```html
<div class="insights-chat">
  <div class="chat-history" id="chatHistory">
    <div class="message user">How does authentication work?</div>
    <div class="message assistant">
      <p>Authentication is handled by the <code>AuthService</code> in
      <a href="file:src/services/auth.ts">src/services/auth.ts:15</a>.</p>
      <p>The flow is:</p>
      <ol>
        <li>User submits credentials to <code>/api/auth/login</code></li>
        <li>Credentials validated against database</li>
        <li>JWT token generated and returned</li>
      </ol>
    </div>
  </div>
  <div class="chat-input">
    <input type="text" placeholder="Ask about your codebase..." />
    <button>Send</button>
  </div>
</div>
```

## User Stories

1. **As a new developer**, I want to ask questions about the codebase so I can onboard faster.

2. **As a developer**, I want to find where things are defined without manually searching.

3. **As a reviewer**, I want to understand how a feature works before reviewing changes.

## Acceptance Criteria

- [ ] Chat interface available in VS Code
- [ ] Codebase indexed on activation
- [ ] "What does X do?" queries work
- [ ] "Where is X?" queries work
- [ ] File references are clickable
- [ ] Chat history persisted
- [ ] CLI `kai ask` command works
- [ ] Incremental re-indexing works
- [ ] Response time < 5 seconds

## Out of Scope

- Multi-repository insights
- Real-time collaboration
- Voice queries
- Visual diagrams (future enhancement)

---

## Changelog

- 2026-01-15: Initial draft
