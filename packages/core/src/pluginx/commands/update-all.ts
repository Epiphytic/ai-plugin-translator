import { readState } from "../state.js";
import { runUpdate, type UpdateResult } from "./update.js";
import type { BaseCommandOptions } from "../types.js";

export interface UpdateAllOptions extends BaseCommandOptions {}

export async function runUpdateAll(
  options: UpdateAllOptions
): Promise<UpdateResult> {
  const state = await readState(options.statePath);

  if (state.plugins.length === 0) {
    return { reports: [], failures: [] };
  }

  const names = state.plugins.map((p) => p.name);

  return runUpdate({
    names,
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
