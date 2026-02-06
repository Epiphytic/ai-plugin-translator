import { describe, it, expect } from "vitest";
import { generateGeminiSkill } from "../../../../src/adapters/gemini/generators/skills.js";
import { generateGeminiAgent } from "../../../../src/adapters/gemini/generators/agents.js";
import { generateGeminiContext } from "../../../../src/adapters/gemini/generators/context.js";
import type { SkillIR, AgentIR, ContextFileIR } from "../../../../src/ir/types.js";

describe("generateGeminiSkill", () => {
  it("generates SKILL.md preserving frontmatter", () => {
    const skill: SkillIR = {
      name: "review",
      description: "Review code",
      version: "1.0.0",
      content: "# Code Review\nCheck for bugs.",
      frontmatter: {
        name: "review",
        description: "Review code",
        version: "1.0.0",
        "allowed-tools": "Read,Grep",
      },
    };
    const result = generateGeminiSkill(skill);
    expect(result).toContain("---");
    expect(result).toContain("name: review");
    expect(result).toContain("# Code Review");
  });

  it("strips claude-specific frontmatter keys", () => {
    const skill: SkillIR = {
      name: "test",
      description: "test",
      content: "body",
      frontmatter: {
        name: "test",
        description: "test",
        "allowed-tools": "Read",
      },
    };
    const result = generateGeminiSkill(skill);
    expect(result).not.toContain("allowed-tools");
  });
});

describe("generateGeminiAgent", () => {
  it("generates agent markdown preserving frontmatter", () => {
    const agent: AgentIR = {
      name: "helper",
      description: "Helps with tasks",
      content: "You are a helpful assistant.",
      model: "opus",
      frontmatter: {
        name: "helper",
        description: "Helps with tasks",
        model: "opus",
      },
    };
    const result = generateGeminiAgent(agent);
    expect(result).toContain("---");
    expect(result).toContain("name: helper");
    expect(result).toContain("You are a helpful assistant.");
  });
});

describe("generateGeminiContext", () => {
  it("returns GEMINI.md with content from CLAUDE.md", () => {
    const contextFiles: ContextFileIR[] = [
      { filename: "CLAUDE.md", content: "# My Plugin\nDo things." },
    ];
    const result = generateGeminiContext(contextFiles);
    expect(result!.filename).toBe("GEMINI.md");
    expect(result!.content).toBe("# My Plugin\nDo things.");
  });

  it("returns undefined when no context files exist", () => {
    const result = generateGeminiContext([]);
    expect(result).toBeUndefined();
  });
});
