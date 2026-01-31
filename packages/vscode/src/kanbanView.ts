import * as path from "node:path";
import * as vscode from "vscode";
import { AIMergeService } from "./services/aiMergeService";
import { ClaudeCodeQuotaService } from "./services/claudeCodeQuotaService";
import { CLIDetectionService } from "./services/cliDetectionService";
import { CodexQuotaService } from "./services/codexQuotaService";
import { CodexReviewService } from "./services/codexReviewService";
import { GitHubService } from "./services/githubService";
import { GitService } from "./services/gitService";
import { GitWorktreeService } from "./services/gitWorktreeService";
import { PRDInterviewService } from "./services/prdInterviewService";
import { SkillService } from "./services/skillService";
import { TerminalService } from "./services/terminalService";
import { TranscriptMonitorService } from "./services/transcriptMonitorService";
import { type Task, TaskParser } from "./taskParser";
import type { QuotaDisplayData } from "./types/claudeQuota";
import { formatResetTime, getQuotaStatus } from "./types/claudeQuota";
import type { ClaudeStepProgress } from "./types/claudeTranscript";
import type { CLIAvailabilityStatus, CLIProviderName, CLISelectionMode } from "./types/cli";
import { getCLIDisplayName } from "./types/cli";
import type { CodexQuotaDisplayData } from "./types/codexQuota";
import { formatCodexResetTime, getCodexQuotaStatus } from "./types/codexQuota";
import type { GitHubIssue } from "./types/github";
import type { MergeState } from "./types/merge";
import type { CodexReviewResult, ReviewState } from "./types/review";
import type { WorktreeConfig } from "./types/worktree";
import { Icons } from "./utils/lucideIcons";

export class KanbanViewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private taskParser: TaskParser;
  private skillService: SkillService;
  private prdInterviewService: PRDInterviewService;
  private quotaService: ClaudeCodeQuotaService;
  private codexQuotaService: CodexQuotaService;
  private cliDetectionService: CLIDetectionService;
  private transcriptMonitorService: TranscriptMonitorService;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private skipNextConfigRefresh = false;
  private quotaRefreshInterval: NodeJS.Timeout | undefined;
  private cachedCLIStatus: CLIAvailabilityStatus | null = null;
  private terminalService: TerminalService;

  // New services for Auto-Claude features
  private gitWorktreeService: GitWorktreeService | null = null;
  private githubService: GitHubService | null = null;
  private gitService: GitService | null = null;
  private aiMergeService: AIMergeService | null = null;
  private codexReviewService: CodexReviewService | null = null;

  // Worktree and merge state
  private activeMergeStates: Map<string, MergeState> = new Map();
  private activeReviewStates: Map<string, ReviewState> = new Map();

  // Batch execution state
  private batchExecutionQueue: string[] = [];
  private currentBatchIndex = 0;
  private isBatchExecuting = false;
  private batchExecutionCancelled = false;
  private batchCompletedCount = 0;
  private batchSkippedCount = 0;

  // Pipeline orchestration state
  private pipelineRetryCount: Map<string, number> = new Map();

  constructor(
    private context: vscode.ExtensionContext,
    terminalService?: TerminalService
  ) {
    this.taskParser = new TaskParser();
    this.skillService = new SkillService();
    this.prdInterviewService = new PRDInterviewService();
    this.quotaService = new ClaudeCodeQuotaService();
    this.codexQuotaService = new CodexQuotaService();
    this.cliDetectionService = new CLIDetectionService();
    this.transcriptMonitorService = new TranscriptMonitorService();
    this.terminalService = terminalService || new TerminalService();

    // Initialize workspace-dependent services
    this.initializeWorkspaceServices();

    // Listen for configuration changes to auto-refresh board
    vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (e.affectsConfiguration("kaiban.columns.enabled")) {
          // Skip refresh if the change came from the webview (UI already updated)
          if (this.skipNextConfigRefresh) {
            this.skipNextConfigRefresh = false;
            return;
          }
          // Auto-refresh the board when columns change from external source
          this.refresh();
        }
      },
      null,
      this.context.subscriptions
    );
  }

  /**
   * Initialize workspace-dependent services.
   * Called when workspace folders are available.
   */
  private initializeWorkspaceServices(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;

    // Get worktree configuration
    const config = vscode.workspace.getConfiguration("kaiban.worktree");
    const worktreeConfig: WorktreeConfig = {
      enabled: config.get<boolean>("enabled", false),
      basePath: config.get<string>("basePath", ".worktrees"),
      branchPrefix: config.get<string>("branchPrefix", "task/"),
      defaultBaseBranch: config.get<string>("defaultBaseBranch", "main"),
      autoCleanup: config.get<boolean>("autoCleanup", true),
    };

    // Initialize services
    this.gitWorktreeService = new GitWorktreeService(workspacePath, worktreeConfig);
    this.githubService = new GitHubService(workspacePath);
    this.gitService = new GitService(workspacePath);
    this.aiMergeService = new AIMergeService(workspacePath);
    this.codexReviewService = new CodexReviewService(workspacePath);
  }

  /**
   * Dispose all resources held by this provider.
   * Called when the extension is deactivated.
   */
  public dispose(): void {
    // Clear quota refresh interval
    if (this.quotaRefreshInterval) {
      clearInterval(this.quotaRefreshInterval);
      this.quotaRefreshInterval = undefined;
    }

    // Clear all polling intervals
    for (const [, interval] of this.pollingIntervals) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();

    // Dispose all CLI terminals
    for (const [, terminal] of this.claudeTerminals) {
      terminal.dispose();
    }
    this.claudeTerminals.clear();

    // Dispose all review terminals
    for (const [, terminal] of this.reviewTerminals) {
      terminal.dispose();
    }
    this.reviewTerminals.clear();

    // Dispose all file watchers
    for (const [, watcher] of this.completionWatchers) {
      watcher.dispose();
    }
    this.completionWatchers.clear();

    // Clear completion pollers
    for (const [, timeout] of this.completionPollers) {
      clearTimeout(timeout);
    }
    this.completionPollers.clear();

    // Dispose embedded terminal processes
    this.terminalService.dispose();

    // Dispose transcript monitors
    this.transcriptMonitorService.dispose();

    // Dispose panel if exists
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
  }

  public async show() {
    if (this.panel) {
      this.panel.reveal();
      await this.refresh();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "kaibanBoard",
      "Kaiban Board",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "media")],
      }
    );

    this.panel.onDidDispose(() => {
      this.terminalService.setWebviewPanel(null);
      this.panel = undefined;
    });

    // Wire terminal service to webview
    this.terminalService.setWebviewPanel(this.panel);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "openTask":
            await this.openTaskFile(message.filePath);
            break;
          case "refresh":
            await this.refresh();
            break;
          case "openSettings":
            await vscode.commands.executeCommand("kaiban.configure");
            break;
          case "openExtensionSettings":
            await vscode.commands.executeCommand("workbench.action.openSettings", "kaiban");
            break;
          case "loadPRD":
            await this.loadPRDContent(message.prdPath, message.taskFilePath);
            break;
          case "updateTaskStatus":
            await this.updateTaskStatus(message.taskId, message.newStatus);
            break;
          case "updateTaskOrder":
            await this.handleUpdateTaskOrder(
              message.taskId,
              message.order,
              message.newStatus,
              message.startExecution,
              message.stopExecution
            );
            break;
          case "saveColumnSettings":
            await this.saveColumnSettings(message.columns);
            break;
          case "executeRalphCommand":
            await this.handleExecuteRalphCommand(message.taskId);
            break;
          case "executeViaClaude":
            await this.handleExecuteViaClaude(message.taskId);
            break;
          case "stopClaudeExecution":
            await this.handleStopClaudeExecution(message.taskId);
            break;
          case "createTask":
            await vscode.commands.executeCommand("kaiban.createTask");
            break;
          case "createPRD":
            await this.handleCreatePRD(message.taskId, message.prdPath);
            break;
          case "editPRD":
            await this.handleEditPRD(message.prdPath);
            break;
          case "getPrdRawContent":
            await this.handleGetPrdRawContent(message.prdPath);
            break;
          case "savePrdContent":
            await this.handleSavePrdContent(message.prdPath, message.content);
            break;
          case "updateTask":
            await this.handleUpdateTask(message.taskId, message.updates);
            break;
          case "startBatchExecution":
            await this.handleStartBatchExecution(message.taskIds);
            break;
          case "cancelBatchExecution":
            await this.handleCancelBatchExecution();
            break;
          case "getClaudeQuota":
            await this.handleGetClaudeQuota();
            break;
          case "refreshClaudeQuota":
            await this.handleRefreshClaudeQuota();
            break;
          case "getCodexQuota":
            await this.handleGetCodexQuota();
            break;
          case "refreshCodexQuota":
            await this.handleRefreshCodexQuota();
            break;
          case "getCLIStatus":
            await this.handleGetCLIStatus();
            break;
          case "refreshCLIStatus":
            await this.handleRefreshCLIStatus();
            break;
          case "executeViaCLI":
            await this.handleExecuteViaCLI(message.taskId, message.cliProvider);
            break;
          // GitHub integration handlers
          case "getGitHubStatus":
            await this.handleGetGitHubStatus();
            break;
          case "importGitHubIssues":
            await this.handleImportGitHubIssues(message.options);
            break;
          case "createPRFromTask":
            await this.handleCreatePRFromTask(message.taskId, message.options);
            break;
          case "openGitHubIssue":
            await this.handleOpenGitHubIssue(message.url);
            break;
          // Worktree handlers
          case "getWorktreeStatus":
            await this.handleGetWorktreeStatus(message.taskId);
            break;
          case "createWorktreeForTask":
            await this.handleCreateWorktreeForTask(message.taskId);
            break;
          case "removeWorktreeForTask":
            await this.handleRemoveWorktreeForTask(message.taskId);
            break;
          // Merge handlers
          case "startMerge":
            await this.handleStartMerge(message.taskId, message.options);
            break;
          case "getMergeStatus":
            await this.handleGetMergeStatus(message.taskId);
            break;
          case "resolveMergeWithAI":
            await this.handleResolveMergeWithAI(message.taskId);
            break;
          case "acceptMergeResolution":
            await this.handleAcceptMergeResolution(message.taskId);
            break;
          case "abortMerge":
            await this.handleAbortMerge(message.taskId);
            break;
          // Review handlers
          case "startReview":
            await this.handleStartReview(message.taskId, message.options);
            break;
          case "getReviewStatus":
            await this.handleGetReviewStatus(message.taskId);
            break;
          // Changelog handler
          case "generateChangelog":
            await vscode.commands.executeCommand("kaiban.generateChangelog");
            break;
          // Project initialization handler
          case "initializeProject":
            await this.handleInitializeProject();
            break;
          case "terminal-input":
            this.terminalService.sendInput(message.taskId, message.data);
            break;
          case "terminal-kill":
            this.terminalService.kill(message.taskId);
            break;
          case "executeViaEmbeddedTerminal":
            await this.handleExecuteViaEmbeddedTerminal(message.taskId, message.cliProvider);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );

    await this.refresh();

    // Start quota auto-refresh (every 5 minutes)
    this.startQuotaAutoRefresh();

    // Note: Initial quota and CLI status are requested by webview when ready (avoids race condition)
  }

  /**
   * Start auto-refresh for Claude and Codex quota (every 5 minutes)
   */
  private startQuotaAutoRefresh(): void {
    // Clear existing interval if any
    if (this.quotaRefreshInterval) {
      clearInterval(this.quotaRefreshInterval);
    }

    // Refresh every 5 minutes (300000ms)
    this.quotaRefreshInterval = setInterval(async () => {
      await this.handleGetClaudeQuota();
      await this.handleGetCodexQuota();
    }, 300000);
  }

  /**
   * Handle get Claude quota request
   */
  private async handleGetClaudeQuota(): Promise<void> {
    if (!this.panel) return;

    // Send loading state
    this.panel.webview.postMessage({
      command: "claudeQuotaLoading",
    });

    try {
      const quotaData = await this.quotaService.getQuota();

      this.panel.webview.postMessage({
        command: "claudeQuotaUpdate",
        data: this.serializeQuotaData(quotaData),
      });
    } catch (error) {
      this.panel.webview.postMessage({
        command: "claudeQuotaError",
        error: String(error),
      });
    }
  }

  /**
   * Handle manual refresh of Claude quota
   */
  private async handleRefreshClaudeQuota(): Promise<void> {
    this.quotaService.clearCache();
    await this.handleGetClaudeQuota();
  }

  /**
   * Handle get Codex quota request
   */
  private async handleGetCodexQuota(): Promise<void> {
    if (!this.panel) return;

    // Send loading state
    this.panel.webview.postMessage({
      command: "codexQuotaLoading",
    });

    try {
      const quotaData = await this.codexQuotaService.getQuota();

      this.panel.webview.postMessage({
        command: "codexQuotaUpdate",
        data: this.serializeCodexQuotaData(quotaData),
      });
    } catch (error) {
      this.panel.webview.postMessage({
        command: "codexQuotaError",
        error: String(error),
      });
    }
  }

  /**
   * Handle manual refresh of Codex quota
   */
  private async handleRefreshCodexQuota(): Promise<void> {
    this.codexQuotaService.clearCache();
    await this.handleGetCodexQuota();
  }

  /**
   * Serialize Codex quota data for webview (convert Dates to strings)
   */
  private serializeCodexQuotaData(data: CodexQuotaDisplayData): {
    usage: {
      sessionLimit: {
        utilization: number;
        resetsAt: string;
        resetTimeFormatted: string;
        status: string;
      } | null;
      weeklyLimit: {
        utilization: number;
        resetsAt: string;
        resetTimeFormatted: string;
        status: string;
      } | null;
      codeReviewLimit: {
        utilization: number;
        resetsAt: string;
        resetTimeFormatted: string;
        status: string;
      } | null;
      planType: string;
      lastUpdated: string;
    } | null;
    error: string | null;
    isLoading: boolean;
    isAvailable: boolean;
  } {
    if (!data.usage) {
      return {
        usage: null,
        error: data.error,
        isLoading: data.isLoading,
        isAvailable: data.isAvailable,
      };
    }

    const serializeWindow = (
      window: { utilization: number; resetsAt: Date; windowSeconds: number } | null
    ) => {
      if (!window) return null;
      return {
        utilization: window.utilization,
        resetsAt: window.resetsAt.toISOString(),
        resetTimeFormatted: formatCodexResetTime(window.resetsAt),
        status: getCodexQuotaStatus(window.utilization),
      };
    };

    return {
      usage: {
        sessionLimit: serializeWindow(data.usage.sessionLimit),
        weeklyLimit: serializeWindow(data.usage.weeklyLimit),
        codeReviewLimit: serializeWindow(data.usage.codeReviewLimit),
        planType: data.usage.planType,
        lastUpdated: data.usage.lastUpdated.toISOString(),
      },
      error: data.error,
      isLoading: data.isLoading,
      isAvailable: data.isAvailable,
    };
  }

  /**
   * Handle project initialization - creates .agent folder structure
   */
  private async handleInitializeProject(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const agentPath = path.join(workspaceRoot, ".agent");
    const folders = ["TASKS", "PRDS", "SESSIONS", "SYSTEM"];

    try {
      const fs = await import("node:fs");

      // Create .agent folder if it doesn't exist
      if (!fs.existsSync(agentPath)) {
        fs.mkdirSync(agentPath, { recursive: true });
      }

      // Create subfolders
      for (const folder of folders) {
        const folderPath = path.join(agentPath, folder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
      }

      vscode.window.showInformationMessage(".agent folder structure created successfully!");
      await this.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to create folder structure: ${message}`);
    }
  }

  /**
   * Serialize quota data for webview (convert Dates to strings)
   */
  private serializeQuotaData(data: QuotaDisplayData): {
    usage: {
      fiveHour: {
        utilization: number;
        resetsAt: string;
        resetTimeFormatted: string;
        status: string;
      };
      sevenDay: {
        utilization: number;
        resetsAt: string;
        resetTimeFormatted: string;
        status: string;
      };
      sevenDaySonnet?: {
        utilization: number;
        resetsAt: string;
        resetTimeFormatted: string;
        status: string;
      };
      lastUpdated: string;
    } | null;
    error: string | null;
    isLoading: boolean;
    isMacOS: boolean;
  } {
    if (!data.usage) {
      return {
        usage: null,
        error: data.error,
        isLoading: data.isLoading,
        isMacOS: data.isMacOS,
      };
    }

    const usage: {
      fiveHour: {
        utilization: number;
        resetsAt: string;
        resetTimeFormatted: string;
        status: string;
      };
      sevenDay: {
        utilization: number;
        resetsAt: string;
        resetTimeFormatted: string;
        status: string;
      };
      sevenDaySonnet?: {
        utilization: number;
        resetsAt: string;
        resetTimeFormatted: string;
        status: string;
      };
      lastUpdated: string;
    } = {
      fiveHour: {
        utilization: data.usage.fiveHour.utilization,
        resetsAt: data.usage.fiveHour.resetsAt.toISOString(),
        resetTimeFormatted: formatResetTime(data.usage.fiveHour.resetsAt),
        status: getQuotaStatus(data.usage.fiveHour.utilization),
      },
      sevenDay: {
        utilization: data.usage.sevenDay.utilization,
        resetsAt: data.usage.sevenDay.resetsAt.toISOString(),
        resetTimeFormatted: formatResetTime(data.usage.sevenDay.resetsAt),
        status: getQuotaStatus(data.usage.sevenDay.utilization),
      },
      lastUpdated: data.usage.lastUpdated.toISOString(),
    };

    if (data.usage.sevenDaySonnet) {
      usage.sevenDaySonnet = {
        utilization: data.usage.sevenDaySonnet.utilization,
        resetsAt: data.usage.sevenDaySonnet.resetsAt.toISOString(),
        resetTimeFormatted: formatResetTime(data.usage.sevenDaySonnet.resetsAt),
        status: getQuotaStatus(data.usage.sevenDaySonnet.utilization),
      };
    }

    const result: ReturnType<typeof this.serializeQuotaData> = {
      usage,
      error: data.error,
      isLoading: data.isLoading,
      isMacOS: data.isMacOS,
    };

    return result;
  }

  /**
   * Handle get CLI status request
   */
  private async handleGetCLIStatus(): Promise<void> {
    if (!this.panel) return;

    try {
      const config = vscode.workspace.getConfiguration("kaiban");
      const selectionMode = config.get<CLISelectionMode>("cli.defaultProvider", "auto");

      const status = await this.cliDetectionService.getCLIAvailabilityStatus(selectionMode);
      this.cachedCLIStatus = status;

      this.panel.webview.postMessage({
        command: "cliStatusUpdate",
        data: status,
      });
    } catch (error) {
      this.panel.webview.postMessage({
        command: "cliStatusError",
        error: String(error),
      });
    }
  }

  /**
   * Handle manual refresh of CLI status
   */
  private async handleRefreshCLIStatus(): Promise<void> {
    this.cliDetectionService.clearCache();
    await this.handleGetCLIStatus();
  }

  /**
   * Execute task via specified CLI or auto-selected CLI
   */
  /**
   * Execute task via the embedded xterm.js terminal in the webview.
   * Uses child_process instead of vscode.window.createTerminal.
   */
  private async handleExecuteViaEmbeddedTerminal(
    taskId: string,
    cliProvider?: CLIProviderName
  ): Promise<void> {
    try {
      if (this.terminalService.isRunning(taskId)) {
        vscode.window.showWarningMessage("Task is already running in embedded terminal.");
        return;
      }

      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);
      if (!task) throw new Error(`Task ${taskId} not found`);

      const config = vscode.workspace.getConfiguration("kaiban");
      const selectionMode = config.get<CLISelectionMode>("cli.defaultProvider", "auto");
      const status =
        this.cachedCLIStatus ||
        (await this.cliDetectionService.getCLIAvailabilityStatus(selectionMode));

      let selectedCLI: CLIProviderName | null = cliProvider || null;
      if (!selectedCLI) {
        if (!status.hasAvailableCLI || !status.selectedProvider) {
          throw new Error("No CLI available.");
        }
        selectedCLI = status.selectedProvider;
      }

      const cliResult = status.clis.find((c) => c.name === selectedCLI);
      if (!cliResult?.available) {
        throw new Error(`${getCLIDisplayName(selectedCLI!)} is not available`);
      }

      const cliConfig = this.cliDetectionService.getCLIConfig(selectedCLI, {
        get: <T>(key: string, defaultValue: T) => config.get<T>(key, defaultValue),
      });

      const taskInstruction = cliConfig.promptTemplate.replace("{taskFile}", task.filePath);
      const flags = cliConfig.additionalFlags ? `${cliConfig.additionalFlags} ` : "";
      let fullCommand: string;

      if (selectedCLI === "claude") {
        const useRalphLoop = config.get<boolean>("claude.useRalphLoop", false);
        if (useRalphLoop) {
          const ralphCommand = config.get<string>("ralph.command", "/ralph-loop:ralph-loop");
          const maxIterations = config.get<number>("ralph.maxIterations", 5);
          const completionPromise = config.get<string>("ralph.completionPromise", "TASK COMPLETE");
          const ralphCmd = `${ralphCommand} "${taskInstruction}" --completion-promise "${completionPromise}" --max-iterations ${maxIterations}`;
          fullCommand = `${cliConfig.executablePath} ${flags}"${ralphCmd}"`;
        } else {
          fullCommand = `${cliConfig.executablePath} ${flags}"${taskInstruction}"`;
        }
      } else {
        fullCommand = `${cliConfig.executablePath} ${flags}"${taskInstruction}"`;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      const cwd = workspaceFolders?.[0]?.uri.fsPath;

      this.terminalService.start({
        taskId,
        label: task.label,
        agent: getCLIDisplayName(selectedCLI),
        command: fullCommand,
        cwd,
      });

      if (task.status !== "AI Review") {
        await this.taskParser.updateTaskStatus(taskId, "In Progress");
      }

      // Also track in claudeTerminals map for compatibility with existing stop/status logic
      // We don't create a VS Code terminal, but we track running state
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "claudeExecutionStarted",
          taskId,
          cliProvider: selectedCLI,
          embedded: true,
        });
      }

      await this.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to execute in embedded terminal: ${error}`);
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "claudeExecutionError",
          taskId,
          error: String(error),
        });
      }
    }
  }

  private async handleExecuteViaCLI(taskId: string, cliProvider?: CLIProviderName): Promise<void> {
    try {
      // Check if task is already running
      if (this.claudeTerminals.has(taskId)) {
        vscode.window.showWarningMessage(
          "Task is already running. Stop it first before starting again."
        );
        return;
      }

      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Get CLI status and selected provider
      const config = vscode.workspace.getConfiguration("kaiban");
      const selectionMode = config.get<CLISelectionMode>("cli.defaultProvider", "auto");
      const status =
        this.cachedCLIStatus ||
        (await this.cliDetectionService.getCLIAvailabilityStatus(selectionMode));

      // Determine which CLI to use
      let selectedCLI: CLIProviderName | null = cliProvider || null;

      if (!selectedCLI) {
        if (!status.hasAvailableCLI || !status.selectedProvider) {
          throw new Error("No CLI available. Install Claude CLI, Codex CLI, or Cursor CLI.");
        }
        selectedCLI = status.selectedProvider;
      }

      // Verify the selected CLI is available
      const cliResult = status.clis.find((c) => c.name === selectedCLI);
      if (!cliResult?.available) {
        throw new Error(`${getCLIDisplayName(selectedCLI)} is not available`);
      }

      // Get CLI-specific configuration
      const cliConfig = this.cliDetectionService.getCLIConfig(selectedCLI, {
        get: <T>(key: string, defaultValue: T) => config.get<T>(key, defaultValue),
      });

      // Build the command
      const taskInstruction = cliConfig.promptTemplate.replace("{taskFile}", task.filePath);
      const flags = cliConfig.additionalFlags ? `${cliConfig.additionalFlags} ` : "";

      // For Claude, check if we should use ralph-loop
      let fullCommand: string;
      if (selectedCLI === "claude") {
        const useRalphLoop = config.get<boolean>("claude.useRalphLoop", false);
        const ralphCommand = config.get<string>("ralph.command", "/ralph-loop:ralph-loop");
        const maxIterations = config.get<number>("ralph.maxIterations", 5);
        const completionPromise = config.get<string>("ralph.completionPromise", "TASK COMPLETE");

        if (useRalphLoop) {
          const ralphCmd = `${ralphCommand} "${taskInstruction}" --completion-promise "${completionPromise}" --max-iterations ${maxIterations}`;
          fullCommand = `${cliConfig.executablePath} ${flags}"${ralphCmd}"`;
        } else {
          fullCommand = `${cliConfig.executablePath} ${flags}"${taskInstruction}"`;
        }
      } else {
        // For Codex and Cursor, use simple command format
        fullCommand = `${cliConfig.executablePath} ${flags}"${taskInstruction}"`;
      }

      // Get workspace folder
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const cwd = workspaceFolders?.[0]?.uri.fsPath;

      // Create terminal
      const terminalName = `${getCLIDisplayName(selectedCLI)}: ${task.label.substring(0, 20)}`;
      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: cwd,
      });

      // Store terminal reference
      this.claudeTerminals.set(taskId, terminal);

      terminal.show();
      terminal.sendText(fullCommand);

      // Update task status - keep in AI Review if already there, otherwise move to In Progress
      if (task.status !== "AI Review") {
        await this.taskParser.updateTaskStatus(taskId, "In Progress");
      }

      // Notify user
      vscode.window.showInformationMessage(
        `Executing via ${getCLIDisplayName(selectedCLI)}: ${task.label}`
      );

      // Notify webview
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "claudeExecutionStarted",
          taskId,
          cliProvider: selectedCLI,
        });
      }

      // Set up completion tracking
      this.watchForCompletion(taskId);

      // Start transcript monitoring for Claude CLI (real-time progress)
      if (selectedCLI === "claude" && cwd) {
        this.startTranscriptMonitoring(taskId, cwd);
      }

      // Refresh board to show updated status
      await this.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to execute task: ${error}`);
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "claudeExecutionError",
          taskId,
          error: String(error),
        });
      }
    }
  }

  // ============ Pipeline Orchestration Methods ============

  /**
   * Get the current retry count for a task in the pipeline.
   */
  private getTaskRetryCount(taskId: string): number {
    return this.pipelineRetryCount.get(taskId) ?? 0;
  }

  /**
   * Increment the retry count for a task in the pipeline.
   */
  private incrementTaskRetryCount(taskId: string): void {
    const current = this.getTaskRetryCount(taskId);
    this.pipelineRetryCount.set(taskId, current + 1);
  }

  /**
   * Clear the retry count for a task (when pipeline completes or is reset).
   */
  private clearTaskRetryCount(taskId: string): void {
    this.pipelineRetryCount.delete(taskId);
  }

  /**
   * Execute task with Ralph Loop, incorporating review feedback.
   * This forces Ralph Loop execution regardless of user settings,
   * since we're in the pipeline's revision phase.
   */
  private async handleExecuteWithRalphLoop(
    taskId: string,
    reviewContext?: { findings?: string[]; summary?: string }
  ): Promise<void> {
    try {
      // Check if task is already running
      if (this.claudeTerminals.has(taskId)) {
        vscode.window.showWarningMessage(
          "Task is already running. Stop it first before starting again."
        );
        return;
      }

      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Get CLI configuration
      const config = vscode.workspace.getConfiguration("kaiban");
      const selectionMode = config.get<string>("cli.defaultProvider", "auto");
      const status =
        this.cachedCLIStatus ||
        (await this.cliDetectionService.getCLIAvailabilityStatus(
          selectionMode as "auto" | "claude" | "codex" | "cursor"
        ));

      // Must use Claude for Ralph Loop
      const claudeCLI = status.clis.find((c) => c.name === "claude");
      if (!claudeCLI?.available) {
        throw new Error("Claude CLI is required for Ralph Loop execution but is not available");
      }

      const cliConfig = this.cliDetectionService.getCLIConfig("claude", {
        get: <T>(key: string, defaultValue: T) => config.get<T>(key, defaultValue),
      });

      // Build prompt with review context
      let taskInstruction = cliConfig.promptTemplate.replace("{taskFile}", task.filePath);

      // Enhance prompt with review findings if available
      if (reviewContext?.findings && reviewContext.findings.length > 0) {
        const findingsContext = `

REVIEW FEEDBACK TO ADDRESS:
${reviewContext.findings.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Please address all the review findings above while implementing the task.`;
        taskInstruction += findingsContext;
      }

      // Get ralph configuration - force Ralph Loop for pipeline
      const ralphCommand = config.get<string>("ralph.command", "/ralph-loop:ralph-loop");
      const maxIterations = config.get<number>("ralph.maxIterations", 5);
      const completionPromise = config.get<string>("ralph.completionPromise", "TASK COMPLETE");

      const flags = cliConfig.additionalFlags ? `${cliConfig.additionalFlags} ` : "";
      const ralphCmd = `${ralphCommand} "${taskInstruction}" --completion-promise "${completionPromise}" --max-iterations ${maxIterations}`;
      const fullCommand = `${cliConfig.executablePath} ${flags}"${ralphCmd}"`;

      // Get workspace folder
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const cwd = workspaceFolders?.[0]?.uri.fsPath;

      // Create terminal
      const terminalName = `Claude (Pipeline): ${task.label.substring(0, 20)}`;
      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: cwd,
      });

      // Store terminal reference
      this.claudeTerminals.set(taskId, terminal);

      terminal.show();
      terminal.sendText(fullCommand);

      // Update task status - keep in AI Review if already there, otherwise move to In Progress
      if (task.status !== "AI Review") {
        await this.taskParser.updateTaskStatus(taskId, "In Progress");
      }

      // Notify user
      vscode.window.showInformationMessage(`Pipeline: Executing with Ralph Loop: ${task.label}`);

      // Notify webview
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "claudeExecutionStarted",
          taskId,
          cliProvider: "claude",
          pipelineMode: true,
        });
      }

      // Set up completion tracking
      this.watchForCompletion(taskId);

      // Start transcript monitoring
      if (cwd) {
        this.startTranscriptMonitoring(taskId, cwd);
      }

      // Refresh board
      await this.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Pipeline execution failed: ${error}`);
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "claudeExecutionError",
          taskId,
          error: String(error),
        });
      }
    }
  }

  /**
   * Handle pipeline status changes to auto-trigger appropriate actions.
   * This is called when a task's status is manually or automatically changed.
   */
  private async handlePipelineStatusChange(taskId: string, newStatus: string): Promise<void> {
    // Log status change to terminal
    const statusEmoji: Record<string, string> = {
      Backlog: "📋",
      Planning: "📝",
      "In Progress": "🔨",
      "AI Review": "🤖",
      "Human Review": "👤",
      Done: "✅",
      Archived: "📦",
      Blocked: "🚫",
    };
    const emoji = statusEmoji[newStatus] || "📌";

    // Get task label for better logging
    const tasks = await this.taskParser.parseTasks();
    const task = tasks.find((t) => t.id === taskId);
    const taskLabel = task?.label || taskId;

    // Notify webview of status change for terminal logging
    if (this.panel) {
      this.panel.webview.postMessage({
        command: "taskStatusChanged",
        taskId,
        taskLabel,
        newStatus,
        emoji,
      });
    }

    // Check if pipeline is enabled
    const pipelineConfig = vscode.workspace.getConfiguration("kaiban.pipeline");
    const pipelineEnabled = pipelineConfig.get<boolean>("enabled", true);
    const autoReview = pipelineConfig.get<boolean>("autoReviewOnAIReview", true);
    const autoInterview = pipelineConfig.get<boolean>("autoInterviewOnPlanning", true);

    if (!pipelineEnabled) {
      return; // Pipeline disabled - no auto-actions
    }

    // Handle status-specific auto-triggers
    switch (newStatus) {
      case "Planning": {
        if (autoInterview && task) {
          // Auto-trigger PRD interview when task moves to Planning
          vscode.window.showInformationMessage("Pipeline: Auto-starting PRD interview...");

          // Small delay to let status update propagate
          setTimeout(async () => {
            await this.handleAutoInterviewForPlanning(taskId, task);
          }, 500);
        }
        break;
      }

      case "AI Review": {
        if (autoReview) {
          // Auto-trigger Codex review when task moves to AI Review
          vscode.window.showInformationMessage("Pipeline: Auto-starting AI review...");

          // Small delay to let status update propagate
          setTimeout(async () => {
            await this.handleStartReview(taskId, { useCodex: true });
          }, 500);
        }
        break;
      }

      case "In Progress": {
        // Check if task is returning from review (has review state)
        const reviewState = this.activeReviewStates.get(taskId);
        if (reviewState?.status === "completed" && reviewState.result) {
          // Task returning from review - this is handled by handlePipelineReviewCompletion
          // We don't need to do anything here since the review completion handler
          // already manages the transition
        }
        break;
      }

      case "Done": {
        // Task completed - clear pipeline state
        this.clearTaskRetryCount(taskId);
        this.activeReviewStates.delete(taskId);
        break;
      }

      case "Human Review": {
        // Clear retry count but keep review state for reference
        this.clearTaskRetryCount(taskId);
        break;
      }

      default:
        // No auto-action for other statuses
        break;
    }
  }

  /**
   * Start monitoring Claude CLI transcript for real-time progress updates.
   */
  private startTranscriptMonitoring(taskId: string, workspacePath: string): void {
    this.transcriptMonitorService.startMonitoring(
      taskId,
      workspacePath,
      (progress: ClaudeStepProgress) => {
        this.sendProgressUpdate(taskId, progress);
      }
    );
  }

  /**
   * Send progress update to webview.
   */
  private sendProgressUpdate(taskId: string, progress: ClaudeStepProgress): void {
    if (!this.panel) return;

    const displayInfo = TranscriptMonitorService.getProgressDisplayText(progress);

    this.panel.webview.postMessage({
      command: "claudeProgressUpdate",
      taskId,
      toolName: displayInfo.toolName,
      status: displayInfo.status,
      currentStep: progress.currentStep,
      recentSteps: progress.recentSteps.slice(-5), // Send last 5 steps
    });
  }

  public async refresh() {
    if (!this.panel) {
      return;
    }

    const tasks = await this.taskParser.parseTasks();
    const groupedTasks = this.taskParser.groupByStatus(tasks);

    this.panel.webview.html = await this.getWebviewContent(groupedTasks);
  }

  private async openTaskFile(filePath: string) {
    try {
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open task file: ${error}`);
    }
  }

  private async loadPRDContent(prdPath: string, taskFilePath?: string) {
    if (!this.panel) {
      console.error("loadPRDContent: Panel not available");
      return;
    }

    console.log("loadPRDContent called:", { prdPath, taskFilePath });

    try {
      // Get PRD base path from configuration
      const config = vscode.workspace.getConfiguration("kaiban.prd");
      const basePath = config.get<string>("basePath", ".agent/PRDS");
      console.log("PRD base path:", basePath);

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        console.error("loadPRDContent: No workspace folders");
        this.panel.webview.postMessage({
          command: "updatePRDContent",
          content: `<p class="prd-not-found">No workspace folder open.</p>`,
          prdExists: false,
          prdPath: prdPath,
        });
        return;
      }

      let prdContent = "";

      for (const folder of workspaceFolders) {
        // Strategy 1: Resolve from configured base path (primary method)
        // Extract the relative path after any "../" segments that navigate to PRDS/
        // For paths like "../../../PRDS/analytics/file.md", extract "analytics/file.md"
        let relativePrdPath = prdPath;

        // If path contains the base path directory name, extract everything after it
        const basePathDir = path.basename(basePath);
        if (prdPath.includes(`${basePathDir}/`)) {
          const index = prdPath.indexOf(`${basePathDir}/`);
          relativePrdPath = prdPath.substring(index + basePathDir.length + 1);
        } else if (prdPath.startsWith("../") || prdPath.startsWith("./")) {
          // For relative paths starting with ../, extract just the filename or subpath
          // This handles cases where the path is like "../PRDS/file.md"
          const parts = prdPath.split("/");
          // Find where the actual file path starts (after all ../)
          let startIndex = 0;
          for (let i = 0; i < parts.length; i++) {
            if (parts[i] !== ".." && parts[i] !== "." && parts[i] !== "") {
              startIndex = i;
              break;
            }
          }
          // If we found the base path directory, skip it
          if (parts[startIndex] === basePathDir) {
            relativePrdPath = parts.slice(startIndex + 1).join("/");
          } else {
            relativePrdPath = parts.slice(startIndex).join("/");
          }
        } else if (!path.isAbsolute(prdPath) && !prdPath.startsWith("http")) {
          // For simple relative paths, use as-is
          relativePrdPath = prdPath;
        }

        // Resolve from the configured base path
        try {
          const baseUri = vscode.Uri.joinPath(folder.uri, basePath);
          const prdUri = vscode.Uri.joinPath(baseUri, relativePrdPath);
          console.log("Trying to load PRD from:", prdUri.fsPath);
          const document = await vscode.workspace.openTextDocument(prdUri);
          prdContent = document.getText();
          if (prdContent) {
            console.log("PRD loaded successfully from base path");
            break;
          }
        } catch (error) {
          console.log("Failed to load from base path:", error);
        }

        // Strategy 2: Fallback - resolve relative to task file if available
        if (taskFilePath && !prdContent) {
          try {
            const taskDir = path.dirname(taskFilePath);
            const resolvedPath = path.resolve(taskDir, prdPath);
            const prdUri = vscode.Uri.file(resolvedPath);
            console.log("Trying to load PRD from task file relative path:", prdUri.fsPath);
            const document = await vscode.workspace.openTextDocument(prdUri);
            prdContent = document.getText();
            if (prdContent) {
              console.log("PRD loaded successfully from task file relative path");
              break;
            }
          } catch (error) {
            console.log("Failed to load from task file relative path:", error);
          }
        }

        // Strategy 3: Fallback - resolve relative to workspace root
        if (!prdContent && !prdPath.startsWith("/") && !prdPath.startsWith("http")) {
          try {
            const prdUri = vscode.Uri.joinPath(folder.uri, prdPath);
            console.log("Trying to load PRD from workspace root:", prdUri.fsPath);
            const document = await vscode.workspace.openTextDocument(prdUri);
            prdContent = document.getText();
            if (prdContent) {
              console.log("PRD loaded successfully from workspace root");
              break;
            }
          } catch (error) {
            console.log("Failed to load from workspace root:", error);
          }
        }
      }

      if (prdContent) {
        // Simple markdown rendering (basic)
        const renderedContent = this.renderMarkdown(prdContent);
        console.log("Sending PRD content to webview, length:", renderedContent.length);
        this.panel.webview.postMessage({
          command: "updatePRDContent",
          content: renderedContent,
          prdExists: true,
          prdPath: prdPath,
        });
      } else {
        console.log("No PRD content found, sending not found message");
        this.panel.webview.postMessage({
          command: "updatePRDContent",
          content: `<p class="prd-not-found">No PRD found for this task. Path attempted: ${prdPath}</p>`,
          prdExists: false,
          prdPath: prdPath,
        });
      }
    } catch (error) {
      console.error("Error in loadPRDContent:", error);
      this.panel.webview.postMessage({
        command: "updatePRDContent",
        content: `<p>Error loading PRD: ${error}</p>`,
        prdExists: false,
        prdPath: prdPath,
      });
    }
  }

  private async handleCreatePRD(taskId: string, _suggestedPath: string) {
    if (!this.panel) return;

    try {
      // Get task info
      const tasks = this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        vscode.window.showErrorMessage("Task not found");
        return;
      }

      // Ask user for PRD name, pre-filled with task label
      const prdName = await vscode.window.showInputBox({
        prompt: "Enter the PRD name or topic",
        value: task.label,
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

      // Start the interview process with task context
      const result = await this.prdInterviewService.startInterview({
        name: prdName.trim(),
        taskContext: {
          taskId: task.id,
          label: task.label,
          description: task.description,
        },
      });

      if (result) {
        // Get PRD base path from configuration
        const config = vscode.workspace.getConfiguration("kaiban.prd");
        const basePath = config.get<string>("basePath", ".agent/PRDS");

        // Update task file to link to PRD
        const relativePrdPath = `../${basePath}/${result.slug}.md`;
        await this.taskParser.updateTaskPRD(taskId, relativePrdPath);

        // Refresh to show updated PRD link
        await this.refresh();
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create PRD: ${error}`);
    }
  }

  /**
   * Auto-trigger PRD interview when task moves to Planning column.
   * If task has no PRD, creates one and starts interview.
   * If task has PRD, starts Claude CLI to validate/expand the existing PRD.
   */
  private async handleAutoInterviewForPlanning(taskId: string, task: Task): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }

    const workspaceFolder = workspaceFolders[0];

    // Notify webview that planning is starting
    if (this.panel) {
      this.panel.webview.postMessage({
        command: "planningStarted",
        taskId,
      });
    }

    try {
      if (!task.prdPath || task.prdPath.trim() === "") {
        // No PRD - create one and start interview using task label
        const result = await this.prdInterviewService.startInterview({
          name: task.label,
          taskContext: {
            taskId: task.id,
            label: task.label,
            description: task.description,
          },
        });

        if (result) {
          // Get PRD base path from configuration
          const config = vscode.workspace.getConfiguration("kaiban.prd");
          const basePath = config.get<string>("basePath", ".agent/PRDS");

          // Update task file to link to PRD
          const relativePrdPath = `../${basePath}/${result.slug}.md`;
          await this.taskParser.updateTaskPRD(taskId, relativePrdPath);

          // Refresh to show updated PRD link
          await this.refresh();

          // Notify webview
          if (this.panel) {
            this.panel.webview.postMessage({
              command: "terminalOutput",
              content: `📝 Created PRD and started interview for "${task.label}"`,
              type: "success",
            });
          }
        }
      } else {
        // Has PRD - start Claude CLI to validate/expand the existing PRD
        const prdUri = this.resolvePrdPath(task.prdPath);
        if (!prdUri) {
          vscode.window.showErrorMessage("Could not resolve PRD path");
          return;
        }

        const relativePrdPath = path.relative(workspaceFolder.uri.fsPath, prdUri.fsPath);

        // Build validation/expansion prompt
        const validationPrompt = `Read this @${relativePrdPath} and validate it for completeness. Interview me using the AskUserQuestionTool about any missing details, unclear requirements, edge cases, or technical considerations. Be thorough - ask about UI/UX, error handling, security, performance, and any ambiguous areas. Once complete, update the PRD file with the additional details.

Task context:
- Task ID: ${task.id}
- Label: ${task.label}
${task.description ? `- Description: ${task.description}` : ""}`;

        // Get Claude CLI configuration
        const config = vscode.workspace.getConfiguration("kaiban.claude");
        const claudePath = config.get<string>("executablePath", "claude");
        const additionalFlags = config.get<string>("additionalFlags", "");

        // Build command
        const flags = additionalFlags ? `${additionalFlags} ` : "";
        const escapedPrompt = this.escapeForShell(validationPrompt);
        const fullCommand = `${claudePath} ${flags}"${escapedPrompt}"`;

        // Create and show terminal
        const terminal = vscode.window.createTerminal({
          name: `PRD Validation: ${task.label.substring(0, 30)}`,
          cwd: workspaceFolder.uri.fsPath,
        });

        terminal.show();
        terminal.sendText(fullCommand);

        // Notify webview
        if (this.panel) {
          this.panel.webview.postMessage({
            command: "terminalOutput",
            content: `📝 Started PRD validation for "${task.label}"`,
            type: "success",
          });
        }

        vscode.window.showInformationMessage(
          `Claude will validate and expand the PRD for "${task.label}". Answer the interview questions in the terminal.`
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start PRD interview: ${error}`);
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "planningFailed",
          taskId,
          error: String(error),
        });
      }
    }
  }

  /**
   * Escape string for shell command.
   */
  private escapeForShell(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`");
  }

  private async handleEditPRD(prdPath: string) {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;

      // Get PRD base path from configuration
      const config = vscode.workspace.getConfiguration("kaiban.prd");
      const basePath = config.get<string>("basePath", ".agent/PRDS");

      // Resolve PRD path - Try configured base path first
      const basePathDir = path.basename(basePath);
      let relativePrdPath = prdPath;

      if (prdPath.includes(`${basePathDir}/`)) {
        const index = prdPath.indexOf(`${basePathDir}/`);
        relativePrdPath = prdPath.substring(index + basePathDir.length + 1);
      } else if (prdPath.startsWith("../") || prdPath.startsWith("./")) {
        const parts = prdPath.split("/");
        let startIndex = 0;
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] !== ".." && parts[i] !== "." && parts[i] !== "") {
            startIndex = i;
            break;
          }
        }
        if (parts[startIndex] === basePathDir) {
          relativePrdPath = parts.slice(startIndex + 1).join("/");
        } else {
          relativePrdPath = parts.slice(startIndex).join("/");
        }
      }

      const baseUri = vscode.Uri.joinPath(workspaceFolders[0].uri, basePath);
      const prdUri = vscode.Uri.joinPath(baseUri, relativePrdPath);

      const document = await vscode.workspace.openTextDocument(prdUri);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open PRD: ${error}`);
    }
  }

  private async handleGetPrdRawContent(prdPath: string) {
    if (!this.panel) return;

    try {
      const prdUri = this.resolvePrdPath(prdPath);
      if (!prdUri) {
        this.panel.webview.postMessage({
          command: "prdRawContent",
          content: "",
          error: "Could not resolve PRD path",
        });
        return;
      }

      const content = await vscode.workspace.fs.readFile(prdUri);
      this.panel.webview.postMessage({
        command: "prdRawContent",
        content: Buffer.from(content).toString("utf-8"),
        prdPath: prdPath,
      });
    } catch (error) {
      this.panel.webview.postMessage({
        command: "prdRawContent",
        content: "",
        error: `Failed to read PRD: ${error}`,
      });
    }
  }

  private async handleSavePrdContent(prdPath: string, content: string) {
    if (!this.panel) return;

    try {
      const prdUri = this.resolvePrdPath(prdPath);
      if (!prdUri) {
        this.panel.webview.postMessage({
          command: "prdSaveResult",
          success: false,
          error: "Could not resolve PRD path",
        });
        return;
      }

      await vscode.workspace.fs.writeFile(prdUri, Buffer.from(content, "utf-8"));

      // Re-render the PRD preview with updated content
      const renderedContent = this.renderMarkdown(content);
      this.panel.webview.postMessage({
        command: "prdSaveResult",
        success: true,
        renderedContent: renderedContent,
      });
    } catch (error) {
      this.panel.webview.postMessage({
        command: "prdSaveResult",
        success: false,
        error: `Failed to save PRD: ${error}`,
      });
    }
  }

  private resolvePrdPath(prdPath: string): vscode.Uri | null {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return null;

    const config = vscode.workspace.getConfiguration("kaiban.prd");
    const basePath = config.get<string>("basePath", ".agent/PRDS");
    const basePathDir = path.basename(basePath);
    let relativePrdPath = prdPath;

    if (prdPath.includes(`${basePathDir}/`)) {
      const index = prdPath.indexOf(`${basePathDir}/`);
      relativePrdPath = prdPath.substring(index + basePathDir.length + 1);
    } else if (prdPath.startsWith("../") || prdPath.startsWith("./")) {
      const parts = prdPath.split("/");
      let startIndex = 0;
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== ".." && parts[i] !== "." && parts[i] !== "") {
          startIndex = i;
          break;
        }
      }
      if (parts[startIndex] === basePathDir) {
        relativePrdPath = parts.slice(startIndex + 1).join("/");
      } else {
        relativePrdPath = parts.slice(startIndex).join("/");
      }
    }

    const baseUri = vscode.Uri.joinPath(workspaceFolders[0].uri, basePath);
    return vscode.Uri.joinPath(baseUri, relativePrdPath);
  }

  private async updateTaskStatus(taskId: string, newStatus: string) {
    try {
      await this.taskParser.updateTaskStatus(
        taskId,
        newStatus as
          | "Backlog"
          | "Planning"
          | "In Progress"
          | "AI Review"
          | "Human Review"
          | "Done"
          | "Archived"
          | "Blocked"
      );
      // Refresh the board after updating
      await this.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update task status: ${error}`);
    }
  }

  private async handleUpdateTaskOrder(
    taskId: string,
    order: number,
    newStatus?: string,
    startExecution?: boolean,
    stopExecution?: boolean
  ): Promise<void> {
    try {
      if (newStatus) {
        // If status changed, update both status and order
        await this.taskParser.updateTaskStatus(taskId, newStatus as Task["status"], order);
      } else {
        // Only update order
        await this.taskParser.updateTaskOrder(taskId, order);
      }

      // Handle execution start/stop based on status transition
      if (stopExecution) {
        // Stop terminal execution when moving out of Doing
        await this.handleStopClaudeExecution(taskId);
      } else if (startExecution) {
        // Start execution when moving to Doing (only if not already running)
        if (!this.claudeTerminals.has(taskId)) {
          await this.handleExecuteViaClaude(taskId);
        }
      }

      // Pipeline orchestration: auto-trigger actions based on status changes
      if (newStatus) {
        await this.handlePipelineStatusChange(taskId, newStatus);
      }

      await this.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update task order: ${error}`);
    }
  }

  private async handleUpdateTask(
    taskId: string,
    updates: {
      label?: string;
      description?: string;
      priority?: string;
      type?: string;
      status?: string;
    }
  ): Promise<void> {
    try {
      await this.taskParser.updateTask(taskId, updates);
      await this.refresh();
      if (this.panel) {
        this.panel.webview.postMessage({ command: "taskUpdated", taskId });
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update task: ${error}`);
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "taskUpdateError",
          error: String(error),
        });
      }
    }
  }

  private async saveColumnSettings(columns: string[]) {
    try {
      // Set flag to skip the config change refresh (UI already updated)
      this.skipNextConfigRefresh = true;
      const config = vscode.workspace.getConfiguration("kaiban.columns");
      await config.update("enabled", columns, vscode.ConfigurationTarget.Workspace);
    } catch (error) {
      // Silently fail - the UI already updated instantly
      console.error("Failed to save column settings:", error);
      this.skipNextConfigRefresh = false;
    }
  }

  private async handleExecuteRalphCommand(taskId: string) {
    try {
      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Get ralph configuration
      const config = vscode.workspace.getConfiguration("kaiban.ralph");
      const ralphCommand = config.get<string>("command", "/ralph-loop");
      const maxIterations = config.get<number>("maxIterations", 5);
      const completionPromise = config.get<string>("completionPromise", "");

      // Load PRD content if available
      let prdContent = "";
      if (task.prdPath) {
        prdContent = await this.loadPRDContentRaw(task.prdPath);
      }

      // Build task description
      let taskDescription = `Task: ${task.label}`;
      if (task.description) {
        taskDescription += `\n\n${task.description}`;
      }
      if (prdContent) {
        taskDescription += `\n\nPRD Context:\n${prdContent.substring(0, 500)}${prdContent.length > 500 ? "..." : ""}`;
      }

      // Escape quotes in description for command
      const escapedDescription = taskDescription.replace(/"/g, '\\"');

      // Build command
      let command = "";
      if (ralphCommand.startsWith("/")) {
        // Claude Code plugin command format
        command = `${ralphCommand} "${escapedDescription}" --max-iterations ${maxIterations}`;
        if (completionPromise) {
          command += ` --completion-promise "${completionPromise}"`;
        }
      } else if (ralphCommand.includes("bash") || ralphCommand.endsWith(".sh")) {
        // Bash script format
        command = `${ralphCommand} "${escapedDescription}"`;
      } else {
        // Generic command format
        command = `${ralphCommand} "${escapedDescription}" --max-iterations ${maxIterations}`;
      }

      // Get or create terminal
      let terminal = vscode.window.activeTerminal;
      if (!terminal) {
        terminal = vscode.window.createTerminal("Ralph Loop");
      }

      // Show terminal and execute command
      terminal.show();
      terminal.sendText(command);

      // Notify user
      vscode.window.showInformationMessage(`Ralph command executed for task: ${task.label}`);

      // Notify webview of success
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "ralphCommandExecuted",
          taskId,
        });
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to execute ralph command: ${error}`);
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "ralphCommandError",
          taskId,
          error: String(error),
        });
      }
    }
  }

  /**
   * Get Claude execution configuration from workspace settings.
   */
  private getClaudeConfig() {
    const config = vscode.workspace.getConfiguration("kaiban");
    return {
      claudePath: config.get<string>("claude.executablePath", "claude"),
      additionalFlags: config.get<string>("claude.additionalFlags", ""),
      useRalphLoop: config.get<boolean>("claude.useRalphLoop", false),
      promptTemplate: config.get<string>(
        "claude.promptTemplate",
        "Read the task file at {taskFile} and implement it. The task contains a link to the PRD with full requirements. Update the task status to Testing when complete."
      ),
      ralphCommand: config.get<string>("ralph.command", "/ralph-loop:ralph-loop"),
      maxIterations: config.get<number>("ralph.maxIterations", 5),
      completionPromise: config.get<string>("ralph.completionPromise", "TASK COMPLETE"),
      executionTimeout: config.get<number>("claude.executionTimeout", 30),
    };
  }

  private claudeTerminals: Map<string, vscode.Terminal> = new Map();
  private completionWatchers: Map<string, vscode.FileSystemWatcher> = new Map();
  private completionPollers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Execute task via CLI (backward compatibility - delegates to handleExecuteViaCLI)
   * Uses the configured default CLI provider or auto-detects
   */
  private async handleExecuteViaClaude(taskId: string) {
    // Delegate to the new multi-CLI handler
    await this.handleExecuteViaCLI(taskId);
  }

  private watchForCompletion(taskId: string) {
    // Watch task file for status changes
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const tasksPath = vscode.Uri.joinPath(workspaceFolders[0].uri, ".agent", "TASKS");
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(tasksPath, "**/*.md")
    );

    const checkCompletion = async () => {
      // Guard against race condition - if watcher is already cleaned up,
      // another trigger already processed this completion
      if (!this.completionWatchers.has(taskId)) return;

      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);

      if (task && (task.status === "Done" || task.status === "Human Review")) {
        // Task completed - clean up (including terminal reference)
        this.cleanupTaskTracking(taskId, true);

        // Check if session documenter is enabled
        const skillSettings = this.skillService.getSettings();
        if (skillSettings.useSessionDocumenter) {
          // Prompt to document session
          const result = await vscode.window.showInformationMessage(
            `Task "${task.label}" completed! Document this session?`,
            "Document Session",
            "Skip"
          );

          if (result === "Document Session") {
            await this.skillService.runSessionDocumenter(task.label);
          }
        } else {
          vscode.window.showInformationMessage(`Task completed: ${task.label}`);
        }

        await this.refresh();
      }
    };

    watcher.onDidChange(checkCompletion);
    this.completionWatchers.set(taskId, watcher);
    this.context.subscriptions.push(watcher);

    // Also poll periodically (in case file watcher misses changes)
    const pollInterval = setInterval(async () => {
      await checkCompletion();
    }, 10000); // Check every 10 seconds

    this.completionPollers.set(taskId, pollInterval);

    // Clean up after configured timeout (default 30 minutes)
    const cfg = this.getClaudeConfig();
    const timeoutMs = cfg.executionTimeout * 60 * 1000;
    setTimeout(() => {
      this.cleanupTaskTracking(taskId);
    }, timeoutMs);
  }

  private cleanupTaskTracking(taskId: string, includeTerminal = false) {
    const watcher = this.completionWatchers.get(taskId);
    if (watcher) {
      watcher.dispose();
      this.completionWatchers.delete(taskId);
    }

    const poller = this.completionPollers.get(taskId);
    if (poller) {
      clearInterval(poller);
      this.completionPollers.delete(taskId);
    }

    // Stop transcript monitoring
    this.transcriptMonitorService.stopMonitoring(taskId);

    // Notify webview that progress tracking stopped
    if (this.panel) {
      this.panel.webview.postMessage({
        command: "claudeProgressStopped",
        taskId,
      });
    }

    if (includeTerminal) {
      this.claudeTerminals.delete(taskId);
    }
  }

  private async handleStopClaudeExecution(taskId: string) {
    // Check for CLI terminal
    const cliTerminal = this.claudeTerminals.get(taskId);
    if (cliTerminal) {
      cliTerminal.dispose();
      this.claudeTerminals.delete(taskId);
      this.cleanupTaskTracking(taskId);

      vscode.window.showInformationMessage("Stopped CLI execution");

      if (this.panel) {
        this.panel.webview.postMessage({
          command: "claudeExecutionStopped",
          taskId,
        });
      }
      return;
    }

    // Check for review terminal
    const reviewTerminal = this.reviewTerminals.get(taskId);
    if (reviewTerminal) {
      reviewTerminal.dispose();
      this.reviewTerminals.delete(taskId);

      // Update review state to failed
      const reviewState = this.activeReviewStates.get(taskId);
      if (reviewState) {
        reviewState.status = "failed";
        reviewState.error = "Review cancelled by user";
        this.activeReviewStates.set(taskId, reviewState);
      }

      vscode.window.showInformationMessage("Stopped review");

      if (this.panel) {
        this.panel.webview.postMessage({
          command: "reviewFailed",
          data: { taskId, error: "Review cancelled by user" },
        });
      }

      await this.refresh();
    }
  }

  // ============ Batch Execution Methods ============

  private async handleStartBatchExecution(taskIds: string[]) {
    if (this.isBatchExecuting) {
      vscode.window.showWarningMessage("Batch execution already in progress");
      return;
    }

    if (!taskIds || taskIds.length === 0) {
      vscode.window.showWarningMessage("No tasks to execute");
      return;
    }

    this.batchExecutionQueue = [...taskIds];
    this.currentBatchIndex = 0;
    this.isBatchExecuting = true;
    this.batchExecutionCancelled = false;
    this.batchCompletedCount = 0;
    this.batchSkippedCount = 0;

    // Notify webview
    if (this.panel) {
      this.panel.webview.postMessage({
        command: "batchExecutionStarted",
        total: taskIds.length,
        taskIds,
      });
    }

    vscode.window.showInformationMessage(`Starting batch execution of ${taskIds.length} tasks`);

    // Start first task
    await this.executeNextBatchTask();
  }

  private async executeNextBatchTask() {
    // Check if cancelled
    if (this.batchExecutionCancelled) {
      this.finishBatchExecution(true);
      return;
    }

    // Check if done
    if (this.currentBatchIndex >= this.batchExecutionQueue.length) {
      this.finishBatchExecution(false);
      return;
    }

    const taskId = this.batchExecutionQueue[this.currentBatchIndex];

    // Send progress update
    if (this.panel) {
      this.panel.webview.postMessage({
        command: "batchTaskStarted",
        taskId,
        index: this.currentBatchIndex,
        total: this.batchExecutionQueue.length,
      });

      this.panel.webview.postMessage({
        command: "batchExecutionProgress",
        current: this.currentBatchIndex + 1,
        total: this.batchExecutionQueue.length,
        completed: this.batchCompletedCount,
        skipped: this.batchSkippedCount,
      });
    }

    // Execute the task
    await this.executeBatchTask(taskId);
  }

  private async executeBatchTask(taskId: string) {
    try {
      // Check if task is already running to prevent duplicate execution
      if (this.claudeTerminals.has(taskId)) {
        // Skip this task and move to next
        this.batchSkippedCount++;
        if (this.panel) {
          this.panel.webview.postMessage({
            command: "batchTaskCompleted",
            taskId,
            success: false,
          });
        }
        this.currentBatchIndex++;
        await this.executeNextBatchTask();
        return;
      }

      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Get CLI status and selected provider
      const config = vscode.workspace.getConfiguration("kaiban");
      const selectionMode = config.get<CLISelectionMode>("cli.defaultProvider", "auto");
      const status =
        this.cachedCLIStatus ||
        (await this.cliDetectionService.getCLIAvailabilityStatus(selectionMode));

      if (!status.hasAvailableCLI || !status.selectedProvider) {
        throw new Error("No CLI available for batch execution");
      }

      const selectedCLI = status.selectedProvider;

      // Get CLI-specific configuration
      const cliConfig = this.cliDetectionService.getCLIConfig(selectedCLI, {
        get: <T>(key: string, defaultValue: T) => config.get<T>(key, defaultValue),
      });

      // Build command
      const taskInstruction = cliConfig.promptTemplate.replace("{taskFile}", task.filePath);
      const flags = cliConfig.additionalFlags ? `${cliConfig.additionalFlags} ` : "";
      let fullCommand: string;

      // For Claude, check if we should use ralph-loop
      if (selectedCLI === "claude") {
        const useRalphLoop = config.get<boolean>("claude.useRalphLoop", true);
        const ralphCommand = config.get<string>("ralph.command", "/ralph-loop:ralph-loop");
        const maxIterations = config.get<number>("ralph.maxIterations", 5);
        const completionPromise = config.get<string>("ralph.completionPromise", "TASK COMPLETE");

        if (useRalphLoop) {
          const escapedInstruction = taskInstruction.replace(/"/g, '\\"');
          const escapedPromise = completionPromise.replace(/"/g, '\\"');
          const ralphCmd = `${ralphCommand} \\"${escapedInstruction}\\" --completion-promise \\"${escapedPromise}\\" --max-iterations ${maxIterations}`;
          fullCommand = `${cliConfig.executablePath} ${flags}"${ralphCmd}"`;
        } else {
          fullCommand = `${cliConfig.executablePath} ${flags}"${taskInstruction}"`;
        }
      } else {
        fullCommand = `${cliConfig.executablePath} ${flags}"${taskInstruction}"`;
      }

      // Get workspace folder
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const cwd = workspaceFolders?.[0]?.uri.fsPath;

      // Create terminal
      const terminalName = `Batch (${getCLIDisplayName(selectedCLI)}): ${task.label.substring(0, 15)}`;
      const terminal = vscode.window.createTerminal({
        name: terminalName,
        cwd: cwd,
      });

      // Store terminal reference
      this.claudeTerminals.set(taskId, terminal);

      terminal.show();
      terminal.sendText(fullCommand);

      // Update task status - keep in AI Review if already there, otherwise move to In Progress
      if (task.status !== "AI Review") {
        await this.taskParser.updateTaskStatus(taskId, "In Progress");
      }

      // Set up completion tracking for batch
      this.watchForBatchCompletion(taskId);

      // Start transcript monitoring for Claude CLI (real-time progress)
      if (selectedCLI === "claude" && cwd) {
        this.startTranscriptMonitoring(taskId, cwd);
      }

      // Refresh board
      await this.refresh();
    } catch (_error) {
      // Task failed - mark as skipped and continue
      this.batchSkippedCount++;

      if (this.panel) {
        this.panel.webview.postMessage({
          command: "batchTaskCompleted",
          taskId,
          success: false,
        });
      }

      // Move to next task
      this.currentBatchIndex++;
      await this.executeNextBatchTask();
    }
  }

  private watchForBatchCompletion(taskId: string) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const tasksPath = vscode.Uri.joinPath(workspaceFolders[0].uri, ".agent", "TASKS");
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(tasksPath, "**/*.md")
    );

    const checkCompletion = async () => {
      if (this.batchExecutionCancelled) return;

      // Guard against race condition - if watcher is already cleaned up,
      // another trigger already processed this completion
      if (!this.completionWatchers.has(taskId)) return;

      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);

      if (task && (task.status === "Done" || task.status === "Human Review")) {
        // Task completed successfully
        this.cleanupTaskTracking(taskId, true);
        this.batchCompletedCount++;

        if (this.panel) {
          this.panel.webview.postMessage({
            command: "batchTaskCompleted",
            taskId,
            success: true,
          });
        }

        // Move to next task
        this.currentBatchIndex++;
        await this.executeNextBatchTask();
        await this.refresh();
      }
    };

    watcher.onDidChange(checkCompletion);
    this.completionWatchers.set(taskId, watcher);
    this.context.subscriptions.push(watcher);

    // Poll every 10 seconds (same as existing)
    const pollInterval = setInterval(async () => {
      await checkCompletion();
    }, 10000);

    this.completionPollers.set(taskId, pollInterval);

    // Timeout after configured time - skip task and continue
    const cfg = this.getClaudeConfig();
    const timeoutMs = cfg.executionTimeout * 60 * 1000;
    setTimeout(() => {
      if (this.completionWatchers.has(taskId) && this.isBatchExecuting) {
        this.cleanupTaskTracking(taskId, true);
        this.batchSkippedCount++;

        if (this.panel) {
          this.panel.webview.postMessage({
            command: "batchTaskCompleted",
            taskId,
            success: false,
          });
        }

        this.currentBatchIndex++;
        this.executeNextBatchTask();
      }
    }, timeoutMs);
  }

  private async handleCancelBatchExecution() {
    if (!this.isBatchExecuting) return;

    this.batchExecutionCancelled = true;

    // Stop current task's terminal
    const currentTaskId = this.batchExecutionQueue[this.currentBatchIndex];
    if (currentTaskId) {
      const terminal = this.claudeTerminals.get(currentTaskId);
      if (terminal) {
        terminal.dispose();
      }
      this.cleanupTaskTracking(currentTaskId, true);
    }

    vscode.window.showInformationMessage("Batch execution cancelled");
  }

  private finishBatchExecution(wasCancelled: boolean) {
    this.isBatchExecuting = false;

    const message = wasCancelled
      ? `Batch execution cancelled. Completed: ${this.batchCompletedCount}, Remaining: ${this.batchExecutionQueue.length - this.currentBatchIndex}`
      : `Batch execution complete. Completed: ${this.batchCompletedCount}, Skipped: ${this.batchSkippedCount}`;

    vscode.window.showInformationMessage(message);

    if (this.panel) {
      if (wasCancelled) {
        this.panel.webview.postMessage({
          command: "batchExecutionCancelled",
          current: this.currentBatchIndex,
          total: this.batchExecutionQueue.length,
          completed: this.batchCompletedCount,
        });
      } else {
        this.panel.webview.postMessage({
          command: "batchExecutionComplete",
          total: this.batchExecutionQueue.length,
          completed: this.batchCompletedCount,
          skipped: this.batchSkippedCount,
        });
      }
    }

    // Reset state
    this.batchExecutionQueue = [];
    this.currentBatchIndex = 0;
    this.batchCompletedCount = 0;
    this.batchSkippedCount = 0;

    // Final refresh
    this.refresh();
  }

  // ============ End Batch Execution Methods ============

  private async loadPRDContentRaw(prdPath: string): Promise<string> {
    // Get PRD base path from configuration
    const config = vscode.workspace.getConfiguration("kaiban.prd");
    const basePath = config.get<string>("basePath", ".agent/PRDS");

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return "";

    for (const folder of workspaceFolders) {
      // Extract relative path after base path directory
      let relativePrdPath = prdPath;
      const basePathDir = path.basename(basePath);

      if (prdPath.includes(`${basePathDir}/`)) {
        const index = prdPath.indexOf(`${basePathDir}/`);
        relativePrdPath = prdPath.substring(index + basePathDir.length + 1);
      } else if (prdPath.startsWith("../") || prdPath.startsWith("./")) {
        const parts = prdPath.split("/");
        let startIndex = 0;
        for (let i = 0; i < parts.length; i++) {
          if (parts[i] !== ".." && parts[i] !== "." && parts[i] !== "") {
            startIndex = i;
            break;
          }
        }
        if (parts[startIndex] === basePathDir) {
          relativePrdPath = parts.slice(startIndex + 1).join("/");
        } else {
          relativePrdPath = parts.slice(startIndex).join("/");
        }
      }

      // Resolve from configured base path
      try {
        const baseUri = vscode.Uri.joinPath(folder.uri, basePath);
        const prdUri = vscode.Uri.joinPath(baseUri, relativePrdPath);
        const document = await vscode.workspace.openTextDocument(prdUri);
        return document.getText();
      } catch {}

      // Fallback: resolve relative to workspace root
      if (!prdPath.startsWith("/") && !prdPath.startsWith("http")) {
        try {
          const prdUri = vscode.Uri.joinPath(folder.uri, prdPath);
          const document = await vscode.workspace.openTextDocument(prdUri);
          return document.getText();
        } catch {}
      }
    }
    return "";
  }

  private renderMarkdown(content: string): string {
    // Simple markdown rendering - convert basic elements
    let html = content
      // Headers
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Code blocks
      .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      // Inline code
      .replace(/`(.*?)`/g, "<code>$1</code>")
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    // Wrap in paragraph tags
    html = `<p>${html}</p>`;

    return html;
  }

  private async getWebviewContent(groupedTasks: Record<string, Task[]>): Promise<string> {
    // All possible columns
    const allColumns = [
      "Backlog",
      "Planning",
      "In Progress",
      "AI Review",
      "Human Review",
      "Done",
      "Archived",
      "Blocked",
    ];

    // Get configured columns from settings
    const config = vscode.workspace.getConfiguration("kaiban.columns");
    const enabledColumns = config.get<string[]>("enabled", [
      "Backlog",
      "Planning",
      "In Progress",
      "AI Review",
      "Human Review",
      "Done",
    ]);

    // Sort function: Order first (ascending), then priority (High > Medium > Low)
    const sortTasksByOrderAndPriority = (tasks: Task[]) => {
      const priorityOrder = { High: 0, Medium: 1, Low: 2 };
      return tasks.sort((a, b) => {
        // If both have order, sort by order first
        if (a.order !== undefined && b.order !== undefined) {
          if (a.order !== b.order) {
            return a.order - b.order;
          }
          // Same order, fallback to priority
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        // If only one has order, it comes first
        if (a.order !== undefined && b.order === undefined) {
          return -1;
        }
        if (a.order === undefined && b.order !== undefined) {
          return 1;
        }
        // Neither has order, sort by priority
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    };

    // Sort tasks for ALL columns (not just enabled ones)
    const columnTasks: Record<string, Task[]> = {};
    let totalTasks = 0;
    for (const column of allColumns) {
      const sorted = sortTasksByOrderAndPriority([...(groupedTasks[column] || [])]);
      columnTasks[column] = sorted;
      // Only count tasks in enabled columns for isEmpty check
      if (enabledColumns.includes(column)) {
        totalTasks += sorted.length;
      }
    }

    const isEmpty = totalTasks === 0;

    // Track which tasks are currently running via Claude terminal
    const terminalRunningIds = new Set(this.claudeTerminals.keys());

    // Track tasks with active review terminal
    const reviewTerminalIds = new Set(this.reviewTerminals.keys());

    // Track tasks with active review in progress (state-based)
    const reviewInProgressIds = new Set(
      [...this.activeReviewStates.entries()]
        .filter(([, state]) => state.status === "in_progress")
        .map(([id]) => id)
    );

    const renderTask = (task: Task) => {
      console.log(`[RenderTask] Task ${task.id}: prdPath="${task.prdPath}"`);
      const priorityClass = task.priority.toLowerCase();
      const completedClass = task.completed ? "completed" : "";
      const isInPlanning = task.status === "Planning";
      const isInProgress = task.status === "In Progress";
      const isInAIReview = task.status === "AI Review";

      // Combined running state: terminal OR review in progress OR review terminal (but not if already Done)
      const isRunningViaTerminal = terminalRunningIds.has(task.id) && task.status !== "Done";
      const isRunningViaReviewState = reviewInProgressIds.has(task.id) && task.status !== "Done";
      const isRunningViaReviewTerminal = reviewTerminalIds.has(task.id) && task.status !== "Done";
      const isRunning =
        isRunningViaTerminal || isRunningViaReviewState || isRunningViaReviewTerminal;
      const runningClass = isRunning ? "running" : "";

      const canExecuteViaClaude =
        (isInPlanning || isInProgress || isInAIReview) && !isRunning && task.status !== "Done";

      // Get review badge for AI Review column
      const reviewBadge = isInAIReview ? this.renderReviewBadge(task.id) : "";

      return `
        <div class="task-card ${priorityClass} ${completedClass} ${runningClass}"
             draggable="true"
             data-filepath="${task.filePath}"
             data-task-id="${task.id}"
             data-prd-path="${this.escapeHtml(task.prdPath || "")}"
             data-status="${task.status}"
             data-label="${this.escapeHtml(task.label)}"
             data-description="${this.escapeHtml(task.description || "")}"
             data-order="${task.order !== undefined ? task.order : ""}">
          <div class="task-header">
            <span class="task-title">${this.escapeHtml(task.label)}</span>
            ${canExecuteViaClaude || isRunning ? `<button class="play-stop-btn${isRunning ? " running" : ""}" onclick="event.stopPropagation(); toggleExecution('${task.id}')" title="${isRunning ? "Stop execution" : "Execute via Claude CLI"}">${isRunning ? "⏹" : "▶"}</button>${!isRunning ? `<button class="rate-limit-btn" onclick="event.stopPropagation(); triggerRateLimitFromUI('${task.id}')" title="Set rate limit wait timer">⏱</button>` : ""}` : ""}
          </div>
          <div class="task-meta">
            <span class="badge priority-${priorityClass}">${task.priority}</span>
            <span class="badge type">${task.type}</span>
            ${task.rejectionCount > 0 ? `<span class="badge rejection-badge">${Icons.rotateCcw(14)} ${task.rejectionCount}</span>` : ""}
            ${reviewBadge}
          </div>
          <div class="task-footer">
            <span class="project-name">${this.escapeHtml(task.project)}</span>
          </div>
        </div>
      `;
    };

    // Get webview URIs for external CSS and JS files
    const styleUri = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "styles.css")
    );
    const scriptUri = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "kanban.js")
    );
    const xtermCssUri = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "xterm.css")
    );
    const xtermJsUri = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "xterm.js")
    );
    const xtermFitUri = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "addon-fit.js")
    );
    const xtermWebLinksUri = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "addon-web-links.js")
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kanban Board</title>
  <link rel="stylesheet" href="${styleUri}">
  <link rel="stylesheet" href="${xtermCssUri}">
</head>
<body>
    <div class="header">
      <div class="title">Kaiban Board</div>
      <!-- Claude Quota Widget -->
      <div class="quota-widget" id="quotaWidget">
        <div class="quota-loading" id="quotaLoading">
          ${Icons.refresh(14)} Loading...
        </div>
        <div class="quota-content" id="quotaContent" style="display: none;">
          <!-- Primary bar (always visible) -->
          <div class="quota-primary">
            <span class="quota-label">5h</span>
            <div class="quota-bar">
              <div class="quota-bar-fill" id="quota5h" data-status="good"></div>
            </div>
            <span class="quota-value" id="quota5hValue">0%</span>
          </div>
          <!-- Expanded bars (visible on hover) -->
          <div class="quota-expanded">
            <div class="quota-bar-group" title="7-day weekly limit">
              <span class="quota-label">7d</span>
              <div class="quota-bar">
                <div class="quota-bar-fill" id="quota7d" data-status="good"></div>
              </div>
              <span class="quota-value" id="quota7dValue">0%</span>
            </div>
            <div class="quota-bar-group quota-sonnet-group" id="quotaSonnetGroup" title="7-day Sonnet limit">
              <span class="quota-label">S</span>
              <div class="quota-bar">
                <div class="quota-bar-fill" id="quotaSonnet" data-status="good"></div>
              </div>
              <span class="quota-value" id="quotaSonnetValue">0%</span>
            </div>
            <button class="quota-refresh-btn" onclick="refreshClaudeQuota()" title="Refresh quota">
              ${Icons.refresh(12)}
            </button>
          </div>
        </div>
        <div class="quota-error" id="quotaError" style="display: none;">
          <span class="quota-error-text" id="quotaErrorText"></span>
        </div>
      </div>
      <!-- Codex Quota Widget -->
      <div class="quota-widget codex-quota-widget" id="codexQuotaWidget">
        <div class="quota-loading" id="codexQuotaLoading">
          ${Icons.refresh(14)} Codex...
        </div>
        <div class="quota-content" id="codexQuotaContent" style="display: none;">
          <!-- Primary bar (5h session limit - always visible) -->
          <div class="quota-primary">
            <span class="quota-label codex-label">CX</span>
            <div class="quota-bar">
              <div class="quota-bar-fill" id="codexQuota5h" data-status="good"></div>
            </div>
            <span class="quota-value" id="codexQuota5hValue">0%</span>
          </div>
          <!-- Expanded bars (visible on hover) -->
          <div class="quota-expanded">
            <div class="quota-bar-group" title="7-day weekly limit">
              <span class="quota-label">7d</span>
              <div class="quota-bar">
                <div class="quota-bar-fill" id="codexQuota7d" data-status="good"></div>
              </div>
              <span class="quota-value" id="codexQuota7dValue">0%</span>
            </div>
            <div class="quota-bar-group codex-review-group" id="codexReviewGroup" title="Code review limit">
              <span class="quota-label">CR</span>
              <div class="quota-bar">
                <div class="quota-bar-fill" id="codexQuotaReview" data-status="good"></div>
              </div>
              <span class="quota-value" id="codexQuotaReviewValue">0%</span>
            </div>
            <button class="quota-refresh-btn" onclick="refreshCodexQuota()" title="Refresh Codex quota">
              ${Icons.refresh(12)}
            </button>
          </div>
        </div>
        <div class="quota-error" id="codexQuotaError" style="display: none;">
          <span class="quota-error-text" id="codexQuotaErrorText"></span>
        </div>
      </div>
      ${
        !isEmpty
          ? `<div class="header-actions">
        <button class="action-btn secondary-btn icon-btn" onclick="createTask()" title="Create new task">
          ${Icons.plus(16)}
        </button>
        <select class="action-btn secondary-btn" id="sortSelect" onchange="onSortChange()" title="Sort tasks">
          <option value="order-asc">Order ↑</option>
          <option value="order-desc">Order ↓</option>
          <option value="priority-asc">Priority ↑</option>
          <option value="priority-desc">Priority ↓</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
        </select>
        <div class="settings-dropdown">
          <button class="action-btn secondary-btn icon-btn" onclick="toggleSettingsPanel(event)" title="Settings">
            ${Icons.settings(16)}
          </button>
          <div class="settings-panel" id="settingsPanel" onclick="event.stopPropagation()">
            <h4>Columns</h4>
            ${allColumns
              .map(
                (col) => `
            <label class="column-toggle" onclick="event.stopPropagation()">
              <input type="checkbox"
                     data-column="${col}"
                     ${enabledColumns.includes(col) ? "checked" : ""}
                     onchange="event.stopPropagation(); toggleColumn('${col}', this.checked)">
              ${col}
            </label>`
              )
              .join("")}
            <div class="settings-divider"></div>
            <a class="settings-link" onclick="initializeProject()">Initialize Project...</a>
            <a class="settings-link" onclick="openSettings()">More Settings...</a>
          </div>
        </div>
        <button class="action-btn secondary-btn icon-btn" onclick="refresh()" title="Refresh">
          ${Icons.refresh(16)}
        </button>
      </div>`
          : ""
      }
    </div>

  <div class="board" id="kanbanBoard" style="grid-template-columns: repeat(${enabledColumns.length}, minmax(200px, 1fr));">
    ${
      isEmpty
        ? `
    <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; padding: 40px;">
      <div class="empty-state-setup">
        <h3>Welcome to Kaiban Board!</h3>
        <p>Set up your project structure to get started:</p>

        <div class="onboarding-actions" style="margin: 24px 0; display: flex; justify-content: center;">
          <button class="action-btn primary-btn" onclick="initializeProject()" title="Initialize Project Structure" style="font-size: 14px; padding: 10px 20px;">
            ${Icons.folder(16)} Initialize Project Structure
          </button>
        </div>

        <p style="font-size: 13px; color: var(--vscode-descriptionForeground); margin-bottom: 12px;">
          This will create:
        </p>
        <ul style="text-align: left; list-style: none; padding: 0; margin: 0 auto; max-width: 300px;">
          <li style="padding: 4px 0;"><code>.agent/TASKS</code> - Your task files</li>
          <li style="padding: 4px 0;"><code>.agent/PRDS</code> - Product requirement documents</li>
          <li style="padding: 4px 0;"><code>.agent/SESSIONS</code> - Session logs</li>
          <li style="padding: 4px 0;"><code>.agent/SYSTEM</code> - System configuration</li>
        </ul>

        <div class="onboarding-actions" style="margin-top: 24px; display: flex; gap: 12px; justify-content: center;">
          <button class="action-btn secondary-btn" onclick="openExtensionSettings()" title="Settings">
            ${Icons.settings(16)} Settings
          </button>
          <button class="action-btn secondary-btn" onclick="refresh()" title="Refresh">
            ${Icons.refresh(16)} Refresh
          </button>
        </div>
      </div>
    </div>
        `
        : `
${allColumns
  .map((column) => {
    const tasks = columnTasks[column];
    const columnClass = column.toLowerCase().replace(/\s+/g, "-");
    const isHidden = !enabledColumns.includes(column);
    const emptyMessages: Record<string, string> = {
      Backlog: "Drop tasks here to add to backlog",
      Planning: "Tasks being planned by agents",
      "In Progress": "Tasks being executed",
      "AI Review": "Tasks awaiting AI review",
      "Human Review": "Tasks awaiting human review",
      Done: "No completed tasks",
      Archived: "No archived tasks",
      Blocked: "No blocked tasks",
    };
    const emptyMessage = emptyMessages[column];

    return `
    <div class="column column-${columnClass}${isHidden ? " hidden" : ""}" data-status="${column}">
      <div class="column-header">
        <span>${column}</span>
        <div class="column-header-actions">
          ${
            column === "Planning" && tasks.length > 0
              ? `<button class="play-all-btn" onclick="event.stopPropagation(); toggleBatchExecution()" title="Execute all tasks via Claude CLI">
                  ${Icons.play(12)} Play All
                </button>`
              : ""
          }
          <span class="column-count">${tasks.length}</span>
        </div>
      </div>
      <div class="column-content">
        ${
          tasks.length > 0
            ? tasks.map(renderTask).join("")
            : `<div class="empty-state">${emptyMessage}</div>`
        }
      </div>
    </div>`;
  })
  .join("")}
        `
    }

    <div class="prd-sidebar" id="prdPanel" style="display: none; visibility: hidden;">
      <div class="prd-header">
        <span id="prdHeaderTitle">PRD Preview</span>
        <div class="prd-actions">
          <!-- View mode buttons -->
          <button class="edit-prd-btn" id="editPrdBtn" onclick="togglePrdEditMode()" title="Edit PRD" style="display: none;">${Icons.edit(14)} Edit</button>
          <button class="create-prd-btn" id="createPrdBtn" onclick="createPRD()" title="Create PRD" style="display: none;">${Icons.plus(14)} Create PRD</button>
          <button class="play-prd-btn" id="playPrdBtn" onclick="executePRD()" title="Execute via Claude CLI" style="display: none;">▶ Execute</button>
          <!-- Edit mode buttons -->
          <button class="edit-btn edit-btn-cancel" id="cancelPrdBtn" onclick="cancelPrdEdit()" style="display: none;">Cancel</button>
          <button class="edit-btn edit-btn-save" id="savePrdBtn" onclick="savePrdEdit()" style="display: none;">Save</button>
          <button class="close-prd-btn" onclick="closePRD()" title="Close PRD Panel">×</button>
        </div>
      </div>
      <!-- PRD Edit Container (hidden by default) -->
      <div class="prd-edit-container" id="prdEditContainer" style="display: none;">
        <textarea class="prd-edit-textarea" id="prdEditTextarea" placeholder="Write your PRD in markdown..."></textarea>
      </div>
      <div class="prd-content" id="prdContent">
        <div class="prd-placeholder">Select a task to view its PRD</div>
      </div>
    </div>

    <div class="terminal-panel" id="terminalPanel" style="display: none; visibility: hidden;">
      <div class="terminal-header">
        <div class="terminal-title">
          <span id="terminalHeaderTitle">Terminal</span>
          <span class="terminal-status" id="terminalStatus"></span>
        </div>
        <div class="terminal-actions">
          <button class="terminal-btn" id="terminalClearBtn" onclick="clearEmbeddedTerminal()" title="Clear terminal">Clear</button>
          <button class="terminal-btn" id="terminalToggleBtn" onclick="toggleTerminal()" title="Collapse/Expand terminal">−</button>
          <button class="terminal-btn" id="terminalCloseBtn" onclick="closeTerminal()" title="Close terminal">×</button>
        </div>
      </div>
      <div class="terminal-tabs" id="terminalTabs"></div>
      <div class="terminal-xterm-container" id="terminalXtermContainer"></div>
      <div class="terminal-content" id="terminalContent" style="display:none;">
        <div class="terminal-output-line info">Terminal ready. Execute commands to see output here.</div>
      </div>
    </div>
  </div>

  <!-- Stop Execution Confirmation Modal -->
  <div class="modal-overlay" id="stopExecutionModal" style="display: none;">
    <div class="modal">
      <h3>Stop Task Execution?</h3>
      <p>Moving "<span id="stopExecutionTaskName"></span>" out of the Doing column will stop the terminal execution and interrupt the task.</p>
      <p style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 8px;">Are you sure you want to continue?</p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" id="stopExecutionCancel" onclick="cancelStopExecution()">Cancel</button>
        <button class="modal-btn modal-btn-send" id="stopExecutionConfirm" onclick="confirmStopExecution()">Stop & Move</button>
      </div>
    </div>
  </div>

  <!-- Batch Progress Banner -->
  <div class="batch-progress-banner" id="batchProgressBanner" style="display: none;">
    <div class="batch-progress-content">
      <span class="batch-progress-icon">${Icons.rotateCcw(16)}</span>
      <span>Running: <span id="batchProgressCurrent">0</span>/<span id="batchProgressTotal">0</span></span>
      <span class="batch-progress-stats">(Completed: <span id="batchCompleted">0</span>, Skipped: <span id="batchSkipped">0</span>)</span>
    </div>
    <button class="batch-cancel-btn" onclick="cancelBatchExecution()">Cancel</button>
  </div>

  <!-- Rate Limit Banner -->
  <div class="rate-limit-banner" id="rateLimitBanner">
    <div class="rate-limit-banner-content">
      <span>${Icons.clock(20)}</span>
      <span class="rate-limit-banner-timer" id="rateLimitTimer">00:00</span>
      <span class="rate-limit-banner-task">Rate limit - waiting to retry: <span id="rateLimitTaskName"></span></span>
    </div>
    <div class="rate-limit-banner-actions">
      <button class="retry-btn" onclick="retryRateLimitNow()">Retry Now</button>
      <button class="cancel-btn" onclick="cancelRateLimitWait()">Cancel</button>
    </div>
  </div>
  <script src="${xtermJsUri}"></script>
  <script src="${xtermFitUri}"></script>
  <script src="${xtermWebLinksUri}"></script>
  <script src="${scriptUri}"></script>
  <script>
    // Embedded terminal management
    (function() {
      const vscodeApi = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : null;
      const terminals = {}; // taskId -> { term, fitAddon, container }
      let activeTerminalId = null;

      function getOrCreateTerminal(taskId, label, agent) {
        if (terminals[taskId]) {
          switchToTerminal(taskId);
          return terminals[taskId];
        }

        const container = document.createElement('div');
        container.id = 'xterm-' + taskId;
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.display = 'none';
        document.getElementById('terminalXtermContainer').appendChild(container);

        const term = new window.Terminal({
          theme: {
            background: '#1e1e1e',
            foreground: '#d4d4d4',
            cursor: '#d4d4d4',
          },
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          fontSize: 13,
          cursorBlink: true,
          convertEol: true,
        });

        const fitAddon = new window.FitAddon.FitAddon();
        term.loadAddon(fitAddon);

        try {
          const webLinksAddon = new window.WebLinksAddon.WebLinksAddon();
          term.loadAddon(webLinksAddon);
        } catch(e) { /* optional */ }

        term.open(container);
        fitAddon.fit();

        // Send input back to extension
        term.onData(function(data) {
          if (vscodeApi) {
            vscodeApi.postMessage({ command: 'terminal-input', taskId: taskId, data: data });
          }
        });

        terminals[taskId] = { term, fitAddon, container, label, agent, exited: false, exitCode: null };
        updateTerminalTabs();
        switchToTerminal(taskId);

        // Show terminal panel
        const panel = document.getElementById('terminalPanel');
        if (panel) {
          panel.style.display = '';
          panel.style.visibility = 'visible';
        }

        return terminals[taskId];
      }

      function switchToTerminal(taskId) {
        for (const [id, t] of Object.entries(terminals)) {
          t.container.style.display = id === taskId ? 'block' : 'none';
        }
        activeTerminalId = taskId;
        const t = terminals[taskId];
        if (t) {
          t.fitAddon.fit();
          document.getElementById('terminalHeaderTitle').textContent = t.label + ' — ' + t.agent;
          const statusEl = document.getElementById('terminalStatus');
          if (t.exited) {
            statusEl.textContent = t.exitCode === 0 ? '✅ Done' : '❌ Failed (' + t.exitCode + ')';
            statusEl.className = 'terminal-status ' + (t.exitCode === 0 ? 'done' : 'failed');
          } else {
            statusEl.textContent = '⟳ Running';
            statusEl.className = 'terminal-status running';
          }
        }
        updateTerminalTabs();
      }

      function updateTerminalTabs() {
        const tabsEl = document.getElementById('terminalTabs');
        if (!tabsEl) return;
        tabsEl.innerHTML = '';
        for (const [id, t] of Object.entries(terminals)) {
          const tab = document.createElement('button');
          tab.className = 'terminal-tab' + (id === activeTerminalId ? ' active' : '') + (t.exited ? (t.exitCode === 0 ? ' done' : ' failed') : ' running');
          tab.textContent = t.label.substring(0, 20);
          tab.title = t.label + ' (' + t.agent + ')';
          tab.onclick = function() { switchToTerminal(id); };

          const closeBtn = document.createElement('span');
          closeBtn.className = 'terminal-tab-close';
          closeBtn.textContent = '×';
          closeBtn.onclick = function(e) {
            e.stopPropagation();
            removeTerminal(id);
          };
          tab.appendChild(closeBtn);
          tabsEl.appendChild(tab);
        }
      }

      function removeTerminal(taskId) {
        const t = terminals[taskId];
        if (!t) return;
        if (!t.exited && vscodeApi) {
          vscodeApi.postMessage({ command: 'terminal-kill', taskId: taskId });
        }
        t.term.dispose();
        t.container.remove();
        delete terminals[taskId];
        if (activeTerminalId === taskId) {
          const remaining = Object.keys(terminals);
          if (remaining.length > 0) {
            switchToTerminal(remaining[0]);
          } else {
            activeTerminalId = null;
            const panel = document.getElementById('terminalPanel');
            if (panel) {
              panel.style.display = 'none';
              panel.style.visibility = 'hidden';
            }
          }
        }
        updateTerminalTabs();
      }

      // Listen for messages from extension
      window.addEventListener('message', function(event) {
        const msg = event.data;
        if (msg.command === 'terminal-started') {
          getOrCreateTerminal(msg.taskId, msg.label, msg.agent);
        } else if (msg.command === 'terminal-output') {
          const t = terminals[msg.taskId];
          if (t) t.term.write(msg.data);
        } else if (msg.command === 'terminal-exit') {
          const t = terminals[msg.taskId];
          if (t) {
            t.exited = true;
            t.exitCode = msg.exitCode;
            t.term.write('\\r\\n\\x1b[90m--- Process exited with code ' + msg.exitCode + ' ---\\x1b[0m\\r\\n');
            if (activeTerminalId === msg.taskId) {
              const statusEl = document.getElementById('terminalStatus');
              if (msg.exitCode === 0) {
                statusEl.textContent = '✅ Done';
                statusEl.className = 'terminal-status done';
              } else {
                statusEl.textContent = '❌ Failed (' + msg.exitCode + ')';
                statusEl.className = 'terminal-status failed';
              }
            }
            updateTerminalTabs();
          }
        }
      });

      // Resize observer for fit
      const resizeObserver = new ResizeObserver(function() {
        if (activeTerminalId && terminals[activeTerminalId]) {
          terminals[activeTerminalId].fitAddon.fit();
        }
      });
      const xtermContainer = document.getElementById('terminalXtermContainer');
      if (xtermContainer) resizeObserver.observe(xtermContainer);

      // Expose clear function
      window.clearEmbeddedTerminal = function() {
        if (activeTerminalId && terminals[activeTerminalId]) {
          terminals[activeTerminalId].term.clear();
        }
      };

      // Expose for external use
      window.embeddedTerminals = { getOrCreateTerminal, switchToTerminal, removeTerminal, terminals };
    })();
  </script>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Render review badge for tasks in AI Review column
   */
  private renderReviewBadge(taskId: string): string {
    const reviewState = this.activeReviewStates.get(taskId);

    if (!reviewState) {
      return '<span class="badge review-badge pending" data-review-status="pending">⏳ Pending</span>';
    }

    switch (reviewState.status) {
      case "in_progress":
        return '<span class="badge review-badge reviewing" data-review-status="in_progress">⟳ Reviewing</span>';
      case "completed":
        if (reviewState.result?.overallRating === "pass") {
          return '<span class="badge review-badge passed" data-review-status="passed">✓ Passed</span>';
        }
        if (reviewState.result?.overallRating === "critical_issues") {
          return '<span class="badge review-badge failed" data-review-status="critical_issues">✗ Issues</span>';
        }
        return '<span class="badge review-badge needs-work" data-review-status="needs_work">⚠ Needs Work</span>';
      case "failed":
        return '<span class="badge review-badge failed" data-review-status="failed">✗ Failed</span>';
      default:
        return '<span class="badge review-badge pending" data-review-status="pending">⏳ Pending</span>';
    }
  }

  // ============ GitHub Integration Handlers ============

  /**
   * Get GitHub CLI status
   */
  private async handleGetGitHubStatus(): Promise<void> {
    if (!this.panel || !this.githubService) return;

    try {
      const status = await this.githubService.getStatus();
      this.panel.webview.postMessage({
        command: "githubStatusUpdate",
        data: status,
      });
    } catch (error) {
      this.panel.webview.postMessage({
        command: "githubStatusError",
        error: String(error),
      });
    }
  }

  /**
   * Import GitHub issues as tasks
   */
  private async handleImportGitHubIssues(options?: {
    limit?: number;
    state?: "open" | "closed" | "all";
    labels?: string[];
  }): Promise<void> {
    if (!this.panel || !this.githubService) {
      vscode.window.showErrorMessage("GitHub service not available");
      return;
    }

    try {
      const issues = await this.githubService.listIssues(options);

      if (issues.length === 0) {
        vscode.window.showInformationMessage("No issues found matching criteria");
        return;
      }

      // Show quick pick to select issues
      const items = issues.map((issue: GitHubIssue) => ({
        label: `#${issue.number} ${issue.title}`,
        description: issue.labels.join(", "),
        picked: true,
        issue,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: "Select issues to import as tasks",
      });

      if (!selected || selected.length === 0) return;

      // Get tasks path
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace folder open");
        return;
      }

      const config = vscode.workspace.getConfiguration("kaiban.task");
      const tasksPath = path.join(
        workspaceFolders[0].uri.fsPath,
        config.get<string>("basePath", ".agent/TASKS")
      );

      // Create tasks from selected issues
      const fs = await import("node:fs");
      let createdCount = 0;

      for (const item of selected) {
        const { filePath, content } = this.githubService.generateTaskFromIssue(
          item.issue,
          tasksPath
        );

        // Create directory if it doesn't exist
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Write task file
        fs.writeFileSync(filePath, content, "utf-8");
        createdCount++;
      }

      vscode.window.showInformationMessage(`Imported ${createdCount} issue(s) as tasks`);
      await this.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to import issues: ${error}`);
    }
  }

  /**
   * Create a PR from a task
   */
  private async handleCreatePRFromTask(
    taskId: string,
    options?: { draft?: boolean }
  ): Promise<void> {
    if (!this.panel || !this.githubService || !this.gitWorktreeService) {
      vscode.window.showErrorMessage("Required services not available");
      return;
    }

    try {
      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);

      if (!task) {
        vscode.window.showErrorMessage(`Task ${taskId} not found`);
        return;
      }

      // Get the branch name
      let branchName: string;
      if (task.worktree?.worktreeBranch) {
        branchName = task.worktree.worktreeBranch;
      } else {
        branchName = this.gitWorktreeService.generateBranchName(taskId);
      }

      // Load PRD content if available
      let prdContent: string | undefined;
      if (task.prdPath) {
        prdContent = await this.loadPRDContentRaw(task.prdPath);
      }

      // Generate PR body
      const body = this.githubService.generatePRBody(
        task.label,
        task.description,
        prdContent,
        task.github?.issueNumber
      );

      const result = await this.githubService.createPR(branchName, {
        title: task.label,
        body,
        draft: options?.draft ?? false,
        autoFill: true,
      });

      if (result.success && result.pr) {
        // Update task with PR metadata
        this.taskParser.updateTaskGitHub(taskId, {
          ...task.github,
          prUrl: result.pr.url,
          prNumber: result.pr.number,
          prState: result.pr.state as "open" | "closed" | "merged" | "draft",
          lastSynced: new Date().toISOString(),
        });

        vscode.window.showInformationMessage(`PR #${result.pr.number} created successfully`);
        await this.refresh();

        // Open PR in browser
        vscode.env.openExternal(vscode.Uri.parse(result.pr.url));
      } else {
        vscode.window.showErrorMessage(`Failed to create PR: ${result.error}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create PR: ${error}`);
    }
  }

  /**
   * Open GitHub issue in browser
   */
  private async handleOpenGitHubIssue(url: string): Promise<void> {
    if (url) {
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }
  }

  // ============ Worktree Handlers ============

  /**
   * Get worktree status for a task
   */
  private async handleGetWorktreeStatus(taskId: string): Promise<void> {
    if (!this.panel || !this.gitWorktreeService) return;

    try {
      const exists = await this.gitWorktreeService.worktreeExists(taskId);
      const worktree = exists ? await this.gitWorktreeService.getWorktreeForTask(taskId) : null;

      this.panel.webview.postMessage({
        command: "worktreeStatusUpdate",
        data: {
          taskId,
          exists,
          worktree,
        },
      });
    } catch (error) {
      this.panel.webview.postMessage({
        command: "worktreeStatusError",
        taskId,
        error: String(error),
      });
    }
  }

  /**
   * Create a worktree for a task
   */
  private async handleCreateWorktreeForTask(taskId: string): Promise<void> {
    if (!this.gitWorktreeService) {
      vscode.window.showErrorMessage("Git worktree service not available");
      return;
    }

    try {
      const baseBranch = await this.gitWorktreeService.getDefaultBaseBranch();
      const result = await this.gitWorktreeService.createWorktree(taskId, baseBranch);

      if (result.success) {
        // Update task with worktree metadata
        const metadata = this.gitWorktreeService.createWorktreeMetadata(taskId, result, baseBranch);
        this.taskParser.updateTaskWorktree(taskId, metadata);

        vscode.window.showInformationMessage(`Worktree created: ${result.branchName}`);
        await this.refresh();
      } else {
        vscode.window.showErrorMessage(`Failed to create worktree: ${result.error}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create worktree: ${error}`);
    }
  }

  /**
   * Remove a worktree for a task
   */
  private async handleRemoveWorktreeForTask(taskId: string): Promise<void> {
    if (!this.gitWorktreeService) {
      vscode.window.showErrorMessage("Git worktree service not available");
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      "Remove the worktree for this task? Any uncommitted changes will be lost.",
      { modal: true },
      "Remove"
    );

    if (confirm !== "Remove") return;

    try {
      const result = await this.gitWorktreeService.removeWorktree(taskId, true);

      if (result.success) {
        // Clear worktree metadata from task
        this.taskParser.clearTaskWorktree(taskId);
        vscode.window.showInformationMessage("Worktree removed");
        await this.refresh();
      } else {
        vscode.window.showErrorMessage(`Failed to remove worktree: ${result.error}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to remove worktree: ${error}`);
    }
  }

  // ============ Merge Handlers ============

  /**
   * Start a merge for a task
   */
  private async handleStartMerge(taskId: string, options?: { useAI?: boolean }): Promise<void> {
    if (!this.gitWorktreeService || !this.gitService) {
      vscode.window.showErrorMessage("Git services not available");
      return;
    }

    try {
      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);

      if (!task?.worktree?.worktreeBranch) {
        vscode.window.showErrorMessage("No worktree branch found for this task");
        return;
      }

      const sourceBranch = task.worktree.worktreeBranch;
      const targetBranch =
        task.worktree.worktreeBaseBranch || (await this.gitWorktreeService.getDefaultBaseBranch());

      // Checkout target branch
      const checkoutResult = await this.gitService.checkout(targetBranch);
      if (!checkoutResult.success) {
        vscode.window.showErrorMessage(
          `Failed to checkout ${targetBranch}: ${checkoutResult.error}`
        );
        return;
      }

      // Start merge
      const mergeResult = await this.gitService.startMerge(sourceBranch);

      if (mergeResult.success) {
        // No conflicts - complete the merge
        const commitResult = await this.gitService.commitMerge(
          `Merge task ${taskId}: ${task.label}`
        );

        if (commitResult.success) {
          vscode.window.showInformationMessage("Merge completed successfully");
          await this.refresh();
        } else {
          vscode.window.showErrorMessage(`Failed to commit merge: ${commitResult.error}`);
        }
      } else if (mergeResult.hasConflicts) {
        // Store merge state
        const conflicts = await this.gitService.getAllConflicts();
        const mergeState: MergeState = {
          taskId,
          sourceBranch,
          targetBranch,
          status: "conflicts",
          conflicts,
          startedAt: new Date().toISOString(),
        };
        this.activeMergeStates.set(taskId, mergeState);

        // Notify webview
        if (this.panel) {
          this.panel.webview.postMessage({
            command: "mergeConflicts",
            data: {
              taskId,
              conflictCount: conflicts.reduce((sum, f) => sum + f.conflicts.length, 0),
              files: conflicts.map((c) => c.filePath),
              canUseAI:
                options?.useAI !== false && (await this.aiMergeService?.getBestProvider()) !== null,
            },
          });
        }
      } else {
        vscode.window.showErrorMessage(`Merge failed: ${mergeResult.error}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to start merge: ${error}`);
    }
  }

  /**
   * Get merge status for a task
   */
  private async handleGetMergeStatus(taskId: string): Promise<void> {
    if (!this.panel) return;

    const mergeState = this.activeMergeStates.get(taskId);
    this.panel.webview.postMessage({
      command: "mergeStatusUpdate",
      data: {
        taskId,
        state: mergeState || null,
      },
    });
  }

  /**
   * Resolve merge conflicts with AI
   */
  private async handleResolveMergeWithAI(taskId: string): Promise<void> {
    if (!this.aiMergeService || !this.gitService) {
      vscode.window.showErrorMessage("AI merge service not available");
      return;
    }

    const mergeState = this.activeMergeStates.get(taskId);
    if (!mergeState) {
      vscode.window.showErrorMessage("No active merge found for this task");
      return;
    }

    try {
      // Update state
      mergeState.status = "ai_resolving";
      this.activeMergeStates.set(taskId, mergeState);

      // Get task info for context
      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);

      // Load PRD if available
      let prdContent: string | undefined;
      if (task?.prdPath) {
        prdContent = await this.loadPRDContentRaw(task.prdPath);
      }

      // Resolve with AI
      const result = await this.aiMergeService.resolveConflicts({
        taskLabel: task?.label || taskId,
        taskDescription: task?.description || "",
        prdContent,
        conflicts: mergeState.conflicts,
      });

      if (result.success) {
        mergeState.status = "review";
        mergeState.aiResolutions = result.resolutions;
        this.activeMergeStates.set(taskId, mergeState);

        if (this.panel) {
          this.panel.webview.postMessage({
            command: "mergeAIResolution",
            data: {
              taskId,
              resolutions: result.resolutions,
              summary: result.summary,
              highConfidenceCount: result.highConfidenceCount,
              totalConflicts: result.totalConflicts,
            },
          });
        }
      } else {
        vscode.window.showErrorMessage(`AI resolution failed: ${result.error}`);
        mergeState.status = "conflicts";
        this.activeMergeStates.set(taskId, mergeState);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to resolve with AI: ${error}`);
    }
  }

  /**
   * Accept AI merge resolution
   */
  private async handleAcceptMergeResolution(taskId: string): Promise<void> {
    if (!this.aiMergeService || !this.gitService) {
      vscode.window.showErrorMessage("Required services not available");
      return;
    }

    const mergeState = this.activeMergeStates.get(taskId);
    if (!mergeState || !mergeState.aiResolutions) {
      vscode.window.showErrorMessage("No AI resolution available");
      return;
    }

    try {
      // Apply resolutions
      const applyResult = await this.aiMergeService.applyResolutions(
        mergeState.aiResolutions,
        mergeState.conflicts
      );

      if (!applyResult.success) {
        vscode.window.showWarningMessage(
          `Applied ${applyResult.appliedCount} resolutions with errors: ${applyResult.errors.join(", ")}`
        );
      }

      // Stage all files
      await this.gitService.stageAll();

      // Get task label for commit message
      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);

      // Complete the merge
      const commitResult = await this.gitService.commitMerge(
        `Merge task ${taskId}: ${task?.label || "unknown"} (AI-assisted)`
      );

      if (commitResult.success) {
        mergeState.status = "completed";
        mergeState.completedAt = new Date().toISOString();
        this.activeMergeStates.delete(taskId);

        vscode.window.showInformationMessage("Merge completed with AI assistance");
        await this.refresh();
      } else {
        vscode.window.showErrorMessage(`Failed to complete merge: ${commitResult.error}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to accept resolution: ${error}`);
    }
  }

  /**
   * Abort an active merge
   */
  private async handleAbortMerge(taskId: string): Promise<void> {
    if (!this.gitService) {
      vscode.window.showErrorMessage("Git service not available");
      return;
    }

    try {
      const result = await this.gitService.abortMerge();

      if (result.success) {
        this.activeMergeStates.delete(taskId);
        vscode.window.showInformationMessage("Merge aborted");
        await this.refresh();
      } else {
        vscode.window.showErrorMessage(`Failed to abort merge: ${result.error}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to abort merge: ${error}`);
    }
  }

  // ============ Review Handlers ============

  // Track review terminals separately
  private reviewTerminals: Map<string, vscode.Terminal> = new Map();

  /**
   * Start a code review for a task using a visible VS Code terminal
   */
  private async handleStartReview(taskId: string, options?: { useCodex?: boolean }): Promise<void> {
    if (!this.codexReviewService || !this.gitWorktreeService) {
      vscode.window.showErrorMessage("Review services not available");
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }

    const workspaceFolder = workspaceFolders[0];
    const workspacePath = workspaceFolder.uri.fsPath;

    try {
      const tasks = await this.taskParser.parseTasks();
      const task = tasks.find((t) => t.id === taskId);

      if (!task) {
        vscode.window.showErrorMessage(`Task ${taskId} not found`);
        return;
      }

      // Check if already reviewing
      if (this.reviewTerminals.has(taskId)) {
        vscode.window.showWarningMessage("Review already in progress for this task");
        const existingTerminal = this.reviewTerminals.get(taskId);
        existingTerminal?.show();
        return;
      }

      // Check Codex availability
      const codexStatus = await this.codexReviewService.getCodexStatus();
      const useCodex = options?.useCodex !== false && codexStatus.available;

      // Get diff for review
      let diff: string;
      let filesChanged: string[];

      if (task.worktree?.worktreeBranch) {
        diff = await this.gitWorktreeService.getWorktreeDiff(taskId);
        filesChanged = await this.gitWorktreeService.getChangedFiles(taskId);
      } else {
        // No worktree - try to get staged/unstaged changes
        try {
          const { exec } = await import("node:child_process");
          const { promisify } = await import("node:util");
          const execAsync = promisify(exec);
          const { stdout: diffOutput } = await execAsync("git diff HEAD", {
            cwd: workspacePath,
            maxBuffer: 5 * 1024 * 1024,
          });
          diff = diffOutput;
          const { stdout: filesOutput } = await execAsync("git diff --name-only HEAD", {
            cwd: workspacePath,
          });
          filesChanged = filesOutput.split("\n").filter(Boolean);
        } catch {
          diff = "";
          filesChanged = [];
        }
      }

      if (!diff || diff.length === 0) {
        vscode.window.showInformationMessage("No changes to review");
        return;
      }

      // Store review state
      const reviewState: ReviewState = {
        taskId,
        status: "in_progress",
        startedAt: new Date().toISOString(),
      };
      this.activeReviewStates.set(taskId, reviewState);

      // Notify webview
      if (this.panel) {
        this.panel.webview.postMessage({
          command: "reviewStarted",
          data: { taskId },
        });
      }

      // Load PRD if available
      let prdContent: string | undefined;
      if (task.prdPath) {
        prdContent = await this.loadPRDContentRaw(task.prdPath);
      }

      // Build the review prompt
      const reviewPrompt = this.codexReviewService.buildReviewPrompt({
        taskLabel: task.label,
        taskDescription: task.description || "",
        prdContent,
        diff,
        filesChanged,
        focusAreas: ["bug", "security", "performance"],
      });

      // Write prompt to temp file
      const fs = await import("node:fs");
      const promptFile = path.join(workspacePath, ".kaiban-review-prompt.txt");
      const resultFile = path.join(workspacePath, ".kaiban-review-result.json");
      fs.writeFileSync(promptFile, reviewPrompt, "utf-8");

      // Clean up old result file if exists
      try {
        fs.unlinkSync(resultFile);
      } catch {}

      // Build the command based on provider
      const cliPath = useCodex ? "codex" : "claude";
      const cliFlags = useCodex ? "" : "--print";
      const command = `cat "${promptFile}" | ${cliPath} ${cliFlags} | tee "${resultFile}" && echo "\\n✅ Review complete - results saved"`;

      // Create and show terminal
      const terminal = vscode.window.createTerminal({
        name: `🔍 Review: ${task.label.substring(0, 25)}`,
        cwd: workspacePath,
      });

      this.reviewTerminals.set(taskId, terminal);
      terminal.show();
      terminal.sendText(command);

      // Watch for terminal close to parse results
      const closeListener = vscode.window.onDidCloseTerminal(async (closedTerminal) => {
        if (closedTerminal === terminal) {
          closeListener.dispose();
          this.reviewTerminals.delete(taskId);

          // Try to parse results from file
          try {
            const resultContent = fs.readFileSync(resultFile, "utf-8");
            const result = this.parseReviewResult(
              resultContent,
              filesChanged,
              diff.split("\n").length
            );

            // Update state
            reviewState.status = "completed";
            reviewState.result = result;
            reviewState.completedAt = new Date().toISOString();
            this.activeReviewStates.set(taskId, reviewState);

            // Notify webview
            if (this.panel) {
              this.panel.webview.postMessage({
                command: "reviewComplete",
                data: {
                  taskId,
                  result,
                  formattedResult: this.codexReviewService?.formatReviewForDisplay(result) || "",
                },
              });
            }

            // Show summary
            const ratingEmoji =
              result.overallRating === "pass"
                ? "✅"
                : result.overallRating === "needs_work"
                  ? "⚠️"
                  : "❌";
            vscode.window.showInformationMessage(
              `${ratingEmoji} Review complete: ${result.overallRating} (${result.findings.length} findings)`
            );

            // Pipeline auto-advancement logic
            await this.handlePipelineReviewCompletion(taskId, result);

            // Clean up temp files
            try {
              fs.unlinkSync(promptFile);
              fs.unlinkSync(resultFile);
            } catch {}
          } catch {
            // Result file doesn't exist or couldn't be parsed
            reviewState.status = "failed";
            reviewState.error = "Review output could not be parsed";
            this.activeReviewStates.set(taskId, reviewState);

            if (this.panel) {
              this.panel.webview.postMessage({
                command: "reviewFailed",
                data: { taskId, error: "Review output could not be parsed" },
              });
            }

            // Clean up prompt file
            try {
              fs.unlinkSync(promptFile);
            } catch {}
          }

          // Refresh to update UI
          await this.refresh();
        }
      });

      // Store listener for cleanup
      this.context.subscriptions.push(closeListener);

      vscode.window.showInformationMessage(
        `🔍 Starting ${useCodex ? "Codex" : "Claude"} review for "${task.label}". Watch the terminal for progress.`
      );
    } catch (error) {
      const reviewState = this.activeReviewStates.get(taskId);
      if (reviewState) {
        reviewState.status = "failed";
        reviewState.error = String(error);
        this.activeReviewStates.set(taskId, reviewState);
      }

      if (this.panel) {
        this.panel.webview.postMessage({
          command: "reviewFailed",
          data: { taskId, error: String(error) },
        });
      }

      vscode.window.showErrorMessage(`Review failed: ${error}`);
    }
  }

  /**
   * Parse review result from CLI output
   */
  private parseReviewResult(
    response: string,
    filesChanged: string[],
    linesReviewed: number
  ): CodexReviewResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.createFallbackReviewResult(response, filesChanged, linesReviewed);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || "Review completed",
        overallRating: parsed.overallRating || "needs_work",
        findings: parsed.findings || [],
        suggestedActions: parsed.suggestedActions || [],
        filesReviewed: filesChanged,
        linesReviewed,
        reviewDuration: 0,
        reviewedAt: new Date().toISOString(),
      };
    } catch {
      return this.createFallbackReviewResult(response, filesChanged, linesReviewed);
    }
  }

  /**
   * Create fallback review result when parsing fails
   */
  private createFallbackReviewResult(
    response: string,
    filesChanged: string[],
    linesReviewed: number
  ): CodexReviewResult {
    return {
      summary: response.substring(0, 500) || "Review completed but could not parse results",
      overallRating: "needs_work",
      findings: [
        {
          type: "other",
          severity: "info",
          filePath: "general",
          description: "AI response could not be parsed. Please review manually.",
          suggestion: "Check the terminal output for details",
        },
      ],
      suggestedActions: ["Review the changes manually"],
      filesReviewed: filesChanged,
      linesReviewed,
      reviewDuration: 0,
      reviewedAt: new Date().toISOString(),
    };
  }

  /**
   * Handle pipeline auto-advancement after review completion.
   * Based on review result and configuration, either:
   * - Pass: Execute with Ralph Loop
   * - Fail + auto-retry: Retry with Claude (with review context)
   * - Fail + human-review OR max retries: Move to Human Review
   */
  private async handlePipelineReviewCompletion(
    taskId: string,
    result: CodexReviewResult
  ): Promise<void> {
    // Check if pipeline is enabled
    const pipelineConfig = vscode.workspace.getConfiguration("kaiban.pipeline");
    const pipelineEnabled = pipelineConfig.get<boolean>("enabled", true);

    if (!pipelineEnabled) {
      return; // Manual pipeline - user handles transitions
    }

    const onReviewFail = pipelineConfig.get<string>("onReviewFail", "auto-retry");
    const maxRetries = pipelineConfig.get<number>("maxRetryIterations", 2);

    if (result.overallRating === "pass") {
      // Review passed - execute with Ralph Loop for final polish
      this.clearTaskRetryCount(taskId);

      vscode.window.showInformationMessage(
        "Pipeline: Review passed! Executing with Ralph Loop for final implementation."
      );

      // Extract findings as context (even if passed, there might be minor suggestions)
      const reviewContext = {
        findings: result.findings.map(
          (f) =>
            `[${f.severity}] ${f.description}${f.suggestion ? ` - Suggestion: ${f.suggestion}` : ""}`
        ),
        summary: result.summary,
      };

      await this.handleExecuteWithRalphLoop(taskId, reviewContext);
    } else {
      // Review failed (needs_work or critical_issues)
      const retryCount = this.getTaskRetryCount(taskId);

      if (onReviewFail === "auto-retry" && retryCount < maxRetries) {
        // Auto-retry: increment count and re-execute with review context
        this.incrementTaskRetryCount(taskId);

        vscode.window.showWarningMessage(
          `Pipeline: Review found issues (attempt ${retryCount + 1}/${maxRetries}). Auto-retrying with feedback.`
        );

        // Extract findings as actionable context
        const reviewContext = {
          findings: result.findings
            .filter((f) => f.severity !== "info" && f.severity !== "low")
            .map(
              (f) =>
                `[${f.severity}] ${f.description}${f.suggestion ? ` - Fix: ${f.suggestion}` : ""}`
            ),
          summary: result.summary,
        };

        // Re-execute with Ralph Loop including the review feedback
        await this.handleExecuteWithRalphLoop(taskId, reviewContext);
      } else {
        // Human review required (either by config or max retries exceeded)
        this.clearTaskRetryCount(taskId);

        const reason =
          retryCount >= maxRetries
            ? `Max retries (${maxRetries}) exceeded`
            : "Review requires human attention";

        vscode.window.showWarningMessage(`Pipeline: ${reason}. Moving to Human Review.`);

        await this.taskParser.updateTaskStatus(taskId, "Human Review");
        await this.refresh();

        // Notify webview
        if (this.panel) {
          this.panel.webview.postMessage({
            command: "pipelineHumanReviewRequired",
            taskId,
            reason,
            reviewResult: result,
          });
        }
      }
    }
  }

  /**
   * Get review status for a task
   */
  private async handleGetReviewStatus(taskId: string): Promise<void> {
    if (!this.panel) return;

    const reviewState = this.activeReviewStates.get(taskId);
    this.panel.webview.postMessage({
      command: "reviewStatusUpdate",
      data: {
        taskId,
        state: reviewState || null,
      },
    });
  }
}
