import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { PluginxConfig } from "./types.js";

export const PLUGINX_DIR = join(
  homedir(),
  ".gemini",
  "extensions",
  "pluginx"
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

export type ConsentResult = "bypass" | "acknowledged" | "required";

export async function checkConsent(
  configPath?: string
): Promise<ConsentResult> {
  const config = await readConfig(configPath);
  if (config.consentLevel === "bypass") return "bypass";
  if (config.consentLevel === "acknowledged") return "acknowledged";
  return "required";
}
