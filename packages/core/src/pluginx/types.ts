import type { ExecFn } from "./exec-utils.js";

export interface PluginxConfig {
  consentLevel?: "bypass" | "acknowledged" | "declined";
}

export interface BaseCommandOptions {
  consent?: boolean;
  json?: boolean;
  configPath?: string;
  statePath?: string;
  execFn?: ExecFn;
  nonInteractive?: boolean;
  translationsDir?: string;
  consentLevel?: "bypass" | "acknowledged";
  onProgress?: (message: string) => void;
}

export interface TrackedPlugin {
  name: string;
  sourceType: "git" | "local";
  sourceUrl?: string;
  sourcePath: string;
  outputPath: string;
  type: "single" | "marketplace";
  lastTranslated: string;
  sourceCommit?: string;
}

export interface PluginxState {
  plugins: TrackedPlugin[];
}
