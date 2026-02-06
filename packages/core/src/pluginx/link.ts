import { execFile } from "child_process";

export type ExecFn = (
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

export async function linkExtension(
  outputPath: string,
  consent: boolean,
  execFn: ExecFn = defaultExec
): Promise<void> {
  const args = ["extensions", "link"];
  if (consent) args.push("--consent");
  args.push(outputPath);
  await execFn("gemini", args);
}
