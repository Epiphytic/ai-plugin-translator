import { describe, it, expect } from "vitest";
import { generateGeminiAgent } from "../../../../src/adapters/gemini/generators/agents.js";
import type { AgentIR } from "../../../../src/ir/types.js";

function makeAgent(overrides?: Partial<AgentIR>): AgentIR {
  return {
    name: "test-agent",
    description: "A test agent",
    content: "You are a test agent.",
    frontmatter: { name: "test-agent", description: "A test agent" },
    ...overrides,
  };
}

describe("generateGeminiAgent", () => {
  it("generates valid frontmatter with only name and description", () => {
    const result = generateGeminiAgent(makeAgent());
    expect(result.content).toContain("name: test-agent");
    expect(result.content).toContain("description: A test agent");
    expect(result.warnings).toHaveLength(0);
  });

  it("strips model field with warning", () => {
    const result = generateGeminiAgent(
      makeAgent({
        model: "sonnet",
        frontmatter: {
          name: "test-agent",
          description: "A test agent",
          model: "sonnet",
        },
      })
    );
    expect(result.content).not.toContain("model:");
    expect(result.warnings).toContain(
      'agent "test-agent": dropped unsupported field "model"'
    );
  });

  it("strips tools field (string) with warning", () => {
    const result = generateGeminiAgent(
      makeAgent({
        frontmatter: {
          name: "test-agent",
          description: "A test agent",
          tools: "Read, Grep, Glob",
        },
      })
    );
    expect(result.content).not.toContain("tools:");
    expect(result.warnings).toContain(
      'agent "test-agent": dropped unsupported field "tools"'
    );
  });

  it("strips permissionMode field with warning", () => {
    const result = generateGeminiAgent(
      makeAgent({
        frontmatter: {
          name: "test-agent",
          description: "A test agent",
          permissionMode: "default",
        },
      })
    );
    expect(result.content).not.toContain("permissionMode:");
    expect(result.warnings).toContain(
      'agent "test-agent": dropped unsupported field "permissionMode"'
    );
  });

  it("strips skills field with warning", () => {
    const result = generateGeminiAgent(
      makeAgent({
        frontmatter: {
          name: "test-agent",
          description: "A test agent",
          skills: "some-plugin:some-skill",
        },
      })
    );
    expect(result.content).not.toContain("skills:");
    expect(result.warnings).toContain(
      'agent "test-agent": dropped unsupported field "skills"'
    );
  });

  it("strips capabilities field with warning", () => {
    const result = generateGeminiAgent(
      makeAgent({
        frontmatter: {
          name: "test-agent",
          description: "A test agent",
          capabilities: ["semantic-search", "pattern-recognition"],
        },
      })
    );
    expect(result.content).not.toContain("capabilities:");
    expect(result.warnings).toContain(
      'agent "test-agent": dropped unsupported field "capabilities"'
    );
  });

  it("ensures name is always present even when missing from frontmatter", () => {
    const result = generateGeminiAgent(
      makeAgent({
        name: "complex-agent",
        frontmatter: { description: "An agent without name in frontmatter" },
      })
    );
    expect(result.content).toContain("name: complex-agent");
  });

  it("preserves content body unchanged", () => {
    const result = generateGeminiAgent(
      makeAgent({ content: "You are a specialized agent." })
    );
    expect(result.content).toContain("You are a specialized agent.");
  });
});
