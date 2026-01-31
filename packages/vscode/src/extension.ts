import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { KanbanViewProvider } from "./kanbanView";
import { ChangelogService } from "./services/changelogService";
import { PRDInterviewService } from "./services/prdInterviewService";
import { SkillService } from "./services/skillService";
import { TerminalService } from "./services/terminalService";
import { TaskParser } from "./taskParser";
import type { ChangelogFormat } from "./types/changelog";
import { getPRDBasePath, getTasksBasePath, getWorkspaceFolder } from "./utils/fileUtils";

let kanbanView: KanbanViewProvider;

export function activate(context: vscode.ExtensionContext) {
  // Check if running in Cursor (not VS Code)
  const appName = vscode.env.appName.toLowerCase();
  const isCursor = appName.includes("cursor");

  if (!isCursor) {
    vscode.window
      .showErrorMessage(
        "Kaiban Board requires Cursor IDE. This extension is not compatible with VS Code. Please install Cursor IDE from https://cursor.com",
        "Download Cursor"
      )
      .then((selection) => {
        if (selection === "Download Cursor") {
          vscode.env.openExternal(vscode.Uri.parse("https://cursor.com"));
        }
      });
    // Don't activate the extension - return early
    console.error("Kaiban Board: Extension requires Cursor IDE. Activation aborted.");
    return;
  }

  console.log("Kaiban Board extension activated");

  const terminalService = new TerminalService();
  kanbanView = new KanbanViewProvider(context, terminalService);

  // Register command to show board
  const showBoardCommand = vscode.commands.registerCommand("kaiban.showBoard", async () => {
    try {
      await kanbanView.show();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to show Kaiban board: ${error}`);
    }
  });

  // Register command to refresh board
  const refreshBoardCommand = vscode.commands.registerCommand("kaiban.refreshBoard", async () => {
    try {
      await kanbanView.refresh();
      vscode.window.showInformationMessage("Kaiban board refreshed");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to refresh board: ${error}`);
    }
  });

  // Register command to create PRD via Claude CLI interview
  const prdInterviewService = new PRDInterviewService();
  const createPRDCommand = vscode.commands.registerCommand("kaiban.createPRD", async () => {
    try {
      // Ask user for PRD name
      const prdName = await vscode.window.showInputBox({
        prompt: "Enter the PRD name or topic",
        placeHolder: "e.g., User Authentication System",
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "PRD name cannot be empty";
          }
          return null;
        },
      });

      if (!prdName) {
        return; // User cancelled
      }

      // Start the interview process
      await prdInterviewService.startInterview({
        name: prdName.trim(),
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start PRD creation: ${error}`);
    }
  });

  // Register command to create Task via Claude CLI
  const createTaskCommand = vscode.commands.registerCommand("kaiban.createTask", async () => {
    try {
      const workspaceFolder = getWorkspaceFolder();
      if (!workspaceFolder) {
        vscode.window.showErrorMessage("No workspace folder open");
        return;
      }

      // Get Claude CLI configuration
      const config = vscode.workspace.getConfiguration("kaiban");
      const claudePath = config.get<string>("claude.executablePath", "claude");
      const additionalFlags = config.get<string>("claude.additionalFlags", "");
      const tasksBasePath = getTasksBasePath(workspaceFolder);
      const prdBasePath = getPRDBasePath(workspaceFolder);

      // Build the prompt for Claude to interactively create a Task
      const prompt = `Help me create a Task for my Kanban board.

Ask me the following questions one at a time:
1. What is the task title?
2. What is the task description?
3. What type is it? (Feature, Bug, Enhancement, or Research)
4. What priority? (High, Medium, or Low)
5. What status should it start in? (Backlog, Planning, In Progress, AI Review, Human Review, Done, Archived, or Blocked)
6. Should this task be linked to an existing PRD? If so, which one? (Check ${prdBasePath} for existing PRDs)

After gathering all information, create a task file at ${tasksBasePath}/<slug-based-on-title>.md with this exact structure:

## Task: <Title>

**ID:** task-<timestamp>
**Label:** <Title>
**Description:** <Description>
**Type:** <Type>
**Status:** <Status>
**Priority:** <Priority>
**Created:** <YYYY-MM-DD>
**Updated:** <YYYY-MM-DD>
**PRD:** [Link](<relative-path-to-prd>) or empty if no PRD

---

## Additional Notes

<Any additional context or notes>

Important: Create the directory if it doesn't exist. Use a kebab-case filename based on the title. Generate a unique task ID using the current timestamp.`;

      // Build command
      const flags = additionalFlags ? `${additionalFlags} ` : "";
      const fullCommand = `${claudePath} ${flags}"${prompt.replace(/"/g, '\\"')}"`;

      // Get workspace path for terminal cwd
      const cwd = workspaceFolder.uri.fsPath;

      // Create terminal
      const terminal = vscode.window.createTerminal({
        name: "Claude: Create Task",
        cwd: cwd,
      });

      terminal.show();
      terminal.sendText(fullCommand);

      vscode.window.showInformationMessage(
        "Claude CLI opened - follow the prompts to create your task"
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start task creation: ${error}`);
    }
  });

  // Register command to configure board settings
  const configureCommand = vscode.commands.registerCommand("kaiban.configure", async () => {
    const allValidColumns = [
      "Backlog",
      "Planning",
      "In Progress",
      "AI Review",
      "Human Review",
      "Done",
      "Archived",
      "Blocked",
    ];
    const columnsConfig = vscode.workspace.getConfiguration("kaiban.columns");
    const prdConfig = vscode.workspace.getConfiguration("kaiban.prd");
    const taskConfig = vscode.workspace.getConfiguration("kaiban.task");

    // Show quick pick for configuration options
    const configOption = await vscode.window.showQuickPick(
      [
        {
          label: "Configure Pipeline",
          description: "Configure AI review pipeline settings (Claude → Codex Review → Done)",
          option: "pipeline",
        },
        {
          label: "Configure CLI Provider",
          description: "Select default CLI for task execution (Claude, Codex, Cursor)",
          option: "cli",
        },
        {
          label: "Configure Columns",
          description: "Select which columns to display on the Kanban board",
          option: "columns",
        },
        {
          label: "Configure PRD Base Path",
          description: "Set the base path for PRD files",
          option: "prd",
        },
        {
          label: "Configure Task Base Path",
          description: "Set the base path for task files",
          option: "task",
        },
      ],
      {
        placeHolder: "Select a configuration option",
      }
    );

    if (!configOption) return;

    if (configOption.option === "pipeline") {
      // Configure Pipeline settings
      const pipelineConfig = vscode.workspace.getConfiguration("kaiban.pipeline");

      const pipelineSetting = await vscode.window.showQuickPick(
        [
          {
            label: "Enable/Disable Pipeline",
            description: `Currently: ${pipelineConfig.get<boolean>("enabled", true) ? "Enabled" : "Disabled"}`,
            setting: "enabled",
          },
          {
            label: "Auto-Review on AI Review",
            description: `Currently: ${pipelineConfig.get<boolean>("autoReviewOnAIReview", true) ? "Yes" : "No"}`,
            setting: "autoReview",
          },
          {
            label: "On Review Fail Action",
            description: `Currently: ${pipelineConfig.get<string>("onReviewFail", "auto-retry")}`,
            setting: "onFail",
          },
          {
            label: "Max Retry Iterations",
            description: `Currently: ${pipelineConfig.get<number>("maxRetryIterations", 2)}`,
            setting: "maxRetries",
          },
        ],
        { placeHolder: "Select pipeline setting to configure" }
      );

      if (!pipelineSetting) return;

      if (pipelineSetting.setting === "enabled") {
        const current = pipelineConfig.get<boolean>("enabled", true);
        const choice = await vscode.window.showQuickPick(
          [
            {
              label: "Enable",
              description: "Tasks go through AI Review before Done",
              picked: current,
            },
            { label: "Disable", description: "Tasks go directly to Done", picked: !current },
          ],
          { placeHolder: "Enable or disable the AI review pipeline" }
        );
        if (choice) {
          await pipelineConfig.update(
            "enabled",
            choice.label === "Enable",
            vscode.ConfigurationTarget.Workspace
          );
          vscode.window.showInformationMessage(
            `Pipeline ${choice.label === "Enable" ? "enabled" : "disabled"}`
          );
        }
      } else if (pipelineSetting.setting === "autoReview") {
        const current = pipelineConfig.get<boolean>("autoReviewOnAIReview", true);
        const choice = await vscode.window.showQuickPick(
          [
            {
              label: "Yes",
              description: "Auto-start Codex review when task enters AI Review",
              picked: current,
            },
            { label: "No", description: "Manually trigger reviews", picked: !current },
          ],
          { placeHolder: "Auto-trigger review when task moves to AI Review?" }
        );
        if (choice) {
          await pipelineConfig.update(
            "autoReviewOnAIReview",
            choice.label === "Yes",
            vscode.ConfigurationTarget.Workspace
          );
          vscode.window.showInformationMessage(
            `Auto-review ${choice.label === "Yes" ? "enabled" : "disabled"}`
          );
        }
      } else if (pipelineSetting.setting === "onFail") {
        const current = pipelineConfig.get<string>("onReviewFail", "auto-retry");
        const choice = await vscode.window.showQuickPick(
          [
            {
              label: "auto-retry",
              description: "Re-run Claude with review feedback",
              picked: current === "auto-retry",
            },
            {
              label: "human-review",
              description: "Move to Human Review column",
              picked: current === "human-review",
            },
          ],
          { placeHolder: "What to do when AI review fails?" }
        );
        if (choice) {
          await pipelineConfig.update(
            "onReviewFail",
            choice.label,
            vscode.ConfigurationTarget.Workspace
          );
          vscode.window.showInformationMessage(`On review fail: ${choice.label}`);
        }
      } else if (pipelineSetting.setting === "maxRetries") {
        const current = pipelineConfig.get<number>("maxRetryIterations", 2);
        const input = await vscode.window.showInputBox({
          prompt: "Maximum retry iterations before moving to Human Review",
          value: String(current),
          validateInput: (v) => {
            const num = parseInt(v, 10);
            if (Number.isNaN(num) || num < 1 || num > 5) return "Enter a number between 1 and 5";
            return null;
          },
        });
        if (input) {
          await pipelineConfig.update(
            "maxRetryIterations",
            parseInt(input, 10),
            vscode.ConfigurationTarget.Workspace
          );
          vscode.window.showInformationMessage(`Max retries set to ${input}`);
        }
      }
    } else if (configOption.option === "cli") {
      // Configure CLI Provider
      const cliConfig = vscode.workspace.getConfiguration("kaiban.cli");
      const current = cliConfig.get<string>("defaultProvider", "auto");

      const choice = await vscode.window.showQuickPick(
        [
          {
            label: "auto",
            description: "Auto-select first available (Claude > Codex > Cursor)",
            picked: current === "auto",
          },
          {
            label: "claude",
            description: "Use Claude CLI for task execution",
            picked: current === "claude",
          },
          {
            label: "codex",
            description: "Use Codex CLI for task execution",
            picked: current === "codex",
          },
          {
            label: "cursor",
            description: "Use Cursor CLI for task execution",
            picked: current === "cursor",
          },
        ],
        { placeHolder: "Select default CLI provider for task execution" }
      );

      if (choice) {
        await cliConfig.update(
          "defaultProvider",
          choice.label,
          vscode.ConfigurationTarget.Workspace
        );
        vscode.window.showInformationMessage(`Default CLI provider set to: ${choice.label}`);
      }
    } else if (configOption.option === "columns") {
      // Configure columns
      const currentColumns = columnsConfig.get<string[]>("enabled", [
        "Backlog",
        "Planning",
        "In Progress",
        "AI Review",
        "Human Review",
        "Done",
      ]);

      const columnItems = allValidColumns.map((col) => ({
        label: col,
        picked: currentColumns.includes(col),
      }));

      const selected = await vscode.window.showQuickPick(columnItems, {
        placeHolder: "Select columns to display (use Ctrl/Cmd+Click to select multiple)",
        canPickMany: true,
      });

      if (selected !== undefined) {
        const selectedColumns = selected.map((item) => item.label);
        if (selectedColumns.length > 0) {
          await columnsConfig.update(
            "enabled",
            selectedColumns,
            vscode.ConfigurationTarget.Workspace
          );
          // Manually refresh the board immediately
          await kanbanView.refresh();
          vscode.window.showInformationMessage(`Columns updated: ${selectedColumns.join(", ")}`);
        } else {
          vscode.window.showWarningMessage("At least one column must be selected.");
        }
      }
    } else if (configOption.option === "prd") {
      // Configure PRD path
      const currentPath = prdConfig.get<string>("basePath", ".agent/PRDS");

      const newPath = await vscode.window.showInputBox({
        prompt: "Enter the base path for PRD files (relative to workspace root)",
        value: currentPath,
        placeHolder: ".agent/PRDS",
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "Path cannot be empty";
          }
          const cleanPath = value.trim().replace(/^\/+|\/+$/g, "");
          if (cleanPath.length === 0) {
            return "Invalid path";
          }
          return null;
        },
      });

      if (newPath !== undefined) {
        const cleanPath = newPath.trim().replace(/^\/+|\/+$/g, "");
        await prdConfig.update("basePath", cleanPath, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(
          `PRD base path updated to: ${cleanPath}. Refresh the board to apply changes.`
        );
      }
    } else if (configOption.option === "task") {
      // Configure Task path
      const currentPath = taskConfig.get<string>("basePath", ".agent/TASKS");

      const newPath = await vscode.window.showInputBox({
        prompt: "Enter the base path for task files (relative to workspace root)",
        value: currentPath,
        placeHolder: ".agent/TASKS",
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return "Path cannot be empty";
          }
          const cleanPath = value.trim().replace(/^\/+|\/+$/g, "");
          if (cleanPath.length === 0) {
            return "Invalid path";
          }
          return null;
        },
      });

      if (newPath !== undefined) {
        const cleanPath = newPath.trim().replace(/^\/+|\/+$/g, "");
        await taskConfig.update("basePath", cleanPath, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(
          `Task base path updated to: ${cleanPath}. Refresh the board to apply changes.`
        );
      }
    }
  });

  // Register command to import GitHub issues
  const importGitHubIssuesCommand = vscode.commands.registerCommand(
    "kaiban.importGitHubIssues",
    async () => {
      try {
        if (kanbanView) {
          // Trigger the import via the kanban view
          await kanbanView.show();
          // The webview will handle the import via message passing
          vscode.window.showInformationMessage(
            "Open the Kaiban Board and use the GitHub import feature"
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to import GitHub issues: ${error}`);
      }
    }
  );

  // Register command to create PR from task
  const createPRFromTaskCommand = vscode.commands.registerCommand(
    "kaiban.createPRFromTask",
    async () => {
      try {
        if (kanbanView) {
          await kanbanView.show();
          vscode.window.showInformationMessage("Select a task in the Kaiban Board to create a PR");
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to create PR: ${error}`);
      }
    }
  );

  // Register command to generate changelog
  const generateChangelogCommand = vscode.commands.registerCommand(
    "kaiban.generateChangelog",
    async () => {
      try {
        const workspaceFolder = getWorkspaceFolder();
        if (!workspaceFolder) {
          vscode.window.showErrorMessage("No workspace folder open");
          return;
        }

        const workspacePath = workspaceFolder.uri.fsPath;
        const changelogService = new ChangelogService(workspacePath);
        const taskParser = new TaskParser();

        // Get available tags
        const tags = await changelogService.getAllTags();
        const tagItems = [
          { label: "All completed tasks", value: undefined },
          ...tags.map((tag) => ({ label: `Since ${tag}`, value: tag })),
        ];

        // Ask user for starting point
        const sinceSelection = await vscode.window.showQuickPick(tagItems, {
          placeHolder: "Generate changelog since...",
        });

        if (sinceSelection === undefined) return;

        // Ask for format
        const formatSelection = await vscode.window.showQuickPick(
          [
            { label: "Keep a Changelog (Recommended)", value: "keepachangelog" },
            { label: "Simple Markdown", value: "markdown" },
            { label: "JSON", value: "json" },
          ],
          { placeHolder: "Select output format" }
        );

        if (!formatSelection) return;

        // Ask for version (optional)
        const version = await vscode.window.showInputBox({
          prompt: "Version number (leave empty for Unreleased)",
          placeHolder: "1.0.0",
        });

        // Ask if dry run
        const actionSelection = await vscode.window.showQuickPick(
          [
            { label: "Write to CHANGELOG.md", value: false },
            { label: "Preview only (dry run)", value: true },
          ],
          { placeHolder: "Select action" }
        );

        if (actionSelection === undefined) return;

        // Parse tasks and generate changelog
        const tasks = taskParser.parseTasks();
        const result = await changelogService.generateChangelog(tasks, {
          since: sinceSelection.value,
          format: formatSelection.value as ChangelogFormat,
          version: version || undefined,
          dryRun: actionSelection.value,
          outputPath: "CHANGELOG.md",
        });

        if (result.success) {
          if (result.entryCount === 0) {
            vscode.window.showWarningMessage(result.error || "No completed tasks found");
          } else if (actionSelection.value) {
            // Show preview in new document
            const doc = await vscode.workspace.openTextDocument({
              content: result.content,
              language: formatSelection.value === "json" ? "json" : "markdown",
            });
            await vscode.window.showTextDocument(doc, { preview: true });
            vscode.window.showInformationMessage(`Preview: ${result.entryCount} entries generated`);
          } else {
            // Open the changelog file
            const changelogPath = vscode.Uri.file(path.join(workspacePath, "CHANGELOG.md"));
            const doc = await vscode.workspace.openTextDocument(changelogPath);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(
              `Changelog updated with ${result.entryCount} entries`
            );
          }
        } else {
          vscode.window.showErrorMessage(`Failed to generate changelog: ${result.error}`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate changelog: ${error}`);
      }
    }
  );

  context.subscriptions.push(
    showBoardCommand,
    refreshBoardCommand,
    configureCommand,
    createPRDCommand,
    createTaskCommand,
    importGitHubIssuesCommand,
    createPRFromTaskCommand,
    generateChangelogCommand
  );

  // Show welcome message
  vscode.window
    .showInformationMessage(
      'Kaiban Board is ready! Use "Kaiban: Show Board" command to open.',
      "Open Board"
    )
    .then((selection) => {
      if (selection === "Open Board") {
        vscode.commands.executeCommand("kaiban.showBoard");
      }
    });

  // Check for .agent folder and offer to initialize
  checkAgentFolderInit(context);
}

/**
 * Check if .agent folder exists and offer to create it
 */
async function checkAgentFolderInit(_context: vscode.ExtensionContext) {
  const workspaceFolder = getWorkspaceFolder();
  if (!workspaceFolder) return;

  const agentPath = path.join(workspaceFolder.uri.fsPath, ".agent");
  const skillService = new SkillService();
  const skillSettings = skillService.getSettings();

  // Required subfolders
  const requiredFolders = ["TASKS", "PRDS", "SESSIONS", "SYSTEM"];

  if (!fs.existsSync(agentPath)) {
    // No .agent folder - offer to create
    const result = await vscode.window.showInformationMessage(
      "No .agent folder found. Initialize project structure for Kaiban Board?",
      "Initialize",
      "Skip"
    );

    if (result === "Initialize") {
      if (skillSettings.useAgentFolderInit) {
        // Use skill via Claude CLI
        const projectName = path.basename(workspaceFolder.uri.fsPath);
        await skillService.runAgentFolderInit(projectName);
        vscode.window.showInformationMessage("Running agent-folder-init via Claude CLI...");
      } else {
        // Create basic structure directly
        await createBasicAgentStructure(agentPath, requiredFolders);
        vscode.window.showInformationMessage(".agent folder structure created successfully!");
      }
    }
  } else {
    // .agent exists - check for missing subfolders
    const missing = requiredFolders.filter((f) => !fs.existsSync(path.join(agentPath, f)));

    if (missing.length > 0) {
      const result = await vscode.window.showInformationMessage(
        `Missing .agent subfolders: ${missing.join(", ")}. Create them?`,
        "Create",
        "Skip"
      );

      if (result === "Create") {
        for (const folder of missing) {
          fs.mkdirSync(path.join(agentPath, folder), { recursive: true });
        }
        vscode.window.showInformationMessage(`Created missing folders: ${missing.join(", ")}`);
      }
    }
  }
}

/**
 * Create basic .agent folder structure
 */
async function createBasicAgentStructure(agentPath: string, folders: string[]): Promise<void> {
  try {
    fs.mkdirSync(agentPath, { recursive: true });

    for (const folder of folders) {
      fs.mkdirSync(path.join(agentPath, folder), { recursive: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to create agent folder structure: ${message}`);
  }

  try {
    const claudeMdPath = path.join(path.dirname(agentPath), "CLAUDE.md");
    if (!fs.existsSync(claudeMdPath)) {
      const claudeMdContent = `# ${path.basename(path.dirname(agentPath))}

Claude-specific entry point. Documentation in \`.agent/\`.

## Commands

Check \`.agent/SYSTEM/RULES.md\` for coding standards.

## Sessions

Document all work in \`.agent/SESSIONS/YYYY-MM-DD.md\` (one file per day).
`;
      fs.writeFileSync(claudeMdPath, claudeMdContent, "utf-8");
    }

    const rulesPath = path.join(agentPath, "SYSTEM", "RULES.md");
    const rulesContent = `# Coding Standards

## General

- Follow existing code patterns
- Write clean, readable code
- Add comments for complex logic

## Testing

- Test all new features
- Run tests before committing

## Documentation

- Document public APIs
- Update README for major changes
`;
    fs.writeFileSync(rulesPath, rulesContent, "utf-8");

    const templatePath = path.join(agentPath, "SESSIONS", "TEMPLATE.md");
    const templateContent = `# Sessions: YYYY-MM-DD

**Summary:** Brief 3-5 word summary

---

## Session 1: Brief Description

**Duration:** ~X hours
**Status:** Complete / In Progress

### What was done

- Task 1
- Task 2

### Files changed

- \`path/to/file.ts\` - what changed

### Decisions

- **Decision:** What was decided
  - **Context:** Why this was needed
  - **Rationale:** Why this choice

### Next steps

- [ ] Next task 1
- [ ] Next task 2

---

**Total sessions today:** 1
`;
    fs.writeFileSync(templatePath, templateContent, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Failed to create template files: ${message}`);
  }
}

export function deactivate() {
  if (kanbanView) {
    kanbanView.dispose();
  }
  console.log("Kaiban Board extension deactivated");
}
