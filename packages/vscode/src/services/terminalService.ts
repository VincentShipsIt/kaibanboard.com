import { type ChildProcess, spawn } from "node:child_process";
import type * as vscode from "vscode";

export interface TerminalProcess {
  taskId: string;
  label: string;
  agent: string;
  process: ChildProcess;
  outputLog: string[];
  startedAt: Date;
  exitCode: number | null;
  exited: boolean;
}

export interface TerminalStartOptions {
  taskId: string;
  label: string;
  agent: string;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Service for managing embedded terminal processes.
 * Spawns agent CLI commands as child processes and streams
 * stdout/stderr to the webview via postMessage.
 */
export class TerminalService {
  private processes: Map<string, TerminalProcess> = new Map();
  private webviewPanel: vscode.WebviewPanel | null = null;

  /**
   * Set the webview panel to send messages to.
   */
  setWebviewPanel(panel: vscode.WebviewPanel | null): void {
    this.webviewPanel = panel;
  }

  /**
   * Start a new terminal process for a task.
   */
  start(options: TerminalStartOptions): TerminalProcess {
    // Kill existing process for this task if any
    this.kill(options.taskId);

    const env = { ...process.env, ...options.env };

    const child = spawn(options.command, [], {
      shell: true,
      cwd: options.cwd || process.cwd(),
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const terminalProcess: TerminalProcess = {
      taskId: options.taskId,
      label: options.label,
      agent: options.agent,
      process: child,
      outputLog: [],
      startedAt: new Date(),
      exitCode: null,
      exited: false,
    };

    this.processes.set(options.taskId, terminalProcess);

    // Stream stdout
    child.stdout?.on("data", (data: Buffer) => {
      const text = data.toString();
      terminalProcess.outputLog.push(text);
      this.postMessage({
        command: "terminal-output",
        taskId: options.taskId,
        data: text,
      });
    });

    // Stream stderr
    child.stderr?.on("data", (data: Buffer) => {
      const text = data.toString();
      terminalProcess.outputLog.push(text);
      this.postMessage({
        command: "terminal-output",
        taskId: options.taskId,
        data: text,
      });
    });

    // Handle exit
    child.on("exit", (code, signal) => {
      terminalProcess.exitCode = code ?? (signal ? 1 : 0);
      terminalProcess.exited = true;
      this.postMessage({
        command: "terminal-exit",
        taskId: options.taskId,
        exitCode: terminalProcess.exitCode,
      });
    });

    child.on("error", (err) => {
      terminalProcess.exited = true;
      terminalProcess.exitCode = 1;
      const errorMsg = `\r\nProcess error: ${err.message}\r\n`;
      terminalProcess.outputLog.push(errorMsg);
      this.postMessage({
        command: "terminal-output",
        taskId: options.taskId,
        data: errorMsg,
      });
      this.postMessage({
        command: "terminal-exit",
        taskId: options.taskId,
        exitCode: 1,
      });
    });

    // Notify webview of start
    this.postMessage({
      command: "terminal-started",
      taskId: options.taskId,
      label: options.label,
      agent: options.agent,
    });

    return terminalProcess;
  }

  /**
   * Send input to a running process.
   */
  sendInput(taskId: string, data: string): boolean {
    const tp = this.processes.get(taskId);
    if (!tp || tp.exited || !tp.process.stdin) {
      return false;
    }
    tp.process.stdin.write(data);
    return true;
  }

  /**
   * Kill a running process.
   */
  kill(taskId: string): boolean {
    const tp = this.processes.get(taskId);
    if (!tp) return false;

    if (!tp.exited) {
      tp.process.kill("SIGTERM");
      // Force kill after 3 seconds
      setTimeout(() => {
        if (!tp.exited) {
          tp.process.kill("SIGKILL");
        }
      }, 3000);
    }

    this.processes.delete(taskId);
    return true;
  }

  /**
   * Check if a task has a running process.
   */
  isRunning(taskId: string): boolean {
    const tp = this.processes.get(taskId);
    return !!tp && !tp.exited;
  }

  /**
   * Get the full output log for a task.
   */
  getOutputLog(taskId: string): string {
    const tp = this.processes.get(taskId);
    return tp ? tp.outputLog.join("") : "";
  }

  /**
   * Get all running task IDs.
   */
  getRunningTaskIds(): string[] {
    return [...this.processes.entries()].filter(([, tp]) => !tp.exited).map(([id]) => id);
  }

  /**
   * Get a terminal process by task ID.
   */
  getProcess(taskId: string): TerminalProcess | undefined {
    return this.processes.get(taskId);
  }

  /**
   * Dispose all processes.
   */
  dispose(): void {
    for (const [taskId] of this.processes) {
      this.kill(taskId);
    }
    this.processes.clear();
  }

  private postMessage(message: Record<string, unknown>): void {
    if (this.webviewPanel) {
      this.webviewPanel.webview.postMessage(message);
    }
  }
}
