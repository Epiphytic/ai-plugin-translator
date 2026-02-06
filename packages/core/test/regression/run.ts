#!/usr/bin/env node
/**
 * Regression test runner for ai-plugin-translator.
 *
 * Reads regression sources from sources.json, clones each,
 * runs translate/translate-marketplace, and verifies output structure.
 *
 * Usage: npx tsx test/regression/run.ts
 *
 * Requires git on PATH. Clones into test/fixtures/cloned-sources/ (gitignored).
 */

import { execFileSync, execFile } from "child_process";
import { existsSync, readFileSync, mkdirSync, rmSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { translate, translateMarketplace } from "../../src/translate.js";

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
const sourcesPath = join(__dirname, "sources.json");
const cloneDir = join(__dirname, "../fixtures/cloned-sources");
const outputDir = join(__dirname, "../fixtures/regression-output");

interface RegressionSource {
  name: string;
  url: string;
  type: "single" | "marketplace";
  path?: string;
  notes?: string;
}

interface SourcesConfig {
  regressionSources: RegressionSource[];
}

const VALID_AGENT_KEYS = new Set(["name", "description"]);

function validateAgents(pluginOutputDir: string): string[] {
  const agentsDir = join(pluginOutputDir, "agents");
  if (!existsSync(agentsDir)) return [];

  const errors: string[] = [];

  for (const file of readdirSync(agentsDir)) {
    if (!file.endsWith(".md")) continue;
    const content = readFileSync(join(agentsDir, file), "utf-8");
    const { data } = matter(content);

    if (!data.name) errors.push(`${file}: missing required 'name'`);

    for (const key of Object.keys(data)) {
      if (!VALID_AGENT_KEYS.has(key)) {
        errors.push(`${file}: unsupported key '${key}'`);
      }
    }
  }
  return errors;
}

function validateManifest(pluginOutputDir: string): string[] {
  const errors: string[] = [];
  const manifestPath = join(pluginOutputDir, "gemini-extension.json");
  if (!existsSync(manifestPath)) return errors;

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  if (
    manifest.contextFileName &&
    typeof manifest.contextFileName === "string"
  ) {
    const contextPath = join(pluginOutputDir, manifest.contextFileName);
    if (!existsSync(contextPath)) {
      errors.push(
        `gemini-extension.json references missing context file: ${manifest.contextFileName}`
      );
    }
  }
  return errors;
}

function cloneOrPull(url: string, targetDir: string): void {
  if (existsSync(targetDir)) {
    console.log(`  Pulling latest for ${targetDir}`);
    execFileSync("git", ["-C", targetDir, "pull", "--ff-only"], {
      stdio: "pipe",
    });
  } else {
    console.log(`  Cloning ${url}`);
    execFileSync("git", ["clone", "--depth", "1", url, targetDir], {
      stdio: "pipe",
    });
  }
}

async function runRegression(): Promise<void> {
  const config: SourcesConfig = JSON.parse(
    readFileSync(sourcesPath, "utf-8")
  );

  const geminiAvailable = isGeminiAvailable();
  if (geminiAvailable) {
    console.log("Gemini CLI detected — will run `gemini extensions validate`");
  } else {
    console.log("Gemini CLI not found — skipping `gemini extensions validate`");
  }

  mkdirSync(cloneDir, { recursive: true });

  // Clean output dir
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true });
  }
  mkdirSync(outputDir, { recursive: true });

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const source of config.regressionSources) {
    console.log(`\nRegression: ${source.name}`);

    const repoDir = join(cloneDir, source.name);

    try {
      cloneOrPull(source.url, repoDir);
    } catch (err) {
      console.log(`  SKIP: Could not clone ${source.url}`);
      errors.push(`${source.name}: clone failed`);
      failed++;
      continue;
    }

    const sourcePath = source.path
      ? join(repoDir, source.path)
      : repoDir;

    try {
      if (source.type === "marketplace") {
        const reports = await translateMarketplace({
          from: "claude",
          to: "gemini",
          source: sourcePath,
          outputDir: join(outputDir, source.name),
        });
        console.log(`  Translated ${reports.length} plugins from marketplace`);

        if (reports.length === 0) {
          errors.push(`${source.name}: marketplace translated 0 plugins`);
          failed++;
          continue;
        }

        for (const report of reports) {
          const pluginDir = join(outputDir, source.name, report.pluginName);
          const manifestPath = join(pluginDir, "gemini-extension.json");
          if (!existsSync(manifestPath)) {
            errors.push(
              `${source.name}/${report.pluginName}: missing gemini-extension.json`
            );
            failed++;
          } else {
            const allErrors = [
              ...validateAgents(pluginDir),
              ...validateManifest(pluginDir),
            ];
            if (allErrors.length > 0) {
              for (const ae of allErrors) {
                errors.push(`${source.name}/${report.pluginName}: ${ae}`);
              }
              failed++;
            } else if (geminiAvailable) {
              const validateErr = geminiValidate(pluginDir);
              if (validateErr) {
                errors.push(
                  `${source.name}/${report.pluginName}: gemini validate failed: ${validateErr}`
                );
                failed++;
              } else {
                passed++;
              }
            } else {
              passed++;
            }
          }
        }
      } else {
        const pluginOutputDir = join(outputDir, source.name);
        const report = await translate({
          from: "claude",
          to: "gemini",
          source: sourcePath,
          output: pluginOutputDir,
        });
        console.log(
          `  Translated: ${report.translated.length} components, ` +
            `Skipped: ${report.skipped.length}, ` +
            `Warnings: ${report.warnings.length}`
        );

        const manifestPath = join(pluginOutputDir, "gemini-extension.json");
        if (!existsSync(manifestPath)) {
          errors.push(`${source.name}: missing gemini-extension.json`);
          failed++;
        } else {
          // Validate manifest is parseable JSON
          JSON.parse(readFileSync(manifestPath, "utf-8"));

          // Validate agents and manifest references
          const allErrors = [
            ...validateAgents(pluginOutputDir),
            ...validateManifest(pluginOutputDir),
          ];
          if (allErrors.length > 0) {
            for (const ae of allErrors) {
              errors.push(`${source.name}: ${ae}`);
            }
            failed++;
          } else if (geminiAvailable) {
            const validateErr = geminiValidate(pluginOutputDir);
            if (validateErr) {
              errors.push(
                `${source.name}: gemini validate failed: ${validateErr}`
              );
              failed++;
            } else {
              passed++;
            }
          } else {
            passed++;
          }
        }
      }
    } catch (err) {
      console.log(`  FAIL: ${(err as Error).message}`);
      errors.push(`${source.name}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Regression results: ${passed} passed, ${failed} failed`);
  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const e of errors) {
      console.log(`  - ${e}`);
    }
  }

  process.exitCode = failed > 0 ? 1 : 0;
}

runRegression().catch((err) => {
  console.error("Regression runner failed:", err);
  process.exitCode = 1;
});
