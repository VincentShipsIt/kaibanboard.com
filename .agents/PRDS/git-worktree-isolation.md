# PRD: Git Worktree Isolation

**Created:** 2026-01-15
**Status:** Draft
**Related Task:** [Link](../TASKS/git-worktree-isolation.md)

---

## Overview

Run AI agent tasks in isolated git worktrees, keeping the main branch safe from experimental changes. Each task execution creates a temporary worktree where the agent can make changes freely. When complete, changes can be reviewed and merged back, or discarded entirely.

## Goals

1. Isolate task execution from main working directory
2. Protect main branch from broken/experimental changes
3. Enable parallel task execution without conflicts
4. Simplify code review before merging
5. Easy cleanup of abandoned experiments

## Requirements

### Functional Requirements

#### 1. Worktree Management
- **FR1.1**: Create worktree for task execution automatically
- **FR1.2**: Name worktree after task ID (e.g., `.worktrees/task-123`)
- **FR1.3**: Branch from current HEAD or specified base branch
- **FR1.4**: Clean up worktree after task completion (configurable)
- **FR1.5**: List active worktrees with their task associations

#### 2. Task Execution in Worktree
- **FR2.1**: Terminal opens in worktree directory
- **FR2.2**: Agent prompt includes worktree context
- **FR2.3**: File changes happen in worktree only
- **FR2.4**: Main directory remains untouched during execution

#### 3. Merge/Integration
- **FR3.1**: Preview changes before merging
- **FR3.2**: One-click merge to main branch
- **FR3.3**: Squash commits option on merge
- **FR3.4**: Handle merge conflicts with VS Code merge editor
- **FR3.5**: Option to create PR instead of direct merge

#### 4. Cleanup
- **FR4.1**: Auto-cleanup on successful merge
- **FR4.2**: Manual cleanup command for abandoned worktrees
- **FR4.3**: Cleanup all worktrees command
- **FR4.4**: Warning before deleting worktree with uncommitted changes

#### 5. UI Integration
- **FR5.1**: Worktree indicator on task cards
- **FR5.2**: "Open in Worktree" vs "Open in Main" options
- **FR5.3**: Merge button in task detail view
- **FR5.4**: Worktree status in progress panel

### Non-Functional Requirements

#### 1. Performance
- **NFR1.1**: Worktree creation < 5 seconds
- **NFR1.2**: No impact on main directory file watching
- **NFR1.3**: Efficient disk usage (git worktrees share objects)

#### 2. Safety
- **NFR2.1**: Never auto-push to remote from worktree
- **NFR2.2**: Confirm before destructive operations
- **NFR2.3**: Preserve worktree on unexpected exit

## Technical Notes

### Git Worktree Commands
```bash
# Create worktree with new branch
git worktree add .worktrees/task-123 -b task/task-123

# List worktrees
git worktree list

# Remove worktree
git worktree remove .worktrees/task-123

# Prune stale worktrees
git worktree prune
```

### Worktree Service
```typescript
interface WorktreeService {
  createWorktree(taskId: string, baseBranch?: string): Promise<WorktreeInfo>;
  getWorktree(taskId: string): WorktreeInfo | null;
  listWorktrees(): WorktreeInfo[];
  mergeWorktree(taskId: string, options: MergeOptions): Promise<void>;
  deleteWorktree(taskId: string, force?: boolean): Promise<void>;
  cleanupAll(): Promise<void>;
}

interface WorktreeInfo {
  taskId: string;
  path: string;
  branch: string;
  baseBranch: string;
  createdAt: Date;
  hasUncommittedChanges: boolean;
  commitCount: number;
}
```

### Task Execution Flow
```
1. User clicks "Execute" on task
2. Check if worktree isolation enabled
3. If enabled:
   a. Create worktree for task
   b. Open terminal in worktree path
   c. Execute CLI with worktree context
   d. Monitor for completion
4. On completion:
   a. Show diff preview
   b. Offer merge/discard options
5. On merge:
   a. Merge branch to main
   b. Delete worktree
```

### Configuration
```json
{
  "kaiban.worktree.enabled": true,
  "kaiban.worktree.basePath": ".worktrees",
  "kaiban.worktree.autoCleanup": true,
  "kaiban.worktree.squashOnMerge": false,
  "kaiban.worktree.defaultBaseBranch": "main"
}
```

## User Stories

1. **As a developer**, I want tasks to run in isolation so my main branch stays stable.

2. **As a team member**, I want to review AI changes before merging so I can ensure quality.

3. **As a user**, I want to easily discard failed experiments without manual git cleanup.

4. **As a power user**, I want to run multiple tasks in parallel without git conflicts.

## Acceptance Criteria

- [ ] Worktree created automatically on task execution
- [ ] Terminal opens in worktree directory
- [ ] Main branch unaffected during execution
- [ ] Diff preview available before merge
- [ ] One-click merge to main
- [ ] One-click discard/cleanup
- [ ] Handle merge conflicts gracefully
- [ ] Worktree indicator on task cards
- [ ] Configuration options available
- [ ] Works with parallel execution

## Out of Scope

- Remote branch creation (local only)
- Automatic PR creation (separate command)
- Cross-repository worktrees
- Worktree templates

---

## Changelog

- 2026-01-15: Initial draft
