import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  readState,
  writeState,
  addPlugin,
  removePlugin,
  findPlugin,
} from "../../../src/pluginx/state.js";
import type { PluginxState, TrackedPlugin } from "../../../src/pluginx/types.js";

const makePlugin = (name: string): TrackedPlugin => ({
  name,
  sourceType: "git",
  sourceUrl: `https://github.com/test/${name}.git`,
  sourcePath: `/tmp/sources/${name}`,
  outputPath: `/tmp/translations/${name}`,
  type: "single",
  lastTranslated: "2026-01-01T00:00:00.000Z",
  sourceCommit: "abc123",
});

describe("pluginx/state", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `pluginx-state-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("readState", () => {
    it("reads valid state file", async () => {
      const statePath = join(tmpDir, "state.json");
      const state: PluginxState = { plugins: [makePlugin("foo")] };
      await writeFile(statePath, JSON.stringify(state));
      const result = await readState(statePath);
      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].name).toBe("foo");
    });

    it("returns empty state for missing file", async () => {
      const result = await readState(join(tmpDir, "nonexistent.json"));
      expect(result).toEqual({ plugins: [] });
    });
  });

  describe("writeState", () => {
    it("writes state to file", async () => {
      const statePath = join(tmpDir, "state.json");
      const state: PluginxState = { plugins: [makePlugin("bar")] };
      await writeState(state, statePath);
      const raw = await readFile(statePath, "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.plugins[0].name).toBe("bar");
    });

    it("creates parent directories if needed", async () => {
      const statePath = join(tmpDir, "nested", "dir", "state.json");
      await writeState({ plugins: [] }, statePath);
      const raw = await readFile(statePath, "utf-8");
      expect(JSON.parse(raw)).toEqual({ plugins: [] });
    });
  });

  describe("addPlugin", () => {
    it("adds a new plugin to empty state", () => {
      const state: PluginxState = { plugins: [] };
      const result = addPlugin(state, makePlugin("new"));
      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].name).toBe("new");
    });

    it("replaces existing plugin with same name", () => {
      const state: PluginxState = { plugins: [makePlugin("dup")] };
      const updated = makePlugin("dup");
      updated.lastTranslated = "2026-06-01T00:00:00.000Z";
      const result = addPlugin(state, updated);
      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].lastTranslated).toBe(
        "2026-06-01T00:00:00.000Z"
      );
    });
  });

  describe("removePlugin", () => {
    it("removes a plugin by name", () => {
      const state: PluginxState = {
        plugins: [makePlugin("a"), makePlugin("b")],
      };
      const result = removePlugin(state, "a");
      expect(result.plugins).toHaveLength(1);
      expect(result.plugins[0].name).toBe("b");
    });

    it("returns unchanged state when name not found", () => {
      const state: PluginxState = { plugins: [makePlugin("a")] };
      const result = removePlugin(state, "missing");
      expect(result.plugins).toHaveLength(1);
    });
  });

  describe("findPlugin", () => {
    it("finds plugin by name", () => {
      const state: PluginxState = {
        plugins: [makePlugin("x"), makePlugin("y")],
      };
      const found = findPlugin(state, "y");
      expect(found?.name).toBe("y");
    });

    it("returns undefined when not found", () => {
      const state: PluginxState = { plugins: [] };
      expect(findPlugin(state, "nope")).toBeUndefined();
    });
  });
});
