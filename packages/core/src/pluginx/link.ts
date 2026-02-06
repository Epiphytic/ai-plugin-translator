import { defaultExec, type ExecFn } from "./exec-utils.js";

export type { ExecFn } from "./exec-utils.js";

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
