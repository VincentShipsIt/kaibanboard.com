## Task: CLI Stability & Testing

**ID:** task-cli-stability
**Label:** CLI Stability & Testing
**Description:** Comprehensive testing and CI/CD setup for the CLI (@kaibanboard/cli) to ensure stability across platforms and Node.js versions.
**Type:** Enhancement
**Status:** To Do
**Priority:** High
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [Link](../PRDS/cli-stability-testing.md)
**Order:** 1

---

## Details

### Scope

1. **Unit Tests**: Parser, hooks, utils with Vitest
2. **Integration Tests**: CLI startup, file watching
3. **TUI Tests**: ink-testing-library for component testing
4. **CI Pipeline**: GitHub Actions for macOS/Linux/Windows + Node 18/20/22
5. **Coverage**: Minimum 80% code coverage

### Key Deliverables

- [ ] Unit tests for `@kaibanboard/core` (taskParser, types)
- [ ] Unit tests for `@kaibanboard/cli` (hooks, components)
- [ ] Integration tests for CLI startup scenarios
- [ ] GitHub Actions workflow file
- [ ] Pre-commit hooks for test enforcement
- [ ] Coverage reporting

### Technical Considerations

- Use `ink-testing-library` for TUI component tests
- Mock file system operations in tests
- Test keyboard navigation
- Ensure tests work in CI (no TTY)

### Success Criteria

- All tests pass on macOS, Linux, Windows
- All tests pass on Node.js 18, 20, 22
- 80%+ code coverage achieved
- CI runs on every PR
