import { readState } from "../state.js";
import { runUpdate, type UpdateResult } from "./update.js";
import type { BaseCommandOptions } from "../types.js";

export interface UpdateAllOptions extends BaseCommandOptions {
  force?: boolean;
}

export async function runUpdateAll(
  options: UpdateAllOptions
): Promise<UpdateResult> {
  const state = await readState(options.statePath);

  if (state.plugins.length === 0) {
    return { reports: [], failures: [] };
  }

  const log = options.onProgress ?? (() => {});
  const names = state.plugins.map((p) => p.name);
  log(`Updating ${names.length} plugin${names.length === 1 ? "" : "s"}: ${names.join(", ")}`);

  return runUpdate({
    names,
    force: options.force,
    consent: options.consent,
    json: options.json,
    consentLevel: options.consentLevel,
    configPath: options.configPath,
    statePath: options.statePath,
    execFn: options.execFn,
    nonInteractive: options.nonInteractive,
    translationsDir: options.translationsDir,
    onProgress: options.onProgress,
  });
}
