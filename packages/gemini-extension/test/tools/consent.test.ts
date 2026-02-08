import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@epiphytic/ai-plugin-translator", () => ({
  checkConsent: vi.fn(),
  writeConfig: vi.fn(),
  SECURITY_NOTICE: "Test security notice",
}));

import { checkConsent, writeConfig } from "@epiphytic/ai-plugin-translator";
import { requireConsent } from "../../src/tools/shared.js";

const mockCheckConsent = vi.mocked(checkConsent);
const mockWriteConfig = vi.mocked(writeConfig);

// Mock Server with elicitInput
function createMockServer(elicitResult?: {
  action: string;
  content?: Record<string, unknown>;
}) {
  return {
    elicitInput: elicitResult
      ? vi.fn().mockResolvedValue(elicitResult)
      : vi.fn().mockRejectedValue(new Error("Client does not support form elicitation.")),
  } as any;
}

describe("consent tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireConsent", () => {
    it("returns ok when consent already acknowledged", async () => {
      mockCheckConsent.mockResolvedValue("acknowledged");
      const server = createMockServer();

      const result = await requireConsent(server);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.consentLevel).toBe("acknowledged");
      }
      expect(server.elicitInput).not.toHaveBeenCalled();
    });

    it("returns ok when consent already bypass", async () => {
      mockCheckConsent.mockResolvedValue("bypass");
      const server = createMockServer();

      const result = await requireConsent(server);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.consentLevel).toBe("bypass");
      }
      expect(server.elicitInput).not.toHaveBeenCalled();
    });

    it("uses elicitation when consent is required and user accepts", async () => {
      mockCheckConsent.mockResolvedValue("required");
      const server = createMockServer({
        action: "accept",
        content: { consent: "acknowledged" },
      });

      const result = await requireConsent(server);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.consentLevel).toBe("acknowledged");
      }
      expect(server.elicitInput).toHaveBeenCalled();
      expect(mockWriteConfig).toHaveBeenCalledWith({ consentLevel: "acknowledged" });
    });

    it("uses elicitation when consent is required and user chooses bypass", async () => {
      mockCheckConsent.mockResolvedValue("required");
      const server = createMockServer({
        action: "accept",
        content: { consent: "bypass" },
      });

      const result = await requireConsent(server);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.consentLevel).toBe("bypass");
      }
      expect(mockWriteConfig).toHaveBeenCalledWith({ consentLevel: "bypass" });
    });

    it("returns declined when user declines elicitation", async () => {
      mockCheckConsent.mockResolvedValue("required");
      const server = createMockServer({
        action: "accept",
        content: { consent: "declined" },
      });

      const result = await requireConsent(server);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const parsed = JSON.parse(result.response.content[0].text);
        expect(parsed.status).toBe("declined");
      }
      expect(mockWriteConfig).not.toHaveBeenCalled();
    });

    it("returns declined when user cancels elicitation", async () => {
      mockCheckConsent.mockResolvedValue("required");
      const server = createMockServer({ action: "cancel" });

      const result = await requireConsent(server);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const parsed = JSON.parse(result.response.content[0].text);
        expect(parsed.status).toBe("declined");
      }
    });

    it("falls back to consent_required JSON when elicitation not supported", async () => {
      mockCheckConsent.mockResolvedValue("required");
      const server = createMockServer(); // rejects with error

      const result = await requireConsent(server);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const parsed = JSON.parse(result.response.content[0].text);
        expect(parsed.status).toBe("consent_required");
        expect(parsed.message).toContain("pluginx_consent");
        expect(parsed.message).toContain("security notice");
      }
    });
  });

  describe("pluginx_consent tool (writeConfig)", () => {
    it("writes acknowledged consent", async () => {
      await writeConfig({ consentLevel: "acknowledged" });
      expect(mockWriteConfig).toHaveBeenCalledWith({
        consentLevel: "acknowledged",
      });
    });

    it("writes bypass consent", async () => {
      await writeConfig({ consentLevel: "bypass" });
      expect(mockWriteConfig).toHaveBeenCalledWith({
        consentLevel: "bypass",
      });
    });

    it("writes declined consent", async () => {
      await writeConfig({ consentLevel: "declined" });
      expect(mockWriteConfig).toHaveBeenCalledWith({
        consentLevel: "declined",
      });
    });
  });
});
