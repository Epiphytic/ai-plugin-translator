import { describe, it, expect, beforeEach } from "vitest";
import { existsSync, readFileSync } from "fs";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ClaudeSourceAdapter } from "../../src/adapters/claude/source.js";
import { GeminiTargetAdapter } from "../../src/adapters/gemini/target.js";
import { translate } from "../../src/translate.js";
import { checkTranslationParity } from "../../src/validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../fixtures/claude-plugins");

describe("end-to-end: Claude -> Gemini", () => {
  let outputDir: string;

  beforeEach(async () => {
    outputDir = await mkdtemp(join(tmpdir(), "pluginx-test-"));
  });

  it("translates a full Claude plugin into a Gemini extension", async () => {
    const source = new ClaudeSourceAdapter();
    const target = new GeminiTargetAdapter();

    const sourcePath = join(fixtures, "full");
    const ir = await source.parse(sourcePath);
    const report = await target.generate(ir, outputDir, { sourcePath });

    // Manifest
    const manifest = JSON.parse(
      readFileSync(join(outputDir, "gemini-extension.json"), "utf-8")
    );
    expect(manifest.name).toBe("full-plugin");
    expect(manifest.version).toBe("2.1.0");
    expect(manifest.mcpServers).toBeDefined();
    expect(manifest.contextFileName).toBe("GEMINI.md");

    // Commands as TOML
    expect(existsSync(join(outputDir, "commands", "commit.toml"))).toBe(true);
    expect(existsSync(join(outputDir, "commands", "search.toml"))).toBe(true);

    // Skills
    expect(
      existsSync(join(outputDir, "skills", "code-review", "SKILL.md"))
    ).toBe(true);

    // Hooks
    const hooksJson = JSON.parse(
      readFileSync(join(outputDir, "hooks", "hooks.json"), "utf-8")
    );
    expect(hooksJson.hooks.BeforeTool).toBeDefined();

    // Hook script files are copied from source
    expect(existsSync(join(outputDir, "hooks", "check.py"))).toBe(true);
    expect(existsSync(join(outputDir, "hooks", "post.sh"))).toBe(true);

    // Agents
    expect(
      existsSync(join(outputDir, "agents", "code-simplifier.md"))
    ).toBe(true);

    // Context file
    expect(existsSync(join(outputDir, "GEMINI.md"))).toBe(true);

    // Metadata
    const meta = JSON.parse(
      readFileSync(join(outputDir, ".pluginx-meta.json"), "utf-8")
    );
    expect(meta.from).toBe("claude");
    expect(meta.to).toBe("gemini");

    // Report
    expect(report.pluginName).toBe("full-plugin");
    expect(report.translated.length).toBeGreaterThan(0);
    expect(report.skipped.length).toBeGreaterThan(0);
  });

  it("translates a minimal Claude plugin", async () => {
    const source = new ClaudeSourceAdapter();
    const target = new GeminiTargetAdapter();

    const ir = await source.parse(join(fixtures, "basic"));
    const report = await target.generate(ir, outputDir);

    const manifest = JSON.parse(
      readFileSync(join(outputDir, "gemini-extension.json"), "utf-8")
    );
    expect(manifest.name).toBe("basic-plugin");
    expect(report.translated.length).toBeGreaterThan(0);
    expect(report.warnings).toEqual([]);
  });

  it("parity check passes for full plugin translation", async () => {
    const source = new ClaudeSourceAdapter();
    const target = new GeminiTargetAdapter();

    const ir = await source.parse(join(fixtures, "full"));
    const report = await target.generate(ir, outputDir);
    const parity = checkTranslationParity(ir, report);

    expect(parity.passed).toBe(true);
    expect(parity.errors).toEqual([]);
  });

  it("parity check passes for minimal plugin translation", async () => {
    const source = new ClaudeSourceAdapter();
    const target = new GeminiTargetAdapter();

    const ir = await source.parse(join(fixtures, "basic"));
    const report = await target.generate(ir, outputDir);
    const parity = checkTranslationParity(ir, report);

    expect(parity.passed).toBe(true);
    expect(parity.errors).toEqual([]);
  });

  it("translate() includes validation in report", async () => {
    const report = await translate({
      from: "claude",
      to: "gemini",
      source: join(fixtures, "full"),
      output: outputDir,
    });

    expect(report.validation).toBeDefined();
    expect(report.validation!.parity.passed).toBe(true);
    expect(report.validation!.parity.errors).toEqual([]);

    // Validation should also be persisted in the report file
    const savedReport = JSON.parse(
      readFileSync(join(outputDir, ".translation-report.json"), "utf-8")
    );
    expect(savedReport.validation).toBeDefined();
    expect(savedReport.validation.parity.passed).toBe(true);
  });
});
