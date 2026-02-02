# Kaiban Board - Coding Rules

**Purpose:** Coding standards and development guidelines  
**Last Updated:** 2026-01-08

---

## General Rules

1. **TypeScript Only:** All source code in TypeScript
2. **Biome Linting:** Run `bun run check` before commits
3. **Test Coverage:** Maintain >80% coverage for core modules
4. **No Any Types:** Avoid `any` - use proper types or `unknown`

## File Organization

### Source Files (`src/`)

```
src/
├── extension.ts        # Entry point - keep minimal
├── kanbanView.ts       # Webview logic
├── taskParser.ts       # Markdown parsing
├── adapters/           # External service adapters
├── services/           # Business logic
├── types/              # Type definitions
├── utils/              # Pure utility functions
└── config/             # Configuration
```

### Naming Conventions

- **Files:** `kebab-case.ts`
- **Classes:** `PascalCase`
- **Functions/Variables:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Types/Interfaces:** `PascalCase`

## Code Style

### Imports

```typescript
// External imports first
import * as vscode from 'vscode';

// Internal imports second, sorted alphabetically
import { parseTask } from './taskParser';
import { AIService } from './services/ai-service';
import type { Task } from './types';
```

### Error Handling

```typescript
// Use Result pattern for recoverable errors
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// Throw only for unrecoverable errors
throw new Error('Unrecoverable: ...');
```

### VS Code Extension Patterns

```typescript
// Dispose subscriptions properly
context.subscriptions.push(
  vscode.commands.registerCommand('kaiban.showBoard', () => {}),
  vscode.workspace.onDidChangeTextDocument(handler)
);

// Use SecretStorage for API keys
const key = await context.secrets.get('kaiban.openai.apiKey');
```

## Testing

### Test File Naming

- Unit tests: `[module].test.ts` (same directory)
- Integration tests: `test/integration/[feature].test.ts`

### Test Structure

```typescript
describe('TaskParser', () => {
  describe('parseTaskFile', () => {
    it('should parse basic task metadata', () => {
      // Arrange
      const markdown = '...';
      
      // Act
      const result = parseTaskFile(markdown);
      
      // Assert
      expect(result.status).toBe('To Do');
    });
  });
});
```

## Webview Guidelines

### HTML/CSS in Webview

- Use VS Code CSS variables for theming
- Escape all user content
- No inline scripts (CSP)

```typescript
// Generate nonce for CSP
const nonce = getNonce();

// Use vscode-webview-ui-toolkit when possible
```

## Git Workflow

### Commit Messages

```
feat: add PRD preview panel
fix: resolve task parsing for multi-line descriptions
docs: update README with installation guide
refactor: extract AI service from kanbanView
test: add coverage for cursor adapter
```

### Branch Names

```
feature/prd-preview
fix/task-parsing-multiline
docs/installation-guide
```

## Critical Rules (NEVER DO)

1. **Never commit API keys** - Use SecretStorage
2. **Never use `eval()` or `innerHTML` with user content** - XSS risk
3. **Never block the extension host** - Use async/await
4. **Never modify files without user consent** - Always prompt

---

**See also:** `SYSTEM/critical/CRITICAL-NEVER-DO.md`
