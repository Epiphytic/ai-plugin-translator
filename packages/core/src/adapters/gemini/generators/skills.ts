import type { SkillIR } from "../../../ir/types.js";

const CLAUDE_ONLY_KEYS = new Set(["allowed-tools"]);

export function generateGeminiSkill(skill: SkillIR): string {
  const frontmatter: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(skill.frontmatter)) {
    if (!CLAUDE_ONLY_KEYS.has(key)) {
      frontmatter[key] = value;
    }
  }

  const yamlLines = Object.entries(frontmatter).map(
    ([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
  );

  return `---\n${yamlLines.join("\n")}\n---\n\n${skill.content}`;
}
