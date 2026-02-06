#!/usr/bin/env node
import { Command } from "commander";
import { runAdd } from "./pluginx/commands/add.js";
import { runAddMarketplace } from "./pluginx/commands/add-marketplace.js";
import { runList } from "./pluginx/commands/list.js";
import { runStatus } from "./pluginx/commands/status.js";
import { runUpdate } from "./pluginx/commands/update.js";
import { runUpdateAll } from "./pluginx/commands/update-all.js";
import { runRemove } from "./pluginx/commands/remove.js";
import type { TranslationReport } from "./adapters/types.js";

const program = new Command();

program
  .name("pluginx")
  .description("Manage translated Claude Code plugins as Gemini CLI extensions")
  .version("0.1.0");

program
  .command("add")
  .description("Add a Claude Code plugin as a Gemini extension")
  .argument("<source>", "GitHub URL, owner/repo shorthand, or local path")
  .option("--consent", "Pass --consent to gemini extensions link")
  .option("--json", "Output structured JSON")
  .action(async (source: string, opts: { consent?: boolean; json?: boolean }) => {
    try {
      const { report } = await runAdd({ source, ...opts });
      if (!opts.json) {
        printReport(report);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("add-marketplace")
  .description("Add all plugins from a Claude Code marketplace")
  .argument("<source>", "GitHub URL, owner/repo shorthand, or local path")
  .option("--consent", "Pass --consent to gemini extensions link")
  .option("--json", "Output structured JSON")
  .action(async (source: string, opts: { consent?: boolean; json?: boolean }) => {
    try {
      const { reports } = await runAddMarketplace({ source, ...opts });
      if (!opts.json) {
        console.log(`Translated ${reports.length} plugins:`);
        for (const report of reports) {
          printReport(report);
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("list")
  .description("List tracked plugins")
  .option("--json", "Output structured JSON")
  .action(async (opts: { json?: boolean }) => {
    try {
      await runList(opts);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("status")
  .description("Check if tracked plugins are up to date")
  .option("--json", "Output structured JSON")
  .action(async (opts: { json?: boolean }) => {
    try {
      await runStatus(opts);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("update")
  .description("Update named plugins (pull, re-translate, re-link)")
  .argument("<names...>", "Plugin names to update")
  .option("--consent", "Pass --consent to gemini extensions link")
  .option("--json", "Output structured JSON")
  .action(async (names: string[], opts: { consent?: boolean; json?: boolean }) => {
    try {
      const reports = await runUpdate({ names, ...opts });
      if (!opts.json) {
        console.log(`Updated ${reports.length} plugins:`);
        for (const report of reports) {
          printReport(report);
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("update-all")
  .description("Update all tracked plugins")
  .option("--consent", "Pass --consent to gemini extensions link")
  .option("--json", "Output structured JSON")
  .action(async (opts: { consent?: boolean; json?: boolean }) => {
    try {
      const reports = await runUpdateAll(opts);
      if (!opts.json) {
        console.log(`Updated ${reports.length} plugins:`);
        for (const report of reports) {
          printReport(report);
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("remove")
  .description("Remove a plugin from tracking")
  .argument("<name>", "Plugin name to remove")
  .option("--json", "Output structured JSON")
  .action(async (name: string, opts: { json?: boolean }) => {
    try {
      await runRemove({ name, ...opts });
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

function printReport(report: TranslationReport): void {
  console.log(
    `\n  ${report.pluginName} (${report.source} -> ${report.target})`
  );
  console.log(`    Translated: ${report.translated.length} components`);
  if (report.skipped.length > 0) {
    console.log(`    Skipped: ${report.skipped.length} components`);
  }
  if (report.warnings.length > 0) {
    console.log(`    Warnings: ${report.warnings.length}`);
    for (const w of report.warnings) {
      console.log(`      - ${w}`);
    }
  }
}

program.parse();
