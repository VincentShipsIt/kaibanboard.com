# Cursor Marketplace Listing - Kaiban Board

## Extension Title

**Kaiban Board** - AI-Powered Kanban Board for Markdown Tasks

## Short Description

An intelligent Kanban board extension for Cursor that visualizes tasks from `.agent/TASKS/` directories, supports AI-assisted PRD/Task creation, and integrates seamlessly with your markdown-based workflow.

## Full Description

### Overview

Kaiban Board brings the power of Kanban boards directly to your Cursor IDE, designed specifically for developers who manage tasks using markdown files in the `.agent/TASKS|PRDS` architecture. Perfect for AI agents, solo developers, and teams that prefer markdown-based task management.

### Key Features

#### 📋 Smart Kanban Board
- **Visual Task Management**: Drag-and-drop tasks between columns (Backlog, To Do, Doing, Testing, Done, Blocked)
- **Multi-Workspace Support**: Aggregates tasks from all workspace folders
- **PRD Previews**: Click any task card to view linked PRDs inline without opening files
- **Priority Visualization**: Color-coded priority badges (High, Medium, Low)
- **Real-time Updates**: Auto-refresh when files change

#### 🤖 AI-Powered Features
- **AI-Assisted Creation**: Generate PRDs and Tasks using AI with a single command
- **Multi-Provider Support**: Works with Cursor Cloud, OpenAI, OpenRouter, and Replicate
- **Send Tasks to Agents**: Assign tasks to AI agents for automatic implementation
- **Smart Content Generation**: AI generates comprehensive PRDs and task descriptions

#### 💬 Cursor Chat Integration
- **Chat Commands**: Use `@kaiban.createPRD` and `@kaiban.createTask` directly in Cursor chat
- **Natural Workflow**: Create tasks and PRDs without leaving your chat interface
- **Quick Commands**: Access all features via Command Palette or chat

#### 📝 Markdown-First Architecture
- **Standard Format**: Works with the classic `.agent/TASKS|PRDS` structure
- **Version Control Friendly**: All tasks and PRDs are markdown files
- **AI Agent Compatible**: Designed for workflows that use AI agents

### Use Cases

- **Solo Developers**: Manage your project roadmap visually while keeping tasks in markdown
- **AI-Driven Workflows**: Perfect for teams using AI agents that expect `.agent/` structure
- **Multi-Project Management**: Track tasks across multiple projects in a single view
- **Product Development**: Link PRDs to tasks and preview them without file switching

### Getting Started

1. **Install the Extension** from Cursor marketplace
2. **Create Folder Structure**:
   ```bash
   mkdir -p .agent/TASKS .agent/PRDS
   ```
3. **Create Your First Task**:
   - Use Command Palette: `Kaiban: Create Task`
   - Or in Cursor chat: `@kaiban.createTask`
4. **View Your Board**: `Kaiban: Show Markdown Board`

### Example Task Format

```markdown
## Task: Implement Feature X

**ID:** task-001
**Label:** Implement Feature X
**Description:** Add feature X with Y and Z capabilities
**Type:** Feature
**Status:** To Do
**Priority:** High
**Created:** 2025-01-03
**Updated:** 2025-01-03
**PRD:** [Link](../PRDS/feature-x-prd.md)
```

### AI Provider Setup

Configure AI providers for enhanced features:

1. Open Command Palette: `Kaiban: Configure AI Providers`
2. Select provider (Cursor, OpenAI, OpenRouter, or Replicate)
3. Enter API key
4. Start creating AI-generated PRDs and Tasks!

### Requirements

- Cursor IDE (not compatible with VS Code)
- Workspace with `.agent/TASKS/` directory structure
- (Optional) AI provider API keys for AI features

### Screenshots

_Add screenshots showing:_
1. Kanban board with tasks across columns
2. PRD preview panel
3. AI creation workflow
4. Cursor chat integration

## Keywords

```
kanban, markdown, task-management, ai, productivity, agent, prd, product-requirements, workflow, project-management, cursor, todo, backlog, development-tools
```

## Categories

- **Productivity**
- **Project Management**
- **Developer Tools**

## Installation

1. Open Cursor IDE
2. Go to Extensions marketplace
3. Search for "Kaiban Board"
4. Click Install
5. Reload Cursor if prompted

## Support

- **GitHub**: [kaibanboard/kaibanboard](https://github.com/kaibanboard/kaibanboard)
- **Issues**: Report bugs and feature requests on GitHub
- **Documentation**: See README.md in the repository

## Version

Current Version: **0.2.0**

## Changelog

### 0.2.0
- ✨ Added AI-assisted PRD/Task creation
- 💬 Cursor chat integration (`@kaiban.createPRD`, `@kaiban.createTask`)
- 🎨 Improved UI and UX
- 🐛 Bug fixes and performance improvements

### 0.1.0
- 🎉 Initial release
- 📋 Basic Kanban board functionality
- 🔍 PRD preview support
- 🎯 Multi-workspace support

## License

MIT License - see LICENSE file for details

## Author

Kaiban Board Contributors

---

**Ready to streamline your task management? Install Kaiban Board today!**

