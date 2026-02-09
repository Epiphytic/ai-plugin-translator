import type { CommandIR } from "../../../ir/types.js";

export interface CommandGeneratorResult {
  toml: string;
  warnings?: string[];
}

export function generateGeminiCommand(cmd: CommandIR): CommandGeneratorResult {
  const warnings: string[] = [];

  if (cmd.allowedTools) {
    warnings.push("allowed-tools not supported in Gemini TOML commands");
  }
  if (cmd.disableModelInvocation) {
    warnings.push(
      "disable-model-invocation not supported in Gemini TOML commands"
    );
  }

  const lines: string[] = [];
  if (cmd.description) {
    const escaped = cmd.description.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines.push(`description = "${escaped}"`);
  }
  lines.push(`prompt = """${cmd.prompt}"""`);
  const toml = lines.join("\n");

  return {
    toml,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
