# PRD: Dynamic Command Allowlist

**Created:** 2026-01-15
**Status:** Draft
**Related Task:** [Link](../TASKS/dynamic-command-allowlist.md)

---

## Overview

Implement a security layer that dynamically generates an allowlist of permitted commands based on the detected project stack. Only commands relevant to the project type (Node.js, Python, Go, etc.) are permitted, reducing the attack surface when AI agents execute commands.

## Goals

1. Auto-detect project stack from package files
2. Generate stack-specific command allowlist
3. Block unauthorized command execution
4. User override for special cases
5. Audit log for security review

## Requirements

### Functional Requirements

#### 1. Stack Detection
- **FR1.1**: Detect Node.js (package.json)
- **FR1.2**: Detect Python (requirements.txt, pyproject.toml)
- **FR1.3**: Detect Go (go.mod)
- **FR1.4**: Detect Rust (Cargo.toml)
- **FR1.5**: Detect multiple stacks in monorepos

#### 2. Allowlist Generation
- **FR2.1**: Base allowlist (ls, cat, grep, etc.)
- **FR2.2**: Stack-specific commands (npm, pip, go, cargo)
- **FR2.3**: Deny dangerous commands (rm -rf /, sudo, etc.)
- **FR2.4**: Configurable additions/removals

#### 3. Command Validation
- **FR3.1**: Intercept commands before execution
- **FR3.2**: Check against allowlist
- **FR3.3**: Block disallowed commands with explanation
- **FR3.4**: Prompt user for one-time approval option

#### 4. Override System
- **FR4.1**: User can approve blocked command once
- **FR4.2**: User can add command to permanent allowlist
- **FR4.3**: Project-level allowlist in `.agent/config.json`
- **FR4.4**: Global user allowlist

#### 5. Audit Logging
- **FR5.1**: Log all executed commands
- **FR5.2**: Log blocked commands
- **FR5.3**: Log user overrides
- **FR5.4**: Export audit log

### Non-Functional Requirements

#### 1. Security
- **NFR1.1**: Default deny for unknown commands
- **NFR1.2**: No shell injection via arguments
- **NFR1.3**: Prevent allowlist bypass

#### 2. Usability
- **NFR2.1**: Minimal friction for common commands
- **NFR2.2**: Clear error messages for blocked commands
- **NFR2.3**: Easy override process

## Technical Notes

### Stack Detection
```typescript
interface StackDetector {
  detect(workspacePath: string): DetectedStack[];
}

interface DetectedStack {
  name: 'nodejs' | 'python' | 'go' | 'rust' | 'java' | 'ruby';
  confidence: number;
  indicators: string[]; // Files that indicated this stack
}

const stackIndicators = {
  nodejs: ['package.json', 'node_modules', '.nvmrc'],
  python: ['requirements.txt', 'pyproject.toml', 'setup.py', '.python-version'],
  go: ['go.mod', 'go.sum'],
  rust: ['Cargo.toml', 'Cargo.lock'],
  java: ['pom.xml', 'build.gradle'],
  ruby: ['Gemfile', '.ruby-version']
};
```

### Allowlist Structure
```typescript
interface CommandAllowlist {
  // Base commands allowed for all stacks
  base: CommandRule[];

  // Stack-specific commands
  stacks: {
    [stack: string]: CommandRule[];
  };

  // Always denied (dangerous commands)
  denylist: string[];

  // User overrides
  userAllowed: string[];
}

interface CommandRule {
  command: string;
  args?: string[]; // Allowed argument patterns
  description: string;
}
```

### Default Allowlists
```typescript
const baseAllowlist: CommandRule[] = [
  { command: 'ls', description: 'List directory contents' },
  { command: 'cat', description: 'Read file contents' },
  { command: 'grep', description: 'Search in files' },
  { command: 'find', description: 'Find files' },
  { command: 'mkdir', description: 'Create directory' },
  { command: 'cp', description: 'Copy files' },
  { command: 'mv', description: 'Move files' },
  { command: 'git', description: 'Git operations' }
];

const nodejsAllowlist: CommandRule[] = [
  { command: 'npm', description: 'npm package manager' },
  { command: 'npx', description: 'npm package executor' },
  { command: 'yarn', description: 'Yarn package manager' },
  { command: 'pnpm', description: 'pnpm package manager' },
  { command: 'bun', description: 'Bun runtime' },
  { command: 'node', description: 'Node.js runtime' },
  { command: 'tsc', description: 'TypeScript compiler' }
];

const denylist: string[] = [
  'rm -rf /',
  'rm -rf ~',
  'sudo',
  'chmod 777',
  'curl | bash',
  'wget | bash',
  '> /dev/sda',
  'mkfs',
  'dd if='
];
```

### Command Validation Flow
```
┌─────────────────┐
│  Agent Command  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Parse Command  │────▶│  Check Denylist │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    ┌──────────────────┘
         │    │ Denied
         │    ▼
         │  ┌─────────────────┐
         │  │  BLOCK + Log    │
         │  └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Check Allowlist │────▶│  EXECUTE + Log  │
└────────┬────────┘     └─────────────────┘
         │
         │ Not in list
         ▼
┌─────────────────┐
│  Prompt User    │
│  for Override   │
└─────────────────┘
```

## User Stories

1. **As a developer**, I want dangerous commands blocked so my system stays safe.

2. **As a power user**, I want to approve special commands when needed.

3. **As a security engineer**, I want audit logs of all command execution.

## Acceptance Criteria

- [ ] Stack detection works for Node.js, Python, Go, Rust
- [ ] Base allowlist includes safe commands
- [ ] Stack-specific commands allowed
- [ ] Dangerous commands blocked
- [ ] User can approve blocked command
- [ ] User can add to permanent allowlist
- [ ] Audit log captures all commands
- [ ] Clear error message for blocked commands

## Out of Scope

- Network-level blocking
- Process sandboxing
- Container isolation
- Real-time threat detection

---

## Changelog

- 2026-01-15: Initial draft
