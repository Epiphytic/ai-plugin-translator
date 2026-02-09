import { basename } from "path";
import { homedir } from "os";
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

function expandTilde(p: string): string {
  if (p === "~" || p.startsWith("~/")) {
    return homedir() + p.slice(1);
  }
  return p;
}

function looksLikeLocalPath(source: string): boolean {
  return (
    source.startsWith("/") ||
    source.startsWith("./") ||
    source.startsWith("../") ||
    source.startsWith("~")
  );
}

export async function resolveSource(
  source: string,
  execFn?: ExecFn,
  onProgress?: ProgressFn,
): Promise<ResolvedSource> {
  const expanded = expandTilde(source);
  const isLocal = await isLocalPath(expanded);
  const name = deriveName(source);

  if (isLocal) {
    return {
      name,
      sourcePath: expanded,
      sourceType: "local",
    };
  }

  if (looksLikeLocalPath(source)) {
    throw new Error(`Local path not found: ${expanded}`);
  }

  try {
    const sourcePath = await clonePersistent(source, name, execFn, onProgress);
    return {
      name,
      sourcePath,
      sourceUrl: source,
      sourceType: "git",
    };
  } catch (err) {
    const msg = String((err as any)?.stderr ?? (err as any)?.message ?? err);
    if (msg.includes("does not exist") || msg.includes("not found")) {
      throw new Error(`Repository not found: ${source}`);
    }
    if (msg.includes("Could not resolve host")) {
      throw new Error(`Cannot reach remote host for: ${source}`);
    }
    throw new Error(`Failed to clone ${source}: ${msg.split("\n")[0].trim()}`);
  }
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
