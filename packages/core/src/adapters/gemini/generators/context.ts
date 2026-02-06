import type { ContextFileIR } from "../../../ir/types.js";

interface GeneratedContextFile {
  filename: string;
  content: string;
}

export function generateGeminiContext(
  contextFiles: ContextFileIR[]
): GeneratedContextFile | undefined {
  if (contextFiles.length === 0) return undefined;

  const source = contextFiles[0];
  return {
    filename: "GEMINI.md",
    content: source.content,
  };
}
