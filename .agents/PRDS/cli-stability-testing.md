# PRD: CLI Stability & Testing

**Created:** 2026-01-15
**Status:** Draft
**Related Task:** [Link](../TASKS/cli-stability-testing.md)

---

## Overview

Ensure the CLI (`kai` command) is stable, well-tested, and production-ready. The CLI was recently extracted into a separate package (`@kaibanboard/cli`) as part of the monorepo restructure. This PRD covers comprehensive testing, error handling, and continuous validation to prevent regressions.

## Goals

1. Establish comprehensive test coverage for CLI functionality
2. Implement CI/CD pipeline for automated testing
3. Create integration tests for real-world scenarios
4. Set up monitoring for CLI stability across platforms
5. Document testing procedures and known edge cases

## Requirements

### Functional Requirements

#### 1. Unit Tests
- **FR1.1**: Test task parser with various markdown formats
- **FR1.2**: Test CLI argument parsing (path, flags, options)
- **FR1.3**: Test navigation hooks (keyboard handling)
- **FR1.4**: Test task status transitions
- **FR1.5**: Test file watcher behavior (add, modify, delete)

#### 2. Integration Tests
- **FR2.1**: Test CLI startup with valid `.agent/TASKS/` directory
- **FR2.2**: Test CLI startup with missing directory (should show helpful error)
- **FR2.3**: Test CLI startup with empty directory
- **FR2.4**: Test task execution flow (To Do -> Doing -> Testing -> Done)
- **FR2.5**: Test real-time file watching updates UI

#### 3. E2E Tests
- **FR3.1**: Test full TUI rendering in terminal
- **FR3.2**: Test keyboard navigation (arrows, enter, escape)
- **FR3.3**: Test task selection and detail view
- **FR3.4**: Test status bar updates
- **FR3.5**: Test help panel toggle

#### 4. Error Handling
- **FR4.1**: Graceful handling of malformed task files
- **FR4.2**: Handle file permission errors
- **FR4.3**: Handle file system race conditions
- **FR4.4**: Clear error messages for common issues
- **FR4.5**: Recovery from temporary file system errors

#### 5. CI/CD Pipeline
- **FR5.1**: Run tests on every PR
- **FR5.2**: Test on Node.js 18, 20, 22
- **FR5.3**: Test on macOS, Linux, Windows
- **FR5.4**: Publish to npm only on passing tests
- **FR5.5**: Version bump automation

### Non-Functional Requirements

#### 1. Performance
- **NFR1.1**: CLI should start in < 500ms
- **NFR1.2**: File watcher should detect changes in < 100ms
- **NFR1.3**: UI should remain responsive during file operations

#### 2. Reliability
- **NFR2.1**: No crashes on edge case inputs
- **NFR2.2**: Proper cleanup on exit (file watchers, event listeners)
- **NFR2.3**: Handle SIGINT/SIGTERM gracefully

#### 3. Test Coverage
- **NFR3.1**: Minimum 80% code coverage
- **NFR3.2**: 100% coverage on critical paths (parser, status updates)
- **NFR3.3**: Snapshot tests for TUI components

## Technical Notes

### Test Stack
- **Unit/Integration**: Vitest
- **TUI Testing**: ink-testing-library
- **Mocking**: vitest mocks for fs, chokidar
- **CI**: GitHub Actions

### Test File Structure
```
packages/cli/
├── src/
│   ├── __tests__/
│   │   ├── app.test.tsx
│   │   ├── taskParser.test.ts
│   │   ├── navigation.test.ts
│   │   └── integration/
│   │       ├── startup.test.ts
│   │       └── fileWatcher.test.ts
│   ├── components/
│   │   └── __tests__/
│   │       ├── Board.test.tsx
│   │       ├── Column.test.tsx
│   │       └── TaskCard.test.tsx
│   └── hooks/
│       └── __tests__/
│           ├── useTasks.test.ts
│           └── useNavigation.test.ts
└── vitest.config.ts
```

### CI Pipeline (GitHub Actions)
```yaml
name: CLI Tests
on: [push, pull_request]
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 22]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test --coverage
      - run: bun run build
```

## User Stories

1. **As a developer**, I want the CLI to be well-tested so I can trust it won't break in production.

2. **As a contributor**, I want clear test patterns so I can add tests for new features.

3. **As a maintainer**, I want CI to catch regressions automatically so I can merge PRs with confidence.

4. **As a user**, I want the CLI to handle edge cases gracefully so my workflow isn't interrupted.

## Acceptance Criteria

- [ ] Unit tests for all core modules (parser, hooks, utils)
- [ ] Integration tests for CLI startup scenarios
- [ ] TUI component tests with ink-testing-library
- [ ] GitHub Actions CI pipeline configured
- [ ] Tests run on macOS, Linux, Windows
- [ ] Tests run on Node.js 18, 20, 22
- [ ] Minimum 80% code coverage achieved
- [ ] Error handling tests for common failures
- [ ] Documentation for running tests locally
- [ ] Pre-commit hooks prevent broken tests

## Out of Scope

- VS Code extension testing (separate task)
- Performance benchmarking (future enhancement)
- Fuzz testing (future enhancement)

## References

- Current CLI code: `packages/cli/src/`
- Core types: `packages/core/src/types.ts`
- Ink testing: https://github.com/vadimdemedes/ink-testing-library

---

## Changelog

- 2026-01-15: Initial draft
