import { join } from "path";
import { TRANSLATIONS_DIR } from "../config.js";
import { readState, writeState, addPlugin, findPlugin } from "../state.js";
import { pullLatest } from "../git-ops.js";
import { linkExtension } from "../link.js";
import { translate, translateMarketplace } from "../../translate.js";
import { getSourceCommit } from "../resolve-source.js";
import { ensureConsent } from "../consent.js";
import type { BaseCommandOptions } from "../types.js";
import type { TranslationReport } from "../../adapters/types.js";

export interface UpdateOptions extends BaseCommandOptions {
  names: string[];
}

export async function runUpdate(
  options: UpdateOptions
): Promise<TranslationReport[]> {
  const consent = await ensureConsent({
    configPath: options.configPath,
    nonInteractive: options.nonInteractive,
  });

  const useConsent = consent === "bypass" || options.consent === true;
  const translationsDir = options.translationsDir ?? TRANSLATIONS_DIR;
  let state = await readState(options.statePath);
  const reports: TranslationReport[] = [];

  for (const name of options.names) {
    const plugin = findPlugin(state, name);
    if (!plugin) {
      console.error(`Plugin not found: ${name}`);
      continue;
    }

    if (plugin.sourceType === "git") {
      await pullLatest(plugin.sourcePath, options.execFn);
    }

    let pluginReports: TranslationReport[];

    if (plugin.type === "marketplace") {
      pluginReports = await translateMarketplace({
        from: "claude",
        to: "gemini",
        source: plugin.sourcePath,
        outputDir: translationsDir,
      });
    } else {
      const report = await translate({
        from: "claude",
        to: "gemini",
        source: plugin.sourcePath,
        output: plugin.outputPath,
      });
      pluginReports = [report];
    }

    for (const report of pluginReports) {
      const outputPath = join(translationsDir, report.pluginName);
      await linkExtension(outputPath, useConsent, options.execFn);
      reports.push(report);
    }

    const sourceCommit = await getSourceCommit(
      plugin.sourcePath,
      plugin.sourceType,
      options.execFn
    );

    state = addPlugin(state, {
      ...plugin,
      lastTranslated: new Date().toISOString(),
      sourceCommit: sourceCommit ?? plugin.sourceCommit,
    });
  }

  await writeState(state, options.statePath);
  return reports;
}
