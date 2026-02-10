import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { runUpdate } from "../../../../src/pluginx/commands/update.js";
import { VERSION } from "../../../../src/version.js";
import type { PluginxState } from "../../../../src/pluginx/types.js";

// Mock translate to avoid real file I/O
vi.mock("../../../../src/translate.js", () => ({
  translate: vi.fn().mockResolvedValue({
    source: "claude",
    target: "gemini",
    pluginName: "test-plugin",
    translated: [],
    skipped: [],
    warnings: [],
  }),
  translateMarketplace: vi.fn().mockResolvedValue([]),
}));

// Mock linkExtension to avoid real gemini CLI calls
vi.mock("../../../../src/pluginx/link.js", () => ({
  linkExtension: vi.fn().mockResolvedValue(undefined),
}));

// Mock consent to bypass interactive prompts
vi.mock("../../../../src/pluginx/consent.js", () => ({
  ensureConsent: vi.fn().mockResolvedValue("bypass"),
}));

// Mock pullLatest to avoid spawning real git processes
vi.mock("../../../../src/pluginx/git-ops.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    pullLatest: vi.fn().mockResolvedValue(undefined),
  };
});

describe("pluginx/commands/update skip-if-unchanged", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `pluginx-update-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function makeState(overrides: Partial<PluginxState["plugins"][0]> = {}): PluginxState {
    return {
      plugins: [
        {
          name: "test-plugin",
          sourceType: "git",
          sourceUrl: "https://github.com/test/plugin.git",
          sourcePath: join(tmpDir, "source"),
          outputPath: join(tmpDir, "output"),
          type: "single",
          lastTranslated: "2026-01-01T00:00:00.000Z",
          sourceCommit: "abc123",
          ...overrides,
        },
      ],
    };
  }

  async function writeMetaFile(outputDir: string, translatorVersion: string): Promise<void> {
    await mkdir(outputDir, { recursive: true });
    await writeFile(
      join(outputDir, ".pluginx-meta.json"),
      JSON.stringify({ from: "claude", to: "gemini", translatorVersion })
    );
  }

  it("skips re-translation when commit hash and translator version are unchanged", async () => {
    const statePath = join(tmpDir, "state.json");
    await writeFile(statePath, JSON.stringify(makeState()));
    await writeMetaFile(join(tmpDir, "output"), VERSION);

    const progressMessages: string[] = [];
    const mockExec = vi.fn().mockResolvedValue({ stdout: "abc123\n", stderr: "" });

    const { reports } = await runUpdate({
      names: ["test-plugin"],
      statePath,
      execFn: mockExec,
      consentLevel: "bypass",
      onProgress: (msg) => progressMessages.push(msg),
    });

    expect(reports).toHaveLength(0);
    expect(progressMessages.some((m) => m.includes("No changes"))).toBe(true);
    expect(progressMessages.some((m) => m.includes("skipping"))).toBe(true);
  });

  it("re-translates when commit hash has changed", async () => {
    const statePath = join(tmpDir, "state.json");
    await writeFile(statePath, JSON.stringify(makeState()));
    await writeMetaFile(join(tmpDir, "output"), VERSION);

    const mockExec = vi.fn().mockResolvedValue({ stdout: "new456\n", stderr: "" });

    const { reports } = await runUpdate({
      names: ["test-plugin"],
      statePath,
      execFn: mockExec,
      consentLevel: "bypass",
    });

    expect(reports).toHaveLength(1);
  });

  it("re-translates when translator version has changed", async () => {
    const statePath = join(tmpDir, "state.json");
    await writeFile(statePath, JSON.stringify(makeState()));
    await writeMetaFile(join(tmpDir, "output"), "0.0.1-old");

    const progressMessages: string[] = [];
    const mockExec = vi.fn().mockResolvedValue({ stdout: "abc123\n", stderr: "" });

    const { reports } = await runUpdate({
      names: ["test-plugin"],
      statePath,
      execFn: mockExec,
      consentLevel: "bypass",
      onProgress: (msg) => progressMessages.push(msg),
    });

    expect(reports).toHaveLength(1);
    expect(progressMessages.some((m) => m.includes("Translator version changed"))).toBe(true);
  });

  it("re-translates when meta file is missing", async () => {
    const statePath = join(tmpDir, "state.json");
    await writeFile(statePath, JSON.stringify(makeState()));
    // No meta file written — should trigger re-translate

    const mockExec = vi.fn().mockResolvedValue({ stdout: "abc123\n", stderr: "" });

    const { reports } = await runUpdate({
      names: ["test-plugin"],
      statePath,
      execFn: mockExec,
      consentLevel: "bypass",
    });

    expect(reports).toHaveLength(1);
  });

  it("re-translates when --force is true even if unchanged", async () => {
    const statePath = join(tmpDir, "state.json");
    await writeFile(statePath, JSON.stringify(makeState()));
    await writeMetaFile(join(tmpDir, "output"), VERSION);

    const mockExec = vi.fn().mockResolvedValue({ stdout: "abc123\n", stderr: "" });

    const { reports } = await runUpdate({
      names: ["test-plugin"],
      statePath,
      execFn: mockExec,
      force: true,
      consentLevel: "bypass",
    });

    expect(reports).toHaveLength(1);
  });

  it("re-translates when sourceCommit is undefined in state", async () => {
    const statePath = join(tmpDir, "state.json");
    await writeFile(
      statePath,
      JSON.stringify(makeState({ sourceCommit: undefined }))
    );
    await writeMetaFile(join(tmpDir, "output"), VERSION);

    const mockExec = vi.fn().mockResolvedValue({ stdout: "abc123\n", stderr: "" });

    const { reports } = await runUpdate({
      names: ["test-plugin"],
      statePath,
      execFn: mockExec,
      consentLevel: "bypass",
    });

    expect(reports).toHaveLength(1);
  });

  it("always re-translates local source plugins", async () => {
    const statePath = join(tmpDir, "state.json");
    const sourcePath = join(tmpDir, "local-source");
    await mkdir(sourcePath, { recursive: true });
    await writeFile(
      statePath,
      JSON.stringify(
        makeState({
          sourceType: "local",
          sourcePath,
          sourceCommit: undefined,
        })
      )
    );

    const mockExec = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });

    const { reports } = await runUpdate({
      names: ["test-plugin"],
      statePath,
      execFn: mockExec,
      consentLevel: "bypass",
    });

    expect(reports).toHaveLength(1);
  });

  it("falls through to translate on getSourceCommit failure", async () => {
    const statePath = join(tmpDir, "state.json");
    await writeFile(statePath, JSON.stringify(makeState()));

    // Simulate git rev-parse failure by rejecting
    const mockExec = vi.fn().mockImplementation((_cmd: string, args: string[]) => {
      if (args.includes("rev-parse")) {
        return Promise.reject(new Error("not a git repo"));
      }
      return Promise.resolve({ stdout: "", stderr: "" });
    });

    const { reports } = await runUpdate({
      names: ["test-plugin"],
      statePath,
      execFn: mockExec,
      consentLevel: "bypass",
    });

    // getSourceCommit returns undefined on failure, so it should fall through to translate
    expect(reports).toHaveLength(1);
  });
});
