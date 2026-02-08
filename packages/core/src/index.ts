export * from "./ir/index.js";
export * from "./adapters/index.js";
export * from "./translate.js";
export { ClaudeSourceAdapter } from "./adapters/claude/index.js";
export { GeminiTargetAdapter } from "./adapters/gemini/index.js";

// Pluginx command API
export { runAdd, type AddOptions, type AddResult } from "./pluginx/commands/add.js";
export { runAddMarketplace, type AddMarketplaceOptions, type AddMarketplaceResult } from "./pluginx/commands/add-marketplace.js";
export { runList, type ListOptions } from "./pluginx/commands/list.js";
export { runStatus, type StatusOptions, type PluginStatus } from "./pluginx/commands/status.js";
export { runUpdate, type UpdateOptions } from "./pluginx/commands/update.js";
export { runUpdateAll, type UpdateAllOptions } from "./pluginx/commands/update-all.js";
export { runRemove, type RemoveOptions } from "./pluginx/commands/remove.js";
export { checkConsent, writeConfig, readConfig, type ConsentResult } from "./pluginx/config.js";
export { readState, writeState } from "./pluginx/state.js";
export type { BaseCommandOptions, TrackedPlugin, PluginxState, PluginxConfig } from "./pluginx/types.js";
export type { ConsentLevel } from "./pluginx/consent.js";
export { SECURITY_NOTICE } from "./pluginx/consent.js";
