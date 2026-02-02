# Kaiban Board - Product Requirements Document

**Product:** Kaiban Board (VS Code/Cursor Extension)  
**Version:** 0.2.0  
**Last Updated:** 2026-01-08

---

## Overview

Kaiban Board is a free, open-source VS Code/Cursor extension that provides an AI-powered Kanban board for visualizing and managing markdown tasks from `.agent/TASKS/` directories.

## Problem Statement

Developers using AI agents (Claude, Cursor, Codex) often store tasks and PRDs in `.agent/TASKS/` and `.agent/PRDS/` folders. However, managing these markdown files requires constantly switching between the file explorer and documents, breaking the development flow.

## Solution

A native VS Code panel that:
1. Visualizes tasks as a Kanban board
2. Allows drag-and-drop status changes
3. Previews PRDs inline
4. Integrates AI for task/PRD generation
5. Connects to Cursor Cloud for automated PR creation

## Target Users

- **Primary:** Developers using AI-assisted development workflows
- **Secondary:** Teams using `.agent` folder conventions
- **Tertiary:** Any developer wanting visual task management in VS Code

## Core Features

### P0 (Must Have)

| Feature | Description | Status |
|---------|-------------|--------|
| Kanban Board | Visual board with columns (Backlog, To Do, Doing, Testing, Done, Blocked) | ✅ Done |
| Task Parsing | Parse `.agent/TASKS/*.md` files | ✅ Done |
| Status Updates | Drag-and-drop to change task status | ✅ Done |
| PRD Preview | Click task to preview linked PRD | ✅ Done |
| File Opening | Double-click to edit task file | ✅ Done |
| Theme Support | Match VS Code theme (light/dark) | ✅ Done |

### P1 (Should Have)

| Feature | Description | Status |
|---------|-------------|--------|
| AI PRD Generation | Generate PRD content with AI | ✅ Done |
| AI Task Creation | Create tasks with AI assistance | ✅ Done |
| Cursor Cloud Agent | Send tasks to Cursor for auto-PR | ✅ Done |
| Multi-Workspace | Aggregate tasks from all folders | ✅ Done |
| Column Configuration | Customize visible columns | ✅ Done |

### P2 (Nice to Have)

| Feature | Description | Status |
|---------|-------------|--------|
| Task Filtering | Filter by priority, type | 🔄 Planned |
| Search | Search tasks by title/description | 🔄 Planned |
| Task Dependencies | Link related tasks | 🔄 Planned |
| Time Tracking | Track time per task | 🔄 Planned |
| Export | Export board as image/CSV | 🔄 Planned |

## User Stories

### Story 1: View Tasks as Kanban Board
> As a developer, I want to see all my `.agent/TASKS` as a Kanban board so I can visualize my project progress at a glance.

**Acceptance Criteria:**
- [x] Tasks are displayed in columns by status
- [x] Task cards show title, priority badge, and type
- [x] Board updates when files change
- [x] Works with multiple workspace folders

### Story 2: Update Task Status via Drag-and-Drop
> As a developer, I want to drag tasks between columns so I can update their status without editing markdown files.

**Acceptance Criteria:**
- [x] Can drag task cards between columns
- [x] Status field in markdown file is updated
- [x] Updated timestamp is refreshed
- [x] Change is persisted immediately

### Story 3: Preview PRD Documents
> As a developer, I want to preview PRD content by clicking a task so I can understand requirements without opening files.

**Acceptance Criteria:**
- [x] Click task card to show PRD preview panel
- [x] PRD markdown is rendered with proper formatting
- [x] Preview panel can be dismissed
- [x] PRD link in task is optional

### Story 4: Generate PRDs with AI
> As a developer, I want to generate PRD content using AI so I can quickly create comprehensive requirements documents.

**Acceptance Criteria:**
- [x] Command to create new PRD
- [x] Prompt for title and description
- [x] Option to use AI generation
- [x] Generated PRD saved to `.agent/PRDS/`

### Story 5: Send Tasks to Cursor Agent
> As a developer, I want to send tasks to Cursor's cloud agent so it can automatically implement features and create PRs.

**Acceptance Criteria:**
- [x] Play button appears on task cards (when API key set)
- [x] Click sends task+PRD to Cursor Cloud
- [x] Cursor creates branch and PR automatically
- [x] Notification shows PR link on completion

## Technical Requirements

### Performance
- Extension should activate in <500ms
- Board should render <100 tasks in <1s
- File watching should not impact editor performance

### Security
- API keys stored in VS Code SecretStorage
- No external analytics or telemetry
- CSP enforced in webview

### Compatibility
- VS Code 1.80.0+
- Works in Cursor IDE
- Supports Windows, macOS, Linux

## Success Metrics

| Metric | Target |
|--------|--------|
| Marketplace Installs | 1,000 in first month |
| Rating | 4.5+ stars |
| Bug Reports | <10 critical issues |
| Weekly Active Users | 500+ after 3 months |

## Roadmap

### v0.3.0 (Q1 2026)
- Task filtering and search
- Keyboard shortcuts
- Task templates

### v0.4.0 (Q2 2026)
- Task dependencies
- Gantt chart view
- Export functionality

### v1.0.0 (Q3 2026)
- Stable API for integrations
- Plugin system
- Team collaboration features

---

**Website:** https://kaibanboard.com  
**License:** MIT
