import { describe, it, expect } from "vitest";
import { parseClaudeAgents } from "../../../../src/adapters/claude/parsers/agents.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeAgents", () => {
  it("parses agents from agents directory", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "full"));
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe("code-simplifier");
  });

  it("extracts description and model from frontmatter", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "full"));
    expect(agents[0].description).toBe(
      "Simplifies code for clarity and maintainability"
    );
    expect(agents[0].model).toBe("opus");
  });

  it("extracts content body without frontmatter", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "full"));
    expect(agents[0].content).toContain(
      "You are an expert code simplification specialist."
    );
    expect(agents[0].content).not.toContain("---");
  });

  it("returns empty array when no agents directory exists", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "basic"));
    expect(agents).toEqual([]);
  });
});
