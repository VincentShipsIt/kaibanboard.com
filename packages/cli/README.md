# @kaibanboard/cli

Interactive terminal kanban board for AI-assisted development.

## Installation

```bash
# npm
npm install -g @kaibanboard/cli

# pnpm
pnpm add -g @kaibanboard/cli

# yarn
yarn global add @kaibanboard/cli

# bun
bun add -g @kaibanboard/cli
```

## Usage

```bash
# Run in current directory
kai

# Run in specific directory
kai /path/to/project

# Show specific columns
kai --columns "Backlog,Planning,In Progress,Done"

# Show all columns including hidden ones
kai --columns "Backlog,Planning,In Progress,AI Review,Human Review,Done,Archived,Blocked"

# Help
kai --help
```

## Columns

The board supports the following workflow columns:

| Column | Description | Default Agent |
|--------|-------------|---------------|
| Backlog | Unstarted tasks | None |
| Planning | Tasks being planned by agents | Claude Code |
| In Progress | Tasks being executed | Claude Code |
| AI Review | Tasks awaiting AI review | Codex |
| Human Review | Tasks awaiting human review | None |
| Done | Completed tasks | None |
| Archived | Hidden, completed/cancelled | None |
| Blocked | Hidden, blocked tasks | None |

Default visible columns: `Backlog`, `Planning`, `In Progress`, `AI Review`, `Human Review`, `Done`

## Features

- Interactive TUI with vim-style navigation (h/j/k/l)
- Execute tasks with Claude CLI, Codex CLI, or Cursor CLI
- Real-time file watching - board updates automatically
- Quick status changes with number keys (1-8)
- Task details view with full metadata
- Multi-agent workflow support

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `h` / `←` | Previous column |
| `l` / `→` | Next column |
| `k` / `↑` | Previous task |
| `j` / `↓` | Next task |
| `Enter` | View task details |
| `e` | Execute task with CLI |
| `1-8` | Quick status change |
| `r` | Refresh board |
| `?` | Show help |
| `q` | Quit |

## Task Format

Reads markdown files from `.agent/TASKS/`:

```markdown
## Task: Implement feature

**ID:** task-1234567890
**Label:** Implement feature
**Description:** Add the new feature
**Type:** Feature
**Status:** Backlog
**Priority:** High
**Created:** 2024-01-15
**Updated:** 2024-01-15
**PRD:** [Link](../PRDS/feature.md)
**Assigned-Agent:** Claude Code

---
```

## Requirements

- Node.js 18+
- `.agent/TASKS/` directory in your project
- At least one AI CLI installed:
  - Claude CLI (`npm i -g @anthropic-ai/claude-cli`)
  - Codex CLI (`npm i -g @openai/codex`)
  - Cursor CLI (included with Cursor IDE)

## Cursor Extension

For a graphical interface with drag-and-drop, install the Cursor extension:

[Kaiban Board - Cursor Extension](https://open-vsx.org/extension/VincentShipsIt/kaibanboardcom)

## License

MIT
