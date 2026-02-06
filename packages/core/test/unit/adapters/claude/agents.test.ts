import { describe, it, expect } from "vitest";
import { parseClaudeAgents } from "../../../../src/adapters/claude/parsers/agents.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeAgents", () => {
  it("parses agents from agents directory", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "full"));
    expect(agents).toHaveLength(3);
    const names = agents.map((a) => a.name).sort();
    expect(names).toEqual(["code-simplifier", "complex-agent", "yaml-tricky"]);
  });

  it("extracts description and model from frontmatter", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "full"));
    const agent = agents.find((a) => a.name === "code-simplifier")!;
    expect(agent.description).toBe(
      "Simplifies code for clarity and maintainability"
    );
    expect(agent.model).toBe("opus");
  });

  it("extracts content body without frontmatter", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "full"));
    const agent = agents.find((a) => a.name === "code-simplifier")!;
    expect(agent.content).toContain(
      "You are an expert code simplification specialist."
    );
    expect(agent.content).not.toContain("---");
  });

  it("parses complex agent with Claude-specific fields", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "full"));
    const agent = agents.find((a) => a.name === "complex-agent")!;
    expect(agent.description).toBe("Agent with Claude-specific fields");
    expect(agent.frontmatter.tools).toBe("Read, Grep, Glob, mcp__some_tool");
    expect(agent.frontmatter.permissionMode).toBe("default");
    expect(agent.frontmatter.skills).toBe("some-plugin:some-skill");
    expect(agent.frontmatter.capabilities).toEqual([
      "semantic-search",
      "pattern-recognition",
    ]);
  });

  it("handles YAML-unfriendly descriptions via lenient fallback", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "full"));
    const agent = agents.find((a) => a.name === "yaml-tricky")!;
    expect(agent).toBeDefined();
    expect(agent.description).toContain("Use this agent when");
    expect(agent.content).toContain("You handle tricky YAML descriptions.");
  });

  it("returns empty array when no agents directory exists", async () => {
    const agents = await parseClaudeAgents(join(fixtures, "basic"));
    expect(agents).toEqual([]);
  });
});
