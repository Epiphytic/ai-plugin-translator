import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";

export interface ClonedRepo {
  path: string;
  cleanup: () => Promise<void>;
}

type ExecFn = (
  cmd: string,
  args: string[]
) => Promise<{ stdout: string; stderr: string }>;

function defaultExec(
  cmd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

export async function cloneToTemp(
  url: string,
  execFn: ExecFn = defaultExec
): Promise<ClonedRepo> {
  const tempDir = await mkdtemp(join(tmpdir(), "pluginx-clone-"));

  const cleanup = async () => {
    await rm(tempDir, { recursive: true, force: true });
  };

  try {
    await execFn("git", ["clone", "--depth", "1", url, tempDir]);
  } catch (err) {
    await cleanup();
    throw new Error(
      `Failed to clone ${url}: ${(err as Error).message}`
    );
  }

  return { path: tempDir, cleanup };
}
