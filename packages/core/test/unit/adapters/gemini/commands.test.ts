import { describe, it, expect } from "vitest";
import { generateGeminiCommand } from "../../../../src/adapters/gemini/generators/commands.js";
import type { CommandIR } from "../../../../src/ir/types.js";

describe("generateGeminiCommand", () => {
  it("generates TOML with prompt field", () => {
    const cmd: CommandIR = {
      name: "greet",
      description: "Say hello",
      prompt: "Say hello to {{args}}",
      shellInjections: [],
    };
    const result = generateGeminiCommand(cmd);
    expect(result.toml).toContain('prompt = """Say hello to {{args}}"""');
  });

  it("preserves shell injections in brace format", () => {
    const cmd: CommandIR = {
      name: "status",
      description: "Show status",
      prompt: "Status:\n!{git status}\nDiff:\n!{git diff}",
      shellInjections: [
        { original: "!`git status`", command: "git status" },
        { original: "!`git diff`", command: "git diff" },
      ],
    };
    const result = generateGeminiCommand(cmd);
    expect(result.toml).toContain("!{git status}");
    expect(result.toml).toContain("!{git diff}");
  });

  it("preserves {{args}} syntax", () => {
    const cmd: CommandIR = {
      name: "search",
      description: "Search for text",
      prompt: "Search for {{args}} in the codebase",
      shellInjections: [],
    };
    const result = generateGeminiCommand(cmd);
    expect(result.toml).toContain("{{args}}");
  });

  it("returns warnings for allowed-tools", () => {
    const cmd: CommandIR = {
      name: "test",
      description: "Test",
      prompt: "Test",
      shellInjections: [],
      allowedTools: ["Bash(git:*)"],
    };
    const result = generateGeminiCommand(cmd);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!).toContain(
      "allowed-tools not supported in Gemini TOML commands"
    );
  });
});
