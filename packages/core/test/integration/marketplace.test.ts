import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, readFileSync } from "fs";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { translateMarketplace } from "../../src/translate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const marketplaceFixtures = join(
  __dirname,
  "../fixtures/claude-marketplaces"
);
const pluginFixtures = join(__dirname, "../fixtures/claude-plugins");

describe("translateMarketplace with marketplace.json", () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), "pluginx-mkt-test-"));
  });

  it("translates local-only marketplace via marketplace.json", async () => {
    const reports = await translateMarketplace({
      from: "claude",
      to: "gemini",
      source: join(marketplaceFixtures, "local-only"),
      outputDir,
    });

    expect(reports).toHaveLength(2);

    // Both plugins should produce gemini-extension.json
    for (const report of reports) {
      const manifestPath = join(
        outputDir,
        report.pluginName,
        "gemini-extension.json"
      );
      expect(existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      expect(manifest.name).toBeTruthy();
    }

    const names = reports.map((r) => r.pluginName).sort();
    expect(names).toEqual(["root-plugin", "sub-plugin"]);
  });

  it("includes validation in marketplace translation reports", async () => {
    const reports = await translateMarketplace({
      from: "claude",
      to: "gemini",
      source: join(marketplaceFixtures, "local-only"),
      outputDir,
    });

    for (const report of reports) {
      expect(report.validation).toBeDefined();
      expect(report.validation!.parity.passed).toBe(true);
      expect(report.validation!.parity.errors).toEqual([]);
    }
  });

  it("falls back to directory scanning when no marketplace.json exists", async () => {
    // The claude-plugins fixture directory has subdirectories (basic, full)
    // that are valid plugins but no marketplace.json
    const reports = await translateMarketplace({
      from: "claude",
      to: "gemini",
      source: pluginFixtures,
      outputDir,
    });

    // Should still work via directory scanning
    expect(reports.length).toBeGreaterThan(0);
    for (const report of reports) {
      const manifestPath = join(
        outputDir,
        report.pluginName,
        "gemini-extension.json"
      );
      expect(existsSync(manifestPath)).toBe(true);
    }
  });

  it("skips unrecognized plugins gracefully", async () => {
    // The mixed marketplace has a remote plugin that won't actually be cloneable
    // in unit tests, but local-only marketplace has all valid local plugins
    // so we test that non-plugin directories are skipped in dir scan mode
    const reports = await translateMarketplace({
      to: "gemini",
      source: pluginFixtures,
      outputDir,
    });

    // All returned reports should be valid
    for (const report of reports) {
      expect(report.pluginName).toBeTruthy();
    }
  });
});
