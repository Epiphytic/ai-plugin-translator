/**
 * Smoke test: pluginx commands through Gemini CLI.
 *
 * Requires: gemini CLI on PATH with valid API credentials.
 *
 * Tests actual end-to-end flow: translate, link via gemini, list, uninstall.
 * This test modifies the real ~/.gemini/extensions/ directory and cleans up.
 *
 * Usage: npx vitest run --config vitest.smoke.config.ts test/smoke/pluginx-gemini.test.ts
 */

import { execFileSync, spawnSync } from "child_process";
import { mkdtempSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
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

function geminiExtensionsList(): string {
  // gemini extensions list may output to stdout or stderr; capture both
  const result = spawnSync("gemini", ["extensions", "list"], {
    encoding: "utf-8",
  });
  return (result.stdout ?? "") + (result.stderr ?? "");
}

const geminiAvailable = isGeminiAvailable();

describe.skipIf(!geminiAvailable)(
  "pluginx through Gemini CLI",
  () => {
    const linkedNames: string[] = [];
    let outputDir: string;

    beforeAll(() => {
      outputDir = mkdtempSync(join(tmpdir(), "pluginx-gemini-smoke-"));
    });

    afterAll(() => {
      // Clean up: uninstall all extensions we linked
      for (const name of linkedNames) {
        try {
          execFileSync("gemini", ["extensions", "uninstall", name], {
            stdio: "pipe",
          });
        } catch {
          console.warn(`Warning: could not uninstall ${name}`);
        }
      }
      rmSync(outputDir, { recursive: true, force: true });
    });

    it("translates and links the basic fixture", async () => {
      const outputPath = join(outputDir, "basic-smoke");

      const report = await translate({
        from: "claude",
        to: "gemini",
        source: join(fixtures, "basic"),
        output: outputPath,
      });

      expect(report.translated.length).toBeGreaterThan(0);

      // Read the manifest to get the extension name
      const manifest = JSON.parse(
        readFileSync(join(outputPath, "gemini-extension.json"), "utf-8")
      );

      // Link the extension
      // --consent bypasses gemini's own interactive consent prompt
      execFileSync(
        "gemini",
        ["extensions", "link", "--consent", outputPath],
        { stdio: "pipe" }
      );
      linkedNames.push(manifest.name);
    });

    it("translates and links the full fixture", async () => {
      const outputPath = join(outputDir, "full-smoke");

      const report = await translate({
        from: "claude",
        to: "gemini",
        source: join(fixtures, "full"),
        output: outputPath,
      });

      expect(report.translated.length).toBeGreaterThan(0);

      const manifest = JSON.parse(
        readFileSync(join(outputPath, "gemini-extension.json"), "utf-8")
      );

      // --consent bypasses gemini's own interactive consent prompt
      execFileSync(
        "gemini",
        ["extensions", "link", "--consent", outputPath],
        { stdio: "pipe" }
      );
      linkedNames.push(manifest.name);
    });

    it("lists installed extensions and finds our plugins", () => {
      const listOutput = geminiExtensionsList();

      for (const name of linkedNames) {
        expect(listOutput).toContain(name);
      }
    });

    it("validates extension structure", () => {
      const paths = [
        join(outputDir, "basic-smoke"),
        join(outputDir, "full-smoke"),
      ];
      for (const p of paths) {
        expect(() => {
          execFileSync("gemini", ["extensions", "validate", p], {
            stdio: "pipe",
          });
        }).not.toThrow();
      }
    });

    it("uninstalls extensions cleanly", () => {
      const toUninstall = [...linkedNames];
      for (const name of toUninstall) {
        try {
          execFileSync("gemini", ["extensions", "uninstall", name], {
            stdio: "pipe",
          });
          linkedNames.splice(linkedNames.indexOf(name), 1);
        } catch {
          // extension may have a different name
        }
      }

      const listOutput = geminiExtensionsList();
      for (const name of toUninstall) {
        expect(listOutput).not.toContain(name);
      }
    });
  }
);
