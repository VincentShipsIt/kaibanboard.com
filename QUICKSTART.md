# Kaiban Board - Quick Start Guide

## What You Built

An AI-powered VS Code extension that:

- Reads all `.agent/TASKS/*.md` files from your workspace
- Parses your Kanban markdown format with AI intelligence
- Displays tasks in a 4-column board (Backlog | To Do | Testing | Done)
- Shows PRD previews inline without opening files
- Works across all projects simultaneously
- Uses the classic `.agent/TASKS|PRDS` architecture

---

## Start Using It NOW (2 steps)

### Step 1: Open Extension Folder

```bash
# Clone the repo first, then open it
git clone https://github.com/VincentShipsIt/kaibanboard.com.git
cd kaibanboard.com
code .
```

### Step 2: Press F5

- A new VS Code window opens (Extension Development Host)
- In that window, press `Cmd+Shift+P`
- Type: **"Kaiban: Show Markdown Board"**
- Your board appears!

---

## What You'll See

### Live Example (Your Actual Tasks)

**Backlog Column** (~195 tasks):

- Studio: Batch Content Generation
- Analytics: AI-Powered Insights
- Publisher: Content Recycling
- API: Replicate Improvements
- [... and 190+ more]

**To Do Column** (~3 tasks):

- GenFeed Roadmap
- World-Class Improvements Plan

**Done Column** (~10 tasks):

- Accounts to Brands Migration [Done]
- Asset Access Control [Done]
- Serialization Audit [Done]

### Card Details

Each card shows:

```
┌─────────────────────────────────────┐
│ Studio: Batch Content Generation    │
│ [HIGH] [Feature]                    │
│ genfeed.ai                          │
└─────────────────────────────────────┘
```

---

## Features

### Visual Design

- Color-coded priorities (Red=High, Orange=Medium, Green=Low)
- Type badges for each task
- Project name shows which repo
- Completed tasks have checkmark
- Dark/Light theme support

### Interactions

- **Single-click card** → Shows PRD preview (if available)
- **Double-click card** → Opens task markdown file for editing
- **Click refresh** → Reloads all tasks
- **Hover effects** for better UX
- **Scrollable columns** for large task lists

---

## .agent/TASKS|PRDS Architecture

This extension works with the **classic .agent/TASKS|PRDS architecture** that AI agents and development workflows use:

### Directory Structure

```
your-project/
├── .agent/
│   ├── TASKS/           # Task files (.md)
│   │   ├── feature-1.md
│   │   └── bug-fix-1.md
│   └── PRDS/            # PRD files (.md)
│       ├── feature-1-prd.md
│       └── bug-fix-1-prd.md
└── src/
    └── ...
```

### Why This Architecture?

- **AI Agent Compatible**: Most AI agents expect this structure
- **Universal Standard**: Works across different tools
- **Separation of Concerns**: Tasks and PRDs are clearly separated
- **Scalable**: Easy to organize large numbers of tasks

### Task File Format

Each task in `.agent/TASKS/` should have:

```markdown
## Task: Your Task Title

**ID:** unique-task-id
**Label:** Your Task Title
**Type:** Feature|Bug|Enhancement
**Status:** Backlog|To Do|Testing|Done
**Priority:** High|Medium|Low
**PRD:** [Link](../PRDS/your-prd-file.md)
```

---

## Commands

In the Extension Development Host window:

- `Kaiban: Show Markdown Board` - Open the board
- `Kaiban: Refresh Board` - Reload tasks

---

## Development Workflow

If you want to modify the extension:

1. Edit files in `src/`
2. Press `Cmd+Shift+B` to recompile
3. In Extension Host window, click reload button (or Cmd+R)
4. Changes apply immediately

---

## Install Permanently (Optional)

When you're happy with it:

```bash
cd kaibanboard.com
bun install -g @vscode/vsce
bun run package:vscode
code --install-extension packages/vscode/build/*.vsix
```

Then it's available in ALL VS Code windows!

---

## Troubleshooting

**Board is empty:**

- Check workspace has `.agent/TASKS/` folder
- Verify task files follow format: `## Task: Title` with metadata fields

**Can't find command:**

- Make sure Extension Development Host window is active
- Check bottom-left corner shows "[Extension Development Host]"

**Extension not loading:**

- Check terminal output for errors
- Try closing Extension Host and pressing F5 again

---

## Expected Results

With your current 208 tasks:

- You should see ~195 in Backlog
- ~3 in To Do
- ~10 in Done
- Tasks from all projects: api, genfeed, extension, mobile, docs

---

## About Kaiban Board

**Kaiban Board** = **AI** + **Kanban** + **Markdown**

Perfect for developers who want intelligent task visualization in their markdown workflows.

---

## You're Done!

The extension is **100% ready to use**. Just:

```bash
cd kaibanboard.com
code .
```

Press F5, and enjoy your AI-powered Kanban board!

Visit **[kaibanboard.com](https://kaibanboard.com)** for more information.
