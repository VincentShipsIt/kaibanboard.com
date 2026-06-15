<p align="center">
  <img src="assets/icon.png" alt="Kaiban Board Logo" width="128" height="128">
</p>

<h1 align="center">Kaiban Board</h1>

<p align="center">
  <strong>Kanban board for AI-assisted development</strong>
</p>

<p align="center">
  <a href="https://open-vsx.org/extension/VincentShipsIt/kaibanboardcom">
    <img src="https://img.shields.io/open-vsx/v/VincentShipsIt/kaibanboardcom?style=flat-square&logo=eclipseide&logoColor=white&label=Extension" alt="Open VSX">
  </a>
  <a href="https://www.npmjs.com/package/@kaibanboard/cli">
    <img src="https://img.shields.io/npm/v/@kaibanboard/cli?style=flat-square&logo=npm&logoColor=white&label=CLI" alt="npm">
  </a>
  <img src="https://img.shields.io/badge/status-production%20ready-brightgreen?style=flat-square" alt="Production Ready">
  <a href="https://github.com/VincentShipsIt/kaibanboard.com/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/VincentShipsIt/kaibanboard.com?style=flat-square" alt="License">
  </a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#packages">Packages</a> •
  <a href="#features">Features</a> •
  <a href="#development">Development</a> •
  <a href="CHANGELOG.md">Changelog</a>
</p>

---

<p align="center">
  <img src="assets/screenshot.png" alt="Kaiban Board Screenshot" width="100%">
</p>

---

## Quick Start

### Terminal (CLI)

```bash
npm i -g @kaibanboard/cli
kai
```

### Cursor IDE (Extension)

1. Open Extensions (`Cmd+Shift+X`)
2. Search "Kaiban Board"
3. Install

---

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| **[@kaibanboard/cli](./packages/cli)** | Interactive terminal TUI | `npm i -g @kaibanboard/cli` |
| **[kaibanboardcom](./packages/vscode)** | Cursor/VS Code extension | [Open VSX](https://open-vsx.org/extension/VincentShipsIt/kaibanboardcom) |
| **@kaibanboard/core** | Shared types & parser | Internal |

---

## Features

| Feature | CLI | Extension |
|---------|:---:|:---------:|
| Visual kanban board | ✓ | ✓ |
| Execute tasks with AI CLIs | ✓ | ✓ |
| Drag & drop | - | ✓ |
| PRD preview | - | ✓ |
| Vim-style navigation | ✓ | - |
| File watching | ✓ | ✓ |
| Multi-CLI support (Claude/Codex/Cursor) | ✓ | ✓ |

---

## Task Format

Tasks are markdown files in `.agent/TASKS/`:

```markdown
## Task: Implement user authentication

**ID:** task-1234567890
**Label:** Implement user authentication
**Description:** Add login and signup flows
**Type:** Feature
**Status:** Backlog
**Priority:** High
**Created:** 2024-01-15
**Updated:** 2024-01-15
**PRD:** [Link](../PRDS/auth-feature.md)
**Assigned-Agent:** Claude Code

---
```

### Workflow Columns

| Column | Description | Default Agent |
|--------|-------------|---------------|
| Backlog | Unstarted tasks | None |
| Planning | Tasks being planned | Claude Code |
| In Progress | Tasks being executed | Claude Code |
| AI Review | Awaiting AI review | Codex |
| Human Review | Awaiting human review | None |
| Done | Completed tasks | None |
| Archived | Hidden | None |
| Blocked | Hidden | None |

---

## Development

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Build individual packages
bun run build:core
bun run build:cli
bun run build:vscode

# Package CLI
bun run package:cli

# Package extension
bun run package:vscode
```

### Project Structure

```
packages/
├── core/     # Shared types and task parser
├── cli/      # Terminal TUI (@kaibanboard/cli)
└── vscode/   # Cursor extension (kaibanboardcom)
```

---

## Requirements

- **Node.js 18+**
- **AI CLI** (at least one):
  - Claude CLI (`npm i -g @anthropic-ai/claude-cli`)
  - Codex CLI (`npm i -g @openai/codex`)
  - Cursor CLI (included with Cursor IDE)
- `.agent/TASKS/` directory in your project

---

## License

MIT

---

<p align="center">
  <a href="https://kaibanboard.com">kaibanboard.com</a> •
  <a href="https://github.com/VincentShipsIt/kaibanboard.com/issues">Report Bug</a> •
  <a href="https://github.com/VincentShipsIt/kaibanboard.com/issues">Request Feature</a>
</p>
