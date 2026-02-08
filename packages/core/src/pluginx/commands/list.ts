import { readState } from "../state.js";
import type { TrackedPlugin } from "../types.js";

export interface ListOptions {
  statePath?: string;
}

export async function runList(options: ListOptions): Promise<TrackedPlugin[]> {
  const state = await readState(options.statePath);
  return state.plugins;
}
