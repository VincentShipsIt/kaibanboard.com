# Kaiban Board - Architecture

**Purpose:** Technical architecture and implementation overview  
**Last Updated:** 2026-01-08

---

## Overview

Kaiban Board is a VS Code/Cursor extension that provides an AI-powered Kanban board for managing markdown tasks from `.agent/TASKS/` directories.

## Tech Stack

- **Runtime:** Node.js (VS Code Extension Host)
- **Language:** TypeScript
- **Build:** TSC (TypeScript Compiler)
- **Linting:** Biome
- **Testing:** Vitest
- **Package Manager:** Bun

## Directory Structure

```
kaibanboardcom/
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── kanbanView.ts         # Webview panel implementation
│   ├── taskParser.ts         # Markdown task parsing
│   ├── adapters/             # AI provider adapters
│   │   ├── cursor-cloud.ts   # Cursor Cloud Agent adapter
│   │   ├── openai.ts         # OpenAI adapter
│   │   └── openrouter.ts     # OpenRouter adapter
│   ├── services/             # Business logic services
│   │   ├── ai-service.ts     # AI integration service
│   │   ├── prd-service.ts    # PRD generation service
│   │   └── task-service.ts   # Task management service
│   ├── types/                # TypeScript type definitions
│   ├── utils/                # Utility functions
│   └── config/               # Configuration
├── assets/                   # Icons and images
├── out/                      # Compiled JavaScript (generated)
├── .agent/                   # Agent documentation
├── package.json              # Extension manifest
└── tsconfig.json             # TypeScript config
```

## Core Components

### Extension Entry (`extension.ts`)

- Registers commands with VS Code
- Initializes the Kanban webview
- Handles extension activation/deactivation
- Manages API key storage in SecretStorage

### Kanban View (`kanbanView.ts`)

- Creates and manages the webview panel
- Renders the Kanban board HTML/CSS/JS
- Handles drag-and-drop task status changes
- Displays PRD preview panel
- Communicates with AI services

### Task Parser (`taskParser.ts`)

- Parses `.agent/TASKS/*.md` files
- Extracts task metadata (status, priority, type, PRD link)
- Supports multiple workspace folders
- Handles recursive file scanning

### AI Adapters (`adapters/`)

- **Cursor Cloud:** Sends tasks to Cursor's cloud agent for automatic PR creation
- **OpenAI:** Direct OpenAI API integration for content generation
- **OpenRouter:** Multi-model routing for various LLM providers
- **Replicate:** Support for Replicate-hosted models

## Data Flow

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ .agent/TASKS/   │────▶│ Task Parser  │────▶│ Kanban View │
│ *.md files      │     │              │     │ (Webview)   │
└─────────────────┘     └──────────────┘     └─────────────┘
                                                    │
                                                    ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│ .agent/PRDS/    │◀────│ PRD Service  │◀────│ AI Adapters │
│ *.md files      │     │              │     │             │
└─────────────────┘     └──────────────┘     └─────────────┘
```

## API Providers

| Provider      | Features                         | Use Case                    |
|---------------|----------------------------------|----------------------------|
| Cursor Cloud  | Auto PR creation, branch mgmt    | Automated task completion  |
| OpenAI        | GPT-4 content generation         | PRD/Task generation        |
| OpenRouter    | Multi-model access               | Flexible AI routing        |
| Replicate     | Open-source models               | Custom model support       |

## Task Status Flow

```
Backlog → To Do → Doing → Testing → Done
                    ↓
                 Blocked
```

## Key Features

1. **Multi-Workspace Support:** Aggregates tasks from all open workspace folders
2. **Real-time Updates:** Watches file system for task changes
3. **PRD Preview:** Inline preview of linked PRD documents
4. **AI Integration:** Generate PRDs and tasks with AI assistance
5. **Cursor Agent:** Automated PR creation via Cursor Cloud
6. **Theme Support:** Adapts to VS Code light/dark themes

## Configuration Options

```json
{
  "kaiban.columns.enabled": ["To Do", "Doing", "Testing", "Done"],
  "kaiban.prd.basePath": ".agent/PRDS",
  "kaiban.ai.defaultProvider": "openrouter",
  "kaiban.ai.defaultModel": "",
  "kaiban.ai.streamResponses": true,
  "kaiban.cursor.repositoryUrl": "",
  "kaiban.cursor.autoCreatePr": true
}
```

## Build & Release

```bash
# Development
bun run watch          # Watch mode compilation
F5                     # Launch Extension Host

# Testing
bun run test           # Run tests
bun run test:coverage  # With coverage

# Package
bun run package        # Create .vsix file
```

---

**Website:** https://kaibanboard.com  
**Marketplace:** [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=shipshitdev.kaibanboardcom)  
**GitHub:** [github.com/shipshitdev/kaibanboard.com](https://github.com/shipshitdev/kaibanboard.com)
