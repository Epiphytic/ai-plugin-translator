import { readState, writeState, findPlugin, removePlugin } from "../state.js";

export interface RemoveOptions {
  name: string;
  statePath?: string;
}

export async function runRemove(options: RemoveOptions): Promise<boolean> {
  const state = await readState(options.statePath);
  const plugin = findPlugin(state, options.name);

  if (!plugin) {
    return false;
  }

  const newState = removePlugin(state, options.name);
  await writeState(newState, options.statePath);

  return true;
}
