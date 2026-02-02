## Task: GitHub/GitLab Integration

**ID:** task-github-integration
**Label:** GitHub/GitLab Integration
**Description:** Import issues from GitHub/GitLab as tasks and create PRs/MRs from completed tasks using gh/glab CLI tools.
**Type:** Feature
**Status:** Done
**CompletedAt:** 2026-01-19
**Priority:** High
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [Link](../PRDS/github-integration.md)
**Order:** 3

---

## Details

### Scope

1. **Issue Import**: GitHub and GitLab issues to tasks
2. **Label Mapping**: Map labels to type/priority
3. **PR/MR Creation**: Create from completed tasks
4. **CLI Commands**: `kai import github`, `kai pr create`

### Key Deliverables

- [ ] GitHub integration service using `gh` CLI
- [ ] GitLab integration service using `glab` CLI
- [ ] Issue to task conversion
- [ ] PR creation with task context
- [ ] VS Code commands
- [ ] CLI subcommands

### Implementation Notes

Uses existing `gh` and `glab` CLI tools for authentication:

```bash
# GitHub
gh issue list --repo owner/repo --json number,title,body,labels

# GitLab
glab issue list --repo owner/repo
```

### Task File with GitHub Metadata

```markdown
**GitHub:** https://github.com/owner/repo/issues/123
**Assignee:** @username
```

### Success Criteria

- Import issues from GitHub repo
- Import issues from GitLab repo
- Create PR with "Closes #123"
- Works offline (local task files)
