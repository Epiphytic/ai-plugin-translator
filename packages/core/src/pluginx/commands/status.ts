import { readState } from "../state.js";
import { getCurrentCommit, type ExecFn } from "../git-ops.js";

export interface StatusOptions {
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

  return statuses;
}
