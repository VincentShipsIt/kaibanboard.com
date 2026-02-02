# Project Map - Kaiban Board

**Purpose:** Quick reference for project structure and responsibilities.
**Last Updated:** 2025-01-27

---

## Directory Overview

```
kaibanmd/
├── .agent/                      # AI documentation (you are here)
│   ├── SYSTEM/                   # Architecture, rules, summaries
│   ├── TASKS/                    # Task tracking
│   ├── SESSIONS/                 # Daily session logs
│   └── ...
├── src/                          # Source code
│   ├── extension.ts              # Extension entry point
│   ├── kanbanView.ts             # Kanban view provider (webview)
│   ├── taskParser.ts             # Task file parsing
│   ├── config/                   # Configuration management
│   │   └── apiKeyManager.ts      # API key storage
│   ├── adapters/                 # AI provider adapters
│   │   ├── cursorCloudAdapter.ts
│   │   ├── openaiAdapter.ts
│   │   ├── openrouterAdapter.ts
│   │   └── replicateAdapter.ts
│   ├── services/                 # Business logic services
│   │   └── providerRegistry.ts   # Provider registry
│   ├── types/                    # TypeScript definitions
│   │   └── aiProvider.ts         # AI provider types
│   ├── utils/                    # Utility functions
│   │   └── lucideIcons.ts        # Icon utilities
│   └── test/                     # Test setup
│       └── setup.ts               # VS Code API mocks
├── out/                          # Compiled JavaScript
├── build/                        # Packaged VSIX files
├── coverage/                     # Test coverage reports
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript config
└── vitest.config.ts              # Test configuration
```

---

## Key Directories

### `/src/`
**Purpose:** Main source code
**Patterns:** TypeScript, VS Code Extension API, modular architecture

### `/src/config/`
**Purpose:** Configuration and secrets management
**Patterns:** Singleton pattern, VS Code SecretStorage API
**Files:**
- `apiKeyManager.ts` - Secure API key storage/retrieval

### `/src/adapters/`
**Purpose:** AI provider integrations
**Patterns:** Adapter pattern, unified interface (`AIProviderAdapter`)
**Files:**
- `cursorCloudAdapter.ts` - Cursor Cloud Agent (branch/PR creation)
- `openaiAdapter.ts` - OpenAI API
- `openrouterAdapter.ts` - OpenRouter API
- `replicateAdapter.ts` - Replicate API

### `/src/services/`
**Purpose:** Business logic and service coordination
**Patterns:** Registry pattern, dependency injection
**Files:**
- `providerRegistry.ts` - Central registry for AI providers

### `/src/types/`
**Purpose:** TypeScript type definitions
**Patterns:** Interfaces, type aliases, exported types
**Files:**
- `aiProvider.ts` - AI provider types and interfaces

### `/src/utils/`
**Purpose:** Utility functions and helpers
**Patterns:** Pure functions, no side effects
**Files:**
- `lucideIcons.ts` - Icon name mapping utilities

### `/src/test/`
**Purpose:** Test configuration and setup
**Patterns:** Mock setup, test utilities
**Files:**
- `setup.ts` - VS Code API mocks for testing

---

## File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Extension Entry | `extension.ts` | `extension.ts` |
| View Provider | `*View.ts` | `kanbanView.ts` |
| Parser | `*Parser.ts` | `taskParser.ts` |
| Adapter | `*Adapter.ts` | `cursorCloudAdapter.ts` |
| Service | `*Service.ts` or `*Registry.ts` | `providerRegistry.ts` |
| Manager | `*Manager.ts` | `apiKeyManager.ts` |
| Types | `*.ts` in `types/` | `aiProvider.ts` |
| Utils | `*.ts` in `utils/` | `lucideIcons.ts` |
| Test | `*.test.ts` | `extension.test.ts` |

---

## Entry Points

| File | Purpose | Called By |
|------|---------|-----------|
| `src/extension.ts` | Extension activation, command registration | VS Code Extension Host |
| `src/extension.ts::activate()` | Initialize extension, create providers | VS Code on extension activation |
| `src/extension.ts::deactivate()` | Cleanup on extension deactivation | VS Code on extension deactivation |

---

## Key Files and Responsibilities

### Core Files

| File | Purpose | Key Exports/Classes |
|------|---------|---------------------|
| `extension.ts` | Extension entry point | `activate()`, `deactivate()` |
| `kanbanView.ts` | Webview management, task coordination | `KanbanViewProvider` |
| `taskParser.ts` | Task file parsing and updates | `TaskParser`, `Task` interface |

### Configuration Files

| File | Purpose | Key Classes |
|------|---------|-------------|
| `apiKeyManager.ts` | API key storage | `ApiKeyManager` |

### Adapter Files

| File | Purpose | Key Classes |
|------|---------|-------------|
| `cursorCloudAdapter.ts` | Cursor Cloud Agent | `CursorCloudAdapter` |
| `openaiAdapter.ts` | OpenAI API | `OpenAIAdapter` |
| `openrouterAdapter.ts` | OpenRouter API | `OpenRouterAdapter` |
| `replicateAdapter.ts` | Replicate API | `ReplicateAdapter` |

### Service Files

| File | Purpose | Key Classes |
|------|---------|-------------|
| `providerRegistry.ts` | Provider management | `ProviderRegistry` |

### Type Files

| File | Purpose | Key Types |
|------|---------|-----------|
| `aiProvider.ts` | AI provider types | `ProviderType`, `AIProviderAdapter`, `TaskPrompt`, `AgentResponse` |

---

## Module Relationships

```
extension.ts
  ├──→ ApiKeyManager (config/apiKeyManager.ts)
  ├──→ KanbanViewProvider (kanbanView.ts)
  │     ├──→ TaskParser (taskParser.ts)
  │     └──→ ProviderRegistry (services/providerRegistry.ts)
  │           ├──→ CursorCloudAdapter (adapters/cursorCloudAdapter.ts)
  │           ├──→ OpenAIAdapter (adapters/openaiAdapter.ts)
  │           ├──→ OpenRouterAdapter (adapters/openrouterAdapter.ts)
  │           └──→ ReplicateAdapter (adapters/replicateAdapter.ts)
  └──→ VS Code API (vscode module)
```

---

## Configuration Files

| File | Purpose | Key Settings |
|------|---------|--------------|
| `package.json` | Extension manifest, dependencies, scripts | `contributes.commands`, `contributes.configuration`, `engines.vscode` |
| `tsconfig.json` | TypeScript compilation | `compilerOptions`, `include`, `exclude` |
| `vitest.config.ts` | Test configuration | Coverage thresholds, test setup |
| `.vscodeignore` | Files to exclude from package | Build artifacts, test files |

---

## Build Output

| Directory | Purpose | Generated By |
|-----------|---------|--------------|
| `out/` | Compiled JavaScript | `tsc` (TypeScript compiler) |
| `build/` | Packaged VSIX files | `@vscode/vsce package` |
| `coverage/` | Test coverage reports | `vitest --coverage` |

---

## Related Documentation

- `../ARCHITECTURE.md` - System architecture
- `../RULES.md` - Coding standards
- `DECISIONS.md` - Architectural decisions
- `../../README.md` - User-facing documentation
- `../../DEVELOPMENT.md` - Development guide
