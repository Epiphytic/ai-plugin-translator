import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, readFileSync } from "fs";
import { mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { translate } from "../../src/translate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../fixtures/claude-plugins");
const clonedSources = join(__dirname, "../fixtures/cloned-sources");

describe("hook script files are copied to translated output", () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), "pluginx-hooks-test-"));
  });

  it("copies hook scripts from source to translated output", async () => {
    const source = join(fixtures, "full");

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
    expect(hooksJson.hooks.BeforeTool).toBeDefined();

    // Hook script files must be copied from source
    expect(existsSync(join(outputDir, "hooks", "check.py"))).toBe(true);
    expect(existsSync(join(outputDir, "hooks", "post.sh"))).toBe(true);

    // hooks.json should NOT be duplicated (it's generated, not copied)
    const translatedHooks = JSON.parse(
      readFileSync(join(outputDir, "hooks", "hooks.json"), "utf-8")
    );
    expect(translatedHooks.hooks.BeforeTool[0].hooks[0].command).toContain(
      "${extensionPath}"
    );
  });

  it.skipIf(!existsSync(join(clonedSources, "double-shot-latte")))(
    "copies hook scripts for double-shot-latte (regression)",
    async () => {
      const source = join(clonedSources, "double-shot-latte");

      await translate({
        from: "claude",
        to: "gemini",
        source,
        output: outputDir,
      });

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
      const hookCommand = hooksJson.hooks.AfterAgent[0].hooks[0].command;
      expect(hookCommand).toContain("${extensionPath}");
      expect(hookCommand).not.toContain("${CLAUDE_PLUGIN_ROOT}");
    }
  );
});
