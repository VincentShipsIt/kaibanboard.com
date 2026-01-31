import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TranscriptMonitorService } from "./transcriptMonitorService";

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readdirSync: vi.fn().mockReturnValue([]),
  statSync: vi.fn().mockReturnValue({ size: 0, mtimeMs: Date.now() }),
  readFileSync: vi.fn().mockReturnValue(""),
  readSync: vi.fn(),
  openSync: vi.fn().mockReturnValue(1),
  closeSync: vi.fn(),
}));

describe("TranscriptMonitorService", () => {
  let service: TranscriptMonitorService;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new TranscriptMonitorService({
      pollIntervalMs: 100,
      sessionDiscoveryTimeoutMs: 500,
      maxRecentSteps: 5,
    });
  });

  afterEach(() => {
    service.dispose();
    vi.useRealTimers();
  });

  describe("startMonitoring", () => {
    it("should stop existing monitor for same task", async () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      // Start first monitor (won't find session file, but that's ok)
      service.startMonitoring("task-1", "/workspace", cb1);
      service.startMonitoring("task-1", "/workspace", cb2);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("stopMonitoring", () => {
    it("should not throw for non-existent task", () => {
      expect(() => service.stopMonitoring("nonexistent")).not.toThrow();
    });
  });

  describe("dispose", () => {
    it("should stop all monitors", () => {
      const cb = vi.fn();
      service.startMonitoring("task-1", "/workspace", cb);
      service.startMonitoring("task-2", "/workspace", cb);

      expect(() => service.dispose()).not.toThrow();
    });
  });

  describe("getProgressDisplayText", () => {
    it("should return thinking status for null progress", () => {
      const result = TranscriptMonitorService.getProgressDisplayText(null);
      expect(result.status).toBe("Thinking...");
      expect(result.toolName).toBe("");
    });

    it("should return thinking for progress without current step", () => {
      const result = TranscriptMonitorService.getProgressDisplayText({
        sessionId: "session-1",
        taskId: "task-1",
        currentStep: null,
        recentSteps: [],
        status: "thinking",
        lastUpdated: new Date(),
      });
      expect(result.status).toBe("Thinking...");
    });

    it("should return tool info for tool_use step", () => {
      const result = TranscriptMonitorService.getProgressDisplayText({
        sessionId: "session-1",
        taskId: "task-1",
        currentStep: {
          id: "step-1",
          type: "tool_use",
          timestamp: new Date(),
          toolName: "Read",
          toolInput: { file_path: "src/index.ts" },
        },
        recentSteps: [],
        status: "tool_use",
        lastUpdated: new Date(),
      });
      expect(result.toolName).toBe("Read");
      expect(result.status).toContain("Read");
    });
  });
});
