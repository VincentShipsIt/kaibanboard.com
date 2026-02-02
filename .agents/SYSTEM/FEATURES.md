# Kaiban Board - Complete Feature Documentation

**Version:** Pre-release  
**Last Updated:** 2026-01-09

## Overview

Kaiban Board is an AI-powered Kanban board extension for Cursor IDE that visualizes markdown tasks from `.agent/TASKS/` directories with PRD preview support. It combines AI-powered task management, visual Kanban workflows, and markdown-based task files to create an intelligent development workflow system.

---

## Core Features

### 1. Kanban Board Visualization

#### Column Support
- **6 Available Columns:** Backlog, To Do, Doing, Testing, Done, Blocked
- **Configurable Display:** Show/hide columns via settings
- **Default Columns:** To Do, Doing, Testing, Done
- **Multi-Column Workflow:** Drag tasks between columns to update status

#### Task Display
- **Task Cards:** Visual cards showing task information
- **Priority Badges:** Color-coded indicators (High=Red, Medium=Orange, Low=Green)
- **Type Badges:** Feature, Bug, Enhancement, Research
- **Project Labels:** Shows which workspace/project each task belongs to
- **Status Indicators:** Visual status badges on cards
- **Completed Checkmark:** Tasks in "Done" status show completion indicator

#### Visual Design
- **Theme Support:** Automatically adapts to Cursor's dark/light theme
- **Responsive Layout:** Scrollable columns for large task lists
- **Hover Effects:** Interactive hover states for better UX
- **Card Styling:** Clean, modern card design with proper spacing

---

### 2. Task Management

#### Task Ordering
- **Per-Column Ordering:** Each column (status) maintains its own task order
- **Drag-and-Drop Reordering:** Drag tasks within or between columns to set order
- **Order Persistence:** Order stored in task markdown files as `**Order:** <number>`
- **Batch Execution Order:** "Execute All" respects drag-and-drop order
- **Smart Sorting:** Tasks sorted by order first, then by priority as fallback

#### Task Status Updates
- **Drag-and-Drop:** Move tasks between columns to update status
- **Auto-Sync:** Task status automatically updates in markdown file
- **Timestamp Updates:** "Updated" field automatically updated on status change
- **PRD Sync:** PRD file status syncs with task status (if PRD has status field)

#### Task Operations
- **Click to Preview:** Single-click task card to preview PRD
- **Double-Click to Open:** Double-click task card to open task file for editing
- **Quick Refresh:** Refresh button to reload all tasks
- **File Tracking:** Automatic detection of task file changes

---

### 3. PRD (Product Requirements Document) Preview

#### Preview Panel
- **Inline Preview:** View PRDs without opening files
- **Side Panel:** PRD displays in collapsible side panel
- **Markdown Rendering:** Full markdown support (headings, lists, code blocks, etc.)
- **Auto-Load:** PRD automatically loads when task card is clicked
- **PRD Path Resolution:** Supports relative and absolute PRD paths

#### PRD Integration
- **Link Detection:** Automatically detects PRD links in task files
- **Path Resolution:** Resolves PRD paths relative to task file or workspace root
- **Status Sync:** PRD status field syncs with task status
- **Multiple Formats:** Supports any markdown PRD format

#### PRD Configuration
- **Base Path Setting:** Configurable PRD base path (default: `.agent/PRDS`)
- **Custom Paths:** Support for custom PRD directory structures
- **Workspace-Aware:** Automatically resolves paths across workspace folders

---

### 4. Multi-Workspace Support

#### Workspace Aggregation
- **Multiple Folders:** Aggregates tasks from all workspace folders
- **Recursive Scanning:** Recursively scans `.agent/TASKS/` directories
- **Project Labels:** Each task shows which project/workspace it belongs to
- **Cross-Project View:** View tasks from multiple projects in one board

#### File Discovery
- **Auto-Discovery:** Automatically finds `.agent/TASKS/*.md` files
- **Excludes README:** Skips README.md files
- **Recursive Search:** Searches subdirectories within TASKS folder
- **Real-Time Updates:** Watches for file changes and updates board

---

### 5. Task Creation & AI Generation

#### Manual Task Creation
- **Command Palette:** `Kaiban: Create Task` command
- **Interactive Wizard:** Step-by-step task creation form
- **Field Collection:** Title, description, type, priority, status
- **Template Generation:** Creates properly formatted markdown task file
- **Auto-Open:** Automatically opens created task file

#### AI-Assisted Task Creation
- **AI Generation:** Uses AI providers to generate task descriptions
- **Provider Support:** Works with OpenAI, OpenRouter, Cursor Cloud, Replicate
- **Contextual Generation:** AI understands task title and type
- **Fallback Template:** Falls back to template if AI generation fails

#### Cursor Chat Integration
- **Chat Commands:** Use `@kaiban.createTask` in Cursor chat
- **Quick Creation:** Fast task creation directly from chat interface
- **Context Awareness:** Chat context can be used for task description

---

### 6. PRD Creation & AI Generation

#### Manual PRD Creation
- **Command Palette:** `Kaiban: Create PRD` command
- **Title Input:** Prompt for PRD title
- **Description Input:** Optional description field
- **Template Generation:** Creates structured PRD template
- **Auto-Open:** Automatically opens created PRD file

#### AI-Assisted PRD Creation
- **AI Generation:** Generates comprehensive PRD content
- **Structured Output:** Includes Overview, Goals, Requirements, Acceptance Criteria
- **Provider Selection:** Uses configured AI provider
- **Model Selection:** Supports provider-specific model selection
- **Fallback Template:** Falls back to template if AI generation fails

#### Cursor Chat Integration
- **Chat Commands:** Use `@kaiban.createPRD` in Cursor chat
- **Quick Creation:** Fast PRD creation directly from chat interface

---

### 7. AI Provider Integration

#### Supported Providers

**Cursor Cloud Agent**
- **Purpose:** Send tasks to Cursor's cloud-based AI agent
- **Workflow:** Creates branch → Implements task → Creates PR
- **Requirements:** Cursor IDE (not VS Code), Cursor API key
- **Features:**
  - Automatic branch creation
  - Pull Request creation
  - Task status tracking
  - PR URL storage in task file

**OpenAI**
- **Purpose:** Task/PRD generation using OpenAI models
- **Models:** Supports all OpenAI models (GPT-3.5, GPT-4, etc.)
- **Features:** API key storage, model selection

**OpenRouter**
- **Purpose:** Access to multiple AI models via OpenRouter
- **Models:** GPT-4, Claude, Llama, and more
- **Features:** Model selection, cost tracking

**Replicate**
- **Purpose:** Access to open-source models via Replicate
- **Models:** Various open-source AI models
- **Features:** Model selection, execution tracking

#### API Key Management
- **Secure Storage:** API keys stored in VS Code secrets storage
- **Provider Configuration:** Configure each provider separately
- **Key Validation:** Validates API key format before storing
- **Quick Setup:** Easy provider setup via settings button
- **Clear Keys:** Ability to clear API keys

#### Provider Selection
- **Default Provider:** Configurable default AI provider
- **Model Selection:** Choose specific models per provider
- **Provider Info:** View provider status (configured/not configured)

---

### 8. Task Execution

#### Individual Task Execution

**Claude Code Integration**
- **Claude CLI:** Execute tasks via Claude CLI
- **Prompt Template:** Configurable prompt template
- **Ralph Loop:** Optional Ralph Loop plugin integration
- **Terminal Output:** Execution runs in VS Code/Cursor terminal
- **Status Tracking:** Monitors task status for completion

**Ralph Loop Integration**
- **Autonomous Loops:** Iterative development with Claude
- **Completion Tracking:** Monitors for task completion
- **Iteration Limits:** Configurable max iterations
- **Completion Promise:** Custom completion criteria
- **Command Template:** Configurable ralph command format

#### Batch Execution

**Execute All Feature**
- **Play All Button:** Execute all tasks in "To Do" column
- **Ordered Execution:** Respects drag-and-drop task order
- **Sequential Processing:** Tasks execute one at a time
- **Progress Tracking:** Shows progress (current/total/completed/skipped)
- **Cancel Support:** Can cancel batch execution mid-run

**Batch Execution Features**
- **Queue Management:** Maintains execution queue
- **Status Updates:** Updates task status to "Doing" when executing
- **Completion Detection:** Automatically detects when tasks complete
- **Error Handling:** Skips failed tasks and continues
- **Timeout Protection:** 30-minute timeout per task
- **Notification System:** Shows completion messages

#### Execution Tracking
- **Agent Metadata:** Stores agent execution metadata in task files
- **Claimed By:** Tracks which agent is working on task
- **Execution Time:** Tracks when task was claimed/completed
- **Rejection Tracking:** Tracks task rejections with count
- **Agent Notes:** Stores agent feedback/notes

---

### 9. Task Sorting & Filtering

#### Sorting Options
- **Default Sort:** Order first, then priority
- **Priority Sort:** Sort by priority (High > Medium > Low)
- **Name Sort:** Alphabetical sorting by task name
- **Custom Sort:** Restore original order
- **Per-Column:** Each column maintains its own sort

#### Task Filtering
- **Status Filtering:** Tasks automatically filtered by status column
- **Project Filtering:** Can view tasks from specific projects
- **Type Filtering:** Visual distinction by task type
- **Priority Filtering:** Visual distinction by priority

---

### 10. Configuration & Settings

#### Column Configuration
- **Show/Hide Columns:** Configure which columns to display
- **Column Order:** Fixed column order (Backlog → To Do → Doing → Testing → Done → Blocked)
- **Persistent Settings:** Column preferences saved to workspace settings
- **Quick Toggle:** Toggle columns via settings panel

#### PRD Configuration
- **Base Path:** Configure PRD base path (default: `.agent/PRDS`)
- **Path Resolution:** Supports relative and absolute paths
- **Custom Directories:** Support for custom PRD directory structures

#### AI Configuration
- **Default Provider:** Set default AI provider
- **Default Model:** Set default model per provider
- **Stream Responses:** Toggle streaming for AI responses
- **Provider Settings:** Individual provider configurations

#### Claude Configuration
- **Executable Path:** Path to Claude CLI (default: `claude`)
- **Additional Flags:** Extra flags for Claude CLI
- **Use Ralph Loop:** Toggle Ralph Loop integration
- **Prompt Template:** Custom prompt template for task execution

#### Ralph Loop Configuration
- **Command:** Ralph command to execute (default: `/ralph-loop:ralph-loop`)
- **Max Iterations:** Maximum iterations (default: 5)
- **Completion Promise:** Completion criteria template

#### Skills Configuration
- **Agent Folder Init:** Use agent-folder-init skill
- **Task PRD Creator:** Use task-prd-creator skill
- **Session Documenter:** Use session-documenter skill

#### Cursor Cloud Configuration
- **Repository URL:** GitHub repository URL for PR creation
- **Auto-Create PR:** Automatically create PR on completion

---

### 11. Skills Integration (Claude Code)

#### Available Skills

**agent-folder-init**
- **Purpose:** Scaffold `.agent/` folder structure
- **Integration:** Can be invoked when initializing project
- **Configuration:** `kaiban.skills.useAgentFolderInit`

**task-prd-creator**
- **Purpose:** Create tasks and PRDs via Claude Code
- **Integration:** Invoked when creating tasks/PRDs
- **Configuration:** `kaiban.skills.useTaskPrdCreator`

**session-documenter**
- **Purpose:** Document completed tasks in session files
- **Integration:** Prompted after task completion
- **Configuration:** `kaiban.skills.useSessionDocumenter`

---

### 12. Task File Format

#### Required Fields
- **ID:** Unique task identifier
- **Label:** Task title/name
- **Type:** Feature | Bug | Enhancement | Research
- **Status:** Backlog | To Do | Doing | Testing | Done | Blocked
- **Priority:** High | Medium | Low
- **Created:** Date in YYYY-MM-DD format
- **Updated:** Date in YYYY-MM-DD format

#### Optional Fields
- **Description:** Task description
- **PRD:** Link to PRD file (relative path)
- **Order:** Order within status column (numeric)
- **Claimed-By:** Agent currently working on task
- **Claimed-At:** When task was claimed
- **Completed-At:** When task was completed
- **Rejection-Count:** Number of times task was rejected
- **Agent-Notes:** Notes from agent execution

#### Agent Metadata Fields
- **Agent-Provider:** Provider used for execution
- **Agent-Model:** Model used for execution
- **Agent-Status:** pending | running | completed | error
- **Agent-Branch-Name:** Git branch created by agent
- **Agent-PR-URL:** Pull Request URL
- **Agent-Tokens-Used:** Token usage count
- **Agent-Cost:** Execution cost

---

### 13. User Interface Features

#### Board Interface
- **Settings Button:** Access configuration options
- **Refresh Button:** Reload tasks from files
- **Create Task Button:** Quick task creation
- **Sort Selector:** Change sorting method
- **Progress Banner:** Shows batch execution progress
- **PRD Panel:** Collapsible PRD preview panel

#### Task Cards
- **Drag Handle:** Drag to reorder or move tasks
- **Play Button:** Execute individual task
- **Rate Limit Button:** Set rate limit wait timer
- **Agent Badge:** Shows which agent is working
- **Provider Badge:** Shows AI provider
- **Rejection Badge:** Shows rejection count
- **Status Indicator:** Visual status display

#### Interactive Elements
- **Click Actions:** Click card to preview PRD
- **Double-Click Actions:** Double-click to open file
- **Drag-and-Drop:** Move tasks between columns
- **Hover Effects:** Visual feedback on hover
- **Loading States:** Loading indicators for async operations

---

### 14. File System Integration

#### Automatic Folder Detection
- **.agent Folder:** Automatically detects `.agent/` folder
- **Initialization:** Offers to create folder structure if missing
- **Subfolder Creation:** Creates TASKS, PRDS, SESSIONS, SYSTEM folders
- **Basic Templates:** Creates basic template files

#### File Watching
- **Change Detection:** Watches for task file changes
- **Auto-Refresh:** Automatically refreshes board on file changes
- **Completion Detection:** Detects when tasks are marked as done
- **Status Sync:** Syncs status between task and PRD files

#### File Operations
- **Read Operations:** Reads task and PRD files
- **Write Operations:** Updates task status and metadata
- **Path Resolution:** Resolves relative paths correctly
- **Error Handling:** Gracefully handles missing files

---

### 15. Commands

#### Available Commands

**kaiban.showBoard**
- **Description:** Open the Kanban board
- **Icon:** $(kanban)
- **Shortcut:** None

**kaiban.refreshBoard**
- **Description:** Refresh the board with latest tasks
- **Icon:** $(refresh)
- **Shortcut:** None

**kaiban.configureProviders**
- **Description:** Configure AI providers
- **Icon:** $(settings-gear)
- **Shortcut:** None

**kaiban.setApiKey**
- **Description:** Set API key for a provider
- **Icon:** $(key)
- **Shortcut:** None

**kaiban.clearApiKey**
- **Description:** Clear API key for a provider
- **Icon:** $(trash)
- **Shortcut:** None

**kaiban.configurePRDPath**
- **Description:** Configure PRD base path and settings
- **Icon:** $(folder)
- **Shortcut:** None

**kaiban.createPRD**
- **Description:** Create a new PRD file
- **Icon:** $(file-text)
- **Shortcut:** None

**kaiban.createTask**
- **Description:** Create a new task file
- **Icon:** $(tasklist)
- **Shortcut:** None

#### Cursor Chat Commands
- **@kaiban.createPRD:** Create PRD from chat
- **@kaiban.createTask:** Create task from chat

---

### 16. Extension Requirements

#### Cursor IDE Required
- **Not VS Code:** Extension only works in Cursor IDE
- **Version Check:** Checks for Cursor on activation
- **Error Handling:** Shows error message if not in Cursor
- **Download Link:** Provides link to download Cursor

#### Workspace Requirements
- **.agent Folder:** Requires `.agent/TASKS/` directory
- **Markdown Files:** Task files must be `.md` format
- **Task Format:** Tasks must follow structured markdown format
- **Optional PRD:** PRD files are optional but recommended

#### Optional Requirements
- **Claude Code:** Required for Ralph Loop integration
- **ralph-wiggum Plugin:** Required for Ralph Loop feature
- **Cursor API Key:** Required for Cursor Cloud Agent
- **AI Provider Keys:** Required for AI-assisted generation

---

### 17. Error Handling & Edge Cases

#### Error Handling
- **File Errors:** Gracefully handles missing or invalid files
- **API Errors:** Handles API failures with fallback options
- **Network Errors:** Handles network failures gracefully
- **Validation Errors:** Validates inputs before processing

#### Edge Cases
- **Missing Fields:** Handles missing optional fields
- **Invalid Status:** Validates status values
- **Empty Columns:** Handles empty columns gracefully
- **Duplicate Orders:** Falls back to priority when orders match
- **Missing PRDs:** Handles missing PRD files
- **Invalid Paths:** Resolves paths correctly even when invalid

#### Backward Compatibility
- **Old Format:** Supports tasks without order field
- **Missing Metadata:** Defaults missing fields appropriately
- **Legacy Tasks:** Handles tasks with old format

---

### 18. Performance & Optimization

#### Performance Features
- **Lazy Loading:** Loads PRDs only when requested
- **Efficient Parsing:** Fast markdown parsing
- **Caching:** Caches parsed tasks
- **Debouncing:** Debounces refresh operations

#### Scalability
- **Large Workspaces:** Handles workspaces with many tasks
- **Recursive Scanning:** Efficiently scans deep directory structures
- **Memory Efficient:** Optimized memory usage
- **Fast Rendering:** Quick board rendering even with many tasks

---

## Technical Architecture

### File Structure
```
src/
├── adapters/          # AI provider adapters
├── config/            # Configuration management
├── services/          # Business logic services
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
├── extension.ts       # Extension entry point
├── kanbanView.ts      # Main board view provider
└── taskParser.ts      # Task file parser
```

### Key Components
- **KanbanViewProvider:** Main view provider for the board
- **TaskParser:** Parses markdown task files
- **ProviderRegistry:** Manages AI provider adapters
- **ApiKeyManager:** Manages secure API key storage
- **SkillService:** Integrates with Claude Code skills

---

## Future Enhancements (Potential)

### Planned Features
- Search and filter tasks
- Task tagging system
- Task dependencies visualization
- Time tracking integration
- Export/import functionality
- Keyboard shortcuts
- Task templates
- Bulk operations
- Analytics dashboard
- Integration with external tools

---

## Changelog

### Recent Additions
- **Task Ordering:** Per-column task ordering with drag-and-drop (2026-01-09)
- **Batch Execution:** Execute all tasks in order (2026-01-09)
- **Order Persistence:** Order stored in task files (2026-01-09)

---

## Documentation References

- **README.md:** Main project documentation
- **QUICKSTART.md:** Quick start guide
- **DEVELOPMENT.md:** Development setup guide
- **CONTRIBUTING.md:** Contribution guidelines

---

*Last reviewed: 2026-01-09*
