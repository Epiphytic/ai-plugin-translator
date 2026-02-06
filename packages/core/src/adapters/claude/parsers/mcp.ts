import { readFile } from "fs/promises";
import { join } from "path";
import type { McpServerIR } from "../../../ir/types.js";

interface McpServerRaw {
  type?: "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  headers?: Record<string, string>;
}

export async function parseClaudeMcpFile(
  pluginPath: string
): Promise<McpServerIR[]> {
  const mcpPath = join(pluginPath, ".mcp.json");
  let raw: string;
  try {
    raw = await readFile(mcpPath, "utf-8");
  } catch {
    return [];
  }

  const parsed: Record<string, McpServerRaw> = JSON.parse(raw);
  return parseClaudeMcpFromObject(parsed);
}

export function parseClaudeMcpFromObject(
  obj: Record<string, unknown>
): McpServerIR[] {
  const servers: McpServerIR[] = [];

  for (const [name, config] of Object.entries(obj)) {
    const raw = config as McpServerRaw;
    const isHttp = raw.type === "http" || raw.url != null;

    servers.push({
      name,
      type: isHttp ? "http" : "stdio",
      command: raw.command,
      args: raw.args,
      env: raw.env,
      cwd: raw.cwd,
      url: raw.url,
      headers: raw.headers,
    });
  }

  return servers;
}
