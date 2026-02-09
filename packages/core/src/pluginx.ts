#!/usr/bin/env node
import { Command } from "commander";
import { runAdd } from "./pluginx/commands/add.js";
import { runAddMarketplace } from "./pluginx/commands/add-marketplace.js";
import { runList } from "./pluginx/commands/list.js";
import { runStatus } from "./pluginx/commands/status.js";
import { runUpdate } from "./pluginx/commands/update.js";
import { runUpdateAll } from "./pluginx/commands/update-all.js";
import { runRemove } from "./pluginx/commands/remove.js";
import { runConsentPrompt } from "./pluginx/consent.js";
import type { TranslationReport } from "./adapters/types.js";

const program = new Command();

interface GlobalOpts {
  nonInteractive?: boolean;
  configPath?: string;
  statePath?: string;
}

function globals(): GlobalOpts {
  return program.opts<GlobalOpts>();
}

program
  .name("pluginx")
  .description("Manage translated Claude Code plugins as Gemini CLI extensions")
  .version("0.1.0")
  .option("--non-interactive", "Skip interactive prompts (auto-acknowledge consent)")
  .option("--config-path <path>", "Custom config file path")
  .option("--state-path <path>", "Custom state file path");

program
  .command("add")
  .description("Add a Claude Code plugin as a Gemini extension")
  .argument("<source>", "GitHub URL, owner/repo shorthand, or local path")
  .option("--consent", "Pass --consent to gemini extensions link")
  .option("--json", "Output structured JSON")
  .action(async (source: string, opts: { consent?: boolean; json?: boolean }) => {
    try {
      const g = globals();
      const { report } = await runAdd({ source, ...opts, ...g });
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
      const g = globals();
      const { reports, failures } = await runAddMarketplace({ source, ...opts, ...g });
      if (!opts.json) {
        console.log(`Translated ${reports.length} plugins:`);
        for (const report of reports) {
          printReport(report);
        }
        for (const f of failures) {
          console.error(`Failed: ${f.name}: ${f.error}`);
        }
      }
      if (failures.length > 0) process.exitCode = 2;
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
      const g = globals();
      const plugins = await runList({ statePath: g.statePath });

      if (plugins.length === 0) {
        console.log("No plugins tracked.");
        console.log(
          "Use `pluginx add <source>` or `pluginx add-marketplace <source>` to get started."
        );
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(plugins, null, 2));
        return;
      }

      console.log(`Tracked plugins (${plugins.length}):\n`);
      for (const p of plugins) {
        console.log(`  ${p.name}`);
        console.log(`    Source: ${p.sourceUrl ?? p.sourcePath}`);
        console.log(`    Type: ${p.type}`);
        console.log(`    Last translated: ${p.lastTranslated}`);
        console.log();
      }
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
      const g = globals();
      const statuses = await runStatus({ statePath: g.statePath });

      if (statuses.length === 0) {
        console.log("No plugins tracked.");
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(statuses, null, 2));
      } else {
        console.log(`Plugin status (${statuses.length}):\n`);
        for (const s of statuses) {
          const statusLabel =
            s.upToDate === true
              ? "up to date"
              : s.upToDate === false
                ? "outdated"
                : "unknown";
          console.log(`  ${s.name}: ${statusLabel}`);
          console.log(`    Last translated: ${s.lastTranslated}`);
          console.log();
        }
      }
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
      const g = globals();
      const { reports, failures } = await runUpdate({ names, ...opts, ...g });
      if (!opts.json) {
        console.log(`Updated ${reports.length} plugins:`);
        for (const report of reports) {
          printReport(report);
        }
        for (const f of failures) {
          console.error(`Failed: ${f.name}: ${f.error}`);
        }
      }
      if (failures.length > 0) process.exitCode = 2;
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
      const g = globals();
      const { reports, failures } = await runUpdateAll({ ...opts, ...g });
      if (!opts.json) {
        console.log(`Updated ${reports.length} plugins:`);
        for (const report of reports) {
          printReport(report);
        }
        for (const f of failures) {
          console.error(`Failed: ${f.name}: ${f.error}`);
        }
      }
      if (failures.length > 0) process.exitCode = 2;
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command("consent")
  .description("Manage security consent settings")
  .action(async () => {
    try {
      const g = globals();
      const level = await runConsentPrompt({
        configPath: g.configPath,
        nonInteractive: g.nonInteractive,
      });
      if (level === "declined") {
        console.log(
          "Consent declined. This prompt will appear again next time you run a pluginx command."
        );
      } else if (level === "bypass") {
        console.log(
          "Consent screens will be bypassed for future plugin installations. Run 'pluginx consent' to change."
        );
      } else {
        console.log(
          "Settings saved. Gemini CLI will still show a consent prompt when installing each plugin. Run 'pluginx consent' to change."
        );
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
      const g = globals();
      const removed = await runRemove({ name, statePath: g.statePath });

      if (!removed) {
        console.error(`Plugin not found: ${name}`);
        process.exitCode = 1;
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify({ removed: name }));
      } else {
        console.log(`Removed "${name}" from tracking.`);
        console.log(
          `To fully uninstall, run: gemini extensions uninstall ${name}`
        );
      }
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
