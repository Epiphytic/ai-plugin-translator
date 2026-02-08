import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { runRemove } from "../../../../src/pluginx/commands/remove.js";
import type { PluginxState } from "../../../../src/pluginx/types.js";

describe("pluginx/commands/remove", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `pluginx-remove-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("removes a tracked plugin", async () => {
    const statePath = join(tmpDir, "state.json");
    const state: PluginxState = {
      plugins: [
        {
          name: "to-remove",
          sourceType: "git",
          sourcePath: "/tmp/sources/to-remove",
          outputPath: "/tmp/translations/to-remove",
          type: "single",
          lastTranslated: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    await writeFile(statePath, JSON.stringify(state));

    const result = await runRemove({ name: "to-remove", statePath });
    expect(result).toBe(true);

    const updated = JSON.parse(await readFile(statePath, "utf-8"));
    expect(updated.plugins).toHaveLength(0);
  });

  it("returns false for unknown plugin", async () => {
    const statePath = join(tmpDir, "state.json");
    await writeFile(statePath, JSON.stringify({ plugins: [] }));

    const result = await runRemove({ name: "missing", statePath });
    expect(result).toBe(false);
  });
});
