import { readState, writeState, findPlugin, removePlugin } from "../state.js";

export interface RemoveOptions {
  name: string;
  json?: boolean;
  statePath?: string;
}

export async function runRemove(options: RemoveOptions): Promise<boolean> {
  const state = await readState(options.statePath);
  const plugin = findPlugin(state, options.name);

  if (!plugin) {
    console.error(`Plugin not found: ${options.name}`);
    return false;
  }

  const newState = removePlugin(state, options.name);
  await writeState(newState, options.statePath);

  if (options.json) {
    console.log(JSON.stringify({ removed: options.name }));
  } else {
    console.log(`Removed "${options.name}" from tracking.`);
    console.log(
      `To fully uninstall, run: gemini extensions uninstall ${options.name}`
    );
  }

  return true;
}
