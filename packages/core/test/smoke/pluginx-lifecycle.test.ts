/**
 * Smoke test: full pluginx lifecycle using the programmatic API.
 *
 * Tests: add -> list -> status -> update -> remove
 *
 * Uses local fixtures with mock exec (no git, no gemini CLI needed).
 * All paths are isolated in temp directories.
 *
 * Usage: npx vitest run --config vitest.smoke.config.ts test/smoke/pluginx-lifecycle.test.ts
 */

import { mkdtemp, rm, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { runAdd } from "../../src/pluginx/commands/add.js";
import { runList } from "../../src/pluginx/commands/list.js";
import { runStatus } from "../../src/pluginx/commands/status.js";
import { runUpdate } from "../../src/pluginx/commands/update.js";
import { runRemove } from "../../src/pluginx/commands/remove.js";
import { runUpdateAll } from "../../src/pluginx/commands/update-all.js";
import type { ExecFn } from "../../src/pluginx/exec-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../fixtures/claude-plugins");

// Fixture manifest names (from plugin.json)
const FULL_MANIFEST_NAME = "full-plugin";
const BASIC_MANIFEST_NAME = "basic-plugin";

// Directory-based names (from resolveSource)
const FULL_DIR_NAME = "full";
const BASIC_DIR_NAME = "basic";

describe("pluginx lifecycle (programmatic API)", () => {
  let tmpDir: string;
  let configPath: string;
  let statePath: string;
  let translationsDir: string;
  let linkCalls: Array<{ cmd: string; args: string[] }>;
  let mockExecFn: ExecFn;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "pluginx-lifecycle-"));
    configPath = join(tmpDir, "config.json");
    statePath = join(tmpDir, "state.json");
    translationsDir = join(tmpDir, "translations");
    linkCalls = [];

    mockExecFn = async (cmd: string, args: string[]) => {
      linkCalls.push({ cmd, args });
      return { stdout: "", stderr: "" };
    };
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("full lifecycle: add -> list -> status -> update -> remove", async () => {
    // Step 1: Add a local plugin
    const addResult = await runAdd({
      source: join(fixtures, "full"),
      nonInteractive: true,
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });

    // Report uses manifest name; tracked plugin uses directory name
    expect(addResult.report.pluginName).toBe(FULL_MANIFEST_NAME);
    expect(addResult.report.translated.length).toBeGreaterThan(0);
    expect(addResult.plugin.name).toBe(FULL_DIR_NAME);
    expect(addResult.plugin.sourceType).toBe("local");

    // Verify translation output exists (uses directory name)
    const outputPath = join(translationsDir, FULL_DIR_NAME);
    expect(existsSync(join(outputPath, "gemini-extension.json"))).toBe(true);

    // Verify gemini extensions link was called
    expect(linkCalls.length).toBe(1);
    expect(linkCalls[0].cmd).toBe("gemini");
    expect(linkCalls[0].args).toContain("link");
    expect(linkCalls[0].args).toContain(outputPath);

    // Step 2: List plugins
    const plugins = await runList({ statePath });
    expect(plugins).toHaveLength(1);
    expect(plugins[0].name).toBe(FULL_DIR_NAME);

    // Step 3: Check status (uses tracked name from state)
    const statuses = await runStatus({ statePath });
    expect(statuses.length).toBe(1);
    expect(statuses[0].name).toBe(FULL_DIR_NAME);
    expect(statuses[0].upToDate).toBe("unknown");

    // Step 4: Update the plugin (uses tracked name)
    linkCalls = [];
    const updateReports = await runUpdate({
      names: [FULL_DIR_NAME],
      nonInteractive: true,
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });
    expect(updateReports.length).toBe(1);
    expect(updateReports[0].pluginName).toBe(FULL_MANIFEST_NAME);
    expect(linkCalls.length).toBe(1);

    // Step 5: Remove the plugin (uses tracked name)
    const removed = await runRemove({ name: FULL_DIR_NAME, statePath });
    expect(removed).toBe(true);

    // Step 6: Verify list is empty
    const emptyPlugins = await runList({ statePath });
    expect(emptyPlugins).toHaveLength(0);
  });

  it("add with --consent passes --consent to gemini extensions link", async () => {
    await runAdd({
      source: join(fixtures, "basic"),
      consent: true,
      nonInteractive: true,
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });

    expect(linkCalls[0].args).toContain("--consent");
  });

  it("add without --consent does not pass --consent to link", async () => {
    await runAdd({
      source: join(fixtures, "basic"),
      nonInteractive: true,
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });

    expect(linkCalls[0].args).not.toContain("--consent");
  });

  it("remove returns false for unknown plugin", async () => {
    const removed = await runRemove({
      name: "nonexistent",
      statePath,
    });
    expect(removed).toBe(false);
  });

  it("update-all updates all tracked plugins", async () => {
    await runAdd({
      source: join(fixtures, "full"),
      nonInteractive: true,
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });
    await runAdd({
      source: join(fixtures, "basic"),
      nonInteractive: true,
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });

    linkCalls = [];
    const reports = await runUpdateAll({
      nonInteractive: true,
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });

    expect(reports.length).toBe(2);
    expect(linkCalls.length).toBe(2);
  });

  it("translated output contains expected files for full fixture", async () => {
    await runAdd({
      source: join(fixtures, "full"),
      nonInteractive: true,
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });

    const outputPath = join(translationsDir, FULL_DIR_NAME);

    // Core extension manifest
    expect(existsSync(join(outputPath, "gemini-extension.json"))).toBe(true);

    // Commands should be translated
    const commandsDir = join(outputPath, "commands");
    expect(existsSync(commandsDir)).toBe(true);

    // Hooks should be translated with scripts copied
    const hooksDir = join(outputPath, "hooks");
    expect(existsSync(join(hooksDir, "hooks.json"))).toBe(true);
    expect(existsSync(join(hooksDir, "check.py"))).toBe(true);
    expect(existsSync(join(hooksDir, "post.sh"))).toBe(true);

    // Hooks.json should reference ${extensionPath}
    const hooksJson = JSON.parse(
      await readFile(join(hooksDir, "hooks.json"), "utf-8")
    );
    const hookCommand = JSON.stringify(hooksJson);
    expect(hookCommand).toContain("${extensionPath}");
    expect(hookCommand).not.toContain("${CLAUDE_PLUGIN_ROOT}");
  });

  it("state persists across operations", async () => {
    await runAdd({
      source: join(fixtures, "full"),
      nonInteractive: true,
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });

    const stateRaw = JSON.parse(await readFile(statePath, "utf-8"));
    expect(stateRaw.plugins.length).toBe(1);
    expect(stateRaw.plugins[0].name).toBe(FULL_DIR_NAME);
    expect(stateRaw.plugins[0].sourceType).toBe("local");
    expect(stateRaw.plugins[0].type).toBe("single");
    expect(stateRaw.plugins[0].lastTranslated).toBeDefined();
  });

  it("consent config is written in non-interactive mode", async () => {
    await runAdd({
      source: join(fixtures, "basic"),
      nonInteractive: true,
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });

    const config = JSON.parse(await readFile(configPath, "utf-8"));
    expect(config.consentLevel).toBe("acknowledged");
  });

  it("subsequent commands skip consent when already acknowledged", async () => {
    // First add writes config
    await runAdd({
      source: join(fixtures, "basic"),
      nonInteractive: true,
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });

    // Second add should succeed without nonInteractive because config has consent
    linkCalls = [];
    await runAdd({
      source: join(fixtures, "full"),
      configPath,
      statePath,
      translationsDir,
      execFn: mockExecFn,
    });

    expect(linkCalls.length).toBe(1);
  });
});
