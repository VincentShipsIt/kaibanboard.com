# PRD: Multi-CLI Support for Task Execution

**Created:** 2026-01-13
**Status:** Doing
**Related Task:** [Link](../TASKS/multi-cli-support.md)

---

## Overview

Currently, Kaiban Board only supports executing tasks via Claude CLI. This PRD extends support to also work with Codex CLI and Cursor CLI, making the extension more versatile and usable across different AI development environments.

## Goals

1. Support multiple CLI tools: Claude, Codex, and Cursor
2. Auto-detect which CLIs are installed on the system
3. Allow users to select which CLI to use per task or globally
4. Maintain backward compatibility with existing Claude CLI functionality
5. Update documentation to clarify VSCode/Cursor compatibility

## Requirements

### Functional Requirements

#### 1. CLI Detection
- **FR1.1**: Extension should detect which CLIs are installed:
  - Claude CLI (`claude` command)
  - Codex CLI (`codex` command)
  - Cursor CLI (`cursor` command - note: may be a shell function, not a binary)
- **FR1.2**: Detection should happen on extension activation and when executing tasks
- **FR1.3**: Show available CLIs in UI (e.g., dropdown or indicator)
- **FR1.4**: Show warning/error if no CLI is detected

#### 2. CLI Selection
- **FR2.1**: Add configuration setting for default CLI: `kaiban.cli.defaultProvider`
  - Options: `"claude"`, `"codex"`, `"cursor"`, `"auto"` (auto-detect first available)
  - Default: `"auto"`
- **FR2.2**: Allow per-task CLI selection (optional, via task metadata or UI)
- **FR2.3**: CLI selection should persist in user/workspace settings

#### 3. CLI Execution
- **FR3.1**: Each CLI should have its own executable path configuration:
  - `kaiban.claude.executablePath` (existing)
  - `kaiban.codex.executablePath` (new, default: `codex`)
  - `kaiban.cursor.executablePath` (new, default: `cursor`)
- **FR3.2**: CLI-specific prompt templates:
  - `kaiban.claude.promptTemplate` (existing)
  - `kaiban.codex.promptTemplate` (new)
  - `kaiban.cursor.promptTemplate` (new)
- **FR3.3**: CLI-specific additional flags:
  - `kaiban.claude.additionalFlags` (existing)
  - `kaiban.codex.additionalFlags` (new)
  - `kaiban.cursor.additionalFlags` (new)
- **FR3.4**: Execute task using the selected CLI with appropriate command format

#### 4. UI Updates
- **FR4.1**: Show available CLIs in task execution button tooltip or nearby indicator
- **FR4.2**: If multiple CLIs available, show selection dropdown or use default
- **FR4.3**: Display which CLI is being used during task execution
- **FR4.4**: Show CLI availability status in settings or status bar

### Non-Functional Requirements

#### 1. Backward Compatibility
- **NFR1.1**: Existing Claude CLI configuration must continue to work
- **NFR1.2**: Default behavior should match current behavior if only Claude is detected
- **NFR1.3**: No breaking changes to existing settings

#### 2. Error Handling
- **NFR2.1**: Gracefully handle missing CLI executables
- **NFR2.2**: Show clear error messages when CLI execution fails
- **NFR2.3**: Provide installation instructions for missing CLIs

#### 3. Performance
- **NFR3.1**: CLI detection should be fast (< 100ms)
- **NFR3.2**: Cache CLI detection results (refresh on settings change)

## Technical Notes

### CLI Detection Implementation

```typescript
async function detectCLI(cliName: string): Promise<boolean> {
  // Use child_process to check if CLI exists
  // For 'cursor', may need special handling if it's a shell function
  // Return true if CLI is available, false otherwise
}
```

### CLI Command Formats

- **Claude**: `claude "prompt"` or `claude /ralph-loop:ralph-loop "prompt"`
- **Codex**: `codex "prompt"` (format TBD - need to verify Codex CLI syntax)
- **Cursor**: `cursor --command "prompt"` (format TBD - need to verify Cursor CLI syntax)

### Configuration Schema

```json
{
  "kaiban.cli.defaultProvider": "auto",
  "kaiban.claude.executablePath": "claude",
  "kaiban.codex.executablePath": "codex",
  "kaiban.cursor.executablePath": "cursor",
  "kaiban.codex.promptTemplate": "...",
  "kaiban.cursor.promptTemplate": "...",
  "kaiban.codex.additionalFlags": "",
  "kaiban.cursor.additionalFlags": ""
}
```

## User Stories

1. **As a developer** using Codex CLI, I want to execute tasks via Codex so I can use my preferred AI tool.

2. **As a developer** using Cursor CLI, I want to execute tasks via Cursor so I can leverage Cursor's AI capabilities.

3. **As a developer** with multiple CLIs installed, I want the extension to auto-detect and use the first available CLI so I don't have to configure it manually.

4. **As a developer** switching between CLIs, I want to easily change the default CLI in settings so I can use different tools for different projects.

## Acceptance Criteria

- [ ] Extension detects Claude, Codex, and Cursor CLIs on system
- [ ] Configuration settings added for all three CLIs
- [ ] Default CLI selection works (auto-detect or manual)
- [ ] Tasks can be executed via any available CLI
- [ ] UI shows which CLI is being used
- [ ] Error handling for missing CLIs
- [ ] Documentation updated with multi-CLI instructions
- [ ] README updated to clarify VSCode/Cursor compatibility
- [ ] Backward compatibility maintained

## Out of Scope

- CLI installation/update functionality
- CLI version detection
- Per-task CLI metadata in task files (future enhancement)
- CLI-specific plugin support (e.g., Ralph Loop only works with Claude)

## References

- Current implementation: `src/kanbanView.ts` - `handleExecuteViaClaude()`
- Configuration: `package.json` - `kaiban.claude.*` settings
- CLI detection: Need to implement using Node.js `child_process`

---

## Changelog

- 2026-01-13: Initial draft
