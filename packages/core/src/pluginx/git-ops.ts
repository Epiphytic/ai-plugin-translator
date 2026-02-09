import { mkdir } from "fs/promises";
import { join } from "path";
import { PLUGINX_DIR } from "./config.js";
import { defaultExec, type ExecFn } from "./exec-utils.js";
import { resolveGitUrl } from "../utils/git.js";

export type { ExecFn } from "./exec-utils.js";

export const SOURCES_DIR = join(PLUGINX_DIR, "sources");

export async function clonePersistent(
  url: string,
  name: string,
  execFn: ExecFn = defaultExec
): Promise<string> {
  const resolved = resolveGitUrl(url);
  const destDir = join(SOURCES_DIR, name);
  await mkdir(destDir, { recursive: true });
  await execFn("git", ["clone", "--depth", "1", resolved, destDir]);
  return destDir;
}

export async function pullLatest(
  repoPath: string,
  execFn: ExecFn = defaultExec
): Promise<void> {
  await execFn("git", ["-C", repoPath, "pull"]);
}

export async function getCurrentCommit(
  repoPath: string,
  execFn: ExecFn = defaultExec
): Promise<string> {
  const { stdout } = await execFn("git", [
    "-C",
    repoPath,
    "rev-parse",
    "HEAD",
  ]);
  return stdout.trim();
}
