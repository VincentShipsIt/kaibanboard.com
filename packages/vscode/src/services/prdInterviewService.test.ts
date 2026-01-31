import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { PRDInterviewService } from "./prdInterviewService";

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe("PRDInterviewService", () => {
  let service: PRDInterviewService;

  beforeEach(() => {
    service = new PRDInterviewService();

    // Set up workspace folders
    (vscode.workspace as any).workspaceFolders = [
      { uri: { fsPath: "/workspace" }, name: "workspace" },
    ];

    (vscode.workspace.getConfiguration as any).mockReturnValue({
      get: vi.fn((key: string, def: any) => {
        if (key === "executablePath") return "claude";
        if (key === "additionalFlags") return "";
        if (key === "basePath") return ".agent/PRDS";
        return def;
      }),
    });
  });

  describe("startInterview", () => {
    it("should create a minimal PRD template and open terminal", async () => {
      const result = await service.startInterview({ name: "Auth Feature" });

      expect(result).not.toBeNull();
      expect(result?.slug).toBe("auth-feature");
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(vscode.window.createTerminal).toHaveBeenCalled();
    });

    it("should return null if no workspace folder", async () => {
      (vscode.workspace as any).workspaceFolders = undefined;

      const result = await service.startInterview({ name: "Test" });
      expect(result).toBeNull();
    });

    it("should include task context in the prompt when provided", async () => {
      const result = await service.startInterview({
        name: "Test Feature",
        taskContext: {
          taskId: "task-123",
          label: "Fix auth",
          description: "Fix the auth bug",
        },
      });

      expect(result).not.toBeNull();
      // Terminal should have been created
      expect(vscode.window.createTerminal).toHaveBeenCalled();
    });

    it("should handle task context without description", async () => {
      const result = await service.startInterview({
        name: "Test Feature",
        taskContext: {
          taskId: "task-123",
          label: "Fix auth",
        },
      });

      expect(result).not.toBeNull();
    });

    it("should generate correct slug for complex names", async () => {
      const result = await service.startInterview({
        name: "User Authentication & Authorization System",
      });

      expect(result?.slug).toBe("user-authentication-authorization-system");
    });
  });
});
