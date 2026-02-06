import { describe, it, expect } from "vitest";
import { parseClaudeCommands } from "../../../../src/adapters/claude/parsers/commands.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeCommands", () => {
  it("parses commands from a plugin directory", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    expect(commands).toHaveLength(2);
  });

  it("extracts description from frontmatter", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    const commit = commands.find((c) => c.name === "commit");
    expect(commit).toBeDefined();
    expect(commit!.description).toBe("Create a git commit");
  });

  it("normalizes $ARGUMENTS to {{args}}", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    const commit = commands.find((c) => c.name === "commit");
    expect(commit!.prompt).toContain("{{args}}");
    expect(commit!.prompt).not.toContain("$ARGUMENTS");
  });

  it("normalizes shell injections from backtick to brace format", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    const commit = commands.find((c) => c.name === "commit");
    expect(commit!.prompt).toContain("!{git status}");
    expect(commit!.shellInjections).toHaveLength(2);
  });

  it("captures allowed-tools from frontmatter", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    const commit = commands.find((c) => c.name === "commit");
    expect(commit!.allowedTools).toEqual([
      "Bash(git add:*)",
      "Bash(git status:*)",
      "Bash(git commit:*)",
    ]);
  });

  it("captures argument-hint from frontmatter", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "full"));
    const search = commands.find((c) => c.name === "search");
    expect(search!.argumentHint).toBe("<search-term>");
  });

  it("returns empty array when no commands directory exists", async () => {
    const commands = await parseClaudeCommands(join(fixtures, "basic"));
    expect(commands).toEqual([]);
  });
});
