export interface PluginxConfig {
  consentLevel?: "bypass" | "acknowledged" | "declined";
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
