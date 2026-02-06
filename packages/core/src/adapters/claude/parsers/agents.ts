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

/**
 * Parse frontmatter line-by-line. Handles unquoted values with colons
 * that trip up js-yaml's strict parser (common in real Claude agent
 * description fields).
 */
function parseFrontmatterLenient(
  frontmatterBlock: string
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const line of frontmatterBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    if (!key) continue;
    let value: string | unknown = line.slice(colonIdx + 1).trim();

    // Try to parse JSON arrays/objects
    if (
      typeof value === "string" &&
      ((value.startsWith("[") && value.endsWith("]")) ||
        (value.startsWith("{") && value.endsWith("}")))
    ) {
      try {
        value = JSON.parse(value);
      } catch {
        // keep as string
      }
    }

    data[key] = value;
  }
  return data;
}

function parseAgentFile(filename: string, raw: string): AgentIR {
  let data: Record<string, unknown>;
  let content: string;

  try {
    // Pass engines option to bypass gray-matter's internal cache,
    // which can return stale empty data after a previous YAML parse failure
    const parsed = matter(raw, { engines: {} });
    data = parsed.data;
    content = parsed.content;
  } catch {
    // Fallback: parse frontmatter manually when js-yaml chokes
    // on unquoted values containing colons
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (match) {
      data = parseFrontmatterLenient(match[1]);
      content = match[2];
    } else {
      data = {};
      content = raw;
    }
  }

  const fallbackName = basename(filename, ".md");

  return {
    name: (data.name as string) ?? fallbackName,
    description: (data.description as string) ?? "",
    content: content.trim(),
    model: data.model as string | undefined,
    frontmatter: data,
  };
}
