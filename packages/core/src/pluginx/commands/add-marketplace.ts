import { basename, join } from "path";
import { stat } from "fs/promises";
import { checkConsent, PLUGINX_DIR } from "../config.js";
import { readState, writeState, addPlugin } from "../state.js";
import { clonePersistent, getCurrentCommit, type ExecFn } from "../git-ops.js";
import { linkExtension, type ExecFn as LinkExecFn } from "../link.js";
import { translateMarketplace } from "../../translate.js";
import { resolveGitUrl } from "../../utils/git.js";
import type { TrackedPlugin } from "../types.js";
import type { TranslationReport } from "../../adapters/types.js";

export interface AddMarketplaceOptions {
  source: string;
  consent?: boolean;
  json?: boolean;
  configPath?: string;
  statePath?: string;
  gitExecFn?: ExecFn;
  linkExecFn?: LinkExecFn;
}

export interface AddMarketplaceResult {
  reports: TranslationReport[];
  plugins: TrackedPlugin[];
}

const TRANSLATIONS_DIR = join(
  PLUGINX_DIR,
  "..",
  "pluginx-translations"
);

export async function runAddMarketplace(
  options: AddMarketplaceOptions
): Promise<AddMarketplaceResult> {
  const consentResult = options.consent
    ? "bypass"
    : await checkConsent(options.configPath);

  if (consentResult === "required") {
    console.log("CONSENT_REQUIRED");
    process.exit(3);
  }

  const useConsent = consentResult === "bypass" || options.consent === true;

  const isLocal = await isLocalPath(options.source);
  let sourcePath: string;
  let sourceUrl: string | undefined;
  let sourceType: "git" | "local";

  const marketplaceName = deriveName(options.source);

  if (isLocal) {
    sourcePath = options.source;
    sourceType = "local";
  } else {
    sourceUrl = options.source;
    sourceType = "git";
    sourcePath = await clonePersistent(
      options.source,
      marketplaceName,
      options.gitExecFn
    );
  }

  const reports = await translateMarketplace({
    from: "claude",
    to: "gemini",
    source: sourcePath,
    outputDir: TRANSLATIONS_DIR,
  });

  let sourceCommit: string | undefined;
  if (sourceType === "git") {
    try {
      sourceCommit = await getCurrentCommit(sourcePath, options.gitExecFn);
    } catch {
      // non-fatal
    }
  }

  let state = await readState(options.statePath);
  const plugins: TrackedPlugin[] = [];

  for (const report of reports) {
    const outputPath = join(TRANSLATIONS_DIR, report.pluginName);
    await linkExtension(outputPath, useConsent, options.linkExecFn);

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
  }

  await writeState(state, options.statePath);

  return { reports, plugins };
}

async function isLocalPath(source: string): Promise<boolean> {
  try {
    await stat(source);
    return true;
  } catch {
    return false;
  }
}

function deriveName(source: string): string {
  const resolved = resolveGitUrl(source);
  if (resolved.includes("/")) {
    return basename(resolved, ".git");
  }
  return basename(source);
}
