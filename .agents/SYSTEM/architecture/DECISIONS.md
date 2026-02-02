# Architectural Decision Records (ADRs)

**Purpose:** Document significant architectural decisions.
**Last Updated:** 2025-01-27

---

## How to Use

When making a significant architectural decision, add an entry below using this format:

```markdown
## ADR-XXX: Title

**Date:** YYYY-MM-DD
**Status:** Proposed / Accepted / Deprecated / Superseded

### Context
What is the issue that we're seeing that is motivating this decision?

### Decision
What is the change that we're proposing and/or doing?

### Consequences
What becomes easier or more difficult because of this change?

### Alternatives Considered
What other options were considered?
```

---

## Decisions

### ADR-001: Use .agent/ Folder for AI Documentation

**Date:** 2025-12-28
**Status:** Accepted

#### Context
Need a structured way to organize AI agent documentation, session tracking, and project rules.

#### Decision
Use a `.agent/` folder at the project root with standardized subdirectories:
- `SYSTEM/` for rules and architecture
- `TASKS/` for task tracking
- `SESSIONS/` for daily session documentation
- `SOP/` for standard procedures

#### Consequences
- **Easier:** AI agents have consistent documentation structure
- **Easier:** Session continuity across conversations
- **More difficult:** Initial setup overhead

#### Alternatives Considered
- Inline documentation in code (rejected: not AI-friendly)
- Single README (rejected: doesn't scale)
- Wiki (rejected: separate from codebase)

---

### ADR-002: Require Cursor IDE (Not VS Code)

**Date:** 2025-12-28
**Status:** Accepted

#### Context
Extension uses Cursor-specific features (Cursor Cloud Agent API) and is designed for Cursor IDE workflows.

#### Decision
Check `vscode.env.appName` on activation. If not Cursor, show error message and don't activate extension.

#### Consequences
- **Easier:** Can use Cursor-specific APIs without compatibility layer
- **Easier:** Simpler codebase (no VS Code fallbacks)
- **More difficult:** Smaller user base (Cursor-only)
- **More difficult:** Users must have Cursor IDE installed

#### Alternatives Considered
- Support both VS Code and Cursor (rejected: adds complexity, Cursor features are key)
- Make Cursor features optional (rejected: core functionality depends on Cursor)

---

### ADR-003: Webview-Based UI Instead of Tree View

**Date:** 2025-12-28
**Status:** Accepted

#### Context
Kanban board requires drag-and-drop, visual layout, and interactive cards. VS Code Tree View API is limited for complex UIs.

#### Decision
Use VS Code Webview API to render HTML/CSS/JavaScript Kanban board in a panel.

#### Consequences
- **Easier:** Full control over UI/UX
- **Easier:** Can use modern web technologies
- **Easier:** Drag-and-drop support
- **More difficult:** Must handle message passing between webview and extension
- **More difficult:** Webview lifecycle management
- **More difficult:** Security considerations (CSP, script injection)

#### Alternatives Considered
- Tree View API (rejected: too limited for Kanban board)
- Status bar items (rejected: not suitable for board view)
- Custom editor (rejected: overkill, not editing files)

---

### ADR-004: Structured Markdown Task Format

**Date:** 2025-12-28
**Status:** Accepted

#### Context
Need a parseable format for tasks that's also human-readable and works with existing `.agent/TASKS/` workflows.

#### Decision
Use structured markdown format with metadata fields:
```markdown
## Task: Title
**ID:** task-id
**Status:** To Do
**Priority:** High
...
---
```

#### Consequences
- **Easier:** Human-readable and editable
- **Easier:** Compatible with existing markdown workflows
- **Easier:** Version control friendly
- **More difficult:** Parsing is more complex than JSON
- **More difficult:** Must handle malformed files gracefully

#### Alternatives Considered
- JSON files (rejected: not human-readable, harder to edit)
- YAML frontmatter (rejected: less common, parsing complexity)
- Database (rejected: overkill, not version-controllable)

---

### ADR-005: Multi-Provider AI Adapter Pattern

**Date:** 2025-12-30
**Status:** Accepted

#### Context
Want to support multiple AI providers (Cursor, OpenAI, OpenRouter, Replicate) with different APIs and capabilities.

#### Decision
Create adapter interface (`AIProviderAdapter`) with provider-specific implementations. Use `ProviderRegistry` to manage adapters centrally.

#### Consequences
- **Easier:** Add new providers without changing core code
- **Easier:** Test providers independently
- **Easier:** Users can choose their preferred provider
- **More difficult:** Must maintain multiple adapter implementations
- **More difficult:** API differences must be abstracted

#### Alternatives Considered
- Single provider only (rejected: limits user choice)
- Provider abstraction library (rejected: adds dependency, may not fit all use cases)
- Configuration-based provider selection (rejected: still need adapters for API differences)

---

### ADR-006: VS Code SecretStorage for API Keys

**Date:** 2025-12-30
**Status:** Accepted

#### Context
Need secure storage for API keys. Plaintext storage is insecure, and users shouldn't commit keys to git.

#### Decision
Use VS Code's `SecretStorage` API which encrypts secrets using OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service).

#### Consequences
- **Easier:** Secure by default (OS-level encryption)
- **Easier:** No manual key management needed
- **Easier:** Keys persist across sessions
- **More difficult:** Platform-specific behavior (OS keychain differences)
- **More difficult:** Can't easily export/import keys

#### Alternatives Considered
- Environment variables (rejected: not persistent, must be set each session)
- Plaintext config file (rejected: security risk)
- Custom encryption (rejected: reinventing the wheel, OS keychain is better)

---

### ADR-007: Task Status Updates Write to Files Directly

**Date:** 2025-12-28
**Status:** Accepted

#### Context
Tasks are stored as markdown files. When user updates status (drag & drop), need to persist change.

#### Decision
Read task file, parse content, update status field, write back to file. Also update linked PRD file if it exists.

#### Consequences
- **Easier:** Changes are immediately visible in file system
- **Easier:** Version control tracks all changes
- **Easier:** No separate database to maintain
- **More difficult:** File I/O on every status change
- **More difficult:** Must handle file locking/conflicts
- **More difficult:** Parsing/writing markdown is error-prone

#### Alternatives Considered
- In-memory state only (rejected: changes lost on reload)
- Database for state, files for source (rejected: sync complexity, two sources of truth)
- Event-driven file watching (rejected: adds complexity, file watching is unreliable)

---

### ADR-008: Cursor Cloud Agent Creates Branches and PRs

**Date:** 2025-12-30
**Status:** Accepted

#### Context
Cursor Cloud Agent can create branches and PRs automatically. This is a key differentiator from other providers.

#### Decision
When using Cursor Cloud Agent, automatically create a branch, send task to agent, and create PR when complete. Store branch name and PR URL in task metadata.

#### Consequences
- **Easier:** Full workflow automation
- **Easier:** Code review happens in GitHub
- **Easier:** Changes are isolated in branches
- **More difficult:** Requires git repository and GitHub access
- **More difficult:** Must handle branch conflicts
- **More difficult:** PR creation can fail (permissions, network)

#### Alternatives Considered
- Manual branch/PR creation (rejected: loses automation benefit)
- Commit directly to main (rejected: dangerous, no review)
- Local changes only (rejected: doesn't enable collaboration)

---

<!-- Add new ADRs above this line -->
