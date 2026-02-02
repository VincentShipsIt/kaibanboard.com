# PRD: Changelog Generator

**Created:** 2026-01-15
**Status:** Draft
**Related Task:** [Link](../TASKS/changelog-generator.md)

---

## Overview

Automatically generate release notes and changelogs from completed tasks. When tasks move to "Done" status, their metadata (title, description, type) can be aggregated to create structured release notes, reducing manual documentation effort.

## Goals

1. Auto-generate changelog entries from completed tasks
2. Support multiple output formats (Markdown, Keep a Changelog)
3. Group changes by type (Features, Bug Fixes, Enhancements)
4. Integrate with existing task workflow
5. Support manual editing before publishing

## Requirements

### Functional Requirements

#### 1. Changelog Generation
- **FR1.1**: Generate changelog from tasks marked "Done" since last release
- **FR1.2**: Group tasks by type: Features, Bug Fixes, Enhancements, Breaking Changes
- **FR1.3**: Include task title, description (truncated), and optional link to PRD
- **FR1.4**: Support date range filtering (e.g., "since v1.0.0" or "since 2026-01-01")
- **FR1.5**: Auto-detect previous version from git tags or package.json

#### 2. Output Formats
- **FR2.1**: Markdown format (default)
- **FR2.2**: Keep a Changelog format (https://keepachangelog.com)
- **FR2.3**: JSON format for programmatic use
- **FR2.4**: Append to existing CHANGELOG.md or create new file

#### 3. VS Code Extension Integration
- **FR3.1**: Add command "Kaiban: Generate Changelog"
- **FR3.2**: Show preview before writing to file
- **FR3.3**: Allow editing in preview before saving
- **FR3.4**: Option to copy to clipboard instead of file

#### 4. CLI Integration
- **FR4.1**: Add `kai changelog` subcommand
- **FR4.2**: Support `--since <version|date>` flag
- **FR4.3**: Support `--format <markdown|keepachangelog|json>` flag
- **FR4.4**: Support `--output <file>` flag (default: CHANGELOG.md)
- **FR4.5**: Support `--dry-run` to preview without writing

### Non-Functional Requirements

#### 1. Performance
- **NFR1.1**: Generate changelog in < 1 second for 100 tasks

#### 2. Flexibility
- **NFR2.1**: Configuration for custom grouping rules
- **NFR2.2**: Template customization support

## Technical Notes

### Task Type Mapping
```typescript
const typeMapping = {
  'Feature': 'Added',
  'Enhancement': 'Changed',
  'Bug': 'Fixed',
  'Research': 'Other',
  'Refactor': 'Changed',
  'Breaking': 'Breaking Changes'
};
```

### Output Format Example (Keep a Changelog)
```markdown
## [1.2.0] - 2026-01-15

### Added
- Multi-CLI support for task execution (#task-123)
- Batch task execution with progress tracking

### Changed
- Improved task parser performance
- Updated SCSS build system

### Fixed
- Rate limit banner not dismissing correctly
- Task order persistence issue
```

### CLI Command
```bash
# Generate changelog since last tag
kai changelog

# Generate since specific version
kai changelog --since v1.0.0

# Preview without writing
kai changelog --dry-run

# Custom output file
kai changelog --output RELEASE_NOTES.md
```

## User Stories

1. **As a maintainer**, I want to auto-generate release notes so I spend less time on documentation.

2. **As a user**, I want to see what changed in each release so I know what's new.

3. **As a developer**, I want changelog generation integrated into my workflow so it happens naturally.

## Acceptance Criteria

- [ ] Tasks marked "Done" are included in changelog
- [ ] Tasks grouped by type (Added, Changed, Fixed)
- [ ] Keep a Changelog format supported
- [ ] VS Code command available
- [ ] CLI `kai changelog` subcommand works
- [ ] Preview before writing to file
- [ ] Date/version filtering works
- [ ] Existing CHANGELOG.md preserved (append mode)

## Out of Scope

- Git commit message parsing (tasks are the source of truth)
- Automatic version bumping (separate tool)
- Publishing to GitHub Releases (future enhancement)

---

## Changelog

- 2026-01-15: Initial draft
