import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { runList } from "../../../../src/pluginx/commands/list.js";
import type { PluginxState } from "../../../../src/pluginx/types.js";

describe("pluginx/commands/list", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `pluginx-list-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("prints message when no plugins tracked", async () => {
    const statePath = join(tmpDir, "state.json");
    await runList({ statePath });
    expect(console.log).toHaveBeenCalledWith("No plugins tracked.");
  });

  it("prints tracked plugins", async () => {
    const statePath = join(tmpDir, "state.json");
    const state: PluginxState = {
      plugins: [
        {
          name: "test-plugin",
          sourceType: "git",
          sourceUrl: "https://github.com/test/plugin.git",
          sourcePath: "/tmp/sources/test-plugin",
          outputPath: "/tmp/translations/test-plugin",
          type: "single",
          lastTranslated: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    await writeFile(statePath, JSON.stringify(state));
    await runList({ statePath });
    expect(console.log).toHaveBeenCalledWith("Tracked plugins (1):\n");
    expect(console.log).toHaveBeenCalledWith("  test-plugin");
  });

  it("outputs JSON when --json flag is set", async () => {
    const statePath = join(tmpDir, "state.json");
    const state: PluginxState = {
      plugins: [
        {
          name: "json-plugin",
          sourceType: "local",
          sourcePath: "/local/path",
          outputPath: "/tmp/translations/json-plugin",
          type: "single",
          lastTranslated: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    await writeFile(statePath, JSON.stringify(state));
    await runList({ statePath, json: true });
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("json-plugin")
    );
  });
});
