import { join } from "path";
import { checkConsent, PLUGINX_DIR } from "../config.js";
import { readState, writeState, addPlugin, findPlugin } from "../state.js";
import { pullLatest, getCurrentCommit, type ExecFn } from "../git-ops.js";
import { linkExtension, type ExecFn as LinkExecFn } from "../link.js";
import { translate, translateMarketplace } from "../../translate.js";
import type { TranslationReport } from "../../adapters/types.js";

export interface UpdateOptions {
  names: string[];
  consent?: boolean;
  json?: boolean;
  configPath?: string;
  statePath?: string;
  gitExecFn?: ExecFn;
  linkExecFn?: LinkExecFn;
}

const TRANSLATIONS_DIR = join(
  PLUGINX_DIR,
  "..",
  "pluginx-translations"
);

export async function runUpdate(
  options: UpdateOptions
): Promise<TranslationReport[]> {
  const consentResult = options.consent
    ? "bypass"
    : await checkConsent(options.configPath);

  if (consentResult === "required") {
    console.log("CONSENT_REQUIRED");
    process.exit(3);
  }

  const useConsent = consentResult === "bypass" || options.consent === true;
  let state = await readState(options.statePath);
  const reports: TranslationReport[] = [];

  for (const name of options.names) {
    const plugin = findPlugin(state, name);
    if (!plugin) {
      console.error(`Plugin not found: ${name}`);
      continue;
    }

    if (plugin.sourceType === "git") {
      await pullLatest(plugin.sourcePath, options.gitExecFn);
    }

    let pluginReports: TranslationReport[];

    if (plugin.type === "marketplace") {
      pluginReports = await translateMarketplace({
        from: "claude",
        to: "gemini",
        source: plugin.sourcePath,
        outputDir: TRANSLATIONS_DIR,
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
      const outputPath = join(TRANSLATIONS_DIR, report.pluginName);
      await linkExtension(outputPath, useConsent, options.linkExecFn);
      reports.push(report);
    }

    let sourceCommit: string | undefined;
    if (plugin.sourceType === "git") {
      try {
        sourceCommit = await getCurrentCommit(
          plugin.sourcePath,
          options.gitExecFn
        );
      } catch {
        // non-fatal
      }
    }

    state = addPlugin(state, {
      ...plugin,
      lastTranslated: new Date().toISOString(),
      sourceCommit: sourceCommit ?? plugin.sourceCommit,
    });
  }

  await writeState(state, options.statePath);
  return reports;
}
