#!/usr/bin/env node
import { Command } from "commander";
import {
  translate,
  translateMarketplace,
  createDefaultRegistry,
} from "./translate.js";
import type { TranslationReport } from "./adapters/types.js";

const program = new Command();

program
  .name("ai-plugin-translator")
  .description("Translate AI coding agent plugins between ecosystems")
  .version("0.1.0");

program
  .command("translate")
  .description("Translate a single plugin")
  .requiredOption("--to <ecosystem>", "Target ecosystem (e.g., gemini)")
  .option("--from <ecosystem>", "Source ecosystem (auto-detected if omitted)")
  .argument("<source>", "Path to source plugin")
  .argument("<output>", "Path to output directory")
  .action(
    async (
      source: string,
      output: string,
      opts: { from?: string; to: string }
    ) => {
      try {
        const report = await translate({
          from: opts.from,
          to: opts.to,
          source,
          output,
        });
        printReport(report);
        process.exitCode =
          report.skipped.length > 0 || report.warnings.length > 0 ? 2 : 0;
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    }
  );

program
  .command("translate-marketplace")
  .description("Translate all plugins in a marketplace")
  .requiredOption("--to <ecosystem>", "Target ecosystem (e.g., gemini)")
  .option("--from <ecosystem>", "Source ecosystem (auto-detected if omitted)")
  .argument("<source>", "Path to marketplace directory")
  .argument("<output-dir>", "Path to output directory")
  .action(
    async (
      source: string,
      outputDir: string,
      opts: { from?: string; to: string }
    ) => {
      try {
        const reports = await translateMarketplace({
          from: opts.from,
          to: opts.to,
          source,
          outputDir,
        });
        console.log(`Translated ${reports.length} plugins:`);
        let hasWarnings = false;
        for (const report of reports) {
          console.log(`\n  ${report.pluginName}:`);
          console.log(
            `    Translated: ${report.translated.length} components`
          );
          if (report.skipped.length > 0) {
            console.log(`    Skipped: ${report.skipped.length} components`);
            hasWarnings = true;
          }
          if (report.warnings.length > 0) {
            console.log(`    Warnings: ${report.warnings.length}`);
            hasWarnings = true;
          }
        }
        process.exitCode = hasWarnings ? 2 : 0;
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    }
  );

program
  .command("adapters")
  .description("List available source and target adapters")
  .action(() => {
    const registry = createDefaultRegistry();
    console.log("Source adapters:", registry.listSources().join(", "));
    console.log("Target adapters:", registry.listTargets().join(", "));
  });

function printReport(report: TranslationReport): void {
  console.log(
    `\nTranslated: ${report.pluginName} (${report.source} -> ${report.target})`
  );
  console.log(`\n  Components translated (${report.translated.length}):`);
  for (const t of report.translated) {
    console.log(
      `    [${t.type}] ${t.name}${t.notes ? ` (${t.notes})` : ""}`
    );
  }
  if (report.skipped.length > 0) {
    console.log(`\n  Skipped (${report.skipped.length}):`);
    for (const s of report.skipped) {
      console.log(`    [${s.type}] ${s.name}: ${s.reason}`);
    }
  }
  if (report.warnings.length > 0) {
    console.log(`\n  Warnings (${report.warnings.length}):`);
    for (const w of report.warnings) {
      console.log(`    ${w}`);
    }
  }
}

program.parse();
