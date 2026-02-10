import { describe, it, expect } from "vitest";
import {
  generateGeminiSkill,
  adaptSkillContent,
} from "../../../../src/adapters/gemini/generators/skills.js";
import type { SkillIR } from "../../../../src/ir/types.js";

describe("adaptSkillContent", () => {
  it("replaces ${CLAUDE_PLUGIN_ROOT} with ${extensionPath}", () => {
    const { content, warnings } = adaptSkillContent(
      "Run ${CLAUDE_PLUGIN_ROOT}/scripts/test.sh"
    );
    expect(content).toBe("Run ${extensionPath}/scripts/test.sh");
    expect(warnings).toContain(
      "adapted skill content: replaced path variable ${CLAUDE_PLUGIN_ROOT}"
    );
  });

  it("replaces unbraced CLAUDE_PLUGIN_ROOT with extensionPath", () => {
    const { content, warnings } = adaptSkillContent(
      "export DIR=CLAUDE_PLUGIN_ROOT/bin"
    );
    expect(content).toBe("export DIR=extensionPath/bin");
    expect(warnings).toContain(
      "adapted skill content: replaced path variable CLAUDE_PLUGIN_ROOT"
    );
  });

  it("replaces **For Claude:** with **For Gemini:**", () => {
    const { content, warnings } = adaptSkillContent(
      "> **For Claude:** REQUIRED SUB-SKILL:"
    );
    expect(content).toBe("> **For Gemini:** REQUIRED SUB-SKILL:");
    expect(warnings).toContain(
      "adapted skill content: replaced bold directive pattern"
    );
  });

  it("replaces plain For Claude: with For Gemini:", () => {
    const { content } = adaptSkillContent("For Claude: do this thing");
    expect(content).toBe("For Gemini: do this thing");
  });

  it("replaces Claude Code with Gemini CLI", () => {
    const { content, warnings } = adaptSkillContent(
      "This plugin works with Claude Code to review files."
    );
    expect(content).toBe(
      "This plugin works with Gemini CLI to review files."
    );
    expect(warnings).toContain(
      "adapted skill content: replaced tool name reference"
    );
  });

  it("replaces ~/.claude/ paths with ~/.gemini/", () => {
    const { content, warnings } = adaptSkillContent(
      "Config lives at ~/.claude/config.json"
    );
    expect(content).toBe("Config lives at ~/.gemini/config.json");
    expect(warnings).toContain(
      "adapted skill content: replaced path ~/.claude/"
    );
  });

  it("replaces 'in Claude' with 'in Gemini' at word boundaries", () => {
    const { content, warnings } = adaptSkillContent(
      "When running in Claude, use the tool."
    );
    expect(content).toBe("When running in Gemini, use the tool.");
    expect(warnings).toContain(
      "adapted skill content: replaced contextual 'in Claude' reference"
    );
  });

  it("does NOT replace Claude when it refers to the model", () => {
    const { content } = adaptSkillContent(
      "future Claude instances will handle this"
    );
    expect(content).toBe("future Claude instances will handle this");
  });

  it("does NOT replace Claude in filenames like CLAUDE.md", () => {
    const { content } = adaptSkillContent("See CLAUDE.md for details");
    expect(content).toBe("See CLAUDE.md for details");
  });

  it("returns empty warnings when no Claude references exist", () => {
    const { content, warnings } = adaptSkillContent("# Plain skill\nNo references here.");
    expect(content).toBe("# Plain skill\nNo references here.");
    expect(warnings).toEqual([]);
  });

  it("handles multiple replacements in one content block", () => {
    const input = [
      "Use Claude Code with ${CLAUDE_PLUGIN_ROOT}/bin.",
      "Config at ~/.claude/settings.json.",
      "> **For Claude:** important note",
    ].join("\n");

    const { content, warnings } = adaptSkillContent(input);
    expect(content).toContain("Gemini CLI");
    expect(content).toContain("${extensionPath}/bin");
    expect(content).toContain("~/.gemini/settings.json");
    expect(content).toContain("**For Gemini:**");
    expect(warnings.length).toBeGreaterThanOrEqual(4);
  });
});

describe("generateGeminiSkill return type", () => {
  it("returns { content, warnings } matching agent generator pattern", () => {
    const skill: SkillIR = {
      name: "test-skill",
      description: "A test skill",
      content: "Use Claude Code to run the tool.",
      frontmatter: {
        name: "test-skill",
        description: "A test skill",
      },
    };

    const result = generateGeminiSkill(skill);
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("warnings");
    expect(typeof result.content).toBe("string");
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.content).toContain("Gemini CLI");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("returns warnings listing each substitution type found", () => {
    const skill: SkillIR = {
      name: "complex",
      description: "Complex skill",
      content: "Claude Code stores data in ~/.claude/data. **For Claude:** use it in Claude.",
      frontmatter: { name: "complex", description: "Complex skill" },
    };

    const { warnings } = generateGeminiSkill(skill);
    expect(warnings).toContain("adapted skill content: replaced path ~/.claude/");
    expect(warnings).toContain("adapted skill content: replaced tool name reference");
    expect(warnings).toContain("adapted skill content: replaced bold directive pattern");
    expect(warnings).toContain("adapted skill content: replaced contextual 'in Claude' reference");
  });

  it("returns empty warnings when no Claude references exist", () => {
    const skill: SkillIR = {
      name: "clean",
      description: "Clean skill",
      content: "# Generic content\nNo ecosystem references.",
      frontmatter: { name: "clean", description: "Clean skill" },
    };

    const { warnings } = generateGeminiSkill(skill);
    expect(warnings).toEqual([]);
  });
});
