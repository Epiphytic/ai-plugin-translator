import { execFile } from "child_process";

export type ExecFn = (
  cmd: string,
  args: string[]
) => Promise<{ stdout: string; stderr: string }>;

export function defaultExec(
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
