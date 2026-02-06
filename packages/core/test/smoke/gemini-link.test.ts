#!/usr/bin/env node
/**
 * Smoke test: verifies that a translated plugin can be linked as a Gemini extension.
 *
 * Requires: gemini CLI on PATH
 *
 * Usage: npx tsx test/smoke/gemini-link.test.ts
 *
 * This test:
 * 1. Checks if gemini CLI is available (skips if not)
 * 2. Translates the "full" fixture plugin
 * 3. Runs `gemini extensions link` on the output
 * 4. Runs `gemini extensions list` and verifies the extension appears
 * 5. Cleans up with `gemini extensions uninstall`
 */

import { execFileSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { translate } from "../../src/translate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../fixtures/claude-plugins");

function isGeminiAvailable(): boolean {
  try {
    execFileSync("gemini", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function runSmokeTest(): Promise<void> {
  if (!isGeminiAvailable()) {
    console.log("SKIP: gemini CLI not found on PATH");
    console.log("Install Gemini CLI to run smoke tests");
    return;
  }

  const outputDir = mkdtempSync(join(tmpdir(), "pluginx-smoke-"));
  const pluginName = "full-plugin";

  try {
    // Step 1: Translate
    console.log("Translating fixture plugin...");
    const report = await translate({
      from: "claude",
      to: "gemini",
      source: join(fixtures, "full"),
      output: outputDir,
    });
    console.log(
      `  Translated ${report.translated.length} components`
    );

    // Step 2: Link
    console.log("Linking extension...");
    execFileSync("gemini", ["extensions", "link", outputDir], {
      stdio: "pipe",
    });
    console.log("  Linked successfully");

    // Step 3: Verify
    console.log("Verifying extension appears in list...");
    const listOutput = execFileSync(
      "gemini",
      ["extensions", "list"],
      { encoding: "utf-8" }
    );

    if (listOutput.includes(pluginName)) {
      console.log(`  PASS: "${pluginName}" found in extensions list`);
    } else {
      console.error(`  FAIL: "${pluginName}" NOT found in extensions list`);
      console.error("  List output:", listOutput);
      process.exitCode = 1;
    }

    // Step 4: Cleanup
    console.log("Cleaning up...");
    try {
      execFileSync(
        "gemini",
        ["extensions", "uninstall", pluginName],
        { stdio: "pipe" }
      );
      console.log("  Uninstalled successfully");
    } catch {
      console.log(
        "  Warning: Could not uninstall extension (may need manual cleanup)"
      );
    }
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }

  console.log("\nSmoke test passed!");
}

runSmokeTest().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exitCode = 1;
});
