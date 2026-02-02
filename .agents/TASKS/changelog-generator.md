## Task: Changelog Generator

**ID:** task-changelog-generator
**Label:** Changelog Generator
**Description:** Auto-generate release notes and changelogs from completed tasks, supporting multiple formats and both VS Code extension and CLI.
**Type:** Feature
**Status:** Done
**CompletedAt:** 2026-01-19
**Priority:** High
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [Link](../PRDS/changelog-generator.md)
**Order:** 2

---

## Details

### Scope

1. **Core Logic**: Generate changelog from "Done" tasks
2. **Formats**: Markdown, Keep a Changelog
3. **VS Code Command**: "Kaiban: Generate Changelog"
4. **CLI Command**: `kai changelog`
5. **Preview**: Show before writing

### Key Deliverables

- [ ] Changelog service in `packages/core`
- [ ] VS Code command with preview
- [ ] CLI `changelog` subcommand
- [ ] Date/version filtering
- [ ] Append to existing CHANGELOG.md

### Implementation Notes

```typescript
// Task type to changelog category mapping
const typeMapping = {
  'Feature': 'Added',
  'Enhancement': 'Changed',
  'Bug': 'Fixed',
  'Refactor': 'Changed'
};
```

### CLI Usage

```bash
kai changelog                    # Generate from last tag
kai changelog --since v1.0.0     # Since version
kai changelog --dry-run          # Preview only
kai changelog --format keepachangelog
```

### Success Criteria

- Completed tasks appear in changelog grouped by type
- Both VS Code and CLI work
- Existing CHANGELOG.md preserved
