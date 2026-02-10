import { join } from "path";
import { TRANSLATIONS_DIR } from "../config.js";
import { readState, writeState, addPlugin } from "../state.js";
import { linkExtension } from "../link.js";
import { translateMarketplace } from "../../translate.js";
import { resolveSource, getSourceCommit } from "../resolve-source.js";
import { ensureConsent } from "../consent.js";
import type { BaseCommandOptions, TrackedPlugin } from "../types.js";
import type { TranslationReport } from "../../adapters/types.js";

export interface AddMarketplaceOptions extends BaseCommandOptions {
  source: string;
}

export interface PluginFailure {
  name: string;
  error: string;
}

export interface AddMarketplaceResult {
  reports: TranslationReport[];
  plugins: TrackedPlugin[];
  failures: PluginFailure[];
}

export async function runAddMarketplace(
  options: AddMarketplaceOptions
): Promise<AddMarketplaceResult> {
  const log = options.onProgress ?? (() => {});

  const consentResult =
    options.consentLevel ?? (await ensureConsent({
      configPath: options.configPath,
      nonInteractive: options.nonInteractive,
    }));

  const useConsent = consentResult === "bypass" || options.consent === true;

  log(`Fetching ${options.source}...`);
  const { name: marketplaceName, sourcePath, sourceUrl, sourceType } =
    await resolveSource(
      options.source,
      options.execFn,
      (gitLine) => log(`  ${gitLine}`),
    );

  const translationsDir = options.translationsDir ?? TRANSLATIONS_DIR;

  log(`Converting ${marketplaceName}...`);
  const reports = await translateMarketplace({
    from: "claude",
    to: "gemini",
    source: sourcePath,
    outputDir: translationsDir,
  });

  const names = reports.map((r) => r.pluginName);
  log(`Found ${names.length} plugins: ${names.join(", ")}`);

  const sourceCommit = await getSourceCommit(
    sourcePath,
    sourceType,
    options.execFn
  );

  let state = await readState(options.statePath);
  const plugins: TrackedPlugin[] = [];
  const failures: PluginFailure[] = [];

  for (const report of reports) {
    const outputPath = join(translationsDir, report.pluginName);
    try {
      log(`Linking ${report.pluginName}...`);
      await linkExtension(outputPath, useConsent, options.execFn);

      const plugin: TrackedPlugin = {
        name: report.pluginName,
        sourceType,
        sourceUrl,
        sourcePath,
        outputPath,
        type: "marketplace",
        lastTranslated: new Date().toISOString(),
        sourceCommit,
      };

      state = addPlugin(state, plugin);
      plugins.push(plugin);
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      log(`Failed to link ${report.pluginName}: ${msg}`);
      failures.push({ name: report.pluginName, error: msg });
    }
  }

  await writeState(state, options.statePath);

  log(`Done: ${plugins.length} plugins installed`);
  return { reports, plugins, failures };
}
