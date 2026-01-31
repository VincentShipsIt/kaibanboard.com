import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeCodeQuotaService } from "./claudeCodeQuotaService";

vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

vi.mock("node:util", () => ({
  promisify: vi.fn((fn: unknown) => fn),
}));

describe("ClaudeCodeQuotaService", () => {
  let service: ClaudeCodeQuotaService;

  beforeEach(() => {
    service = new ClaudeCodeQuotaService();
  });

  describe("isMacOS", () => {
    it("should return boolean based on platform", () => {
      const result = service.isMacOS();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("getCredentials", () => {
    it("should return null on non-macOS", async () => {
      vi.spyOn(service, "isMacOS").mockReturnValue(false);
      const result = await service.getCredentials();
      expect(result).toBeNull();
    });

    it("should handle keychain errors gracefully", async () => {
      vi.spyOn(service, "isMacOS").mockReturnValue(true);
      const cp = await import("node:child_process");
      // biome-ignore lint/suspicious/noExplicitAny: test mock
      (cp.exec as any).mockRejectedValue(new Error("keychain error"));

      const result = await service.getCredentials();
      expect(result).toBeNull();
    });
  });

  describe("fetchUsage", () => {
    it("should return null on API error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const result = await service.fetchUsage("invalid-token");
      expect(result).toBeNull();
    });

    it("should parse valid API response", async () => {
      const mockResponse = {
        five_hour: { utilization: 0.5, resets_at: "2025-01-01T00:00:00Z" },
        seven_day: { utilization: 0.3, resets_at: "2025-01-07T00:00:00Z" },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.fetchUsage("valid-token");
      expect(result).not.toBeNull();
      expect(result?.fiveHour.utilization).toBe(0.5);
      expect(result?.sevenDay.utilization).toBe(0.3);
    });

    it("should handle sonnet quota in response", async () => {
      const mockResponse = {
        five_hour: { utilization: 0.5, resets_at: "2025-01-01T00:00:00Z" },
        seven_day: { utilization: 0.3, resets_at: "2025-01-07T00:00:00Z" },
        seven_day_sonnet: { utilization: 0.8, resets_at: "2025-01-07T00:00:00Z" },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await service.fetchUsage("valid-token");
      expect(result?.sevenDaySonnet).toBeDefined();
      expect(result?.sevenDaySonnet?.utilization).toBe(0.8);
    });

    it("should handle fetch exceptions", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

      const result = await service.fetchUsage("token");
      expect(result).toBeNull();
    });
  });

  describe("getQuota", () => {
    it("should return error for non-macOS", async () => {
      vi.spyOn(service, "isMacOS").mockReturnValue(false);

      const result = await service.getQuota();
      expect(result.isMacOS).toBe(false);
      expect(result.error).toContain("macOS");
    });

    it("should return error if not authenticated", async () => {
      vi.spyOn(service, "isMacOS").mockReturnValue(true);
      vi.spyOn(service, "getCredentials").mockResolvedValue(null);

      const result = await service.getQuota();
      expect(result.error).toContain("not authenticated");
    });

    it("should return cached data on fetch failure", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          five_hour: { utilization: 0.5, resets_at: "2025-01-01T00:00:00Z" },
          seven_day: { utilization: 0.3, resets_at: "2025-01-07T00:00:00Z" },
        }),
      });

      // Populate cache
      await service.fetchUsage("token");
      expect(service.getCachedQuota()).not.toBeNull();

      // Now getQuota with fetch failing
      vi.spyOn(service, "isMacOS").mockReturnValue(true);
      vi.spyOn(service, "getCredentials").mockResolvedValue({
        claudeAiOauth: { accessToken: "token" },
      } as unknown as Awaited<ReturnType<typeof service.getCredentials>>);
      vi.spyOn(service, "fetchUsage").mockResolvedValue(null);

      const result = await service.getQuota();
      expect(result.usage).not.toBeNull();
      expect(result.error).toContain("cached");
    });
  });

  describe("clearCache", () => {
    it("should clear cached quota", () => {
      service.clearCache();
      expect(service.getCachedQuota()).toBeNull();
    });
  });
});
