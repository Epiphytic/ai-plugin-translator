import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { homedir } from "os";
import type { PluginxConfig } from "./types.js";

export const PLUGINX_DIR = join(
  homedir(),
  ".gemini",
  "extensions",
  "pluginx"
);

export const TRANSLATIONS_DIR = join(
  PLUGINX_DIR,
  "..",
  "pluginx-translations"
);

export async function readConfig(
  configPath: string = join(PLUGINX_DIR, "config.json")
): Promise<PluginxConfig> {
  try {
    const raw = await readFile(configPath, "utf-8");
    return JSON.parse(raw) as PluginxConfig;
  } catch {
    return {};
  }
}

export async function writeConfig(
  config: PluginxConfig,
  configPath: string = join(PLUGINX_DIR, "config.json")
): Promise<void> {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
}

export type ConsentResult = "bypass" | "acknowledged" | "required";

export async function checkConsent(
  configPath?: string
): Promise<ConsentResult> {
  const config = await readConfig(configPath);
  if (config.consentLevel === "bypass") return "bypass";
  if (config.consentLevel === "acknowledged") return "acknowledged";
  return "required";
}
