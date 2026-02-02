## Task: Git Worktree Isolation

**ID:** task-git-worktree
**Label:** Git Worktree Isolation
**Description:** Run AI agent tasks in isolated git worktrees to keep main branch safe from experimental changes.
**Type:** Feature
**Status:** Done
**CompletedAt:** 2026-01-19
**Priority:** High
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [Link](../PRDS/git-worktree-isolation.md)
**Order:** 5

---

## Details

### Scope

1. **Worktree Creation**: Auto-create on task execution
2. **Isolated Execution**: Terminal runs in worktree
3. **Merge Flow**: Preview diff, one-click merge
4. **Cleanup**: Auto/manual worktree removal

### Key Deliverables

- [ ] WorktreeService for git operations
- [ ] UI indicator for worktree tasks
- [ ] Merge preview and actions
- [ ] Conflict resolution handling
- [ ] Configuration options

### Git Commands Used

```bash
git worktree add .worktrees/task-123 -b task/task-123
git worktree list
git worktree remove .worktrees/task-123
```

### Configuration

```json
{
  "kaiban.worktree.enabled": true,
  "kaiban.worktree.basePath": ".worktrees",
  "kaiban.worktree.autoCleanup": true
}
```

### Success Criteria

- Task runs in isolated worktree
- Main branch unchanged during execution
- One-click merge works
- Conflicts handled via VS Code merge editor
