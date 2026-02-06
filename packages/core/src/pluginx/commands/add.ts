import { basename } from "path";
import { stat } from "fs/promises";
import { checkConsent, PLUGINX_DIR } from "../config.js";
import { readState, writeState, addPlugin } from "../state.js";
import { clonePersistent, getCurrentCommit, type ExecFn } from "../git-ops.js";
import { linkExtension, type ExecFn as LinkExecFn } from "../link.js";
import { translate } from "../../translate.js";
import { resolveGitUrl } from "../../utils/git.js";
import type { TrackedPlugin } from "../types.js";
import type { TranslationReport } from "../../adapters/types.js";
import { join } from "path";

export interface AddOptions {
  source: string;
  consent?: boolean;
  json?: boolean;
  configPath?: string;
  statePath?: string;
  gitExecFn?: ExecFn;
  linkExecFn?: LinkExecFn;
}

export interface AddResult {
  report: TranslationReport;
  plugin: TrackedPlugin;
}

const TRANSLATIONS_DIR = join(
  PLUGINX_DIR,
  "..",
  "pluginx-translations"
);

export async function runAdd(options: AddOptions): Promise<AddResult> {
  const consentResult = options.consent
    ? "bypass"
    : await checkConsent(options.configPath);

  if (consentResult === "required") {
    console.log("CONSENT_REQUIRED");
    process.exit(3);
  }

  const useConsent = consentResult === "bypass" || options.consent === true;

  // Determine if source is a URL or local path
  const isLocal = await isLocalPath(options.source);
  let sourcePath: string;
  let sourceUrl: string | undefined;
  let sourceType: "git" | "local";

  const name = deriveName(options.source);

  if (isLocal) {
    sourcePath = options.source;
    sourceType = "local";
  } else {
    sourceUrl = options.source;
    sourceType = "git";
    sourcePath = await clonePersistent(
      options.source,
      name,
      options.gitExecFn
    );
  }

  const outputPath = join(TRANSLATIONS_DIR, name);

  const report = await translate({
    from: "claude",
    to: "gemini",
    source: sourcePath,
    output: outputPath,
  });

  await linkExtension(outputPath, useConsent, options.linkExecFn);

  let sourceCommit: string | undefined;
  if (sourceType === "git") {
    try {
      sourceCommit = await getCurrentCommit(sourcePath, options.gitExecFn);
    } catch {
      // non-fatal: commit tracking is optional
    }
  }

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

  return { report, plugin };
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
  // Extract repo name from URL or use basename of local path
  if (resolved.includes("/")) {
    const name = basename(resolved, ".git");
    return name;
  }
  return basename(source);
}
