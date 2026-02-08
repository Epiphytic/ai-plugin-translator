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

describe("consent tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireConsent", () => {
    it("returns consent_required when consent is needed", async () => {
      mockCheckConsent.mockResolvedValue("required");

      const result = await requireConsent();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const text = result.response.content[0].text;
        const parsed = JSON.parse(text);
        expect(parsed.status).toBe("consent_required");
        expect(parsed.securityNotice).toBe("Test security notice");
      }
    });

    it("returns ok with consentLevel when acknowledged", async () => {
      mockCheckConsent.mockResolvedValue("acknowledged");

      const result = await requireConsent();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.consentLevel).toBe("acknowledged");
      }
    });

    it("returns ok with consentLevel when bypass", async () => {
      mockCheckConsent.mockResolvedValue("bypass");

      const result = await requireConsent();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.consentLevel).toBe("bypass");
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
