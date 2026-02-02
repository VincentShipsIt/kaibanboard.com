# Kaiban Board - Agent Documentation Hub

**Welcome to the Kaiban Board workspace!**

This is the `.agent/` folder containing AI agent documentation, session tracking, and project rules.

## Quick Links

- **Website:** https://kaibanboard.com
- **Marketplace:** [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=shipshitdev.kaibanboardcom)
- **GitHub:** [github.com/shipshitdev/kaibanboard.com](https://github.com/shipshitdev/kaibanboard.com)

## Quick Start

**READ FIRST:** `SYSTEM/ai/SESSION-QUICK-START.md`

## Documentation

**Feature Documentation:** See `SYSTEM/FEATURES.md` for comprehensive documentation of all Kaiban Board features.

## Directory Structure

```
.agent/
├── README.md                    # This file - Navigation hub
├── SYSTEM/
│   ├── ARCHITECTURE.md          # Technical architecture
│   ├── FEATURES.md              # Complete feature documentation
│   ├── PRD.md                   # Product requirements
│   ├── RULES.md                 # Coding standards
│   ├── ai/                      # AI agent protocols
│   │   └── SESSION-QUICK-START.md
│   └── critical/                # Critical rules
│       └── CRITICAL-NEVER-DO.md
├── TASKS/
│   ├── README.md                # Task format guide
│   └── INBOX.md                 # Quick task capture
├── PRDS/                        # Product requirement documents
├── SESSIONS/                    # Session logs (YYYY-MM-DD.md)
├── SOP/                         # Standard operating procedures
├── EXAMPLES/                    # Code patterns
└── FEEDBACK/                    # Improvement tracking
```

## For AI Agents

### Before Starting Work

1. Read `SYSTEM/ai/SESSION-QUICK-START.md`
2. Check `SYSTEM/critical/CRITICAL-NEVER-DO.md`
3. Read today's session file (if exists): `SESSIONS/YYYY-MM-DD.md`

### During Work

- Follow patterns in `SYSTEM/RULES.md`
- Reference `SYSTEM/ARCHITECTURE.md` for code structure
- Track tasks in `TASKS/`

### After Work

- Update session file in `SESSIONS/`
- Mark completed tasks
- Note next steps

## Tech Stack

- **Language:** TypeScript
- **Runtime:** VS Code Extension Host
- **Build:** TSC
- **Linting:** Biome
- **Testing:** Vitest
- **Package Manager:** Bun

## Key Commands

```bash
bun install          # Install dependencies
bun run watch        # Development mode
bun run test         # Run tests
bun run check        # Lint code
bun run package      # Build .vsix
```

---

**Last Updated:** 2026-01-08
