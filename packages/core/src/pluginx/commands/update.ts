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

export interface UpdateFailure {
  name: string;
  error: string;
}

export interface UpdateResult {
  reports: TranslationReport[];
  failures: UpdateFailure[];
}

export interface UpdateOptions extends BaseCommandOptions {
  names: string[];
  force?: boolean;
}

export async function runUpdate(
  options: UpdateOptions
): Promise<UpdateResult> {
  const log = options.onProgress ?? (() => {});

  const consentResult =
    options.consentLevel ?? (await ensureConsent({
      configPath: options.configPath,
      nonInteractive: options.nonInteractive,
    }));

  const useConsent = consentResult === "bypass" || options.consent === true;
  const translationsDir = options.translationsDir ?? TRANSLATIONS_DIR;
  let state = await readState(options.statePath);
  const reports: TranslationReport[] = [];
  const failures: UpdateFailure[] = [];

  const total = options.names.length;
  for (let i = 0; i < total; i++) {
    const name = options.names[i];
    const prefix = total > 1 ? `[${i + 1}/${total}] ` : "";
    const plugin = findPlugin(state, name);
    if (!plugin) {
      continue;
    }

    try {
      if (plugin.sourceType === "git") {
        log(`${prefix}Pulling latest for ${name}...`);
        await pullLatest(
          plugin.sourcePath,
          options.execFn,
          (gitLine) => log(`${prefix}  ${gitLine}`),
        );
      }

      if (plugin.sourceType === "git" && !options.force) {
        const currentCommit = await getSourceCommit(
          plugin.sourcePath,
          plugin.sourceType,
          options.execFn
        );
        if (currentCommit && currentCommit === plugin.sourceCommit) {
          log(`${prefix}No changes for ${name}, skipping`);
          continue;
        }
      }

      let pluginReports: TranslationReport[];

      log(`${prefix}Converting ${name}...`);
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
        log(`${prefix}Linking ${report.pluginName}...`);
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

      log(`${prefix}Updated ${name}`);
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      log(`${prefix}Failed to update ${name}: ${msg}`);
      failures.push({ name, error: msg });
    }
  }

  await writeState(state, options.statePath);
  return { reports, failures };
}
