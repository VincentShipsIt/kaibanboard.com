## Task: Roadmap Generator

**ID:** task-roadmap-generator
**Label:** Roadmap Generator
**Description:** AI-assisted feature planning with competitor analysis, audience targeting, and prioritization framework.
**Type:** Feature
**Status:** Done
**CompletedAt:** 2026-01-19
**Priority:** Medium
**Created:** 2026-01-15
**Updated:** 2026-01-15
**PRD:** [Link](../PRDS/roadmap-generator.md)
**Order:** 8

---

## Details

### Scope

1. **Feature Ideation**: AI-generated suggestions
2. **Competitor Analysis**: Feature comparison matrix
3. **Prioritization**: Impact/effort scoring
4. **Output**: Timeline and Kanban views

### Key Deliverables

- [ ] Roadmap data structure
- [ ] Feature ideation prompts
- [ ] Competitor comparison UI
- [ ] Prioritization scoring
- [ ] Convert roadmap items to tasks

### Roadmap Structure

```typescript
interface RoadmapItem {
  title: string;
  impact: 1-5;
  effort: 1-5;
  timeframe: 'now' | 'next' | 'later';
  taskId?: string;
}
```

### Competitor Matrix

| Feature | Us | Competitor A |
|---------|-----|--------------|
| Kanban  | ✅  | ✅           |
| Parallel| ❌  | ✅           |

### Success Criteria

- Generate relevant feature ideas
- Compare with competitors
- Score by impact/effort
- Convert to actionable tasks
