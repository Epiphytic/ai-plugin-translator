import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { runStatus } from "../../../../src/pluginx/commands/status.js";
import type { PluginxState } from "../../../../src/pluginx/types.js";

describe("pluginx/commands/status", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `pluginx-status-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("reports up-to-date when commits match", async () => {
    const statePath = join(tmpDir, "state.json");
    const state: PluginxState = {
      plugins: [
        {
          name: "fresh",
          sourceType: "git",
          sourceUrl: "https://github.com/test/fresh.git",
          sourcePath: "/tmp/sources/fresh",
          outputPath: "/tmp/translations/fresh",
          type: "single",
          lastTranslated: "2026-01-01T00:00:00.000Z",
          sourceCommit: "abc123",
        },
      ],
    };
    await writeFile(statePath, JSON.stringify(state));

    const mockGitExec = vi
      .fn()
      .mockResolvedValue({ stdout: "abc123\n", stderr: "" });

    const statuses = await runStatus({
      statePath,
      gitExecFn: mockGitExec,
    });

    expect(statuses).toHaveLength(1);
    expect(statuses[0].upToDate).toBe(true);
  });

  it("reports outdated when commits differ", async () => {
    const statePath = join(tmpDir, "state.json");
    const state: PluginxState = {
      plugins: [
        {
          name: "stale",
          sourceType: "git",
          sourcePath: "/tmp/sources/stale",
          outputPath: "/tmp/translations/stale",
          type: "single",
          lastTranslated: "2026-01-01T00:00:00.000Z",
          sourceCommit: "old123",
        },
      ],
    };
    await writeFile(statePath, JSON.stringify(state));

    const mockGitExec = vi
      .fn()
      .mockResolvedValue({ stdout: "new456\n", stderr: "" });

    const statuses = await runStatus({
      statePath,
      gitExecFn: mockGitExec,
    });

    expect(statuses[0].upToDate).toBe(false);
  });

  it("reports unknown for local sources", async () => {
    const statePath = join(tmpDir, "state.json");
    const state: PluginxState = {
      plugins: [
        {
          name: "local",
          sourceType: "local",
          sourcePath: "/local/path",
          outputPath: "/tmp/translations/local",
          type: "single",
          lastTranslated: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    await writeFile(statePath, JSON.stringify(state));

    const statuses = await runStatus({ statePath });
    expect(statuses[0].upToDate).toBe("unknown");
  });

  it("returns empty array when no plugins", async () => {
    const statePath = join(tmpDir, "state.json");
    const statuses = await runStatus({ statePath });
    expect(statuses).toEqual([]);
  });
});
