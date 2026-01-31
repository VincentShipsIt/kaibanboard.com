import * as fs from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodexQuotaService } from "./codexQuotaService";

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue("{}"),
}));

describe("CodexQuotaService", () => {
  let service: CodexQuotaService;

  beforeEach(() => {
    service = new CodexQuotaService();
  });

  describe("isAvailable", () => {
    it("should return false when auth file does not exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(service.isAvailable()).toBe(false);
    });

    it("should return true when auth file exists", () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe("getCredentials", () => {
    it("should return null when not available", () => {
      vi.spyOn(service, "isAvailable").mockReturnValue(false);
      expect(service.getCredentials()).toBeNull();
    });

    it("should return null for invalid auth file", () => {
      vi.spyOn(service, "isAvailable").mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("{}");
      expect(service.getCredentials()).toBeNull();
    });

    it("should return credentials from valid auth file", () => {
      vi.spyOn(service, "isAvailable").mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          tokens: { accessToken: "test-token", accountId: "acc-123" },
        })
      );

      const creds = service.getCredentials();
      expect(creds).not.toBeNull();
      expect(creds!.accessToken).toBe("test-token");
      expect(creds!.accountId).toBe("acc-123");
    });

    it("should handle read errors gracefully", () => {
      vi.spyOn(service, "isAvailable").mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("read error");
      });
      expect(service.getCredentials()).toBeNull();
    });
  });

  describe("fetchUsage", () => {
    it("should return null on API error", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      const result = await service.fetchUsage("invalid");
      expect(result).toBeNull();
    });

    it("should handle fetch exceptions", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("network"));
      const result = await service.fetchUsage("token");
      expect(result).toBeNull();
    });
  });

  describe("getQuota", () => {
    it("should return not available when auth file missing", async () => {
      vi.spyOn(service, "isAvailable").mockReturnValue(false);
      const result = await service.getQuota();
      expect(result.isAvailable).toBe(false);
    });

    it("should return error when no credentials", async () => {
      vi.spyOn(service, "isAvailable").mockReturnValue(true);
      vi.spyOn(service, "getCredentials").mockReturnValue(null);
      const result = await service.getQuota();
      expect(result.error).toBeTruthy();
    });
  });

  describe("clearCache", () => {
    it("should clear cached usage", () => {
      service.clearCache();
      expect(service.getCachedQuota()).toBeNull();
    });
  });
});
