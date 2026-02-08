import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("returns empty array when no plugins tracked", async () => {
    const statePath = join(tmpDir, "state.json");
    const result = await runList({ statePath });
    expect(result).toEqual([]);
  });

  it("returns tracked plugins", async () => {
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
    const result = await runList({ statePath });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("test-plugin");
    expect(result[0].sourceUrl).toBe("https://github.com/test/plugin.git");
  });

  it("returns all plugin data", async () => {
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
    const result = await runList({ statePath });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("json-plugin");
    expect(result[0].sourceType).toBe("local");
  });
});
