import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, readFileSync } from "fs";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { translate } from "../../src/translate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clonedSources = join(__dirname, "../fixtures/cloned-sources");

describe("hook script files are copied to translated output", () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), "pluginx-hooks-test-"));
  });

  it("copies hook scripts for double-shot-latte (regression)", async () => {
    const source = join(clonedSources, "double-shot-latte");

    const report = await translate({
      from: "claude",
      to: "gemini",
      source,
      output: outputDir,
    });

    // hooks.json should be generated (translated)
    const hooksJson = JSON.parse(
      readFileSync(join(outputDir, "hooks", "hooks.json"), "utf-8")
    );
    expect(hooksJson.hooks.AfterAgent).toBeDefined();

    // Hook script files must be copied from source
    expect(existsSync(join(outputDir, "hooks", "run-hook.cmd"))).toBe(true);
    expect(
      existsSync(join(outputDir, "hooks", "claude-judge-continuation.sh"))
    ).toBe(true);

    // The translated command should reference ${extensionPath}
    const hookCommand =
      hooksJson.hooks.AfterAgent[0].hooks[0].command;
    expect(hookCommand).toContain("${extensionPath}");
    expect(hookCommand).not.toContain("${CLAUDE_PLUGIN_ROOT}");
  });

  it("copies hook scripts for superpowers plugin with hooks", async () => {
    const source = join(clonedSources, "superpowers");

    // Check if superpowers has hooks
    const hooksPath = join(source, "hooks", "hooks.json");
    if (!existsSync(hooksPath)) {
      return; // Skip if fixture doesn't have hooks
    }

    const report = await translate({
      from: "claude",
      to: "gemini",
      source,
      output: outputDir,
    });

    // Verify hooks.json exists in output
    expect(existsSync(join(outputDir, "hooks", "hooks.json"))).toBe(true);
  });
});
