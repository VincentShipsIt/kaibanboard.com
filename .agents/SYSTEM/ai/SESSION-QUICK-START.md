# Session Quick Start - Kaiban Board

**For AI Agents Starting a New Session**

---

## 1. Check Current State

```bash
# Check git status
git status

# Check for any TODO items
cat .agent/TASKS/INBOX.md
```

## 2. Key Files to Know

| File | Purpose |
|------|---------|
| `src/extension.ts` | Extension entry point, command registration |
| `src/kanbanView.ts` | Main UI logic, webview panel |
| `src/taskParser.ts` | Markdown task parsing |
| `src/services/ai-service.ts` | AI provider orchestration |
| `package.json` | Extension manifest (commands, config) |

## 3. Development Commands

```bash
# Install dependencies
bun install

# Watch mode (auto-compile)
bun run watch

# Run tests
bun run test

# Check linting
bun run check

# Package extension
bun run package
```

## 4. Testing Changes

1. Open project in VS Code/Cursor
2. Press `F5` to launch Extension Development Host
3. In new window: `Cmd+Shift+P` → "Kaiban: Show Markdown Board"
4. After changes: `Cmd+R` in Extension Host to reload

## 5. Common Tasks

### Adding a New Command

1. Add command to `package.json` under `contributes.commands`
2. Register handler in `src/extension.ts` in `activate()`
3. Implement logic in appropriate service/module

### Modifying Webview UI

1. Edit HTML template in `src/kanbanView.ts`
2. Use VS Code CSS variables for theming
3. Test in both light and dark themes

### Adding AI Provider

1. Create adapter in `src/adapters/[provider].ts`
2. Register in `src/services/ai-service.ts`
3. Add config options in `package.json`

## 6. Critical Rules

- **Never commit API keys** - Use SecretStorage
- **Always dispose subscriptions** - Prevent memory leaks
- **Escape user content** - Prevent XSS in webview
- **Test before commit** - Run `bun run test`

## 7. Session Documentation

After completing work, update:
- `.agent/SESSIONS/YYYY-MM-DD.md` - What was done
- `.agent/TASKS/INBOX.md` - Any new TODOs
- `CHANGELOG.md` - If shipping a release

---

**Full docs:** `.agent/SYSTEM/ARCHITECTURE.md`
