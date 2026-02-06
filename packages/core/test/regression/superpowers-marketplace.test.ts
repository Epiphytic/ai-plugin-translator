#!/usr/bin/env node
/**
 * Regression test: obra/superpowers-marketplace
 *
 * Clones the marketplace repo using GitHub owner/repo shorthand,
 * translates all plugins, and validates each output is a valid Gemini extension.
 *
 * Usage: npx tsx test/regression/superpowers-marketplace.test.ts
 *
 * Requires git on PATH and network access.
 */

import { execFileSync } from "child_process";
import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { translateMarketplace } from "../../src/translate.js";
import { cloneToTemp, resolveGitUrl } from "../../src/utils/git.js";
import type { TranslationReport } from "../../src/adapters/types.js";

function isGeminiAvailable(): boolean {
  try {
    execFileSync("gemini", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function geminiValidate(extensionDir: string): string | null {
  try {
    execFileSync("gemini", ["extensions", "validate", extensionDir], {
      stdio: "pipe",
    });
    return null;
  } catch (err) {
    const stderr = (err as { stderr?: Buffer }).stderr?.toString() ?? "";
    const stdout = (err as { stdout?: Buffer }).stdout?.toString() ?? "";
    return stderr || stdout || (err as Error).message;
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = join(__dirname, "../fixtures/regression-output/superpowers-marketplace-test");

const MARKETPLACE_SHORTHAND = "obra/superpowers-marketplace";
const EXPECTED_PLUGIN_COUNT = 7;
const VALID_AGENT_KEYS = new Set(["name", "description"]);

interface ValidationResult {
  pluginName: string;
  valid: boolean;
  errors: string[];
  componentCount: number;
  warnings: string[];
}

function validateGeminiExtension(pluginDir: string, pluginName: string): ValidationResult {
  const errors: string[] = [];

  // 1. gemini-extension.json must exist and be valid JSON
  const manifestPath = join(pluginDir, "gemini-extension.json");
  if (!existsSync(manifestPath)) {
    return { pluginName, valid: false, errors: ["missing gemini-extension.json"], componentCount: 0, warnings: [] };
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch (err) {
    return { pluginName, valid: false, errors: [`invalid gemini-extension.json: ${(err as Error).message}`], componentCount: 0, warnings: [] };
  }

  if (!manifest.name || typeof manifest.name !== "string") {
    errors.push("gemini-extension.json: missing or invalid 'name'");
  }

  // 2. Commands (if any) should be .toml files
  const commandsDir = join(pluginDir, "commands");
  if (existsSync(commandsDir)) {
    for (const file of readdirSync(commandsDir)) {
      if (!file.endsWith(".toml")) continue;
      const content = readFileSync(join(commandsDir, file), "utf-8");
      if (!content.includes("prompt")) {
        errors.push(`commands/${file}: missing 'prompt' field`);
      }
    }
  }

  // 3. Agents (if any) should only have Gemini-valid frontmatter keys
  const agentsDir = join(pluginDir, "agents");
  if (existsSync(agentsDir)) {
    for (const file of readdirSync(agentsDir)) {
      if (!file.endsWith(".md")) continue;
      const content = readFileSync(join(agentsDir, file), "utf-8");
      const { data } = matter(content);

      if (!data.name) {
        errors.push(`agents/${file}: missing required 'name'`);
      }

      for (const key of Object.keys(data)) {
        if (!VALID_AGENT_KEYS.has(key)) {
          errors.push(`agents/${file}: unsupported frontmatter key '${key}'`);
        }
      }
    }
  }

  // 4. Translation report should exist
  const reportPath = join(pluginDir, ".translation-report.json");
  let componentCount = 0;
  let warnings: string[] = [];
  if (existsSync(reportPath)) {
    const report: TranslationReport = JSON.parse(readFileSync(reportPath, "utf-8"));
    componentCount = report.translated.length;
    warnings = report.warnings;
    if (componentCount === 0) {
      errors.push("translation produced 0 components");
    }
  }

  // 5. Context files referenced in manifest must exist
  if (manifest.contextFileName && typeof manifest.contextFileName === "string") {
    const contextPath = join(pluginDir, manifest.contextFileName);
    if (!existsSync(contextPath)) {
      errors.push(
        `gemini-extension.json references missing context file: ${manifest.contextFileName}`
      );
    }
  }

  return {
    pluginName,
    valid: errors.length === 0,
    errors,
    componentCount,
    warnings,
  };
}

async function run(): Promise<void> {
  const geminiAvailable = isGeminiAvailable();

  console.log(`\nSuperpowers Marketplace Regression Test`);
  console.log(`${"=".repeat(50)}`);
  if (geminiAvailable) {
    console.log("Gemini CLI detected — will run `gemini extensions validate`");
  } else {
    console.log("Gemini CLI not found — skipping `gemini extensions validate`");
  }

  // Step 1: Resolve shorthand and clone
  const gitUrl = resolveGitUrl(MARKETPLACE_SHORTHAND);
  console.log(`\nResolving "${MARKETPLACE_SHORTHAND}" -> ${gitUrl}`);
  console.log("Cloning marketplace...");

  const cloned = await cloneToTemp(gitUrl);

  try {
    // Step 2: Translate all plugins
    if (existsSync(outputDir)) {
      rmSync(outputDir, { recursive: true });
    }
    mkdirSync(outputDir, { recursive: true });

    console.log("Translating all plugins...\n");
    const reports = await translateMarketplace({
      from: "claude",
      to: "gemini",
      source: cloned.path,
      outputDir,
    });

    console.log(`Translated ${reports.length} plugins\n`);

    // Step 3: Assert plugin count
    if (reports.length !== EXPECTED_PLUGIN_COUNT) {
      console.error(
        `FAIL: Expected ${EXPECTED_PLUGIN_COUNT} plugins, got ${reports.length}`
      );
      console.error(
        "Plugin names:",
        reports.map((r) => r.pluginName).join(", ")
      );
      process.exitCode = 1;
      return;
    }

    // Step 4: Validate each translated plugin
    const results: ValidationResult[] = [];
    for (const report of reports) {
      const pluginDir = join(outputDir, report.pluginName);
      const result = validateGeminiExtension(pluginDir, report.pluginName);

      // Run gemini extensions validate if structural checks passed
      if (result.valid && geminiAvailable) {
        const validateErr = geminiValidate(pluginDir);
        if (validateErr) {
          result.valid = false;
          result.errors.push(`gemini extensions validate failed: ${validateErr}`);
        }
      }

      results.push(result);

      const status = result.valid ? "PASS" : "FAIL";
      console.log(
        `  [${status}] ${result.pluginName} (${result.componentCount} components)`
      );
      if (result.warnings.length > 0) {
        console.log(`         ${result.warnings.length} translation warnings (expected)`);
      }
      for (const err of result.errors) {
        console.log(`         ERROR: ${err}`);
      }
    }

    // Step 5: Summary
    const passed = results.filter((r) => r.valid).length;
    const failed = results.filter((r) => !r.valid).length;

    console.log(`\n${"=".repeat(50)}`);
    console.log(
      `Results: ${passed}/${results.length} valid Gemini extensions`
    );

    if (failed > 0) {
      console.error(`\n${failed} plugin(s) produced invalid extensions:`);
      for (const r of results.filter((r) => !r.valid)) {
        console.error(`  ${r.pluginName}:`);
        for (const e of r.errors) {
          console.error(`    - ${e}`);
        }
      }
      process.exitCode = 1;
    } else {
      console.log("\nAll plugins are valid Gemini extensions!");
    }
  } finally {
    await cloned.cleanup();
  }
}

run().catch((err) => {
  console.error("Regression test failed:", err);
  process.exitCode = 1;
});
