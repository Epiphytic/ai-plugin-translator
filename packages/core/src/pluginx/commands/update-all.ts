import { readState } from "../state.js";
import { runUpdate } from "./update.js";
import type { BaseCommandOptions } from "../types.js";
import type { TranslationReport } from "../../adapters/types.js";

export interface UpdateAllOptions extends BaseCommandOptions {}

export async function runUpdateAll(
  options: UpdateAllOptions
): Promise<TranslationReport[]> {
  const state = await readState(options.statePath);

  if (state.plugins.length === 0) {
    console.log("No plugins tracked. Nothing to update.");
    return [];
  }

  const names = state.plugins.map((p) => p.name);

  return runUpdate({
    names,
    consent: options.consent,
    json: options.json,
    configPath: options.configPath,
    statePath: options.statePath,
    execFn: options.execFn,
    nonInteractive: options.nonInteractive,
    translationsDir: options.translationsDir,
  });
}
