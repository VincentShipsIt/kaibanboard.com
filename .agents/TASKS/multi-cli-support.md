## Task: Multi-CLI Support for Task Execution

**ID:** task-multi-cli-support
**Label:** Multi-CLI Support for Task Execution
**Description:** Add support for executing tasks via Codex CLI and Cursor CLI in addition to Claude CLI. Implement CLI detection, configuration, and execution logic.
**Type:** Feature
**Status:** Done
**Priority:** High
**Created:** 2026-01-13
**Updated:** 2026-01-13
**PRD:** [Link](../PRDS/multi-cli-support.md)

---

## Details

### Implementation Summary

The following components were implemented:

1. **CLI Detection Service** (`src/services/cliDetectionService.ts`)
   - Detects Claude, Codex, and Cursor CLIs
   - Uses `which` command to find executables
   - Special handling for Cursor (checks common macOS paths)
   - Caches detection results for 5 minutes
   - Extracts version information when available

2. **CLI Types** (`src/types/cli.ts`)
   - Type definitions for CLI providers
   - Configuration interfaces
   - Default CLI configurations
   - Helper functions for display names and install instructions

3. **Configuration Updates** (`package.json`)
   - `kaiban.cli.defaultProvider` - Select CLI (auto, claude, codex, cursor)
   - Per-CLI settings for executablePath, promptTemplate, additionalFlags

4. **Execution Logic Updates** (`src/kanbanView.ts`)
   - New `handleExecuteViaCLI()` method with multi-CLI support
   - `handleExecuteViaClaude()` delegates to new method for backward compatibility
   - CLI status messages sent to webview
   - Batch execution updated to use selected CLI

5. **Tests** (`src/services/cliDetectionService.test.ts`)
   - Unit tests for CLI detection
   - Tests for caching behavior
   - Tests for auto-selection logic

6. **Documentation** (`README.md`)
   - Multi-CLI support section
   - CLI configuration examples
   - Updated requirements and settings tables

### Acceptance Criteria

- [x] CLI detection works for Claude, Codex, and Cursor
- [x] Configuration settings added and working
- [x] Tasks can be executed via any available CLI
- [x] UI shows CLI status (via webview messages)
- [x] Documentation updated
- [x] Backward compatibility maintained
- [x] Tests added for CLI detection

### Files Changed

- `src/services/cliDetectionService.ts` (new)
- `src/services/cliDetectionService.test.ts` (new)
- `src/types/cli.ts` (new)
- `src/kanbanView.ts` (modified)
- `package.json` (modified)
- `README.md` (modified)

### Notes

- Ralph Wiggum Loop only works with Claude CLI (documented)
- Cursor CLI detection includes fallback to common macOS paths
- Version detection is optional and non-blocking
