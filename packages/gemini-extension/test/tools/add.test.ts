import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@epiphytic/ai-plugin-translator", () => ({
  checkConsent: vi.fn(),
  writeConfig: vi.fn(),
  runAdd: vi.fn(),
  SECURITY_NOTICE: "Test security notice",
}));

import { checkConsent, runAdd } from "@epiphytic/ai-plugin-translator";

const mockCheckConsent = vi.mocked(checkConsent);
const mockRunAdd = vi.mocked(runAdd);

// We test the tool logic by calling the same functions the tool handler calls
// This avoids needing to spin up a full MCP server
import { requireConsent } from "../../src/tools/shared.js";

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

describe("pluginx_add tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns consent_required when consent not given and elicitation unsupported", async () => {
    mockCheckConsent.mockResolvedValue("required");
    const server = createMockServer(); // rejects

    const check = await requireConsent(server);
    expect(check.ok).toBe(false);
    if (!check.ok) {
      const parsed = JSON.parse(check.response.content[0].text);
      expect(parsed.status).toBe("consent_required");
    }

    expect(mockRunAdd).not.toHaveBeenCalled();
  });

  it("calls runAdd with consentLevel when consent is acknowledged", async () => {
    mockCheckConsent.mockResolvedValue("acknowledged");
    const server = createMockServer();

    const check = await requireConsent(server);
    expect(check.ok).toBe(true);

    if (check.ok) {
      mockRunAdd.mockResolvedValue({
        report: {
          pluginName: "test-plugin",
          source: "claude",
          target: "gemini",
          translated: [{ type: "manifest", name: "manifest" }],
          skipped: [],
          warnings: [],
        },
        plugin: {
          name: "test-plugin",
          sourceType: "local",
          sourcePath: "/tmp/test",
          outputPath: "/tmp/out",
          type: "single",
          lastTranslated: "2026-01-01T00:00:00.000Z",
        },
      });

      await runAdd({
        source: "/tmp/test",
        consentLevel: check.consentLevel,
      });

      expect(mockRunAdd).toHaveBeenCalledWith({
        source: "/tmp/test",
        consentLevel: "acknowledged",
      });
    }
  });

  it("calls runAdd with bypass consentLevel", async () => {
    mockCheckConsent.mockResolvedValue("bypass");
    const server = createMockServer();

    const check = await requireConsent(server);
    expect(check.ok).toBe(true);

    if (check.ok) {
      mockRunAdd.mockResolvedValue({
        report: {
          pluginName: "test",
          source: "claude",
          target: "gemini",
          translated: [],
          skipped: [],
          warnings: [],
        },
        plugin: {
          name: "test",
          sourceType: "local",
          sourcePath: "/tmp/test",
          outputPath: "/tmp/out",
          type: "single",
          lastTranslated: "2026-01-01T00:00:00.000Z",
        },
      });

      await runAdd({
        source: "/tmp/test",
        consentLevel: check.consentLevel,
      });

      expect(mockRunAdd).toHaveBeenCalledWith({
        source: "/tmp/test",
        consentLevel: "bypass",
      });
    }
  });
});
