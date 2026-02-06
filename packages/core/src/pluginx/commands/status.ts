import { readState } from "../state.js";
import { getCurrentCommit, type ExecFn } from "../git-ops.js";

export interface StatusOptions {
  json?: boolean;
  statePath?: string;
  gitExecFn?: ExecFn;
}

export interface PluginStatus {
  name: string;
  sourceUrl?: string;
  lastTranslated: string;
  upToDate: boolean | "unknown";
}

export async function runStatus(
  options: StatusOptions
): Promise<PluginStatus[]> {
  const state = await readState(options.statePath);

  if (state.plugins.length === 0) {
    console.log("No plugins tracked.");
    return [];
  }

  const statuses: PluginStatus[] = [];

  for (const p of state.plugins) {
    let upToDate: boolean | "unknown" = "unknown";

    if (p.sourceType === "git" && p.sourceCommit) {
      try {
        const current = await getCurrentCommit(
          p.sourcePath,
          options.gitExecFn
        );
        upToDate = current === p.sourceCommit;
      } catch {
        upToDate = "unknown";
      }
    }

    statuses.push({
      name: p.name,
      sourceUrl: p.sourceUrl,
      lastTranslated: p.lastTranslated,
      upToDate,
    });
  }

  if (options.json) {
    console.log(JSON.stringify(statuses, null, 2));
  } else {
    console.log(`Plugin status (${statuses.length}):\n`);
    for (const s of statuses) {
      const statusLabel =
        s.upToDate === true
          ? "up to date"
          : s.upToDate === false
            ? "outdated"
            : "unknown";
      console.log(`  ${s.name}: ${statusLabel}`);
      console.log(`    Last translated: ${s.lastTranslated}`);
      console.log();
    }
  }

  return statuses;
}
