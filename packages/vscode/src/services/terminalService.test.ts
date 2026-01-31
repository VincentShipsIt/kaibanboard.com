import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TerminalService } from "./terminalService";

// Mock child_process
vi.mock("node:child_process", () => {
  const EventEmitter = require("node:events");

  function createMockProcess() {
    const proc = new EventEmitter();
    proc.stdin = { write: vi.fn() };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = vi.fn(() => {
      proc.emit("exit", 0, null);
    });
    proc.pid = 12345;
    return proc;
  }

  return {
    spawn: vi.fn(() => createMockProcess()),
  };
});

describe("TerminalService", () => {
  let service: TerminalService;
  let mockPanel: any;

  beforeEach(() => {
    service = new TerminalService();
    mockPanel = {
      webview: {
        postMessage: vi.fn(),
      },
    };
    service.setWebviewPanel(mockPanel);
  });

  afterEach(() => {
    service.dispose();
  });

  describe("start", () => {
    it("should start a process and send terminal-started message", () => {
      const result = service.start({
        taskId: "task-1",
        label: "Test Task",
        agent: "Claude",
        command: "echo hello",
      });

      expect(result.taskId).toBe("task-1");
      expect(result.label).toBe("Test Task");
      expect(result.agent).toBe("Claude");
      expect(result.exited).toBe(false);
      expect(result.exitCode).toBeNull();

      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        command: "terminal-started",
        taskId: "task-1",
        label: "Test Task",
        agent: "Claude",
      });
    });

    it("should kill existing process for same task before starting new one", () => {
      service.start({
        taskId: "task-1",
        label: "First",
        agent: "Claude",
        command: "echo 1",
      });

      service.start({
        taskId: "task-1",
        label: "Second",
        agent: "Claude",
        command: "echo 2",
      });

      // Should only have one process
      expect(service.isRunning("task-1")).toBe(true);
      const process = service.getProcess("task-1");
      expect(process?.label).toBe("Second");
    });

    it("should stream stdout to webview", () => {
      const result = service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "echo hello",
      });

      // Simulate stdout
      result.process.stdout?.emit("data", Buffer.from("hello world"));

      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        command: "terminal-output",
        taskId: "task-1",
        data: "hello world",
      });
    });

    it("should stream stderr to webview", () => {
      const result = service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "failing command",
      });

      result.process.stderr?.emit("data", Buffer.from("error occurred"));

      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        command: "terminal-output",
        taskId: "task-1",
        data: "error occurred",
      });
    });

    it("should send terminal-exit on process exit", () => {
      const result = service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "echo done",
      });

      result.process.emit("exit", 0, null);

      expect(result.exited).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        command: "terminal-exit",
        taskId: "task-1",
        exitCode: 0,
      });
    });

    it("should handle non-zero exit codes", () => {
      const result = service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "exit 1",
      });

      result.process.emit("exit", 1, null);

      expect(result.exitCode).toBe(1);
      expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
        command: "terminal-exit",
        taskId: "task-1",
        exitCode: 1,
      });
    });

    it("should handle process errors", () => {
      const result = service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "nonexistent",
      });

      result.process.emit("error", new Error("spawn failed"));

      expect(result.exited).toBe(true);
      expect(result.exitCode).toBe(1);
    });

    it("should capture output in log", () => {
      const result = service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "echo hello",
      });

      result.process.stdout?.emit("data", Buffer.from("line 1\n"));
      result.process.stdout?.emit("data", Buffer.from("line 2\n"));

      const log = service.getOutputLog("task-1");
      expect(log).toBe("line 1\nline 2\n");
    });
  });

  describe("sendInput", () => {
    it("should write to process stdin", () => {
      const result = service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "cat",
      });

      const sent = service.sendInput("task-1", "hello\n");
      expect(sent).toBe(true);
      expect(result.process.stdin?.write).toHaveBeenCalledWith("hello\n");
    });

    it("should return false for non-existent task", () => {
      const sent = service.sendInput("nonexistent", "data");
      expect(sent).toBe(false);
    });

    it("should return false for exited process", () => {
      const result = service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "echo",
      });

      result.process.emit("exit", 0, null);
      const sent = service.sendInput("task-1", "data");
      expect(sent).toBe(false);
    });
  });

  describe("kill", () => {
    it("should kill a running process", () => {
      const result = service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "sleep 100",
      });

      const killed = service.kill("task-1");
      expect(killed).toBe(true);
      expect(result.process.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("should return false for non-existent task", () => {
      const killed = service.kill("nonexistent");
      expect(killed).toBe(false);
    });
  });

  describe("isRunning", () => {
    it("should return true for running process", () => {
      service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "sleep 100",
      });

      expect(service.isRunning("task-1")).toBe(true);
    });

    it("should return false for exited process", () => {
      const result = service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "echo done",
      });

      result.process.emit("exit", 0, null);
      expect(service.isRunning("task-1")).toBe(false);
    });

    it("should return false for non-existent task", () => {
      expect(service.isRunning("nonexistent")).toBe(false);
    });
  });

  describe("getRunningTaskIds", () => {
    it("should return all running task IDs", () => {
      service.start({ taskId: "task-1", label: "T1", agent: "Claude", command: "sleep 1" });
      service.start({ taskId: "task-2", label: "T2", agent: "Codex", command: "sleep 2" });

      const running = service.getRunningTaskIds();
      expect(running).toContain("task-1");
      expect(running).toContain("task-2");
    });

    it("should exclude exited processes", () => {
      const r1 = service.start({ taskId: "task-1", label: "T1", agent: "Claude", command: "echo" });
      service.start({ taskId: "task-2", label: "T2", agent: "Codex", command: "sleep 2" });

      r1.process.emit("exit", 0, null);

      const running = service.getRunningTaskIds();
      expect(running).not.toContain("task-1");
      expect(running).toContain("task-2");
    });
  });

  describe("getOutputLog", () => {
    it("should return empty string for non-existent task", () => {
      expect(service.getOutputLog("nonexistent")).toBe("");
    });
  });

  describe("dispose", () => {
    it("should kill all running processes", () => {
      const r1 = service.start({
        taskId: "task-1",
        label: "T1",
        agent: "Claude",
        command: "sleep",
      });
      const r2 = service.start({ taskId: "task-2", label: "T2", agent: "Codex", command: "sleep" });

      service.dispose();

      expect(r1.process.kill).toHaveBeenCalled();
      expect(r2.process.kill).toHaveBeenCalled();
      expect(service.getRunningTaskIds()).toHaveLength(0);
    });
  });

  describe("setWebviewPanel", () => {
    it("should not throw when panel is null", () => {
      service.setWebviewPanel(null);
      // Starting a process should work without crashing even with no panel
      const result = service.start({
        taskId: "task-1",
        label: "Test",
        agent: "Claude",
        command: "echo hello",
      });

      // Output should still be captured in log
      result.process.stdout?.emit("data", Buffer.from("hello"));
      expect(service.getOutputLog("task-1")).toBe("hello");
    });
  });
});
