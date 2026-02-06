import { readFile } from "fs/promises";
import { join } from "path";
import type { ContextFileIR } from "../../../ir/types.js";

const CONTEXT_FILES = ["CLAUDE.md"];

export async function parseClaudeContext(
  pluginPath: string
): Promise<ContextFileIR[]> {
  const contextFiles: ContextFileIR[] = [];

  for (const filename of CONTEXT_FILES) {
    try {
      const content = await readFile(join(pluginPath, filename), "utf-8");
      contextFiles.push({ filename, content });
    } catch {
      // File doesn't exist, skip
    }
  }

  return contextFiles;
}
