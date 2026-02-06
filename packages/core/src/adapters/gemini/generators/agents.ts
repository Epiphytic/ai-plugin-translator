import type { AgentIR } from "../../../ir/types.js";

export function generateGeminiAgent(agent: AgentIR): string {
  const yamlLines = Object.entries(agent.frontmatter).map(
    ([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
  );

  return `---\n${yamlLines.join("\n")}\n---\n\n${agent.content}`;
}
