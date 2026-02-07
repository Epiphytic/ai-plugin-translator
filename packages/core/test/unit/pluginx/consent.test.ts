import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("@inquirer/select", () => ({
  default: vi.fn(),
}));

import select from "@inquirer/select";
import { runConsentPrompt, ensureConsent } from "../../../src/pluginx/consent.js";
import { PassThrough } from "stream";

const mockedSelect = vi.mocked(select);

describe("pluginx/consent", () => {
  let tmpDir: string;
  let configPath: string;
  let mockInput: PassThrough;
  let mockOutput: PassThrough;

  beforeEach(async () => {
    vi.clearAllMocks();
    tmpDir = join(tmpdir(), `pluginx-consent-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    configPath = join(tmpDir, "config.json");
    mockInput = new PassThrough();
    mockOutput = new PassThrough();
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("runConsentPrompt", () => {
    it("returns 'acknowledged' and writes config", async () => {
      mockedSelect.mockResolvedValue("acknowledged");

      const result = await runConsentPrompt({
        configPath,
        input: mockInput,
        output: mockOutput,
      });

      expect(result).toBe("acknowledged");
      const saved = JSON.parse(await readFile(configPath, "utf-8"));
      expect(saved.consentLevel).toBe("acknowledged");
    });

    it("returns 'bypass' and writes config", async () => {
      mockedSelect.mockResolvedValue("bypass");

      const result = await runConsentPrompt({
        configPath,
        input: mockInput,
        output: mockOutput,
      });

      expect(result).toBe("bypass");
      const saved = JSON.parse(await readFile(configPath, "utf-8"));
      expect(saved.consentLevel).toBe("bypass");
    });

    it("returns 'declined' and writes config", async () => {
      mockedSelect.mockResolvedValue("declined");

      const result = await runConsentPrompt({
        configPath,
        input: mockInput,
        output: mockOutput,
      });

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

    it("writes security banner to output", async () => {
      mockedSelect.mockResolvedValue("acknowledged");
      let outputData = "";
      mockOutput.on("data", (chunk) => {
        outputData += chunk.toString();
      });

      await runConsentPrompt({
        configPath,
        input: mockInput,
        output: mockOutput,
      });

      expect(outputData).toContain("PLUGINX SECURITY NOTICE");
      expect(outputData).toContain("EXPERIMENTAL");
    });
  });

  describe("ensureConsent", () => {
    it("returns existing 'bypass' consent without prompting", async () => {
      await writeFile(configPath, JSON.stringify({ consentLevel: "bypass" }));

      const result = await ensureConsent({
        configPath,
        input: mockInput,
        output: mockOutput,
      });

      expect(result).toBe("bypass");
      expect(mockedSelect).not.toHaveBeenCalled();
    });

    it("returns existing 'acknowledged' consent without prompting", async () => {
      await writeFile(
        configPath,
        JSON.stringify({ consentLevel: "acknowledged" })
      );

      const result = await ensureConsent({
        configPath,
        input: mockInput,
        output: mockOutput,
      });

      expect(result).toBe("acknowledged");
      expect(mockedSelect).not.toHaveBeenCalled();
    });

    it("prompts when consent is required", async () => {
      mockedSelect.mockResolvedValue("acknowledged");

      const result = await ensureConsent({
        configPath,
        input: mockInput,
        output: mockOutput,
      });

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

      await ensureConsent({
        configPath,
        input: mockInput,
        output: mockOutput,
      });

      expect(mockExit).toHaveBeenCalledWith(0);
      mockExit.mockRestore();
    });
  });
});
