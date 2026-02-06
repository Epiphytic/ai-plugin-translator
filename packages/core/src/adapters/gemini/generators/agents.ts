import type { AgentIR } from "../../../ir/types.js";

const GEMINI_AGENT_KEYS = new Set(["name", "description"]);

export function generateGeminiAgent(agent: AgentIR): {
  content: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  const frontmatter: Record<string, unknown> = {};

  // Always ensure name is present
  frontmatter.name = agent.name;

  // Keep only Gemini-compatible keys from original frontmatter
  for (const [key, value] of Object.entries(agent.frontmatter)) {
    if (GEMINI_AGENT_KEYS.has(key)) {
      frontmatter[key] = value;
    } else {
      warnings.push(`agent "${agent.name}": dropped unsupported field "${key}"`);
    }
  }

  // Ensure description is present
  if (!frontmatter.description && agent.description) {
    frontmatter.description = agent.description;
  }

  const yamlLines = Object.entries(frontmatter).map(
    ([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
  );

  return {
    content: `---\n${yamlLines.join("\n")}\n---\n\n${agent.content}`,
    warnings,
  };
}
