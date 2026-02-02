# PRD: GitHub/GitLab Integration

**Created:** 2026-01-15
**Status:** Draft
**Related Task:** [Link](../TASKS/github-integration.md)

---

## Overview

Integrate with GitHub and GitLab to import issues as tasks and create pull/merge requests from completed tasks. This bridges external project management with the local task-based workflow, reducing context switching.

## Goals

1. Import GitHub/GitLab issues as Kaiban tasks
2. Create PRs/MRs from completed tasks
3. Sync task status with issue status
4. Support multiple repositories
5. Work offline with sync-on-demand

## Requirements

### Functional Requirements

#### 1. Issue Import
- **FR1.1**: Import issues from GitHub repository
- **FR1.2**: Import issues from GitLab repository
- **FR1.3**: Map issue labels to task type/priority
- **FR1.4**: Preserve issue metadata (assignee, milestone, labels)
- **FR1.5**: Link task to original issue URL
- **FR1.6**: Filter issues by label, milestone, or assignee

#### 2. PR/MR Creation
- **FR2.1**: Create GitHub PR from task
- **FR2.2**: Create GitLab MR from task
- **FR2.3**: Auto-populate PR/MR title from task label
- **FR2.4**: Auto-populate PR/MR description from PRD content
- **FR2.5**: Link PR/MR back to issue (closes #123)

#### 3. Status Sync (Optional)
- **FR3.1**: Update task status when PR is merged
- **FR3.2**: Update issue status when task moves to Done
- **FR3.3**: Configurable sync direction (one-way or two-way)

#### 4. VS Code Extension Integration
- **FR4.1**: Command "Kaiban: Import Issues from GitHub"
- **FR4.2**: Command "Kaiban: Create PR from Task"
- **FR4.3**: Show GitHub/GitLab icon on imported tasks
- **FR4.4**: Quick action to open issue in browser

#### 5. CLI Integration
- **FR5.1**: `kai import github --repo owner/repo`
- **FR5.2**: `kai import gitlab --repo owner/repo`
- **FR5.3**: `kai pr create --task <task-id>`
- **FR5.4**: `kai mr create --task <task-id>`

### Non-Functional Requirements

#### 1. Authentication
- **NFR1.1**: Use existing `gh` CLI authentication for GitHub
- **NFR1.2**: Use existing `glab` CLI authentication for GitLab
- **NFR1.3**: Fallback to personal access token if CLI not available
- **NFR1.4**: Store tokens securely via VS Code SecretStorage

#### 2. Offline Support
- **NFR2.1**: Import creates local task files (works offline)
- **NFR2.2**: Sync happens on explicit command (not automatic)

#### 3. Rate Limiting
- **NFR3.1**: Respect GitHub API rate limits
- **NFR3.2**: Cache API responses for 5 minutes

## Technical Notes

### Using `gh` CLI
```bash
# List issues
gh issue list --repo owner/repo --json number,title,body,labels,assignees,milestone

# Create PR
gh pr create --repo owner/repo --title "Title" --body "Body" --base main
```

### Issue to Task Mapping
```typescript
interface IssueMapping {
  // GitHub/GitLab label -> Task type
  labelToType: {
    'bug': 'Bug',
    'feature': 'Feature',
    'enhancement': 'Enhancement',
    'documentation': 'Research'
  },
  // GitHub/GitLab label -> Task priority
  labelToPriority: {
    'priority:high': 'High',
    'priority:medium': 'Medium',
    'priority:low': 'Low',
    'P0': 'High',
    'P1': 'Medium',
    'P2': 'Low'
  }
}
```

### Task File with GitHub Metadata
```markdown
## Task: Fix login redirect bug

**ID:** task-gh-123
**Label:** Fix login redirect bug
**Description:** Users are not redirected after login
**Type:** Bug
**Status:** To Do
**Priority:** High
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [Link](../PRDS/fix-login-redirect.md)
**GitHub:** https://github.com/owner/repo/issues/123
**Assignee:** @username

---

## Original Issue

[Imported from GitHub #123]

...issue body...
```

## User Stories

1. **As a developer**, I want to import GitHub issues so I can work on them using Kaiban's workflow.

2. **As a maintainer**, I want to create PRs from tasks so my commits are properly linked to issues.

3. **As a team lead**, I want issue status to sync so I don't have to update both places.

## Acceptance Criteria

- [ ] Import issues from GitHub using `gh` CLI
- [ ] Import issues from GitLab using `glab` CLI
- [ ] Issues converted to task markdown files
- [ ] Labels mapped to type/priority
- [ ] Create PR with task title/description
- [ ] PR description includes "Closes #123"
- [ ] VS Code commands available
- [ ] CLI subcommands available
- [ ] Works offline (local files)

## Out of Scope

- Automatic background sync (manual trigger only)
- Comment sync between issue and task
- Multiple assignee support (use first assignee)
- Project board integration (issues only)

---

## Changelog

- 2026-01-15: Initial draft
