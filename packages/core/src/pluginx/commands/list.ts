import { readState } from "../state.js";

export interface ListOptions {
  json?: boolean;
  statePath?: string;
}

export async function runList(options: ListOptions): Promise<void> {
  const state = await readState(options.statePath);

  if (state.plugins.length === 0) {
    console.log("No plugins tracked.");
    console.log(
      "Use `pluginx add <source>` or `pluginx add-marketplace <source>` to get started."
    );
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(state.plugins, null, 2));
    return;
  }

  console.log(`Tracked plugins (${state.plugins.length}):\n`);
  for (const p of state.plugins) {
    console.log(`  ${p.name}`);
    console.log(`    Source: ${p.sourceUrl ?? p.sourcePath}`);
    console.log(`    Type: ${p.type}`);
    console.log(`    Last translated: ${p.lastTranslated}`);
    console.log();
  }
}
