import { readFile, readdir } from "fs/promises";
import { join, basename } from "path";
import matter from "gray-matter";
import type { AgentIR } from "../../../ir/types.js";

export async function parseClaudeAgents(
  pluginPath: string
): Promise<AgentIR[]> {
  const agentsDir = join(pluginPath, "agents");
  let entries: string[];
  try {
    entries = await readdir(agentsDir);
  } catch {
    return [];
  }

  const agents: AgentIR[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const filePath = join(agentsDir, entry);
    const raw = await readFile(filePath, "utf-8");
    agents.push(parseAgentFile(entry, raw));
  }

  return agents;
}

function parseAgentFile(filename: string, raw: string): AgentIR {
  const { data, content } = matter(raw);
  const fallbackName = basename(filename, ".md");

  return {
    name: (data.name as string) ?? fallbackName,
    description: (data.description as string) ?? "",
    content: content.trim(),
    model: data.model as string | undefined,
    frontmatter: data,
  };
}
