import { describe, it, expect } from "vitest";
import { parseClaudeSkills } from "../../../../src/adapters/claude/parsers/skills.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeSkills", () => {
  it("parses skills from a plugin directory", async () => {
    const skills = await parseClaudeSkills(join(fixtures, "full"));
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("code-review");
  });

  it("extracts frontmatter fields", async () => {
    const skills = await parseClaudeSkills(join(fixtures, "full"));
    expect(skills[0].description).toBe(
      "Reviews code for best practices. Trigger when user asks for code review."
    );
    expect(skills[0].version).toBe("1.0.0");
  });

  it("preserves full frontmatter including extra fields", async () => {
    const skills = await parseClaudeSkills(join(fixtures, "full"));
    expect(skills[0].frontmatter["allowed-tools"]).toBe("Read,Bash(git diff:*)");
    expect(skills[0].frontmatter["author"]).toBe(
      "Test Author <https://example.com>"
    );
  });

  it("extracts content body without frontmatter", async () => {
    const skills = await parseClaudeSkills(join(fixtures, "full"));
    expect(skills[0].content).toContain("# Code Review");
    expect(skills[0].content).not.toContain("---");
  });

  it("returns empty array when no skills directory exists", async () => {
    const skills = await parseClaudeSkills(join(fixtures, "basic"));
    expect(skills).toEqual([]);
  });
});
