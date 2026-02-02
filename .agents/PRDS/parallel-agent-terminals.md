# PRD: Parallel Agent Terminals

**Created:** 2026-01-15
**Status:** Draft
**Related Task:** [Link](../TASKS/parallel-agent-terminals.md)

---

## Overview

Enable running multiple AI agent terminals simultaneously, allowing parallel task execution. Currently, batch execution runs tasks sequentially. This feature enables concurrent execution with configurable parallelism (up to 12 agents), similar to Auto-Claude's parallel processing capability.

## Goals

1. Run multiple tasks concurrently via separate terminals
2. Configurable parallelism level (1-12 concurrent agents)
3. Visual progress tracking for all running agents
4. Resource-aware execution (respect system limits)
5. Aggregate results and handle failures gracefully

## Requirements

### Functional Requirements

#### 1. Parallel Execution
- **FR1.1**: Execute N tasks simultaneously (configurable N)
- **FR1.2**: Each task runs in its own terminal instance
- **FR1.3**: Default parallelism: 3 concurrent tasks
- **FR1.4**: Maximum parallelism: 12 concurrent tasks
- **FR1.5**: Queue remaining tasks when all slots occupied

#### 2. Progress Tracking
- **FR2.1**: Show all running tasks in progress panel
- **FR2.2**: Individual progress indicator per task
- **FR2.3**: Aggregate progress (e.g., "3/10 complete, 3 running")
- **FR2.4**: Visual distinction between queued/running/complete

#### 3. Resource Management
- **FR3.1**: Detect system resources (CPU, memory)
- **FR3.2**: Auto-adjust parallelism based on resources
- **FR3.3**: Pause new task starts if system under pressure
- **FR3.4**: Configuration to limit memory per agent

#### 4. Failure Handling
- **FR4.1**: Continue other tasks if one fails
- **FR4.2**: Retry failed tasks (configurable retry count)
- **FR4.3**: Aggregate failure report at end
- **FR4.4**: Option to stop all on first failure

#### 5. UI Updates
- **FR5.1**: Multi-task progress panel in webview
- **FR5.2**: Per-task stop button
- **FR5.3**: "Stop All" button
- **FR5.4**: Parallelism slider in settings

### Non-Functional Requirements

#### 1. Performance
- **NFR1.1**: No UI lag with 12 concurrent terminals
- **NFR1.2**: Efficient terminal output handling
- **NFR1.3**: Memory cleanup after task completion

#### 2. Stability
- **NFR2.1**: Graceful degradation under resource pressure
- **NFR2.2**: No zombie terminal processes
- **NFR2.3**: Clean shutdown on extension deactivate

## Technical Notes

### Architecture
```typescript
interface ParallelExecutionManager {
  maxConcurrent: number;
  runningTasks: Map<string, TaskExecution>;
  queuedTasks: string[];

  startParallelExecution(taskIds: string[]): void;
  stopTask(taskId: string): void;
  stopAll(): void;
  getProgress(): ParallelProgress;
}

interface TaskExecution {
  taskId: string;
  terminal: vscode.Terminal;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  progress?: ClaudeStepProgress;
}
```

### Terminal Management
```typescript
// Create named terminals for each task
const terminal = vscode.window.createTerminal({
  name: `Agent ${index}: ${task.label.substring(0, 15)}`,
  cwd: workspacePath,
  env: {
    KAIBAN_TASK_ID: task.id,
    KAIBAN_PARALLEL_INDEX: String(index)
  }
});
```

### Progress Panel UI
```html
<div class="parallel-progress-panel">
  <div class="progress-header">
    <span>Parallel Execution: 3/10 complete</span>
    <button onclick="stopAll()">Stop All</button>
  </div>
  <div class="progress-tasks">
    <!-- Running tasks -->
    <div class="task-progress running">
      <span class="task-name">Task 1</span>
      <span class="task-status">Running: Read file.ts</span>
      <button onclick="stopTask('id')">Stop</button>
    </div>
    <!-- Queued tasks -->
    <div class="task-progress queued">
      <span class="task-name">Task 4</span>
      <span class="task-status">Queued (position 1)</span>
    </div>
  </div>
</div>
```

### Configuration
```json
{
  "kaiban.parallel.maxConcurrent": 3,
  "kaiban.parallel.autoAdjust": true,
  "kaiban.parallel.retryOnFailure": true,
  "kaiban.parallel.maxRetries": 2,
  "kaiban.parallel.stopOnFirstFailure": false
}
```

## User Stories

1. **As a developer**, I want to run multiple tasks in parallel so I can complete work faster.

2. **As a power user**, I want to configure parallelism level so I can balance speed vs. resource usage.

3. **As a user**, I want to see progress of all running tasks so I know what's happening.

4. **As a user**, I want to stop individual tasks without affecting others.

## Acceptance Criteria

- [ ] Multiple tasks execute concurrently
- [ ] Configurable parallelism (1-12)
- [ ] Progress panel shows all running tasks
- [ ] Individual task stop works
- [ ] "Stop All" works
- [ ] Failed tasks don't stop others (by default)
- [ ] Queue management for excess tasks
- [ ] Resource-aware auto-adjustment
- [ ] Clean terminal cleanup on completion

## Out of Scope

- Cross-machine distributed execution
- Task dependency ordering (future enhancement)
- Priority-based queue ordering (future enhancement)

---

## Changelog

- 2026-01-15: Initial draft
