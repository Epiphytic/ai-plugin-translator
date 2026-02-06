import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { PLUGINX_DIR } from "./config.js";
import type { PluginxState, TrackedPlugin } from "./types.js";

const DEFAULT_STATE: PluginxState = { plugins: [] };

export async function readState(
  statePath: string = join(PLUGINX_DIR, "state.json")
): Promise<PluginxState> {
  try {
    const raw = await readFile(statePath, "utf-8");
    return JSON.parse(raw) as PluginxState;
  } catch {
    return { ...DEFAULT_STATE, plugins: [] };
  }
}

export async function writeState(
  state: PluginxState,
  statePath: string = join(PLUGINX_DIR, "state.json")
): Promise<void> {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2) + "\n");
}

export function addPlugin(
  state: PluginxState,
  plugin: TrackedPlugin
): PluginxState {
  const filtered = state.plugins.filter((p) => p.name !== plugin.name);
  return { plugins: [...filtered, plugin] };
}

export function removePlugin(
  state: PluginxState,
  name: string
): PluginxState {
  return { plugins: state.plugins.filter((p) => p.name !== name) };
}

export function findPlugin(
  state: PluginxState,
  name: string
): TrackedPlugin | undefined {
  return state.plugins.find((p) => p.name === name);
}
