# PRD: Embedded UI Terminal for KaibanBoard

## Overview

Replace the current `vscode.window.createTerminal()` approach with an embedded xterm.js terminal rendered inside the webview panel. This provides a unified split-pane experience: kanban board on the left, agent terminal on the right.

## Problem

Currently, task execution launches a separate VS Code terminal tab. This forces users to context-switch between the kanban board and the terminal, losing visibility of task progress while managing their board.

## Solution

### Architecture

```
┌─────────────────────────────────────────────────┐
│                   Webview Panel                  │
│ ┌──────────────────┐ ┌────────────────────────┐ │
│ │                  │ │  Terminal Header        │ │
│ │   Kanban Board   │ │  [Task: Fix auth bug]  │ │
│ │                  │ │  Agent: Claude CLI      │ │
│ │   (existing UI)  │ │ ┌────────────────────┐ │ │
│ │                  │ │ │                    │ │ │
│ │                  │ │ │   xterm.js         │ │ │
│ │                  │ │ │   terminal         │ │ │
│ │                  │ │ │                    │ │ │
│ │                  │ │ └────────────────────┘ │ │
│ │                  │ │  [Tab1] [Tab2] [Tab3]  │ │
│ └──────────────────┘ └────────────────────────┘ │
│           ◄─── resizable divider ───►            │
└─────────────────────────────────────────────────┘
```

### Extension Side (`terminalService.ts`)

- Spawn agent CLI processes using `child_process.spawn` with PTY-like options (VS Code extensions cannot use `node-pty` — it's a native module that won't load in the extension host)
- Use `child_process.spawn(command, args, { shell: true, env: process.env })` to get shell behavior
- Stream `stdout`/`stderr` to webview via `postMessage({ type: 'terminal-output', taskId, data })`
- Accept input from webview via `onDidReceiveMessage({ type: 'terminal-input', taskId, data })`
- Track running processes per task in a `Map<string, ChildProcess>`
- On process exit: send `{ type: 'terminal-exit', taskId, exitCode }`, capture full output log
- Auto-update task status: exit code 0 → Done, non-zero → Failed/Blocked

### Webview Side

- Bundle xterm.js + xterm-addon-fit + xterm-addon-web-links as inline scripts (webview CSP restrictions)
- Split-pane layout with a draggable resizer between kanban and terminal panel
- Terminal panel contains:
  - **Header**: task label + agent name + status indicator (running/done/failed)
  - **xterm.js instance**: renders terminal output, sends keyboard input back to extension
  - **Tab bar** at bottom: one tab per running task, click to switch

### Message Protocol

| Direction | Type | Payload |
|-----------|------|---------|
| Extension → Webview | `terminal-output` | `{ taskId, data: string }` |
| Extension → Webview | `terminal-exit` | `{ taskId, exitCode: number }` |
| Extension → Webview | `terminal-started` | `{ taskId, label, agent }` |
| Webview → Extension | `terminal-input` | `{ taskId, data: string }` |
| Webview → Extension | `terminal-kill` | `{ taskId }` |

### Task Status Auto-Update

- On process exit code 0: update task status to "Done"
- On process exit code non-0: update task status to "Blocked" (or keep in current status)
- Full stdout/stderr captured as execution log, stored as task metadata

### Multiple Terminals

- Each running task gets its own `child_process` and xterm.js instance
- Tab bar shows all active terminals with task labels
- Inactive tabs preserve scroll position and output history
- Terminals auto-close when task completes (with option to keep open)

## Technical Constraints

- **No `node-pty`**: VS Code extension host doesn't support native Node modules. Use `child_process.spawn` with `{ shell: true }` instead. This means no true PTY (no terminal resize signals, no `cols`/`rows`), but it works for CLI output streaming.
- **Webview CSP**: xterm.js must be loaded from extension media directory or inlined. External CDN scripts are blocked.
- **xterm.js bundle**: Include pre-built xterm.js files in `media/` directory and reference via `webview.asWebviewUri()`.

## Implementation Plan

1. Create `services/terminalService.ts` — process management
2. Update `kanbanView.ts` — wire message handlers, update `getWebviewContent` for split-pane
3. Add xterm.js assets to `media/` directory
4. Update webview HTML/CSS/JS for terminal panel
5. Add unit tests

## Success Criteria

- Tasks execute in embedded terminal instead of separate VS Code terminal
- Users can view kanban board and terminal output simultaneously
- Multiple tasks can run concurrently with tab switching
- Task status auto-updates on process completion
- Terminal output is captured as execution log
