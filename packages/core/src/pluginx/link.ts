import { basename } from "path";
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
  try {
    await execFn("gemini", args);
  } catch (err) {
    const msg = String((err as any)?.stderr ?? (err as any)?.message ?? "");
    if (msg.includes("already installed")) {
      const name = basename(outputPath);
      await execFn("gemini", ["extensions", "uninstall", name]);
      await execFn("gemini", args);
    } else {
      throw err;
    }
  }
}
