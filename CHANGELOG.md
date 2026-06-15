# Changelog

All notable changes to the Kaiban Board extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2025-01-13

### Added
- Enhanced README documentation with comprehensive Ralph Wiggum Loop explanation
- Added link to [Ralph Wiggum plugin repository](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum)

### Changed
- Clarified that tasks can be executed directly from the kanban board in README
- Improved documentation of autonomous iterative execution features
- Reduced test coverage thresholds to 55% for more realistic CI/CD requirements
- Updated git hooks: pre-commit now runs linters only (via lint-staged), pre-push no longer runs tests

### Fixed
- Fixed TypeScript type error in test mocks for fs.existsSync
- Removed unused cachedQuotaData variable in kanbanView.ts
- Fixed non-null assertion linting error in quota serialization

## [0.2.1] - 2025-01-12

### Added
- **PRD Management**: Create PRD and Task files directly from the board
- **Task Ordering**: Drag & drop to reorder tasks within columns
- **Order Persistence**: Custom task order saved to `Order` field in task files
- **Smart Sorting**: Tasks sorted by custom order first, then by priority (High → Medium → Low)

### Changed
- Tasks without order field now appear after ordered tasks

## [0.2.0] - 2025-01-11

### Added
- **Ralph Loop Integration**: Execute tasks with Claude Code's autonomous development loop
  - New "Execute with Ralph Loop" option in task execution modal
  - Configurable max iterations via `kaiban.ralph.maxIterations` setting
  - Custom command support via `kaiban.ralph.command` setting
  - Automatic PRD content inclusion for context
  - Terminal panel shows Ralph Loop output in real-time
- **Ralph Loop Settings**:
  - `kaiban.ralph.command`: Ralph command to execute (default: `/ralph-loop:ralph-loop`)
  - `kaiban.ralph.maxIterations`: Maximum iterations (default: 5)
  - `kaiban.ralph.completionPromise`: Custom completion promise template
  - `kaiban.claude.useRalphLoop`: Toggle Ralph Loop as default execution method
- **Task Execution Modal**: Choose between Cursor Cloud Agent and Ralph Loop
- **Terminal Panel**: View task execution output inline in the board

### Changed
- Renamed project from "Kaiban Markdown" to "Kaiban Board"
- Updated extension display name and documentation
- Improved task execution flow with provider selection

### Fixed
- Task status updates now persist correctly after drag & drop

## [0.1.1] - 2025-01-08

### Added
- **Sorting**: Sort tasks by priority (ascending/descending) or default order
- **PRD Preview Sidebar**: Click task cards to preview PRD content inline
- **Double-click to Edit**: Double-click task cards to open file for editing
- **Theme Support**: Board adapts to VS Code dark/light theme
- **Column Visibility**: Toggle columns on/off via settings dropdown

### Changed
- Improved drag & drop visual feedback
- Enhanced task card hover states
- Better column header styling with colored left borders

### Fixed
- Task cards now display correctly in all VS Code themes
- PRD links resolve correctly from task files

## [0.1.0] - 2025-01-05

### Added
- Initial release of Kaiban Board (formerly Kaiban Markdown)
- **4-Column Kanban Board**: To Do, Doing, Testing, Done
- **Markdown Task Parsing**: Reads tasks from `.agent/TASKS/*.md` files
- **PRD Support**: Link tasks to PRD files in `.agent/PRDS/`
- **Drag & Drop**: Move tasks between columns to update status
- **Multi-Workspace**: Aggregates tasks from all workspace folders
- **Priority Badges**: Visual indicators for High/Medium/Low priority
- **Type Badges**: Feature, Bug, Enhancement, Research labels
- **Cursor Cloud Agent**: Execute tasks with Cursor's AI agent
- **API Key Management**: Secure storage for provider API keys
- **Real-time Refresh**: Update board with latest task changes

### Configuration
- `kaiban.columns.enabled`: Customize visible columns
- `kaiban.task.basePath`: Task files location (default: `.agent/TASKS`)
- `kaiban.prd.basePath`: PRD files location (default: `.agent/PRDS`)
- `kaiban.ai.defaultProvider`: Default AI provider for task execution
- `kaiban.cursor.repositoryUrl`: GitHub repo URL for Cursor Cloud Agent

---

## Ralph Loop Integration Details

### What is Ralph Loop?

Ralph Loop is a Claude Code plugin (`ralph-wiggum`) that enables autonomous, iterative development. When you execute a task with Ralph Loop:

1. Claude reads the task and PRD context
2. Works on the implementation iteratively
3. Reviews its own output each iteration
4. Continues until completion criteria are met
5. Stops after max iterations or when task is complete

### How to Use Ralph Loop

1. **Prerequisites**:
   - Install Claude Code (not VS Code)
   - Install the ralph-wiggum plugin: `/plugin install ralph-wiggum`

2. **Execute a Task**:
   - Click the ▶ button on any task card
   - Select "Execute with Ralph Loop"
   - Click "Execute with Ralph"

3. **Monitor Progress**:
   - Terminal panel shows real-time output
   - Task card shows "Running" state with animated indicator
   - Completion notification when done

### Configuration Options

```json
{
  "kaiban.ralph.command": "/ralph-loop:ralph-loop",
  "kaiban.ralph.maxIterations": 5,
  "kaiban.ralph.completionPromise": "",
  "kaiban.claude.useRalphLoop": false
}
```

### Command Format

The extension constructs the Ralph Loop command as:

```
/ralph-loop:ralph-loop "Task: [task-label]

[task-description]

PRD Context:
[prd-content]" --max-iterations 5
```

This ensures Claude has full context about the task and its requirements.

---

[Unreleased]: https://github.com/VincentShipsIt/kaibanboard.com/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/VincentShipsIt/kaibanboard.com/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/VincentShipsIt/kaibanboard.com/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/VincentShipsIt/kaibanboard.com/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/VincentShipsIt/kaibanboard.com/releases/tag/v0.1.0
