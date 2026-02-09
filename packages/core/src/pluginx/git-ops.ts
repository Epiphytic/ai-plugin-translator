import { mkdir } from "fs/promises";
import { spawn } from "child_process";
import { join } from "path";
import { PLUGINX_DIR } from "./config.js";
import { defaultExec, type ExecFn } from "./exec-utils.js";
import { resolveGitUrl } from "../utils/git.js";

export type { ExecFn } from "./exec-utils.js";
export type ProgressFn = (message: string) => void;

export const SOURCES_DIR = join(PLUGINX_DIR, "sources");

/**
 * Spawn a git command and stream stderr progress lines to `onProgress`.
 * Falls back to the non-streaming `execFn` when no callback is provided.
 */
function spawnGitWithProgress(
  args: string[],
  onProgress?: ProgressFn,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      if (onProgress) {
        // Git progress lines are \r-delimited; split on \r or \n
        const lines = text.split(/[\r\n]+/).filter((l: string) => l.trim());
        for (const line of lines) {
          onProgress(line.trim());
        }
      }
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(Object.assign(new Error(`git exited with code ${code}`), { stderr }));
    });
    child.on("error", reject);
  });
}

export async function clonePersistent(
  url: string,
  name: string,
  execFn: ExecFn = defaultExec,
  onProgress?: ProgressFn,
): Promise<string> {
  const resolved = resolveGitUrl(url);
  const destDir = join(SOURCES_DIR, name);
  await mkdir(destDir, { recursive: true });
  if (onProgress) {
    await spawnGitWithProgress(
      ["clone", "--depth", "1", "--progress", resolved, destDir],
      onProgress,
    );
  } else {
    await execFn("git", ["clone", "--depth", "1", resolved, destDir]);
  }
  return destDir;
}

export async function pullLatest(
  repoPath: string,
  execFn: ExecFn = defaultExec,
  onProgress?: ProgressFn,
): Promise<void> {
  if (onProgress) {
    await spawnGitWithProgress(
      ["-C", repoPath, "pull", "--progress"],
      onProgress,
    );
  } else {
    await execFn("git", ["-C", repoPath, "pull"]);
  }
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
