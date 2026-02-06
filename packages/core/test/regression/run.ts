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

import { execFileSync } from "child_process";
import { existsSync, readFileSync, mkdirSync, rmSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { translate, translateMarketplace } from "../../src/translate.js";

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
            const agentErrors = validateAgents(pluginDir);
            if (agentErrors.length > 0) {
              for (const ae of agentErrors) {
                errors.push(`${source.name}/${report.pluginName}: ${ae}`);
              }
              failed++;
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

          // Validate agents
          const agentErrors = validateAgents(pluginOutputDir);
          if (agentErrors.length > 0) {
            for (const ae of agentErrors) {
              errors.push(`${source.name}: ${ae}`);
            }
            failed++;
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
