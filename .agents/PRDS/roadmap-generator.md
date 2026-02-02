# PRD: Roadmap Generator

**Created:** 2026-01-15
**Status:** Draft
**Related Task:** [Link](../TASKS/roadmap-generator.md)

---

## Overview

AI-assisted feature planning with competitor analysis and audience targeting. Generate product roadmaps by analyzing the current codebase, market trends, and user needs. Help prioritize features based on impact, effort, and strategic alignment.

## Goals

1. Generate feature ideas based on codebase analysis
2. Competitor feature comparison
3. Audience/persona-based prioritization
4. Effort/impact estimation
5. Visual roadmap output

## Requirements

### Functional Requirements

#### 1. Feature Ideation
- **FR1.1**: Analyze codebase for improvement opportunities
- **FR1.2**: Suggest features based on common patterns in similar projects
- **FR1.3**: Generate features from user stories/personas
- **FR1.4**: Identify missing functionality vs. competitors

#### 2. Competitor Analysis
- **FR2.1**: Input competitor products/URLs
- **FR2.2**: Extract competitor feature lists (manual or web scrape)
- **FR2.3**: Compare features: has/missing/better
- **FR2.4**: Highlight differentiation opportunities

#### 3. Prioritization
- **FR3.1**: Score features by impact (1-5)
- **FR3.2**: Score features by effort (1-5)
- **FR3.3**: Calculate priority score (impact/effort)
- **FR3.4**: Filter by audience segment
- **FR3.5**: Manual override for strategic priorities

#### 4. Roadmap Output
- **FR4.1**: Timeline view (Q1, Q2, etc.)
- **FR4.2**: Kanban view (Now, Next, Later)
- **FR4.3**: Export as Markdown
- **FR4.4**: Export as image (optional)
- **FR4.5**: Auto-create tasks from roadmap items

#### 5. Integration
- **FR5.1**: Command "Kaiban: Generate Roadmap"
- **FR5.2**: Roadmap panel in webview
- **FR5.3**: Convert roadmap items to tasks
- **FR5.4**: Link tasks back to roadmap

### Non-Functional Requirements

#### 1. Accuracy
- **NFR1.1**: Feature suggestions are relevant to project type
- **NFR1.2**: Effort estimates are reasonable ballparks

#### 2. Flexibility
- **NFR2.1**: Support different roadmap formats
- **NFR2.2**: Customizable scoring criteria

## Technical Notes

### Roadmap Data Structure
```typescript
interface Roadmap {
  id: string;
  name: string;
  created: Date;
  updated: Date;
  items: RoadmapItem[];
  competitors: Competitor[];
  audiences: Audience[];
}

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  impact: 1 | 2 | 3 | 4 | 5;
  effort: 1 | 2 | 3 | 4 | 5;
  priority: number; // calculated
  timeframe: 'now' | 'next' | 'later' | 'q1' | 'q2' | 'q3' | 'q4';
  audience: string[];
  status: 'idea' | 'planned' | 'in-progress' | 'done';
  taskId?: string; // linked task
}

interface Competitor {
  name: string;
  url?: string;
  features: string[];
}

interface Audience {
  name: string;
  description: string;
  needs: string[];
}
```

### Feature Ideation Prompt
```markdown
Analyze this codebase and suggest 10 features that would improve it.

Current capabilities:
- [extracted from codebase]

Project type: VS Code Extension / CLI tool
Target audience: Developers using AI coding assistants

For each feature, provide:
1. Title
2. Description (2-3 sentences)
3. Impact score (1-5)
4. Effort estimate (1-5)
5. Target audience segment
```

### Competitor Comparison Matrix
```markdown
| Feature              | Us | Competitor A | Competitor B |
|---------------------|-----|--------------|--------------|
| Kanban Board        | ✅  | ✅           | ❌           |
| Parallel Execution  | ❌  | ✅           | ✅           |
| Git Integration     | ❌  | ✅           | ❌           |
| Roadmap Generator   | ❌  | ✅           | ✅           |
```

## User Stories

1. **As a product owner**, I want to generate a roadmap so I can plan development priorities.

2. **As a founder**, I want to compare with competitors so I know where to differentiate.

3. **As a developer**, I want to convert roadmap items to tasks so I can start working.

## Acceptance Criteria

- [ ] Feature ideation generates relevant suggestions
- [ ] Competitor input/comparison works
- [ ] Impact/effort scoring works
- [ ] Priority calculation works
- [ ] Timeline/Kanban views available
- [ ] Export to Markdown works
- [ ] Convert to tasks works
- [ ] Roadmap stored in `.agent/ROADMAP/`

## Out of Scope

- Automatic competitor web scraping
- Financial projections
- Resource allocation planning
- Gantt chart view

---

## Changelog

- 2026-01-15: Initial draft
