import { join } from "path";
import { TRANSLATIONS_DIR } from "../config.js";
import { readState, writeState, addPlugin } from "../state.js";
import { linkExtension } from "../link.js";
import { translate } from "../../translate.js";
import { resolveSource, getSourceCommit } from "../resolve-source.js";
import { ensureConsent } from "../consent.js";
import type { BaseCommandOptions, TrackedPlugin } from "../types.js";
import type { TranslationReport } from "../../adapters/types.js";

export interface AddOptions extends BaseCommandOptions {
  source: string;
}

export interface AddResult {
  report: TranslationReport;
  plugin: TrackedPlugin;
}

export async function runAdd(options: AddOptions): Promise<AddResult> {
  const log = options.onProgress ?? (() => {});

  const consentResult =
    options.consentLevel ?? (await ensureConsent({
      configPath: options.configPath,
      nonInteractive: options.nonInteractive,
    }));

  const useConsent = consentResult === "bypass" || options.consent === true;

  log(`Fetching ${options.source}...`);
  const { name, sourcePath, sourceUrl, sourceType } = await resolveSource(
    options.source,
    options.execFn,
    (gitLine) => log(`  ${gitLine}`),
  );

  const translationsDir = options.translationsDir ?? TRANSLATIONS_DIR;
  const outputPath = join(translationsDir, name);

  log(`Converting ${name}...`);
  const report = await translate({
    from: "claude",
    to: "gemini",
    source: sourcePath,
    output: outputPath,
  });

  log(`Linking ${name}...`);
  await linkExtension(outputPath, useConsent, options.execFn);

  const sourceCommit = await getSourceCommit(
    sourcePath,
    sourceType,
    options.execFn
  );

  const plugin: TrackedPlugin = {
    name,
    sourceType,
    sourceUrl,
    sourcePath,
    outputPath,
    type: "single",
    lastTranslated: new Date().toISOString(),
    sourceCommit,
  };

  const state = await readState(options.statePath);
  const newState = addPlugin(state, plugin);
  await writeState(newState, options.statePath);

  log(`Done: ${name} installed`);
  return { report, plugin };
}
