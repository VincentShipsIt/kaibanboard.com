# Critical Rules - NEVER DO

**These rules MUST NEVER be violated. They protect users and maintain extension integrity.**

---

## Security

### 🚫 NEVER Commit API Keys
- API keys MUST use `context.secrets` (SecretStorage)
- Never log or display API keys
- Never hardcode keys in source files

### 🚫 NEVER Use innerHTML with User Content
```typescript
// BAD - XSS vulnerability
element.innerHTML = userContent;

// GOOD - Use textContent or sanitize
element.textContent = userContent;
```

### 🚫 NEVER Disable CSP in Webview
- Always use nonce-based script loading
- Never set `enableScripts: false` with `allowScripts: true`

## Stability

### 🚫 NEVER Block the Extension Host
```typescript
// BAD - Blocks UI
const result = longRunningSync();

// GOOD - Async
const result = await longRunningAsync();
```

### 🚫 NEVER Forget to Dispose Subscriptions
```typescript
// ALWAYS add to subscriptions
context.subscriptions.push(
  vscode.commands.registerCommand(...)
);
```

### 🚫 NEVER Modify Files Without User Awareness
- Status changes via drag-drop are explicit user actions (OK)
- Batch file modifications MUST show progress/confirmation
- Never delete user files automatically

## Quality

### 🚫 NEVER Use `any` Type Without Comment
```typescript
// BAD
const data: any = response;

// ACCEPTABLE (with justification)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = legacyApiResponse; // Legacy API returns untyped data
```

### 🚫 NEVER Skip Error Handling for External APIs
```typescript
// BAD
const response = await fetch(url);
const data = await response.json();

// GOOD
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
} catch (error) {
  vscode.window.showErrorMessage(`API error: ${error.message}`);
}
```

### 🚫 NEVER Ship Without Testing
- Run `bun run test` before every commit
- Test in both VS Code and Cursor
- Test in both light and dark themes

## User Experience

### 🚫 NEVER Show Raw Error Messages to Users
```typescript
// BAD
vscode.window.showErrorMessage(error.stack);

// GOOD
vscode.window.showErrorMessage('Failed to connect to AI provider. Check your API key.');
console.error('AI connection error:', error);
```

### 🚫 NEVER Make Breaking Changes Without Migration
- If task format changes, support both old and new
- Provide upgrade path for configuration changes
- Document migration in CHANGELOG

---

**If you're unsure about any of these rules, ask before proceeding.**
