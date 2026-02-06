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

  const toml = `prompt = """${cmd.prompt}"""`;

  return {
    toml,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
