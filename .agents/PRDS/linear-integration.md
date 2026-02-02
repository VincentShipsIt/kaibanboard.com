# PRD: Linear Integration

**Created:** 2026-01-15
**Status:** Draft
**Related Task:** [Link](../TASKS/linear-integration.md)

---

## Overview

Sync tasks with Linear for teams using Linear as their project management tool. Import Linear issues as Kaiban tasks, update status bidirectionally, and create Linear issues from completed tasks. Bridge the gap between local AI-driven development and team project management.

## Goals

1. Import Linear issues as Kaiban tasks
2. Sync task status with Linear issue status
3. Create Linear issues from Kaiban tasks
4. Support multiple Linear projects/teams
5. Work offline with sync-on-demand

## Requirements

### Functional Requirements

#### 1. Linear Issue Import
- **FR1.1**: Import issues from Linear workspace
- **FR1.2**: Filter by project, team, or assignee
- **FR1.3**: Map Linear labels to task type/priority
- **FR1.4**: Preserve Linear metadata (assignee, cycle, project)
- **FR1.5**: Link task to original Linear issue

#### 2. Status Sync
- **FR2.1**: Map Kaiban statuses to Linear statuses
- **FR2.2**: Update Linear when task status changes
- **FR2.3**: Update task when Linear issue changes (optional)
- **FR2.4**: Configurable sync direction

#### 3. Issue Creation
- **FR3.1**: Create Linear issue from Kaiban task
- **FR3.2**: Include task description and PRD content
- **FR3.3**: Set project, team, and labels
- **FR3.4**: Link back to task file

#### 4. Configuration
- **FR4.1**: Linear API key stored securely
- **FR4.2**: Default project/team selection
- **FR4.3**: Status mapping configuration
- **FR4.4**: Auto-sync toggle

#### 5. UI Integration
- **FR5.1**: Command "Kaiban: Import from Linear"
- **FR5.2**: Command "Kaiban: Push to Linear"
- **FR5.3**: Linear icon on synced tasks
- **FR5.4**: Quick link to open in Linear

### Non-Functional Requirements

#### 1. Authentication
- **NFR1.1**: OAuth or API key authentication
- **NFR1.2**: Secure token storage via SecretStorage
- **NFR1.3**: Token refresh handling

#### 2. Performance
- **NFR2.1**: Batch import (not one-by-one)
- **NFR2.2**: Cache Linear data for 5 minutes
- **NFR2.3**: Background sync (non-blocking)

## Technical Notes

### Linear API
```typescript
// Linear SDK usage
import { LinearClient } from '@linear/sdk';

const linear = new LinearClient({ apiKey: 'your-api-key' });

// Fetch issues
const issues = await linear.issues({
  filter: {
    team: { key: { eq: 'ENG' } },
    state: { type: { in: ['backlog', 'unstarted', 'started'] } }
  }
});

// Create issue
const issue = await linear.createIssue({
  teamId: 'team-id',
  title: 'Task title',
  description: 'Task description',
  priority: 2
});

// Update issue status
await linear.updateIssue(issueId, {
  stateId: 'done-state-id'
});
```

### Status Mapping
```typescript
const statusMapping = {
  // Kaiban -> Linear
  'Backlog': 'backlog',
  'To Do': 'unstarted',
  'Doing': 'started',
  'Testing': 'started', // or custom 'testing' state
  'Done': 'completed',
  'Blocked': 'backlog' // with blocked label
};
```

### Task File with Linear Metadata
```markdown
## Task: Implement user dashboard

**ID:** task-linear-ENG-123
**Label:** Implement user dashboard
**Description:** Create the main user dashboard page
**Type:** Feature
**Status:** To Do
**Priority:** High
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [Link](../PRDS/user-dashboard.md)
**Linear:** https://linear.app/team/issue/ENG-123
**LinearID:** ENG-123
**Assignee:** @username
**Cycle:** Sprint 5

---

## Synced from Linear

[Original issue description]
```

### Configuration
```json
{
  "kaiban.linear.enabled": true,
  "kaiban.linear.defaultTeam": "ENG",
  "kaiban.linear.syncDirection": "bidirectional",
  "kaiban.linear.autoSync": false,
  "kaiban.linear.statusMapping": {}
}
```

## User Stories

1. **As a team member**, I want to import my Linear issues so I can work on them locally.

2. **As a developer**, I want status changes to sync to Linear so my team sees progress.

3. **As a lead**, I want completed tasks to create Linear issues for tracking.

## Acceptance Criteria

- [ ] Linear API authentication works
- [ ] Import issues from Linear
- [ ] Status sync to Linear works
- [ ] Create Linear issue from task
- [ ] Status mapping is configurable
- [ ] Linear icon on synced tasks
- [ ] Quick link to Linear issue
- [ ] Works offline (sync on demand)

## Out of Scope

- Comment sync
- Attachment sync
- Cycle/sprint planning
- Linear project creation

---

## Changelog

- 2026-01-15: Initial draft
