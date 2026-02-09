import { basename } from "path";
import { stat } from "fs/promises";
import { clonePersistent, getCurrentCommit, type ProgressFn } from "./git-ops.js";
import { resolveGitUrl } from "../utils/git.js";
import type { ExecFn } from "./exec-utils.js";

export interface ResolvedSource {
  name: string;
  sourcePath: string;
  sourceUrl?: string;
  sourceType: "git" | "local";
}

export async function resolveSource(
  source: string,
  execFn?: ExecFn,
  onProgress?: ProgressFn,
): Promise<ResolvedSource> {
  const isLocal = await isLocalPath(source);
  const name = deriveName(source);

  if (isLocal) {
    return {
      name,
      sourcePath: source,
      sourceType: "local",
    };
  }

  const sourcePath = await clonePersistent(source, name, execFn, onProgress);
  return {
    name,
    sourcePath,
    sourceUrl: source,
    sourceType: "git",
  };
}

export async function getSourceCommit(
  sourcePath: string,
  sourceType: "git" | "local",
  execFn?: ExecFn
): Promise<string | undefined> {
  if (sourceType !== "git") return undefined;
  try {
    return await getCurrentCommit(sourcePath, execFn);
  } catch {
    // non-fatal: commit tracking is optional
    return undefined;
  }
}

async function isLocalPath(source: string): Promise<boolean> {
  try {
    await stat(source);
    return true;
  } catch {
    return false;
  }
}

function deriveName(source: string): string {
  const resolved = resolveGitUrl(source);
  if (resolved.includes("/")) {
    return basename(resolved, ".git");
  }
  return basename(source);
}
