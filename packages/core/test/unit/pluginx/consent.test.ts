import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("@clack/prompts", () => ({
  select: vi.fn(),
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}));

import { select, isCancel } from "@clack/prompts";
import {
  runConsentPrompt,
  ensureConsent,
} from "../../../src/pluginx/consent.js";

const mockedSelect = vi.mocked(select);
const mockedIsCancel = vi.mocked(isCancel);

describe("pluginx/consent", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockedIsCancel.mockReturnValue(false);
    tmpDir = join(tmpdir(), `pluginx-consent-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    configPath = join(tmpDir, "config.json");
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("runConsentPrompt", () => {
    it("returns 'acknowledged' and writes config", async () => {
      mockedSelect.mockResolvedValue("acknowledged");

      const result = await runConsentPrompt({ configPath });

      expect(result).toBe("acknowledged");
      const saved = JSON.parse(await readFile(configPath, "utf-8"));
      expect(saved.consentLevel).toBe("acknowledged");
    });

    it("returns 'bypass' and writes config", async () => {
      mockedSelect.mockResolvedValue("bypass");

      const result = await runConsentPrompt({ configPath });

      expect(result).toBe("bypass");
      const saved = JSON.parse(await readFile(configPath, "utf-8"));
      expect(saved.consentLevel).toBe("bypass");
    });

    it("returns 'declined' when user selects decline", async () => {
      mockedSelect.mockResolvedValue("declined");

      const result = await runConsentPrompt({ configPath });

      expect(result).toBe("declined");
      const saved = JSON.parse(await readFile(configPath, "utf-8"));
      expect(saved.consentLevel).toBe("declined");
    });

    it("returns 'declined' when user cancels (Ctrl+C)", async () => {
      mockedSelect.mockResolvedValue(Symbol("cancel"));
      mockedIsCancel.mockReturnValue(true);

      const result = await runConsentPrompt({ configPath });

      expect(result).toBe("declined");
      const saved = JSON.parse(await readFile(configPath, "utf-8"));
      expect(saved.consentLevel).toBe("declined");
    });

    it("auto-acknowledges in non-interactive mode without prompting", async () => {
      const result = await runConsentPrompt({
        configPath,
        nonInteractive: true,
      });

      expect(result).toBe("acknowledged");
      expect(mockedSelect).not.toHaveBeenCalled();
      const saved = JSON.parse(await readFile(configPath, "utf-8"));
      expect(saved.consentLevel).toBe("acknowledged");
    });
  });

  describe("ensureConsent", () => {
    it("returns existing 'bypass' consent without prompting", async () => {
      await writeFile(configPath, JSON.stringify({ consentLevel: "bypass" }));

      const result = await ensureConsent({ configPath });

      expect(result).toBe("bypass");
      expect(mockedSelect).not.toHaveBeenCalled();
    });

    it("returns existing 'acknowledged' consent without prompting", async () => {
      await writeFile(
        configPath,
        JSON.stringify({ consentLevel: "acknowledged" })
      );

      const result = await ensureConsent({ configPath });

      expect(result).toBe("acknowledged");
      expect(mockedSelect).not.toHaveBeenCalled();
    });

    it("prompts when consent is required", async () => {
      mockedSelect.mockResolvedValue("acknowledged");

      const result = await ensureConsent({ configPath });

      expect(result).toBe("acknowledged");
      expect(mockedSelect).toHaveBeenCalledOnce();
    });

    it("auto-acknowledges in non-interactive mode when consent required", async () => {
      const result = await ensureConsent({
        configPath,
        nonInteractive: true,
      });

      expect(result).toBe("acknowledged");
      expect(mockedSelect).not.toHaveBeenCalled();
    });

    it("exits process when user declines", async () => {
      mockedSelect.mockResolvedValue("declined");
      const mockExit = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await ensureConsent({ configPath });

      expect(mockExit).toHaveBeenCalledWith(0);
      mockExit.mockRestore();
    });
  });
});
